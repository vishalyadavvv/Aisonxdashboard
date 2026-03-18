const cron = require('node-cron');
const Project = require('../models/Project');
const Snapshot = require('../models/Snapshot');
const promptOrchestrator = require('./ai_internal/promptOrchestrator');
const techAudit = require('./techAudit.service');
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
        const projects = await Project.find({ 'settings.dailyScanEnabled': true });
        logger.info(`🔍 Found ${projects.length} projects for daily scanning`);

        for (const project of projects) {
            try {
                logger.info(`🚀 Scanning project: ${project.name} (${project.domain})`);
                
                // 1. Technical Audits
                const [robotsJson, sitemapJson] = await Promise.all([
                    techAudit.analyzeRobots(project.domain),
                    techAudit.analyzeSitemap(project.domain)
                ]);

                // 2. AI Audits (Brand + Competitors)
                const scanResults = await promptOrchestrator.performProjectScan(project);

                // 3. Aggregate Authority Signals
                const allSignals = scanResults.promptRankings.map(r => r.authoritySignals).filter(Boolean);
                const trainingRecall = Math.round(allSignals.filter(s => s.recallConfidence === 'High').length / (allSignals.length || 1) * 100);
                const webGroundedPercent = Math.round(allSignals.filter(s => s.sourceType?.includes('Web')).length / (allSignals.length || 1) * 100);
                const uniqueCitations = [...new Set(allSignals.flatMap(s => s.citations || []))].slice(0, 10);

                // 4. Calculate refined GEO Health Score (0-100)
                const visibilityScore = scanResults.promptRankings.length > 0
                    ? Math.round(scanResults.promptRankings.reduce((a, b) => a + (b.score || 0), 0) / scanResults.promptRankings.length)
                    : 0;
                
                const techScore = (robotsJson.found ? 50 : 0) + (sitemapJson.found ? 50 : 0);
                const authorityScore = Math.round((trainingRecall + webGroundedPercent) / 2);

                const overallScore = Math.round((visibilityScore * 0.4) + (techScore * 0.3) + (authorityScore * 0.3));

                // Create the daily snapshot
                await Snapshot.create({
                    projectId: project._id,
                    date: new Date(),
                    overallScore,
                    promptRankings: scanResults.promptRankings,
                    competitorRankings: scanResults.competitorRankings,
                    customPromptResults: scanResults.customPromptResults,
                    authoritySignals: {
                        trainingRecall,
                        webGroundedRecency: webGroundedPercent,
                        topCitations: uniqueCitations.map(c => ({ source: c, type: 'Web', relevance: 100 }))
                    },
                    technicalAudit: {
                        robotsValid: robotsJson.found,
                        sitemapFound: sitemapJson.found,
                        schemaCount: 0,
                        pageSpeedScore: 0
                    },
                    summary: `Daily automated scan completed. Authority: Training Recall (${trainingRecall}%), Web Grounding (${webGroundedPercent}%).`
                });

                // Update last scan date on the project
                project.lastScanAt = new Date();
                await project.save();

                logger.info(`✅ Successfully scanned ${project.name}`);
            } catch (projectErr) {
                logger.error(`❌ Error scanning project ${project.name}:`, projectErr.message);
            }
        }
        
        logger.info('🏁 Daily GEO scans completed');
    } catch (err) {
        logger.error('CRITICAL: Daily scan master process failed:', err.message);
    }
};

// Also export for manual triggering if needed
exports.runAllProjectScans = runAllProjectScans;
