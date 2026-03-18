const aiReadinessService = require('../services/aiReadiness.service');
const profilerService = require('../services/profiler.service');
const ReadinessReport = require('../models/ReadinessReport');
const User = require('../models/User');
const logger = require('../utils/logger');

exports.analyze = async (req, res) => {
    try {
        const { url } = req.body;
        const userId = req.user?._id;
        
        if (!url || !url.trim()) {
            return res.status(400).json({ error: 'URL is required' });
        }
        
        logger.info(`Starting analysis for: ${url}`);
        
        // Run readiness analysis
        const result = await aiReadinessService.analyzeWebsite(url);
        
        if (result.isBlocked) {
            logger.warn(`Analysis blocked for ${url}. Not consuming user quota.`);
            return res.status(403).json({ error: result.summary, isBlocked: true });
        }
        
        // Run domain profiler in parallel for domain synthesis data
        let profilerData = {};
        try {
            // Extract clean domain for profiler
            let cleanDomain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').split('/')[0];
            const websiteContent = await profilerService.fetchWebsiteContent(cleanDomain);
            profilerData = await profilerService.analyzeDomainMulti(cleanDomain, websiteContent);
            result.domainSynthesis = profilerData;
        } catch (profilerErr) {
            logger.warn(`Profiler integration failed: ${profilerErr.message}`);
            result.domainSynthesis = null;
        }
        
        // Save to DB if user is authenticated
        if (userId) {
            try {
                let cleanDomain = url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').split('/')[0];
                
                // Identify actual sub-sitemaps from discovered list
                const allQueries = result.queries || [];
                pageUrls = allQueries.filter(q => q.status === 'present').length;
                postUrls = (result.totalSitemapUrls || 0) - pageUrls;
                
                const discovered = result.discoveredSubSitemaps || [];
                pageSitemapUrl = discovered.find(u => u.toLowerCase().includes('page')) || result.sitemapUrl;
                postSitemapUrl = discovered.find(u => u.toLowerCase().includes('post')) || result.sitemapUrl;

                const report = await ReadinessReport.create({
                    user: userId,
                    url: url,
                    domain: cleanDomain,
                    businessType: result.businessType,
                    summary: result.summary,
                    coverageScore: result.coverageScore,
                    corePagesFound: result.corePagesFound,
                    totalPages: result.totalPages,
                    totalMissing: result.totalMissing,
                    queries: result.queries,
                    sitemapUrl: result.sitemapUrl,
                    totalSitemapUrls: result.totalSitemapUrls,
                    method: result.method,
                    isBlocked: result.isBlocked || false,
                    blockReason: result.blockReason || '',
                    domainType: profilerData.domainType || '',
                    brandType: profilerData.brandType || '',
                    brandFocus: profilerData.brandFocus || '',
                    coreOffering: profilerData.coreOffering || '',
                    sentiment: profilerData.sentiment || '',
                    topics: profilerData.topics || [],
                    competitors: profilerData.competitors || [],
                    prompts: profilerData.prompts || [],
                    presenceTags: profilerData.presenceTags || [],
                    pageUrls,
                    postUrls,
                    pageSitemapUrl,
                    postSitemapUrl,
                    technicalSignals: result.technicalSignals || null
                });
                result._id = report._id;
                result.createdAt = report.createdAt;

                // Increment prompt usage
                const updateOps = { $inc: { 'subscription.promptsUsedThisMonth': 1 } };
                if (req.user && req.user.subscription && req.user.subscription.status === 'trialing') {
                    updateOps.$inc['subscription.trialScansUsedToday'] = 1;
                }
                await User.findByIdAndUpdate(userId, updateOps);
                logger.info(`💾 AI Readiness report saved and usage incremented for user ID: ${userId}`);

            } catch (saveErr) {
                logger.error(`Failed to save readiness report: ${saveErr.message}`);
            }
        }
        
        logger.info(`Analysis completed successfully for ${url}`);
        res.json(result);
        
    } catch (error) {
        logger.error('Analysis failed:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.getReports = async (req, res) => {
    try {
        const userId = req.user?._id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const reports = await ReadinessReport.find({ user: userId })
            .sort({ createdAt: -1 })
            .lean();

        res.json(reports);
    } catch (error) {
        logger.error(`Get Readiness Reports Error: ${error.message}`);
        res.status(500).json({ error: 'Failed to fetch reports' });
    }
};

exports.getReportById = async (req, res) => {
    try {
        const userId = req.user?._id;
        const { id } = req.params;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const report = await ReadinessReport.findOne({ _id: id, user: userId }).lean();
        if (!report) return res.status(404).json({ error: 'Report not found' });

        res.json(report);
    } catch (error) {
        logger.error(`Get Readiness Report Error: ${error.message}`);
        res.status(500).json({ error: 'Failed to fetch report' });
    }
};
