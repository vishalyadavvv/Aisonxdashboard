const cron = require('node-cron');
const Project = require('../models/Project');
const User = require('../models/User');
const { internalRunProjectScan } = require('../controllers/project.controller');
const logger = require('../utils/logger');

/**
 * Initializes all cron jobs for the application
 */
exports.initCronJobs = () => {
    // Run daily at midnight (00:00)
    cron.schedule('0 0 * * *', async () => {
        logger.info('🕒 Starting daily GEO automated scans...');
        await runAllProjectScans();
    });

    logger.info('✅ Cron jobs initialized');
};

/**
 * Iterates through all active projects and performs a GEO visibility scan
 */
const runAllProjectScans = async () => {
    try {
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
        // The project themselves must have dailyScanEnabled toggle turned ON (Usually default True)
        const projects = await Project.find({ 
            userId: { $in: premiumUserIds },
            'settings.dailyScanEnabled': true 
        });

        logger.info(`🔍 Found ${projects.length} eligible subscribing projects for daily automated scanning`);

        // 3. Process them sequentially with an artificial delay to prevent massive API Rate Limits at midnight
        for (const project of projects) {
            try {
                logger.info(`🚀 [AUTO-SCAN] Executing Comprehensive Scan for subscribed project: ${project.name} (${project.domain})`);
                
                // Fire the core heavy scanner exactly as if the user manually pushed the sync button
                await internalRunProjectScan(project);

                logger.info(`✅ [AUTO-SCAN] Successfully completed daily automated scan for ${project.name}`);

                // Pause for 15 seconds between heavy project scans to prevent OpenAI/Google 429 quota exhaustion
                await new Promise(resolve => setTimeout(resolve, 15000));

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
