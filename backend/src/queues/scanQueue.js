const { Queue, Worker, QueueEvents } = require('bullmq');
const redis = require('../config/redis');
const Project = require('../models/Project');
const logger = require('../utils/logger');

const QUEUE_NAME = 'aisonx-project-scans';

// ─── QUEUE (Producer) ─────────────────────────────────────────────────────────
// Used to ADD scan jobs. Keeps jobs in Redis so they survive server restarts.
const scanQueue = new Queue(QUEUE_NAME, {
    connection: redis,
    defaultJobOptions: {
        attempts: 1,            // Don't auto-retry failed scans (they're expensive)
        removeOnComplete: 50,   // Keep last 50 completed jobs for status checks
        removeOnFail: 30,       // Keep last 30 failed jobs for debugging
    }
});

// ─── WORKER (Consumer) ────────────────────────────────────────────────────────
// Processes scan jobs. concurrency: 2 = max 2 scans at a time (same as before).
// Runs inside the same Node.js process — no extra RAM needed.
const scanWorker = new Worker(QUEUE_NAME, async (job) => {
    const { projectId } = job.data;

    // Lazy-load to prevent circular dependency with project.controller
    const { internalRunProjectScan } = require('../controllers/project.controller');

    const project = await Project.findById(projectId);
    if (!project) {
        logger.warn(`[QUEUE] Project ${projectId} not found — skipping job ${job.id}`);
        return { skipped: true };
    }

    logger.info(`[QUEUE] 🚀 Starting scan for "${project.name}" (job ${job.id})`);
    await internalRunProjectScan(project);
    logger.info(`[QUEUE] ✅ Completed scan for "${project.name}" (job ${job.id})`);

    return { success: true, projectId };

}, {
    connection: redis,
    concurrency: 2,         // MAX 2 scans simultaneously — protects 1GB RAM
    lockDuration: 600000,   // 10-min lock (Pro tier scans can take ~10 min)
    lockRenewTime: 30000,   // Renew lock every 30s to prevent timeout mid-scan
});

// ─── WORKER EVENT HANDLERS ────────────────────────────────────────────────────
scanWorker.on('failed', async (job, err) => {
    logger.error(`[QUEUE] ❌ Job ${job?.id} failed for project ${job?.data?.projectId}:`, err.message);
    // Always reset isScanning flag on failure to prevent stuck projects
    if (job?.data?.projectId) {
        try {
            await Project.findByIdAndUpdate(job.data.projectId, { isScanning: false });
            logger.info(`[QUEUE] Reset isScanning flag for ${job.data.projectId}`);
        } catch (e) {
            logger.error(`[QUEUE] Failed to reset isScanning flag:`, e.message);
        }
    }
});

scanWorker.on('completed', (job) => {
    logger.info(`[QUEUE] ✅ Job ${job.id} completed successfully`);
});

scanWorker.on('error', (err) => {
    logger.error(`[QUEUE] Worker error:`, err.message);
});

// ─── QUEUE EVENTS (for status polling) ───────────────────────────────────────
const queueEvents = new QueueEvents(QUEUE_NAME, { connection: redis });

// ─── HELPER: Add project scan to queue ───────────────────────────────────────
const queueProjectScan = async (projectId) => {
    // Prevent duplicate jobs for the same project
    const waiting = await scanQueue.getWaiting();
    const alreadyWaiting = waiting.find(j => j.data.projectId === projectId.toString());
    if (alreadyWaiting) {
        logger.info(`[QUEUE] Project ${projectId} already in queue — skipping duplicate`);
        return { alreadyQueued: true, jobId: alreadyWaiting.id };
    }

    const job = await scanQueue.add('scan', { projectId: projectId.toString() });
    const waitingCount = await scanQueue.getWaitingCount();
    const activeCount = await scanQueue.getActiveCount();

    logger.info(`[QUEUE] Added project ${projectId} to queue. Position: ${waitingCount}. Active: ${activeCount}/2`);
    return {
        jobId: job.id,
        queuePosition: waitingCount,
        activeCount,
        estimatedWait: waitingCount === 0 && activeCount < 2
            ? 'Starting now'
            : `~${Math.ceil((waitingCount + activeCount) * 5)} min`
    };
};

module.exports = { scanQueue, scanWorker, queueEvents, queueProjectScan };
