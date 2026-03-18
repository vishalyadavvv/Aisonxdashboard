const profilerService = require('../services/profiler.service');
const ProfilerReport = require('../models/ProfilerReport');
const User = require('../models/User');
const logger = require('../utils/logger');

exports.analyzeDomain = async (req, res) => {
    const startTime = Date.now();
    try {
        const { domain } = req.body;
        const userId = req.user?._id;
        const LLM_PROVIDER = process.env.LLM_PROVIDER || 'openai';

        if (!domain) {
            return res.status(400).json({ error: 'Domain is required' });
        }

        const cleanDomain = domain
            .toLowerCase()
            .replace(/^https?:\/\//, '')
            .replace(/^www\./, '')
            .replace(/\/$/, '')
            .split('/')[0];

        logger.info(`[Profiler] New Analysis: ${cleanDomain} (Provider: ${LLM_PROVIDER})`);

        const websiteContent = await profilerService.fetchWebsiteContent(cleanDomain);
        const analysisResult = await profilerService.analyzeDomainMulti(cleanDomain, websiteContent);

        // If fetchWebsiteContent or analyzeDomainMulti returned an error object directly (instead of throwing)
        if (analysisResult && analysisResult.error && analysisResult.isBlocked) {
            logger.warn(`[Profiler] Analysis blocked for ${cleanDomain}. Not consuming user quota.`);
            return res.status(403).json({ error: analysisResult.error, isBlocked: true });
        }

        // Save to DB if user is authenticated
        if (userId) {
            try {
                const report = await ProfilerReport.create({
                    user: userId,
                    domain: cleanDomain,
                    domainType: analysisResult.domainType,
                    brandType: analysisResult.brandType,
                    brandFocus: analysisResult.brandFocus,
                    description: analysisResult.description,
                    coreOffering: analysisResult.coreOffering,
                    sentiment: analysisResult.sentiment,
                    topics: analysisResult.topics || [],
                    competitors: analysisResult.competitors || [],
                    prompts: analysisResult.prompts || [],
                    presenceTags: analysisResult.presenceTags || []
                });
                analysisResult._id = report._id;
                analysisResult.createdAt = report.createdAt;

                // Increment prompt usage
                const updateOps = { $inc: { 'subscription.promptsUsedThisMonth': 1 } };
                if (req.user && req.user.subscription && req.user.subscription.status === 'trialing') {
                    updateOps.$inc['subscription.trialScansUsedToday'] = 1;
                }
                await User.findByIdAndUpdate(userId, updateOps);
                logger.info(`💾 Domain profile report saved and usage incremented for user ID: ${userId}`);

            } catch (saveErr) {
                logger.error(`[Profiler] Failed to save report: ${saveErr.message}`);
            }
        }

        logger.info(`[Profiler] Completed analysis for ${cleanDomain} in ${Date.now() - startTime}ms`);
        res.json(analysisResult);

    } catch (error) {
        logger.error(`[Profiler] Error: ${error.message}`);
        res.status(500).json({ error: error.message || 'Analysis failed' });
    }
};

exports.getReports = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const reports = await ProfilerReport.find({ user: userId })
            .sort({ createdAt: -1 })
            .lean();

        res.json(reports);
    } catch (error) {
        logger.error(`[Profiler] Get Reports Error: ${error.message}`);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
};

exports.getReportById = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { id } = req.params;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const report = await ProfilerReport.findOne({ _id: id, user: userId }).lean();
        if (!report) return res.status(404).json({ error: 'Report not found' });

        res.json(report);
    } catch (error) {
        logger.error(`[Profiler] Get Report Error: ${error.message}`);
        res.status(500).json({ error: 'Failed to fetch report' });
    }
};

exports.getHealth = (req, res) => {
    res.json({
        status: 'healthy',
        provider: process.env.LLM_PROVIDER || 'openai',
        timestamp: new Date().toISOString()
    });
};
