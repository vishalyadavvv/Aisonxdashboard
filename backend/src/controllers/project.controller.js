const mongoose = require('mongoose');
const Project = require('../models/Project');
const Snapshot = require('../models/Snapshot');
const promptOrchestrator = require('../services/ai_internal/promptOrchestrator');
const aiOrchestrator = require('../services/ai_internal/aiOrchestrator');
const techAudit = require('../services/techAudit.service');
const profilerService = require('../services/profiler.service');
const aiReadinessService = require('../services/aiReadiness.service');
const { runLiveAudit, profileAIInterceptor } = require('../services/ai_live/live.orchestrator');
const { fetchKnowledgeGraphFull } = require('../services/externalEntity.service');
const logger = require('../utils/logger');

// ─── SCAN CONCURRENCY LIMITER ─────────────────────────────────────────────────
// On a 1GB server, only 2 scans should ever run at the same time.
// Each scan triggers 5+ heavy AI API calls — more than 2 = OOM crash.
const MAX_CONCURRENT_SCANS = 2;
let activeScans = 0;

const acquireScanSlot = () => {
    if (activeScans >= MAX_CONCURRENT_SCANS) return false;
    activeScans++;
    return true;
};
const releaseScanSlot = () => { if (activeScans > 0) activeScans--; };

// ─── GLOBAL GEMINI RATE LIMITER ───────────────────────────────────────────────
// Ensures no two Gemini calls fire within 2 seconds of each other server-wide.
let lastGeminiCallTime = 0;
async function safeGeminiCall(fn) {
    const now = Date.now();
    const timeSinceLast = now - lastGeminiCallTime;
    if (timeSinceLast < 2000) {
        await new Promise(r => setTimeout(r, 2000 - timeSinceLast));
    }
    lastGeminiCallTime = Date.now();
    return fn();
}
exports.safeGeminiCall = safeGeminiCall;

// Helper to get project limit by tier
const getProjectLimit = (tier) => {
    switch (tier) {
        case 'professional': return 20;
        case 'growth': return 5;
        case 'starter': return 2;
        default: return 1; // Free Trial (none)
    }
};

// Helper to get prompt limit by tier
const getPromptLimit = (tier) => {
    switch (tier) {
        case 'professional': return 25;
        case 'growth': return 10;
        case 'starter': return 2;
        default: return 2; // Free Trial (none) gets 2 prompts
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

        // 1. Check Project Quantity Limits
        const projectCount = await Project.countDocuments({ userId: req.user._id });
        const projectLimit = getProjectLimit(req.user.subscription?.tier);
        
        if (projectCount >= projectLimit) {
            return res.status(403).json({ 
                error: `Project limit reached. Your ${req.user.subscription?.tier || 'Free'} plan allows only ${projectLimit} projects.` 
            });
        }

        // 2. Check Prompt Limits
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
            targetEngines: targetEngines || ['openai', 'gemini'],
            market: market || { name: 'Global', code: 'GLB', type: 'global' }
        });

        // Trigger AI Scan in the background immediately
        logger.info(`🚀 [AUTO-SCAN] Triggering background scan for new project: ${project.name}`);
        internalRunProjectScan(project).catch(err => {
            logger.error(`❌ [AUTO-SCAN] Background scan failed for ${project.name}:`, err.message);
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

// @desc    Run immediate project scan (Comprehensive)
// @route   POST /api/projects/:id/scan
// @access  Private
exports.runProjectScan = async (req, res) => {
    // Check if scan slots are available
    if (!acquireScanSlot()) {
        return res.status(429).json({ 
            error: 'System Busy',
            message: 'Our AI systems are currently at capacity. Please wait 30-60 seconds and try again.'
        });
    }

    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            releaseScanSlot();
            return res.status(400).json({ error: 'Invalid project ID format' });
        }
        const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });

        if (!project) {
            releaseScanSlot();
            return res.status(404).json({ error: 'Project not found' });
        }

        // Prevent overlapping scans if already in progress
        if (project.isScanning) {
            releaseScanSlot();
            return res.status(400).json({ 
                error: 'Scan in progress', 
                message: 'A comprehensive scan is already running for this project. Please wait for it to complete.' 
            });
        }

        // Set scanning flag IMMEDIATELY and await it before responding to client
        // This prevents the race condition where the client refreshes before the background task saves the flag
        project.isScanning = true;
        await project.save();

        // Start background execution (non-blocking) - flag is already set
        internalRunProjectScan(project);

        res.json({ message: 'Intelligence assembly initiated. Scan running in background.', isScanning: true });
    } catch (err) {
        logger.error('Error running project scan:', err.message);
        res.status(500).json({ error: 'Scan failed', message: 'Something went wrong during the scan. Please try again.' });
    } finally {
        releaseScanSlot();
    }
};

// Internal helper to run comprehensive project scans (reusable)
const internalRunProjectScan = async (project) => {
    try {
        project.isScanning = true;
        await project.save();
        logger.info(`🚀 [SCAN-START] COMPREHENSIVE scan triggered for: ${project.name}`);
        
        // Fix: Clean the domain for specialized services (profiler, tech audit)
        // This ensures things like fetchWebsiteContent don't try to fetch https://https://domain.com
        const domain = project.domain.replace(/^(https?:\/\/)+/, '').replace(/^www\.(https?:\/\/)/i, '').replace(/^www\./, '').replace(/\/$/, '').split('/')[0];
        
        // PHASE 1: Technical Infrastructure (Sequential — low memory, no AI calls)
        logger.info(`🔄 [PHASE-1] Running technical checks for ${domain}...`);
        let techResults = [{ found: false }, { found: false }];
        let readinessResults = { error: 'skipped', method: 'failed' };
        let profilerContent = { error: 'skipped', isNotFound: true };
        let brandAuditResults = null;

        try { techResults = await Promise.all([techAudit.analyzeRobots(domain), techAudit.analyzeSitemap(domain)]); }
        catch (e) { logger.warn(`Tech Audit failed for ${domain}:`, e.message); }

        try { readinessResults = await aiReadinessService.analyzeWebsite(domain); }
        catch (e) { logger.warn(`AI Readiness failed for ${domain}:`, e.message); }

        try { profilerContent = await profilerService.fetchWebsiteContent(domain); }
        catch (e) { logger.warn(`Profiler fetch failed for ${domain}:`, e.message); }

        try { brandAuditResults = await fetchKnowledgeGraphFull(project.brandName || project.name); }
        catch (e) { logger.warn(`Brand Audit failed for ${project.brandName}:`, e.message); }

        const [robotsJson, sitemapJson] = techResults;

        // PHASE 2: AI CALLS — fully sequential to protect the 1GB server
        // Each await completes before the next starts. No parallel Gemini calls.
        logger.info(`🔄 [PHASE-2] Running Visibility Audit for ${project.name}...`);
        let scanResults = { promptRankings: [], competitorRankings: [], customPromptResults: [] };
        try { scanResults = await promptOrchestrator.performProjectScan(project); }
        catch (e) { logger.error(`Visibility Audit failed for ${project.name}:`, e.message); }

        logger.info(`🔄 [PHASE-3] Running Domain Profiler for ${domain}...`);
        let synthesisResults = { brandType: 'Unknown' };
        try { synthesisResults = await profilerService.analyzeDomainMulti(domain, profilerContent); }
        catch (e) { logger.error(`Domain Profiler failed for ${domain}:`, e.message); }

        logger.info(`🔄 [PHASE-4] Running Live Brand Audit for ${project.brandName}...`);
        let liveAuditResults = { citations: [], mentions: [] };
        try { liveAuditResults = await runLiveAudit(project.brandName); }
        catch (e) { logger.error(`Live Brand Audit failed for ${project.brandName}:`, e.message); }

        logger.info(`🔄 [PHASE-5] Running Structured Profile for ${project.brandName}...`);
        let auditProfile = { summary: 'Profile generation failed.' };
        try { auditProfile = await aiOrchestrator.getStructuredProfile(project.brandName); }
        catch (e) { logger.error(`Structured Profile failed for ${project.brandName}:`, e.message); }

        logger.info(`🔄 [PHASE-6] Running Broadcast Query for ${project.brandName}...`);
        let auditModelResults = [];
        try { auditModelResults = await aiOrchestrator.broadcastQuery(project.brandName); }
        catch (e) { logger.error(`Broadcast Query failed for ${project.brandName}:`, e.message); }

        // ---------------------------------------------------------
        // PHASE 3: Web Mentions Profile (Synthesis)
        // ---------------------------------------------------------
        const mentionsProfile = await profileAIInterceptor(project.brandName, liveAuditResults);

        // ---------------------------------------------------------
        // PHASE 4: Score Aggregation
        // ---------------------------------------------------------
        
        // Authority Signals Calculation
        const allSignals = scanResults.promptRankings.map(r => r.authoritySignals).filter(Boolean);
        const trainingRecall = Math.round(allSignals.filter(s => s.recallConfidence === 'High' || s.recallConfidence === 'Medium').length / (allSignals.length || 1) * 100);
        // FIX: Only count results that have ACTUAL citation URLs as "web grounded"
        // Previously, ANY web-search-sourced result was counted even if brand wasn't found
        const webGroundedPercent = Math.round(
            allSignals.filter(s => s.citations && s.citations.length > 0).length / (allSignals.length || 1) * 100
        );
        const uniqueCitations = [...new Set(allSignals.flatMap(s => s.citations || []))].filter(Boolean).slice(0, 10);

        // Engine-Specific Scores (Live Search based)
        const engineScores = { openai: 0, gemini: 0 };
        const foundPrompts = new Set();
        
        ['openai', 'gemini'].forEach(engine => {
            const engineRankings = scanResults.promptRankings.filter(r => r.engine === engine);
            if (engineRankings.length > 0) {
                const negPhrases = ['not found at all', 'completely missing', 'no information available', 'not recognized as a brand'];
                const validRankings = engineRankings.map(r => {
                    const snippetL = (r.snippet || '').toLowerCase();
                    const brandL = project.brandName.toLowerCase();
                    
                    // A brand is found if it has a rank, a found flag, OR is mentioned in the snippet without a definitive "not found at all" phrase
                    const isNegTerm = negPhrases.some(p => snippetL.includes(p));
                    const snippetMatch = snippetL.includes(brandL) && !isNegTerm;
                    const isFound = r.found || (r.rank > 0) || snippetMatch;
                    
                    if (isFound) foundPrompts.add(r.prompt);
                    
                    let score = r.score || 0;
                    // Ensure a minimum score for any verified/ranked presence
                    if (isFound && score < 15) score = 15; 
                    if (r.rank > 0 && score < 60) score = 60; // Genuinely ranked wins get base 60
                    
                    return { ...r, score, isFound };
                });
                engineScores[engine] = Math.round(validRankings.reduce((a, b) => a + b.score, 0) / validRankings.length);
            }
        });

        // 🟢 CONSENSUS VISIBILITY CALCULATION (Fix: Avoid Inflated Scores)
        // Instead of weighting "Found" results, we now calculate a strict average 
        // across all models to ensure that failures (0%) are accurately reflected.
        const modelScores = [];
        const engines = ['openai', 'gemini'];
        
        engines.forEach(engine => {
            const engineRankings = scanResults.promptRankings.filter(r => r.engine === engine);
            if (engineRankings.length > 0) {
                const totalModelScore = engineRankings.reduce((sum, r) => {
                    const snippetL = (r.snippet || '').toLowerCase();
                    const brandL = project.brandName.toLowerCase();
                    const negPhrases = ['not found at all', 'completely missing', 'no information available', 'not recognized as a brand'];
                    const isNegTerm = negPhrases.some(p => snippetL.includes(p));
                    const snippetMatch = snippetL.includes(brandL) && !isNegTerm;
                    const isFound = r.found || (r.rank > 0) || snippetMatch;
                    
                    if (isFound) foundPrompts.add(r.prompt);
                    
                    let score = (r.rank > 0) ? Math.max(r.score, 60) : (isFound ? Math.max(r.score, 15) : 0);
                    return sum + score;
                }, 0);
                modelScores.push(Math.round(totalModelScore / engineRankings.length));
            }
        });

        const visibilityScore = modelScores.length > 0 
            ? Math.round(modelScores.reduce((a, b) => a + b, 0) / modelScores.length) 
            : 0;

        const techScore = (robotsJson.found ? 50 : 0) + (sitemapJson.found ? 50 : 0);
        
        // Authority logic: prioritize reach over bulk
        const reachPercent = Math.round((foundPrompts.size / (project.prompts.length || 1)) * 100);
        const authorityScore = Math.round((trainingRecall * 0.4) + (webGroundedPercent * 0.3) + (reachPercent * 0.3));

        // Final Aggregate GEO Health Score (Project Overview)
        // CRITICAL FIX: Scale tech & authority contribution proportionally to visibility
        // Rationale: Having good robots.txt is meaningless if the brand is invisible to AI
        // When visibility=0% → GEO score ≈ 0% (honest, not inflated by tech infra)
        // When visibility=80% → tech & authority provide full bonus (rewarding good infra)
        const visibilityRatio = visibilityScore / 100; // 0.0 to 1.0
        const overallScore = Math.round(
            (visibilityScore * 0.6) + 
            (techScore * 0.2 * visibilityRatio) + 
            (authorityScore * 0.2 * visibilityRatio)
        );

        // ---------------------------------------------------------
        // PHASE 5: Save Snapshot
        // ---------------------------------------------------------
        
        // *** INTERNAL AUDIT PROFILE RECONCILIATION ***
        // Detect hallucinations in the audit profile
        const isInternalAuditFound = (model) => {
            if (!model || model.status === 'failed' || model.error) return false;
            const status = (model.brandStatus || '').toLowerCase();
            const foundFlag = model.entityRecognition?.found;
            return !status.includes('not found') && foundFlag !== false;
        };

        // Calculate audit-specific score (strictly internal knowledge)
        const auditScores = [];
        Object.keys(auditModelResults).forEach(key => {
            const m = auditModelResults[key];
            if (!m || m.status === 'failed' || m.error) {
                return; // Skip failed models completely so they don't drag the average down
            }
            if (isInternalAuditFound(m)) {
                let score = m.aiVisibilityAssessment?.visibilityScore;
                if (score === undefined || score === null) score = m.visibilityScore;
                if (score === undefined || score === null) score = m.sentimentScore;
                auditScores.push(Number(score) || 15);
            } else {
                auditScores.push(0);
            }
        });
        const internalAuditScore = auditScores.length > 0 
            ? Math.round(auditScores.reduce((a, b) => a + b, 0) / auditScores.length)
            : 0;

        // Build Visibility Audit (Group by Engine for the primary prompt)
        const visibilityAudit = {
            brandName: project.brandName,
            domain: project.domain,
            overallScore: internalAuditScore, // Replaced with strictly internal score
            summary: auditProfile?.summary || `Internal knowledge base exploration complete. Visibility: ${internalAuditScore}%`,
            profile: {
                ...auditProfile,
                visibilityScore: internalAuditScore,
                aiVisibilityAssessment: {
                    ...auditProfile?.aiVisibilityAssessment,
                    overallLevel: internalAuditScore >= 70 ? 'High' : (internalAuditScore >= 40 ? 'Moderate' : 'Low'),
                    interpretation: auditProfile?.interpretation || `Brand awareness index computed from native LLM training data.`
                }
            }
        };
        
        // Map individual engine cards from the dedicated internal audit results
        ['openai', 'gemini'].forEach(engine => {
            const internalResult = auditModelResults[engine];
            if (internalResult) {
                visibilityAudit[engine] = {
                    ...internalResult,
                    score: internalResult.aiVisibilityAssessment?.visibilityScore || 0,
                    found: isInternalAuditFound(internalResult)
                };
            }
        });

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
            competitorRankings: (scanResults.competitorRankings || []).map(cr => {
                const cleanDomain = (cr.competitorDomain || '').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
                
                // 🚀 COMPETITOR SCORE BOOSTING (Same as Brand)
                // If AI found them but didn't give a score, provide a verified baseline
                let finalScore = cr.score || 0;
                if ((cr.found || cr.rank > 0) && finalScore < 15) finalScore = 15;
                if (cr.rank > 0 && finalScore < 60) finalScore = 60;

                return {
                    ...cr,
                    score: finalScore,
                    competitorDomain: cleanDomain
                };
            }),
            customPromptResults: scanResults.customPromptResults,
            
            // New Tool Data
            domainSynthesis: synthesisResults,
            aiReadiness: readinessResults,
            webMentions: {
                score: mentionsProfile.visibilityScore || 0,
                profile: mentionsProfile,
                rawResults: liveAuditResults
            },
            visibilityAudit,
            authoritySignals: {
                trainingRecall,
                webGroundedRecency: webGroundedPercent,
                topCitations: uniqueCitations.map(c => ({ source: c, type: 'Web', relevance: 100 }))
            },
            technicalAudit: {
                robotsValid: robotsJson.found,
                sitemapFound: sitemapJson.found,
                schemaCount: readinessResults.technicalSignals?.structuredData?.schemaTypes?.length || 0, 
                pageSpeedScore: 0 
            },
            summary: visibilityAudit.summary,
            brandAudit: brandAuditResults || null
        });

        // 🚀 AUTO-CORRECT COMPETITOR DOMAINS
        // If AI returns a domain that differs from our record, and that AI result had a high score, update it.
        const competitorUpdates = [];
        (scanResults.competitorRankings || []).forEach(cr => {
            if (!cr.competitorDomain || cr.score < 40) return;
            
            const existingComp = project.competitors.find(c => 
                c.name.toLowerCase() === cr.competitorName?.toLowerCase() ||
                (c.domain && c.domain.toLowerCase().replace(/^https?:\/\/(www\.)?/, '') === cr.competitorDomain.toLowerCase().replace(/^https?:\/\/(www\.)?/, ''))
            );

            if (existingComp) {
                const newD = cr.competitorDomain.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').trim();
                const oldD = existingComp.domain ? existingComp.domain.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').trim() : '';
                if (newD && newD !== oldD && !newD.includes('google.com') && !newD.includes('openai.com')) {
                    existingComp.domain = newD;
                    competitorUpdates.push(`${existingComp.name}: ${oldD || 'None'} -> ${newD}`);
                }
            }
        });

        if (competitorUpdates.length > 0) {
            logger.info(`✅ [AUTO-CORRECT] Updated ${competitorUpdates.length} competitor domains: ${competitorUpdates.join(', ')}`);
        }

        project.lastScanAt = new Date();
        project.isScanning = false;
        await project.save();
        logger.info(`✅ [SCAN-COMPLETE] Completed background scan for: ${project.name}`);
        return snapshot;
    } catch (err) {
        logger.error(`❌ [SCAN-ERROR] Background project scan failed for ${project.name}:`, err.message);
        throw err;
    } finally {
        // Ensure flag is reset even on crash
        try {
            const p = await Project.findById(project._id);
            if (p && p.isScanning) {
                p.isScanning = false;
                await p.save();
            }
        } catch (e) {
            logger.error(`⚠️ Failed to reset isScanning flag for ${project._id}:`, e.message);
        }
    }
};

// @desc    Run full comprehensive scan
// @route   POST /api/projects/:id/sync
// @access  Private
exports.runProjectSync = async (req, res) => {
    // Check if scan slots are available
    if (!acquireScanSlot()) {
        return res.status(429).json({ 
            error: 'System Busy',
            message: 'Our AI systems are currently at capacity. Please wait 30-60 seconds and try again.'
        });
    }
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            releaseScanSlot();
            return res.status(400).json({ error: 'Invalid project ID format' });
        }
        const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });

        if (!project) {
            releaseScanSlot();
            return res.status(404).json({ error: 'Project not found' });
        }
        
        // Prevent overlapping scans
        if (project.isScanning) {
            releaseScanSlot();
            return res.status(400).json({ 
                error: 'Scan in progress', 
                message: 'A comprehensive scan is already running for this project. Please wait for it to complete.' 
            });
        }

        logger.info(`🔄 [SYNC-TRIGGER] Starting manual background sync for: ${project.name}`);
        
        // Set flag and await it before response
        project.isScanning = true;
        await project.save();

        // Start background execution (non-blocking)
        internalRunProjectScan(project).finally(() => releaseScanSlot());
        
        res.json({ message: 'Intelligence assembly initiated. Scan running in background.', isScanning: true });
    } catch (err) {
        logger.error('Error in manual background sync trigger:', err.message);
        res.status(500).json({ error: 'Failed to initiate sync: ' + err.message });
    }
};

// EXPORT FOR CRON JOBS
exports.internalRunProjectScan = internalRunProjectScan;
