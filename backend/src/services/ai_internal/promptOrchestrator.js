const geminiInternal = require('./gemini.service');
const openaiInternal = require('./openai.service');
// const groqInternal = require('./groq.service');
const logger = require('../../utils/logger');

// Live Services
const { 
    gptPromptAudit, 
    gptBatchPromptAudit, 
    gptCompetitiveBatchAudit,
    geminiPromptAudit, 
    geminiCompetitiveAudit,
    gptSearchCompetitors, 
    geminiSearchCompetitors 
} = require('../ai_live/projectAuditor');
const { cleanUrl } = require('../../utils/urlCleaner');
const { robustParseJSON } = require('../../utils/jsonParser');

/**
 * PromptOrchestrator
 * Specifically designed to measure "Rank" and "Recommendation Share" 
 * for a brand against specific prompts in AI models.
 */

async function analyzePromptRanking(brandName, domain, promptText, market = { name: 'Global' }, modelName = 'openai', useLiveSearch = true) {
    try {
        let audit;
        
        if (useLiveSearch) {
            if (modelName === 'openai') {
                audit = await gptPromptAudit(brandName, domain, promptText, market);
            } else if (modelName === 'gemini') {
                audit = await geminiPromptAudit(brandName, domain, promptText, market);
            }
        }

        // Fallback to internal knowledge if live search fails, is disabled, or for Groq
        if (!audit) {
    const prompt = `
ROLE: You are an EXPERT Search Visibility & Market Analyst.
TASK: Analyze the presence of "${brandName}" (${domain}) in your internal knowledge/training data for the query: "${promptText}".

INSTRUCTIONS:
1. ⚠️ KNOWLEDGE RECALL: Specifically look for ${brandName}'s association with this niche in the ${market.name} market.
2. 🚨 DATA INTEGRITY: Provide a REALISTIC assessment. If they are an established player, recognize their status.
3. 🚨 RICH SNIPPETS: Snippets MUST be 1-2 detailed sentences (max 60 words).
4. 🚨 SCORING: Provide Rank 0-10 and Score 0-100.
5. OUTPUT FORMAT (JSON):
{
  "prompt": "${promptText}",
  "brandRanking": { "rank": 1-10 (0 if unknown), "score": 0-100, "isRecommended": true/false, "linkProvided": true/false, "snippet": "Detailed factual info" },
  "authoritySignals": { "sourceType": "Expert Analysis", "recallConfidence": "High|Medium|Low", "citations": [] }
}
`;
            let response;
            if (modelName === 'openai') response = await openaiInternal.fetchOpenAI(prompt, true);
            else if (modelName === 'gemini') response = await geminiInternal.fetchGemini(prompt, true);
            // else if (modelName === 'groq') response = await groqInternal.fetchGroq(prompt, true);

            if (response) {
                audit = robustParseJSON(response);
                if (audit && audit.authoritySignals?.citations) {
                    audit.authoritySignals.citations = audit.authoritySignals.citations.map(cleanUrl).filter(Boolean);
                }
            }
        }

        return audit || {
            prompt: promptText,
            brand: brandName,
            isRecommended: false,
            linkMentioned: false,
            recommendationRank: 0,
            linkRank: 0,
            visibilityLevel: 'None',
            score: 0,
            error: true
        };
    } catch (err) {
        logger.error(`Error in Prompt Audit (${modelName}):`, err.message);
        return {
            prompt: promptText,
            brand: brandName,
            isRecommended: false,
            linkMentioned: false,
            recommendationRank: 0,
            linkRank: 0,
            visibilityLevel: 'None',
            score: 0,
            error: true
        };
    }
}

async function analyzeCustomPrompt(brandName, domain, customPromptText, engine = 'openai') {
    const prompt = `
ROLE: You are an AI Search Visibility Auditor.
USER QUERY: "${customPromptText}"
TARGET BRAND: "${brandName}"
WEBSITE: "${domain}"

TASK: Analyze your own internal response to this user query with HIGH accuracy.
1. Does "${brandName}" (or their website ${domain}) appear in your response to this query? (brandMentioned: true/false)
2. What is the sentiment towards "${brandName}"? (Positive/Neutral/Negative)

🚨 DATA INTEGRITY: DO NOT hallucinate. Only report a mention if you are 100% sure the brand or domain is explicitly or implicitly identified in the results.

OUTPUT FORMAT (JSON ONLY):
{
  "brandMentioned": true/false,
  "sentiment": "Positive|Neutral|Negative",
  "reasoning": "1-2 detailed sentences explaining why, specifically identifying evidence for ${brandName} or ${domain}. Max 60 words."
}
`;
    try {
        let response;
        if (engine === 'openai') response = await openaiInternal.fetchOpenAI(prompt, true);
        else if (engine === 'gemini') response = await geminiInternal.fetchGemini(prompt, true);
        // else if (engine === 'groq') response = await groqInternal.fetchGroq(prompt, true);

        if (!response) return { brandMentioned: false, sentiment: 'Neutral', error: true };

        const jsonMatch = response.match(/\{[\s\S]*\}/);
        return JSON.parse(jsonMatch[0]);
    } catch (err) {
        return { brandMentioned: false, sentiment: 'Neutral', error: true };
    }
}

async function discoverCompetitors(brandName, domain, market = { name: 'Global' }) {
    try {
        logger.info(`🔍 [DISCOVERY] Researching rivals for ${brandName} in ${market.name} using Multi-Engine Live Search...`);
        
        let allRivals = [];
        try {
            const [gptRivals, geminiRivals] = await Promise.all([
                gptSearchCompetitors(brandName, domain, market),
                geminiSearchCompetitors(brandName, domain, market)
            ]);
            allRivals = [...(gptRivals || []), ...(geminiRivals || [])];
        } catch (parallelErr) {
            logger.warn(`⚠️ [DISCOVERY] Parallel search failed, trying sequentially for ${brandName}...`);
            const gptRivals = await gptSearchCompetitors(brandName, domain, market).catch(() => []);
            const geminiRivals = await geminiSearchCompetitors(brandName, domain, market).catch(() => []);
            allRivals = [...(gptRivals || []), ...(geminiRivals || [])];
        }

        // Merge and deduplicate by domain
        const uniqueMap = new Map();
        
        allRivals.forEach(r => {
            if (r.domain && r.domain !== domain) {
                const cleanD = r.domain.toLowerCase().replace('www.', '').trim();
                if (!uniqueMap.has(cleanD)) {
                    uniqueMap.set(cleanD, r);
                }
            }
        });

        const discovered = Array.from(uniqueMap.values()).slice(0, 5);
        
        if (discovered.length > 0) {
            logger.info(`✅ [DISCOVERY] Found ${discovered.length} unique rivals via search`);
            return discovered;
        } else {
            logger.warn(`⚠️ [DISCOVERY] No rivals found for ${brandName} after fallback attempts`);
            return [];
        }
    } catch (err) {
        logger.error(`❌ [DISCOVERY] Fatal error for ${brandName}:`, err.message);
        return [];
    }
}

/**
 * Helper: Run an array of task functions with a concurrency limit.
 */
async function runWithLimit(tasks, limit = 5) {
    const results = [];
    const executing = new Set();
    for (const task of tasks) {
        const p = Promise.resolve().then(() => task());
        results.push(p);
        executing.add(p);
        p.finally(() => executing.delete(p));
        if (executing.size >= limit) {
            await Promise.race(executing);
        }
    }
    return Promise.all(results);
}

/**
 * Scans a brand across multiple prompts and engines
 */
exports.performProjectScan = async (project) => {
    const results = {
        promptRankings: [],
        competitorRankings: [],
        customPromptResults: []
    };
    const engines = project.targetEngines && project.targetEngines.length > 0 ? project.targetEngines : ['openai', 'gemini'];
    const brandName = project.brandName || project.name;
    const domain = project.domain;
    const market = project.market || { name: 'Global', type: 'global' };
    
    // 0. Auto-Discover Competitors if empty
    if (!project.competitors || project.competitors.length === 0) {
        logger.info(`🔍 Discovery: No competitors set for ${project.name}. Running AI discovery in ${market.name}...`);
        const discovered = await discoverCompetitors(brandName, domain, market);
        if (discovered && discovered.length > 0) {
            project.competitors = discovered;
            await project.save();
            logger.info(`✅ Discovery: Found ${discovered.length} competitors: ${discovered.map(c => c.name).join(', ')}`);
        }
    }

    // 1. Competitive Audits — OpenAI & Gemini (The "Battle View")
    // These calls evaluate the brand and rivals in the same search context.
    
    // 1.1 OpenAI Competitive Audit (with Smart Fallback)
    if (engines.includes('openai')) {
        logger.info(`🔄 [COMPETITIVE] Running OpenAI Battle View for ${project.prompts.length} prompts in ${market.name}...`);
        
        let compResults = await gptCompetitiveBatchAudit(brandName, domain, project.competitors, project.prompts, market);
        
        // --- FALLBACK: If OpenAI is exhausted, use Gemini to simulate the OpenAI perspective ---
        if (!compResults || compResults.length === 0) {
            logger.warn(`⚠️ [COMPETITIVE] OpenAI failed for ${project.name}. Initiating Gemini-Surrogate for OpenAI slot...`);
            const tasks = project.prompts.map(promptText => () => 
                geminiCompetitiveAudit(brandName, domain, project.competitors, promptText, market)
            );
            const surrogateResults = (await runWithLimit(tasks, 3)).filter(Boolean);
            
            if (surrogateResults.length > 0) {
                compResults = surrogateResults.map(r => ({
                    ...r,
                    authoritySignals: { 
                        ...r.authoritySignals, 
                        sourceType: 'Gemini (OpenAI Surrogate)',
                        isSurrogate: true 
                    }
                }));
            }
        }
        
        if (compResults && Array.isArray(compResults) && compResults.length > 0) {
            for (const audit of compResults) {
                if (!audit || !audit.brandRanking) continue;
                
                const isRanked = audit.brandRanking.rank > 0;
                results.promptRankings.push({
                    prompt: audit.prompt || '',
                    engine: 'openai',
                    visibility: isRanked ? (audit.brandRanking.rank <= 3 ? 'High' : 'Moderate') : 'None',
                    found: isRanked || (audit.brandRanking.isRecommended === true && audit.brandRanking.rank > 0),
                    linkFound: audit.brandRanking.linkProvided || false,
                    rank: audit.brandRanking.rank || 0,
                    linkRank: audit.brandRanking.rank || 0,
                    score: audit.brandRanking.score || 0,
                    snippet: audit.brandRanking.snippet || '',
                    citations: audit.authoritySignals?.citations || [],
                    authoritySource: audit.authoritySignals?.sourceType || 'OpenAI Search (Fallback)',
                    authoritySignals: audit.authoritySignals || { sourceType: 'Comparison', citations: [] }
                });

                // Map Competitor Results
                if (audit.competitorRankings) {
                    for (const cr of audit.competitorRankings) {
                        results.competitorRankings.push({
                            competitorName: cr.name,
                            competitorDomain: cr.domain,
                            prompt: audit.prompt,
                            engine: 'openai',
                            visibility: cr.rank > 0 ? (cr.rank <= 3 ? 'High' : 'Moderate') : 'None',
                            found: cr.found || cr.rank > 0 || (cr.score > 0),
                            score: cr.score || 0,
                            rank: cr.rank || 0,
                            authoritySignals: audit.authoritySignals || {}
                        });
                    }
                }
            }
            logger.info(`✅ [COMPETITIVE] OpenAI Battle View (with Fallback) complete with ${compResults.length} results`);
        }
    }

    // 1.2 Gemini Competitive Audit
    if (engines.includes('gemini')) {
        logger.info(`🔄 [COMPETITIVE] Running Gemini Battle View for ${project.prompts.length} prompts in ${market.name}...`);
        const tasks = project.prompts.map(promptText => () => 
            geminiCompetitiveAudit(brandName, domain, project.competitors, promptText, market)
        );
        
        const gCompResultsRaw = await runWithLimit(tasks, 3); // Gemini search is heavy, lower limit
        const gCompResults = gCompResultsRaw.filter(Boolean);
        
        if (gCompResults.length > 0) {
            for (const audit of gCompResults) {
                 if (!audit.brandRanking) continue;
     
                 const isRanked = audit.brandRanking.rank > 0;
                 // Map Brand Result
                 results.promptRankings.push({
                    prompt: audit.prompt || '',
                    engine: 'gemini',
                    visibility: isRanked ? (audit.brandRanking.rank <= 3 ? 'High' : 'Moderate') : 'None',
                    found: isRanked || (audit.brandRanking.isRecommended === true && audit.brandRanking.rank > 0),
                    linkFound: audit.brandRanking.linkProvided || false,
                    rank: audit.brandRanking.rank || 0,
                    linkRank: audit.brandRanking.rank || 0,
                    score: audit.brandRanking.score || 0,
                    snippet: audit.brandRanking.snippet || '',
                    citations: audit.authoritySignals?.citations || [],
                    authoritySource: audit.authoritySignals?.sourceType || 'Gemini Google Search',
                    authoritySignals: audit.authoritySignals || { sourceType: 'Comparison', citations: [] }
                });
    
                // Map Competitor Results
                if (audit.competitorRankings) {
                    for (const cr of audit.competitorRankings) {
                        results.competitorRankings.push({
                            competitorName: cr.name,
                            competitorDomain: cr.domain,
                            prompt: audit.prompt,
                            engine: 'gemini',
                            visibility: cr.rank > 0 ? (cr.rank <= 3 ? 'High' : 'Moderate') : 'None',
                            found: cr.found || cr.rank > 0 || (cr.score > 0),
                            score: cr.score || 0,
                            rank: cr.rank || 0,
                            authoritySignals: audit.authoritySignals || {}
                        });
                    }
                }
            }
            logger.info(`✅ [COMPETITIVE] Gemini Battle View complete with ${gCompResults.length} results`);
        } else {
            logger.warn(`⚠️ [COMPETITIVE] Gemini Battle View returned NO results for ${project.name}`);
        }
    }

    // 2. Fallback Audits (Non-Search Internal Knowledge)
    const otherEngines = engines.filter(e => e === 'other'); // Placeholder if needed, currently none
    if (otherEngines.length > 0) {
        const tasks = [];
        for (const promptText of project.prompts) {
            for (const engine of otherEngines) {
                tasks.push(() => 
                    analyzePromptRanking(brandName, domain, promptText, market, engine, false).then(audit => ({
                        prompt: promptText,
                        engine,
                        visibility: audit.visibilityLevel || 'None',
                        found: (audit.brandRanking?.rank > 0) || (audit.brandRanking?.isRecommended === true && audit.brandRanking?.rank > 0) || false,
                        linkFound: audit.brandRanking?.linkProvided || (audit.authoritySignals?.citations?.length > 0) || false,
                        rank: audit.brandRanking?.rank || 0,
                        linkRank: audit.brandRanking?.rank || 0,
                        score: audit.brandRanking?.score || 0,
                        snippet: audit.brandRanking?.snippet || '',
                        citations: audit.authoritySignals?.citations || [],
                        authoritySource: audit.authoritySignals?.sourceType || 'Internal Knowledge',
                        authoritySignals: audit.authoritySignals || { sourceType: 'Internal Knowledge', citations: [] }
                    }))
                );
            }
        }
        logger.info(`🔄 [INTERNAL] Executing ${tasks.length} background knowledge audits for ${otherEngines.join(', ')}...`);
        const internalAudits = await runWithLimit(tasks, 5);
        results.promptRankings.push(...internalAudits);
    }

    // 4. Scan Custom Simulator Prompts (Parallel with Limit)
    if (project.customPrompts && project.customPrompts.length > 0) {
        const tasks = [];
        for (const cp of project.customPrompts) {
            for (const engine of engines) {
                tasks.push(() => 
                    analyzeCustomPrompt(brandName, domain, cp.text, engine).then(audit => ({
                        promptText: cp.text,
                        engine,
                        brandMentioned: audit.brandMentioned,
                        sentiment: audit.sentiment
                    }))
                );
            }
        }
        logger.info(`🔄 [PARALLEL] Executing ${tasks.length} custom simulator audits (Limit: 5)...`);
        const customResults = await runWithLimit(tasks, 5);
        results.customPromptResults.push(...customResults);
    }
    
    return results;
};
