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
// Prevents too many simultaneous API calls from crashing OpenAI/Gemini rate limits
// Max 50 scans can run at the same time across ALL users.
// ⚠️ WARNING: 50 concurrent scans require a high-tier OpenAI (Tier 5) / Gemini API Key.
// On Tier 1 (Free/Basic), this will still result in 429 errors from the AI, even if the server is open.
const MAX_CONCURRENT_SCANS = 50;
let activeScans = 0;

const acquireScanSlot = () => {
    if (activeScans >= MAX_CONCURRENT_SCANS) return false;
    activeScans++;
    return true;
};
const releaseScanSlot = () => { if (activeScans > 0) activeScans--; };

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

        // Run scan
        await internalRunProjectScan(project);
        res.json({ message: 'Scan completed successfully' });
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
        logger.info(`🚀 COMPREHENSIVE scan triggered for: ${project.name}`);
        
        // Fix: Clean the domain for specialized services (profiler, tech audit)
        // This ensures things like fetchWebsiteContent don't try to fetch https://https://domain.com
        const domain = project.domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').split('/')[0];
        
        // PHASE 1: Technical & Content Infrastructure (Defensive Parallel)
        const [techResults, readinessResults, profilerContent, brandAuditResults] = await Promise.all([
            // Technical check (Robots/Sitemap)
            (async () => {
                try {
                    return await Promise.all([
                        techAudit.analyzeRobots(domain),
                        techAudit.analyzeSitemap(domain)
                    ]);
                } catch (e) {
                    logger.warn(`Tech Audit sub-phase failed for ${domain}:`, e.message);
                    return [{ found: false, error: e.message }, { found: false, error: e.message }];
                }
            })(),
            // AI Readiness Audit
            (async () => {
                try {
                    return await aiReadinessService.analyzeWebsite(domain);
                } catch (e) {
                    logger.warn(`AI Readiness sub-phase failed for ${domain}:`, e.message);
                    return { error: e.message, method: 'failed' };
                }
            })(),
            // Fetch content for Profiler
            (async () => {
                try {
                    return await profilerService.fetchWebsiteContent(domain);
                } catch (e) {
                    logger.warn(`Profiler fetch sub-phase failed for ${domain}:`, e.message);
                    return { error: e.message, isNotFound: true };
                }
            })(),
            // Brand Audit (Knowledge Graph)
            (async () => {
                try {
                    return await fetchKnowledgeGraphFull(project.brandName || project.name);
                } catch (e) {
                    logger.warn(`Brand Audit sub-phase failed for ${project.brandName}:`, e.message);
                    return null;
                }
            })()
        ]);

        const [robotsJson, sitemapJson] = techResults;

        // PHASE 2: MULTI-MODEL INTERNAL AUDIT (Defensive Parallel)
        const [scanResults, synthesisResults, liveAuditResults, auditProfile, auditModelResults] = await Promise.all([
            // 1. Visibility Audit (Brand + Competitors — typically uses Search)
            (async () => {
                try {
                    return await promptOrchestrator.performProjectScan(project);
                } catch (e) {
                    logger.error(`Visibility Audit phase failed for ${project.name}:`, e.message);
                    return { promptRankings: [], competitorRankings: [], customPromptResults: [], error: e.message };
                }
            })(),
            // 2. Domain Profiler (Synthesis)
            (async () => {
                try {
                    return await profilerService.analyzeDomainMulti(domain, profilerContent);
                } catch (e) {
                    logger.error(`Domain Profiler phase failed for ${domain}:`, e.message);
                    return { brandType: 'Unknown', error: e.message };
                }
            })(),
            // 3. Web search (Live Brand Mentions)
            (async () => {
                try {
                    return await runLiveAudit(project.brandName);
                } catch (e) {
                    logger.error(`Live Brand Audit phase failed for ${project.brandName}:`, e.message);
                    return { citations: [], mentions: [] };
                }
            })(),
            // 4. Independent Audit Profile (for Visibility Audit tool)
            (async () => {
                try {
                    return await aiOrchestrator.getStructuredProfile(project.brandName);
                } catch (e) {
                    logger.error(`Structured Profile phase failed for ${project.brandName}:`, e.message);
                    return { summary: 'Profile generation failed.', error: e.message };
                }
            })(),
            // 5. Independent Model Results (for Visibility Audit tool engine cards)
            (async () => {
                try {
                    return await aiOrchestrator.broadcastQuery(project.brandName);
                } catch (e) {
                    logger.error(`Broadcast Query phase failed for ${project.brandName}:`, e.message);
                    return [];
                }
            })()
        ]);

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
        const webGroundedPercent = Math.round(
            allSignals.filter(s => 
                (s.citations && s.citations.length > 0) || 
                (s.sourceType && !s.sourceType.includes('Internal'))
            ).length / (allSignals.length || 1) * 100
        );
        const uniqueCitations = [...new Set(allSignals.flatMap(s => s.citations || []))].filter(Boolean).slice(0, 10);

        // Engine-Specific Scores (Live Search based)
        const engineScores = { openai: 0, gemini: 0 };
        const foundPrompts = new Set();
        
        ['openai', 'gemini'].forEach(engine => {
            const engineRankings = scanResults.promptRankings.filter(r => r.engine === engine);
            if (engineRankings.length > 0) {
                const negPhrases = ['not found', 'not visible', 'does not appear', 'does not rank', 'not organically visible', 'is not present', 'no mention'];
                const validRankings = engineRankings.map(r => {
                    const snippetL = (r.snippet || '').toLowerCase();
                    const brandL = project.brandName.toLowerCase();
                    const isNeg = negPhrases.some(p => snippetL.includes(p));
                    const snippetMatch = snippetL.includes(brandL) && !isNeg;
                    const isFound = r.found || r.rank > 0 || snippetMatch;
                    if (isFound) foundPrompts.add(r.prompt);
                    let score = r.score || 0;
                    if (isFound && score < 60) score = 60;
                    return { ...r, score, isFound };
                });
                engineScores[engine] = Math.round(validRankings.reduce((a, b) => a + b.score, 0) / validRankings.length);
            }
        });

        // 🟢 WEIGHTED VISIBILITY CALCULATION (Fix: Avoid Blind Average Dilution)
        // We give 2x weight to prompts where the brand is actually FOUND.
        // This rewards discovery while still acknowledging gaps.
        let totalWeightedScore = 0;
        let totalWeights = 0;

        const negPhrasesOverall = ['not found', 'not visible', 'does not appear', 'does not rank', 'not organically visible', 'is not present', 'no mention'];
        scanResults.promptRankings.forEach(r => {
            const snippetL = (r.snippet || '').toLowerCase();
            const brandL = project.brandName.toLowerCase();
            const isNeg = negPhrasesOverall.some(p => snippetL.includes(p));
            const snippetMatch = snippetL.includes(brandL) && !isNeg;
            const isFound = r.found || r.rank > 0 || snippetMatch;
            const score = isFound ? Math.max(r.score, 60) : (r.score || 0);
            const weight = isFound ? 2 : 1; // Double weight for "wins"
            
            totalWeightedScore += (score * weight);
            totalWeights += weight;
        });

        const visibilityScore = totalWeights > 0 
            ? Math.round(totalWeightedScore / totalWeights) 
            : 0;

        const techScore = (robotsJson.found ? 50 : 0) + (sitemapJson.found ? 50 : 0);
        
        // Authority logic: prioritize reach over bulk
        const reachPercent = Math.round((foundPrompts.size / (project.prompts.length || 1)) * 100);
        const authorityScore = Math.round((trainingRecall * 0.4) + (webGroundedPercent * 0.3) + (reachPercent * 0.3));

        // Final Aggregate GEO Health Score (Project Overview)
        const overallScore = Math.round((visibilityScore * 0.4) + (techScore * 0.3) + (authorityScore * 0.3));

        // ---------------------------------------------------------
        // PHASE 5: Save Snapshot
        // ---------------------------------------------------------
        
        // *** INTERNAL AUDIT PROFILE RECONCILIATION ***
        // Detect hallucinations in the audit profile
        const isInternalAuditFound = (model) => {
            if (!model) return false;
            const status = (model.brandStatus || '').toLowerCase();
            const foundFlag = model.entityRecognition?.found;
            return !status.includes('not found') && foundFlag !== false;
        };

        // Calculate audit-specific score (strictly internal knowledge)
        const auditScores = [];
        Object.keys(auditModelResults).forEach(key => {
            const m = auditModelResults[key];
            if (isInternalAuditFound(m)) {
                auditScores.push(m.aiVisibilityAssessment?.visibilityScore || 15);
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
            competitorRankings: scanResults.competitorRankings,
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

        project.lastScanAt = new Date();
        await project.save();
        return snapshot;
    } catch (err) {
        logger.error(`Error in background project scan (${project._id}):`, err.message);
        throw err;
    }
};

// @desc    Run full comprehensive scan
// @route   POST /api/projects/:id/sync
// @access  Private
exports.runProjectSync = async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ error: 'Invalid project ID format' });
        }
        const project = await Project.findOne({ _id: req.params.id, userId: req.user._id });

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        logger.info(`🔄 [SYNC-TRIGGER] Starting manual comprehensive scan for: ${project.name}`);
        const snapshot = await internalRunProjectScan(project);
        
        res.json({ message: 'Comprehensive scan completed successfully', snapshot });
    } catch (err) {
        logger.error('Error in manual comprehensive scan:', err.message);
        res.status(500).json({ error: 'Comprehensive scan failed: ' + err.message });
    }
};

// EXPORT FOR CRON JOBS
exports.internalRunProjectScan = internalRunProjectScan;
