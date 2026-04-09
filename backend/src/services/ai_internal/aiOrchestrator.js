const gemini = require('./gemini.service');
const openai = require('./openai.service');
// const groq = require('./groq.service');
// const perplexity = require('./perplexity.service');
const logger = require('../../utils/logger');

// ============================================================================
// ENHANCED CONFIGURATION
// ============================================================================

const CONFIG = {
    RATE_LIMITS: {
        GLOBAL_REQUESTS: 200,    // Reduced from 2s to 0.2s for synthesis speed
        BURST_LIMIT: 3,
        BURST_WINDOW: 5000
    },
    RETRY: {
        MAX_ATTEMPTS: 2,       // Fail faster on synthesis
        BASE_DELAY: 500,
        MAX_DELAY: 5000,
        BACKOFF_MULTIPLIER: 2
    },
    CACHE: {
        TTL: 3600000,
        MAX_SIZE: 100
    },
    VALIDATION: {
        MIN_SUMMARY_LENGTH: 100,
        MAX_SUMMARY_LENGTH: 1500,
        REQUIRED_FIELDS: [
            'interpretation', 'visibilityLevel', 'sentiment', 'checklist', 
            'domainType', 'coreOffering', 'aiVisibilityAssessment'
        ]
    }
};

// Caching system removed (Context discovery no longer required)

// ============================================================================
// RATE LIMITER
// ============================================================================

class RateLimiter {
    constructor() {
        this.lastRequest = 0;
        this.requestHistory = [];
    }

    async throttle() {
        const now = Date.now();
        this.requestHistory = this.requestHistory.filter(
            time => now - time < CONFIG.RATE_LIMITS.BURST_WINDOW
        );

        if (this.requestHistory.length >= CONFIG.RATE_LIMITS.BURST_LIMIT) {
            const oldestRequest = this.requestHistory[0];
            const waitTime = CONFIG.RATE_LIMITS.BURST_WINDOW - (now - oldestRequest);
            if (waitTime > 0) {
                logger.warn(`🚦 Burst limit reached. Waiting ${waitTime}ms`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }

        const timeSinceLastRequest = now - this.lastRequest;
        if (timeSinceLastRequest < CONFIG.RATE_LIMITS.GLOBAL_REQUESTS) {
            const waitTime = CONFIG.RATE_LIMITS.GLOBAL_REQUESTS - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequest = Date.now();
        this.requestHistory.push(this.lastRequest);
    }
}

const rateLimiter = new RateLimiter();

// ============================================================================
// RETRY LOGIC
// ============================================================================

async function retryWithBackoff(fn, context = 'operation') {
    let lastError;
    
    for (let attempt = 1; attempt <= CONFIG.RETRY.MAX_ATTEMPTS; attempt++) {
        try {
            await rateLimiter.throttle();
            const result = await fn();
            
            if (result && typeof result === 'string' && result.length > 0) {
                return result;
            }
            
            lastError = new Error(`Empty or invalid response received`);
        } catch (error) {
            lastError = error;
            logger.warn(`❌ ${context} attempt ${attempt}/${CONFIG.RETRY.MAX_ATTEMPTS} failed:`, error.message);
        }

        if (attempt < CONFIG.RETRY.MAX_ATTEMPTS) {
            const delay = Math.min(
                CONFIG.RETRY.BASE_DELAY * Math.pow(CONFIG.RETRY.BACKOFF_MULTIPLIER, attempt - 1),
                CONFIG.RETRY.MAX_DELAY
            );
            logger.info(`⏳ Retrying ${context} in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

// ============================================================================
// JSON PARSER WITH VALIDATION
// ============================================================================

function cleanAndParseJSON(jsonString, schema = 'default') {
    if (!jsonString) {
        throw new Error('Empty JSON response received');
    }

    // Handle string errors from services (pre-formatted as ERROR: ...)
    if (typeof jsonString === 'string') {
        const trimmed = jsonString.trim();
        const lower = trimmed.toLowerCase();
        if (lower.startsWith('error') || lower.includes('details_missing')) {
            return {
                error: trimmed,
                summary: trimmed,
                status: 'failed'
            };
        }
    }

    try {
        let cleanJson = String(jsonString)
            .replace(/```json\s*/ig, '')
            .replace(/```\s*/g, '')
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
            .trim();
        
        const firstBrace = cleanJson.indexOf('{');
        const lastBrace = cleanJson.lastIndexOf('}');
        
        if (firstBrace === -1) {
            if (typeof jsonString === 'object') return jsonString;
            throw new Error(`No JSON object markers found`);
        }

        // Handle possible truncation
        if (lastBrace === -1 || lastBrace < firstBrace) {
            logger.warn('⚠️ JSON truncated, attempting repair...');
            let openBraces = (cleanJson.match(/\{/g) || []).length;
            let closeBraces = (cleanJson.match(/\}/g) || []).length;
            let openBrackets = (cleanJson.match(/\[/g) || []).length;
            let closeBrackets = (cleanJson.match(/\]/g) || []).length;

            while (openBrackets > closeBrackets) {
                cleanJson += ']';
                closeBrackets++;
            }
            while (openBraces > closeBraces) {
                cleanJson += '}';
                closeBraces++;
            }
        } else {
            cleanJson = cleanJson.substring(firstBrace, lastBrace + 1);
        }

        let parsed;
        try {
            parsed = JSON.parse(cleanJson);
        } catch (e) {
            logger.warn('⚠️ Standard parse failed, trying comma repair...');
            const repaired = cleanJson.replace(/,\s*[}\]]/g, m => m.slice(1));
            parsed = JSON.parse(repaired);
        }

        const missingFields = CONFIG.VALIDATION.REQUIRED_FIELDS.filter(
            field => !parsed.hasOwnProperty(field)
        );

        if (missingFields.length > 0) {
            logger.warn(`⚠️ Partial parse for ${schema}, missing: ${missingFields.join(', ')}`);
            missingFields.forEach(field => {
                parsed[field] = getDefaultValue(field);
            });
        }

        return parsed;

    } catch (error) {
        logger.error(`❌ Resilience logic failed to recover JSON: ${error.message}`);
        return {
            summary: "Entity analysis truncated or malformed.",
            interpretation: "The AI response was too complex for real-time parsing. Please retry.",
            brandStatus: 'Unknown',
            visibilityLevel: 'Analysis Partial',
            sentiment: 'Neutral',
            checklist: ['Retry scan for full data'],
            citations: [],
            prompts: [],
            domainType: 'Unknown',
            brandType: 'Unknown',
            coreOffering: 'Analysis incomplete',
            criticalMissing: 'Parsing failed',
            error: error.message
        };
    }
}

function getDefaultValue(field) {
    const defaults = {
        interpretation: 'Analysis pending',
        visibilityLevel: 'Unknown',
        sentiment: 'Neutral',
        checklist: [],
        citations: [],
        prompts: [],
        domainType: 'Unknown',
        brandType: 'Unknown',
        coreOffering: 'Not analyzed',
        criticalMissing: 'Data unavailable',
        visibilityScore: 0,
        sentimentScore: 50
    };
    return defaults[field] || null;
}

// ============================================================================
// INDEPENDENT MODEL ANALYSIS - NO CROSS-REFERENCING
// ============================================================================

exports.broadcastQuery = async (brandName, providedContext = null, onResult = null) => {
    logger.info(`🚀 Starting INDEPENDENT GEO analysis for: ${brandName}`);
    logger.info(`⚠️ Each model will analyze using ONLY its internal knowledge - NO cross-referencing`);
    
    const createIndependentPrompt = (modelName) => {
        return `You are ${modelName}. Analyze this brand based on your internal training knowledge.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BRAND TO ANALYZE: "${brandName}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DIRECTIVE: STRICT HONESTY - NO GUESSING - INTERNAL KNOWLEDGE ONLY
- Search your training data for REAL, SPECIFIC information about "${brandName}"
- If you DO NOT genuinely recognize this brand with specific facts, you MUST say "Not Found"
- DO NOT generate generic descriptions based on the brand name alone
- DO NOT guess what the brand might do based on its name (e.g., "CreatorsXchange" → don't guess "creator collaborations" unless you truly know it)
- Provide ONLY information you are genuinely confident about from your training data
- It is better to say "Not Found" than to fabricate plausible-sounding information

HALLUCINATION CHECK - Ask yourself:
1. Can I name a SPECIFIC fact about "${brandName}" (founding year, founder, headquarters, specific product)?
2. Have I seen "${brandName}" mentioned in actual articles, research, or documents in my training data?
3. Am I just guessing based on what the name sounds like?
→ If your answers are No, No, Yes — then mark as "Not Found" with entityRecognition.found = false

ANALYSIS FRAMEWORK:
1. Do you recognize "${brandName}" from your training data with SPECIFIC facts?
2. What CONCRETE information do you have (not guesses)?
3. What industry/category context exists in your knowledge?
4. How prominent is this entity in your training corpus?

OUTPUT FORMAT (Valid JSON - MANDATORY):
{
  "modelName": "${modelName}",
  "dataSource": "internal-training-knowledge",
  "analysisTimestamp": "${new Date().toISOString()}",
  "entityRecognition": {
    "found": true/false,
    "confidence": "High|Medium|Low|Not Found",
    "trainingDataCoverage": "Describe SPECIFIC facts you know, or state 'No specific information found in training data'"
  },
  "summary": "4-5 detailed sentences: What SPECIFIC facts does YOUR training data contain about ${brandName}? Provide a comprehensive description of their products, industry position, and reputation.",
  "interpretation": "4-5 detailed sentences based ONLY on verified knowledge. Provide a professional assessment of their market impact and significance. If not found, say '${brandName} does not appear in my training corpus with any specific or verifiable information.'",
  "brandStatus": "Present|Not Found|Partially Known",
  "visibilityLevel": "Market Leader|Highly Visible|Moderate Presence|Minimal Visibility|Unknown",
  "sentimentScore": 0-100,
  "sentiment": "Positive|Neutral|Negative|Unknown",
  "citations": [
    {
      "source": "Internal Knowledge (${modelName})",
      "authority": "Training Data",
      "context": "Specific facts from training, or 'No verifiable citations available'"
    }
  ],
  "rankingSignals": ["Signal 1 from your knowledge", "Signal 2"],
  "checklist": ["Brand Action 1", "Brand Action 2", "Brand Action 3", "Brand Action 4", "Brand Action 5"],
  "criticalMissing": "What gaps exist in your knowledge about this brand",
  "domainType": "Industry category from your training or Unknown",
  "brandType": "Type from your training or Unknown",
  "coreOffering": "Products/services from your training or Unknown",
  "prompts": ["relevant prompts from your training"],
  "knowledgeLimitations": "Honest statement about data gaps",
  "confidenceLevel": "High|Medium|Low",
  "aiVisibilityAssessment": {
    "overallLevel": "High|Moderate|Low|Very Low",
    "visibilityScore": 0-100,
    "interpretation": "How prominent is this brand in your training data? Be honest.",
    "dataCompleteness": "Complete|Partial|Minimal|None",
    "criteria": [
      {
        "name": "Distinct entity recognition",
        "assessment": "High|Moderate|Low|Very Low",
        "score": 0-100,
        "evidence": "Can you clearly identify this as a unique entity with specific facts?"
      },
      {
        "name": "Semantic footprint",
        "assessment": "High|Moderate|Low|Very Low",
        "score": 0-100,
        "evidence": "How often does this brand appear with specific context in your training?"
      },
      {
        "name": "Stable associations",
        "assessment": "High|Moderate|Low|Very Low",
        "score": 0-100,
        "evidence": "What consistent, verifiable patterns exist in your training data?"
      },
      {
        "name": "Organic AI recall",
        "assessment": "High|Moderate|Low|Very Low",
        "score": 0-100,
        "evidence": "Can you recall specific facts without guessing?"
      },
      {
        "name": "Overall AI visibility",
        "assessment": "High|Moderate|Low|Very Low",
        "score": 0-100,
        "evidence": "Overall prominence in your training corpus based on real data"
      }
    ]
  }
}

🚨 CRITICAL RULES:
- Output ONLY valid JSON (no markdown, no code blocks)
- Be HONEST: say "Not Found" if you don't genuinely know the brand
- DO NOT fabricate information based on what the brand name sounds like
- Use ONLY: High, Moderate, Low, or Very Low for assessment fields
- If entityRecognition.found is false, ALL criteria scores MUST be 0-10 and assessments MUST be "Very Low"
- Data source: Internal training ONLY (no web search)`;
    };

    // Define models with their specific focus areas
    const models = [
        { 
            id: 'openai', 
            name: 'OpenAI GPT-4o',
            fn: (p) => openai.fetchOpenAI(p, true, false),
            priority: 1
        },
        { 
            id: 'gemini', 
            name: 'Google Gemini',
            fn: (p) => gemini.fetchGemini(p, true, false),
            priority: 2
        },
        // { 
        //     id: 'groq', 
        //     name: 'Groq LLaMA',
        //     fn: (p) => groq.fetchGroq(p, true, false),
        //     priority: 3
        // }
    ];

    const results = {};

    // Run all models in parallel but with complete independence
    const analysisPromises = models.map(async (model) => {
        try {
            logger.info(`🔍 [${model.name}] Starting INDEPENDENT analysis...`);
            
            // Create completely independent prompt for this model
            const independentPrompt = createIndependentPrompt(model.name);

            const timeoutMs = 60000;
            const result = await Promise.race([
                retryWithBackoff(() => model.fn(independentPrompt), `${model.name} independent analysis`),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error(`Timeout: ${model.name} > 60s`)), timeoutMs)
                )
            ]);

            const parsed = cleanAndParseJSON(result);
            
            // Ensure independence metadata is preserved
            parsed.modelId = model.id;
            parsed.modelName = model.name;
            parsed.analysisTimestamp = new Date().toISOString();
            parsed.independentAnalysis = true;
            parsed.dataSources = 'internal-training-data-only';
            parsed.crossReferencing = 'disabled';

            results[model.id] = parsed;
            
            logger.info(`✅ [${model.name}] Independent analysis complete`);

            if (onResult) {
                onResult(model.id, parsed);
            }
            
        } catch (error) {
            logger.error(`❌ [${model.name}] Independent analysis failed:`, error.message);
            results[model.id] = { 
                error: error.message, 
                modelId: model.id,
                modelName: model.name, 
                status: 'failed',
                independentAnalysis: true,
                analysisTimestamp: new Date().toISOString()
            };
            if (onResult) onResult(model.id, results[model.id]);
        }
    });

    await Promise.allSettled(analysisPromises);
    
    logger.info(`🎉 All independent analyses complete for: ${brandName}`);
    
    return results;
};

// ============================================================================
// INDEPENDENT MASTER PROFILE - NO MODEL CROSS-REFERENCING
// ============================================================================

exports.getStructuredProfile = async (brand, providedContext = null) => {
    logger.info(`📊 Generating INDEPENDENT master profile for: ${brand}`);
    logger.info(`⚠️ Using single model analysis - NO cross-referencing`);
    
    const independentProfilePrompt = `MASTER BRAND PROFILE ANALYSIS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BRAND TO ANALYZE: "${brand}"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOUR ROLE: Lead Brand Intelligence Analyst

DIRECTIVE: STRICT HONESTY - NO GUESSING - INTERNAL TRAINING DATA ONLY
- Search your training data for REAL, SPECIFIC information about "${brand}"
- If you DO NOT genuinely recognize this brand with specific facts, you MUST say "Not Found"
- DO NOT generate generic descriptions based on the brand name alone
- DO NOT guess what the brand might do based on its name (e.g., "CreatorsXchange" → don't guess "creator collaborations" unless you truly know it)
- Provide ONLY information you are genuinely confident about from your training data
- It is better to say "Not Found" than to fabricate plausible-sounding information
- Data source: YOUR internal training ONLY (no web search)

HALLUCINATION CHECK - Ask yourself:
1. Can I name a SPECIFIC fact about "${brand}" (founding year, founder, headquarters, specific product)?
2. Have I seen "${brand}" mentioned in actual articles, research, or documents in my training data?
3. Am I just guessing based on what the name sounds like?
→ If your answers are No, No, Yes — then mark as "Not Found" with entityVerification.found = false

ANALYSIS OBJECTIVES:
1. Entity Recognition: Is "${brand}" present in your training data with SPECIFIC facts?
2. Market Intelligence: What CONCRETE information do you have (not guesses)?
3. Brand Strength: How prominent is this brand in your knowledge base?
4. Competitive Context: What industry patterns and competitors do you recognize?

OUTPUT FORMAT (Valid JSON - MANDATORY):
{
  "modelUsed": "Model name",
  "dataSource": "internal-training-knowledge-only",
  "analysisTimestamp": "${new Date().toISOString()}",
  "entityVerification": {
    "found": true/false,
    "confidence": "High|Medium|Low|Not Found",
    "knowledgeCoverage": "Describe SPECIFIC facts you know, or state 'No specific information found in training data'"
  },
  "interpretation": "4-5 powerful sentences providing a comprehensive market profile based on training knowledge. Include specific services, industry role, and estimated market presence. If not found, say '${brand} was not found in my training data.'",
  "visibilityLevel": "Market Leader|Top Recommendation|Highly Visible|Moderate Presence|Minimal Visibility|Unknown|Not Found",
  "visibilityScore": 0-100,
  "sentimentScore": 0-100,
  "prompts": ["specific prompts from your training knowledge"],
  "domainType": "Specific industry from your training or Unknown",
  "brandType": "Specific category from your training or Unknown",
  "coreOffering": "Detailed description from your training or Unknown",
  "sentiment": "Positive|Neutral|Negative|Unknown",
  "checklist": ["Brand-focused recommendation 1", "Brand-focused recommendation 2", "Brand-focused recommendation 3", "Brand-focused recommendation 4", "Brand-focused recommendation 5"],
  "citations": [
    {
      "source": "My training data",
      "authority": "Internal Knowledge",
      "context": "Specific facts from training, or 'No verifiable citations available'",
      "confidence": "High|Medium|Low"
    }
  ],
  "criticalMissing": "Specific gaps in your knowledge (if any)",
  "confidence": "High|Medium|Low",
  "dataQuality": "Assessment of your training data completeness for this brand",
  "knowledgeLimitations": "Honest statement about data gaps",
  "recommendations": {
    "immediate": ["Immediate action from your analysis"],
    "shortTerm": ["Short-term strategy"],
    "longTerm": ["Long-term optimization"]
  },
  "competitiveAnalysis": {
    "position": "Leader|Challenger|Follower|Unknown",
    "competitors": ["Known competitors from your training or empty array"],
    "differentiators": ["Known strengths from your training or empty array"],
    "dataCompleteness": "Assessment of your competitive knowledge"
  },
  "aiVisibilityAssessment": {
    "overallLevel": "Very Low AI visibility (0-15) OR Low AI visibility (16-45) OR Moderate AI visibility (46-69) OR High AI visibility (70-100) OR Unknown",
    "interpretation": "How prominent is ${brand} in your training data? Be honest.",
    "dataCompleteness": "Complete|Partial|Minimal|None",
    "criteria": [
      {
        "name": "Distinct entity recognition in your training",
        "assessment": "None OR Very Low OR Weak OR Moderate OR Strong",
        "evidence": "Can you clearly identify this brand as a unique entity with specific facts?"
      },
      {
        "name": "Semantic footprint in your data",
        "assessment": "None OR Very Low OR Low OR High",
        "evidence": "How often does this brand appear with specific context in your training?"
      },
      {
        "name": "Stable associations in your knowledge",
        "assessment": "None OR Very Low OR Low OR High",
        "evidence": "What consistent, verifiable patterns appear in your training?"
      },
      {
        "name": "Organic recall likelihood",
        "assessment": "Unlikely OR Possible OR Likely",
        "evidence": "Can you recall specific facts without guessing from the name?"
      }
    ]
  }
}

🚨 CRITICAL RULES:
- Output ONLY valid JSON (no markdown, no code blocks)
- Be HONEST: say "Not Found" if you don't genuinely know the brand
- DO NOT fabricate information based on what the brand name sounds like
- Data source: Internal training ONLY (no web search)`;

    // Try models in priority order (but use only ONE)
    const models = [
        { name: 'Google Gemini', fn: () => gemini.fetchGemini(independentProfilePrompt, true, false) },
        { name: 'OpenAI GPT-4o', fn: () => openai.fetchOpenAI(independentProfilePrompt, true, false) },
        // { name: 'Groq LLaMA', fn: () => groq.fetchGroq(independentProfilePrompt, true, false) }
    ];

    for (const model of models) {
        try {
            logger.info(`🤖 [${model.name}] Generating independent master profile...`);
            const response = await retryWithBackoff(() => model.fn(), `${model.name} independent profile`);
            const parsed = cleanAndParseJSON(response, 'profile');
            
            // Add independence metadata
            parsed.generatedBy = model.name;
            parsed.independentAnalysis = true;
            parsed.dataSources = 'internal-training-data-only';
            parsed.crossReferencing = 'disabled';
            parsed.generatedAt = new Date().toISOString();
            
            logger.info(`✅ [${model.name}] Independent master profile complete`);
            return parsed;
        } catch (error) {
            logger.error(`❌ [${model.name}] Failed:`, error.message);
            continue;
        }
    }

    logger.error(`❌ All models failed to generate independent master profile`);
    return { 
        error: "All models failed", 
        visibilityLevel: "Unknown", 
        visibilityScore: 0,
        independentAnalysis: true,
        dataSources: 'internal-training-data-only'
    };
};

// ============================================================================
// LIVE SYNTHESIS - MERGING RESEARCH INTO STRUCTURED PROFILE
// ============================================================================

/**
 * Synthesizes a structured profile using real-time search results as context.
 */
exports.synthesizeProfileFromLiveResults = async (brand, liveResults) => {
    logger.info(`🧠 Synthesizing REAL-TIME profile for: ${brand}`);

    const validInsights = Object.entries(liveResults)
        .filter(([_, result]) => {
            if (!result || typeof result !== 'string') return false;
            const res = result.toLowerCase();
            return !res.startsWith('error:') && 
                   !res.startsWith('failed:') && 
                   !res.includes('search failed') && 
                   !res.includes('unavailable') &&
                   !res.includes('details_missing');
        })
        .map(([model, result]) => `[Source: ${model}]\n${result}`)
        .join('\n\n');

    if (!validInsights || validInsights.length < 20) {
        logger.warn(`⚠️ No valid live insights found for synthesis of ${brand}. Falling back to internal knowledge.`);
        return await exports.getStructuredProfile(brand);
    }

    const synthesisPrompt = `You are the Lead Brand Intelligence Synthesizer. 
Your goal is to create a professional brand profile STRICTLY using the provided real-time research.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BRAND: "${brand}"
RAW RESEARCH DATA:
${validInsights}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL EXTRACTION RULES:
1. DOMAIN TYPE: Identify the specific industry (e.g., 'Influencer Marketing/marketplace', 'AdTech').
2. BRAND TYPE: mentioned in the research data.
3. CHECKLIST: Provide 5 ACTIONABLE, SPECIFIC technical or brand growth recommendations found in the research.
4. INTERPRETATION: Use the specific market terminology found in the snippets (marketplace vs platform).

OUTPUT FORMAT (Valid JSON ONLY):
{
  "interpretation": "6-8 comprehensive and precise sentences using research terminology. Synthesize a deep-dive market overview including competitive positioning, service offerings, and core value propositions found in the research.",
  "visibilityLevel": "Market Leader|Highly Visible|Moderate Presence|Minimal Visibility|Unknown",
  "visibilityScore": 0-100,
  "sentiment": "Positive|Neutral|Negative",
  "domainType": "Specific Industry from research",
  "brandType": "Specific Category from research",
  "coreOffering": "Primary Service from research",
  "prompts": ["tag1", "tag2", "tag3"],
  "checklist": ["Actionable Brand Fix 1 (e.g. Schema.org)", "Actionable Brand Fix 2", "Actionable Brand Fix 3", "Actionable Brand Fix 4", "Actionable Brand Fix 5"],
  "citations": [{"domain": "domain.com", "url": "url", "context": "description"}],
  "aiVisibilityAssessment": {
    "overallLevel": "High|Moderate|Low|Very Low",
    "interpretation": "Summary of search presence",
    "criteria": [{"name": "Search Footprint", "assessment": "Strong|Weak", "evidence": "evidence from research"}]
  }
}

Do not use generic placeholders if search data is available. Return ONLY JSON.`;

    // Priority: Gemini -> OpenAI -> Groq (per user architectural preference)
    const synthesisModels = [
        { name: 'Gemini', fn: () => gemini.fetchGemini(synthesisPrompt, true) },
        { name: 'OpenAI', fn: () => openai.fetchOpenAI(synthesisPrompt, true, false) },
        // { name: 'Groq', fn: () => groq.fetchGroq(synthesisPrompt, true) }
    ];

    for (const model of synthesisModels) {
        try {
            logger.info(`🤖 Attempting synthesis with ${model.name}...`);
            const response = await retryWithBackoff(() => model.fn(), `live synthesis (${model.name})`);
            const parsed = cleanAndParseJSON(response, 'synthesis');
            parsed.generatedAt = new Date().toISOString();
            parsed.dataSource = 'synthesized-live-research';
            parsed.engine = model.name;
            
            logger.info(`✅ Synthesis successful via ${model.name}`);
            return parsed;
        } catch (error) {
            logger.warn(`⚠️ Synthesis failed via ${model.name}: ${error.message}`);
            continue; // Try next model
        }
    }

    logger.error(`❌ All synthesis models failed for ${brand}`);
    // Internal fallback also prioritizing Gemini
    return await exports.getStructuredProfile(brand); 
};

module.exports = {
    broadcastQuery: exports.broadcastQuery,
    getStructuredProfile: exports.getStructuredProfile,
    synthesizeProfileFromLiveResults: exports.synthesizeProfileFromLiveResults,
    clearCache: () => {},
    getConfig: () => CONFIG
};
