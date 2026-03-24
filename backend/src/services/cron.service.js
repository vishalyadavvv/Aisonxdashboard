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
    logger.info('🕒 Checking for missed daily scans on startup...');
    runAllProjectScans().catch(err => {
        logger.error('❌ Error during catch-up scan on startup:', err.message);
    });

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

        // 3. Calculate Adaptive Delay
        // Goal: Finish all scans within a 3-hour window (10,800 seconds)
        // Formula: (Total Window / Total Projects) - Estimated Scan Time (min 10s, max 45s)
        const TOTAL_WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours
        const ESTIMATED_SCAN_TIME_MS = 20000; // 20 seconds
        let adaptiveDelay = Math.floor((TOTAL_WINDOW_MS / projects.length) - ESTIMATED_SCAN_TIME_MS);
        adaptiveDelay = Math.max(10000, Math.min(45000, adaptiveDelay)); // Clamp between 10s and 45s

        logger.info(`🕒 Adaptive Delay calculated: ${adaptiveDelay/1000}s between projects`);

        // 4. Process them sequentially with adaptive delay
        for (const project of projects) {
            try {
                logger.info(`🚀 [AUTO-SCAN] Executing Comprehensive Scan for subscribed project: ${project.name} (${project.domain})`);
                
                // Fire the core heavy scanner exactly as if the user manually pushed the sync button
                await internalRunProjectScan(project);

                logger.info(`✅ [AUTO-SCAN] Successfully completed daily automated scan for ${project.name}`);

                // Pause with adaptive delay
                await new Promise(resolve => setTimeout(resolve, adaptiveDelay));

            } catch (projectErr) {
                logger.error(`❌ [AUTO-SCAN] Error scanning subscribed project ${project.name}:`, projectErr.message);
            }
        }
        
        logger.info('🏁 Daily Priority GEO scans officially completed for all subscribing users.');
    } catch (err) {
        logger.error('CRITICAL: Daily scan master process failed:', err.message);
    }
};

// Also export for manual triggering if needed
exports.runAllProjectScans = runAllProjectScans;
