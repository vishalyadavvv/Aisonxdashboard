const mongoose = require('mongoose');
const Project = require('../models/Project');
const Snapshot = require('../models/Snapshot');
const promptOrchestrator = require('../services/ai_internal/promptOrchestrator');
const techAudit = require('../services/techAudit.service');
const logger = require('../utils/logger');

// Helper to get prompt limit by tier
const getPromptLimit = (tier) => {
    switch (tier) {
        case 'professional': return 25;
        case 'growth': return 10;
        default: return 2;
    }
};

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
exports.createProject = async (req, res) => {
    try {
    const { name, brandName, domain, prompts: promptsInput, targetEngines, competitors, market } = req.body;

    if (!name || !brandName || !domain) {
      return res.status(400).json({ error: 'Name, Brand Name, and Domain are required' });
    }

    // Check Prompt Limits
    const promptLimit = getPromptLimit(req.user.subscription?.tier);
    const prompts = Array.isArray(promptsInput) ? promptsInput : (promptsInput ? promptsInput.split(',').map(k => k.trim()).filter(Boolean) : []);
    
    if (prompts.length > promptLimit) {
        return res.status(403).json({ 
            error: `Project prompt limit exceeded. Your ${req.user.subscription?.tier || 'Free'} plan allows only ${promptLimit} prompts per project.` 
        });
    }

    const project = await Project.create({
      userId: req.user._id,
      name,
      brandName,
      domain,
      prompts,
      competitors: competitors || [],
      targetEngines: targetEngines || ['openai', 'gemini', 'groq'],
      market: market || { name: 'Global', code: 'GLB', type: 'global' }
    });

        res.status(201).json(project);
    } catch (err) {
        logger.error('Error creating project:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// @desc    Get all user projects
// @route   GET /api/projects
// @access  Private
exports.getProjects = async (req, res) => {
    try {
        const projects = await Project.find({ userId: req.user._id }).sort('-createdAt');
        res.json(projects);
    } catch (err) {
        logger.error('Error getting projects:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid project ID format' });
        }
        const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json(project);
    } catch (err) {
        logger.error('Error getting project:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
exports.updateProject = async (req, res) => {
    try {
        const { name, prompts: promptsInput, targetEngines, competitors, market, settings } = req.body;

        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid project ID format' });
        }
        let project = await Project.findOne({ _id: req.params.id, userId: req.user._id });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (promptsInput) {
            const promptLimit = getPromptLimit(req.user.subscription?.tier);
            const prompts = Array.isArray(promptsInput) ? promptsInput : promptsInput.split(',').map(k => k.trim()).filter(Boolean);
            
            if (prompts.length > promptLimit) {
                return res.status(403).json({ 
                    error: `Project prompt limit exceeded. Your ${req.user.subscription?.tier || 'Free'} plan allows only ${promptLimit} prompts per project.` 
                });
            }
            project.prompts = prompts;
        }

        project.name = name || project.name;
        project.targetEngines = targetEngines || project.targetEngines;
        project.competitors = competitors !== undefined ? competitors : project.competitors;
        project.market = market || project.market;
        project.settings = settings || project.settings;

        await project.save();

        res.json(project);
    } catch (err) {
        logger.error('Error updating project:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
exports.deleteProject = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid project ID format' });
        }
        const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        await project.deleteOne();
        
        // Also delete all associated snapshots
        await Snapshot.deleteMany({ projectId: project._id });

        res.json({ message: 'Project and associated data removed' });
    } catch (err) {
        logger.error('Error deleting project:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// @desc    Get project snapshots (history)
// @route   GET /api/projects/:id/history
// @access  Private
exports.getProjectHistory = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid project ID format' });
        }
        const snapshots = await Snapshot.find({ projectId: req.params.id })
            .sort('-date')
            .limit(30); // Last 30 days

        res.json(snapshots);
    } catch (err) {
        logger.error('Error getting history:', err.message);
        res.status(500).json({ error: 'Server error' });
    }
};

// @desc    Run immediate project scan
// @route   POST /api/projects/:id/scan
// @access  Private
exports.runProjectScan = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid project ID format' });
        }
        const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        logger.info(`🚀 Manual scan triggered for: ${project.name}`);
        
        // 1. Run Technical Audits
        const [robotsJson, sitemapJson] = await Promise.all([
            techAudit.analyzeRobots(project.domain),
            techAudit.analyzeSitemap(project.domain)
        ]);

        // 2. Run AI Audits (Brand + Competitors)
        const scanResults = await promptOrchestrator.performProjectScan(project);
        
        // 3. Aggregate Authority Signals
        const allSignals = scanResults.promptRankings.map(r => r.authoritySignals).filter(Boolean);
        const trainingRecall = Math.round(allSignals.filter(s => s.recallConfidence === 'High' || s.recallConfidence === 'Medium').length / (allSignals.length || 1) * 100);
        
        // Count as "Web Grounded" if the source is not purely internal training
        const webGroundedPercent = Math.round(
            allSignals.filter(s => 
                (s.citations && s.citations.length > 0) || 
                (s.sourceType && !s.sourceType.includes('Internal') && (s.sourceType.includes('Search') || s.sourceType.includes('Web') || s.sourceType.includes('Google')))
            ).length / (allSignals.length || 1) * 100
        );
        
        const uniqueCitations = [...new Set(allSignals.flatMap(s => s.citations || []))].filter(Boolean).slice(0, 10);

        // 4. Calculate refined GEO Health Score (0-100)
        const visibilityScore = scanResults.promptRankings.length > 0
            ? Math.round(scanResults.promptRankings.reduce((a, b) => a + (b.score || 0), 0) / scanResults.promptRankings.length)
            : 0;
        
        // Calculate Engine-Specific Scores
        const engineScores = {
            openai: 0,
            gemini: 0,
            groq: 0
        };
        ['openai', 'gemini', 'groq'].forEach(engine => {
            const engineRankings = scanResults.promptRankings.filter(r => r.engine === engine);
            if (engineRankings.length > 0) {
                engineScores[engine] = Math.round(engineRankings.reduce((a, b) => a + (b.score || 0), 0) / engineRankings.length);
            }
        });

        const techScore = (robotsJson.found ? 50 : 0) + (sitemapJson.found ? 50 : 0);
        const authorityScore = Math.round((trainingRecall + webGroundedPercent) / 2);

        // Balanced Score: 40% Visibility, 30% Tech, 30% Authority
        const overallScore = Math.round((visibilityScore * 0.4) + (techScore * 0.3) + (authorityScore * 0.3));

        const snapshot = await Snapshot.create({
            projectId: project._id,
            date: new Date(),
            overallScore,
            engineScores,
            promptRankings: scanResults.promptRankings.map(r => ({
                ...r,
                linkFound: r.linkFound || false,
                rank: r.rank || 0,
                linkRank: r.linkRank || 0
            })),
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
            summary: `Manual scan for ${project.name} completed. Authority: Training Recall (${trainingRecall}%), Web Grounding (${webGroundedPercent}%).`
        });

        project.lastScanAt = new Date();
        await project.save();

        res.json({ message: 'Scan completed successfully', snapshot });
    } catch (err) {
        logger.error('Error in manual project scan:', err.message);
        res.status(500).json({ error: 'Scan failed' });
    }
};
