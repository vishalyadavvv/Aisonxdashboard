const cron = require('node-cron');
const Project = require('../models/Project');
const User = require('../models/User');
const { internalRunProjectScan } = require('../controllers/project.controller');
const logger = require('../utils/logger');

/**
 * Initializes all cron jobs for the application
 */
exports.initCronJobs = () => {
    // 1. Run daily at midnight (00:00)
    cron.schedule('0 0 * * *', async () => {
        logger.info('🕒 Starting daily GEO automated scans...');
        await runAllProjectScans();
    });

    // 2. Catch-up: Run on server startup for any missed scans today
    // Delaying startup scan by 10 seconds to let the server fully stabilize and DB connect
    setTimeout(async () => {
        try {
            logger.info('🕒 Cleaning up stuck scans from previous session...');
            const stuckCount = await Project.updateMany({ isScanning: true }, { isScanning: false });
            if (stuckCount.modifiedCount > 0) {
                logger.info(`✅ Reset ${stuckCount.modifiedCount} stuck scan flags.`);
            }

            logger.info('🕒 Checking for missed daily scans on startup...');
            await runAllProjectScans();
        } catch (err) {
            logger.error('❌ Error during catch-up scan on startup:', err.message);
        }
    }, 10000);

    logger.info('✅ Cron jobs initialized');
};

/**
 * Iterates through all active projects and performs a GEO visibility scan
 * Only processes projects that haven't been scanned in the current calendar day.
 */
const runAllProjectScans = async () => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Find all Eligible Paying Users (Starter, Growth, Professional) with Active Subscriptions
        const premiumUsers = await User.find({
            'subscription.status': 'active',
            'subscription.tier': { $in: ['starter', 'growth', 'professional'] }
        });

        const premiumUserIds = premiumUsers.map(u => u._id);
        
        if (premiumUserIds.length === 0) {
            logger.info('🕒 Daily Scan: No active subscribing users found. Skipping.');
            return;
        }

        // 2. Find eligible projects belonging to those premium users
        // Criteria: dailyScanEnabled is true AND lastScanAt is NOT today (or exists not)
        const projects = await Project.find({ 
            userId: { $in: premiumUserIds },
            'settings.dailyScanEnabled': true,
            $or: [
                { lastScanAt: { $lt: today } },
                { lastScanAt: { $exists: false } }
            ]
        });

        if (projects.length === 0) {
            logger.info('🕒 Daily Scan: All eligible projects are already up to date for today.');
            return;
        }

        logger.info(`🔍 Found ${projects.length} eligible subscribing projects needing daily automated scanning`);

        const { queueProjectScan } = require('../queues/scanQueue');

        // 4. Process them via queue — concurrency is handled by the worker automatically
        for (const project of projects) {
            try {
                logger.info(`🚀 [AUTO-SCAN] Queuing daily scan for: ${project.name} (${project.domain})`);
                
                // Set flag and add to queue
                project.isScanning = true;
                await project.save();
                
                await queueProjectScan(project._id);

            } catch (projectErr) {
                logger.error(`❌ [AUTO-SCAN] Error queuing project ${project.name}:`, projectErr.message);
            }
        }
        
        logger.info('🏁 Daily Priority GEO scans officially completed for all subscribing users.');
    } catch (err) {
        logger.error('CRITICAL: Daily scan master process failed:', err.message);
    }
};

// Also export for manual triggering if needed
exports.runAllProjectScans = runAllProjectScans;
