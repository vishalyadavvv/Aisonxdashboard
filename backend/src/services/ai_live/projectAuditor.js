const OpenAI = require("openai");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("../../utils/logger");
const { cleanUrl } = require("../../utils/urlCleaner");
const { robustParseJSON } = require("../../utils/jsonParser");
const axios = require("axios");

/**
 * PROJECT AUDITOR SERVICE
 * Dedicated logic for skeptical project scans and rank audits.
 * Isolated from the main WebSearch / Profiler tools to prevent side effects.
 */

// Helper: Resolve Vertex AI Redirects (Shared with GeminiLive)
async function resolveVertexRedirect(url) {
  if (!url || !url.includes('vertexaisearch')) return url;
  try {
    const res = await axios.head(url, {
      maxRedirects: 0,
      validateStatus: (status) => status >= 300 && status < 400,
      timeout: 3000
    });
    return res.headers.location || url;
  } catch (e) {
    return url;
  }
}


/**
 * GPT BATCH PROMPT AUDIT
 * Optimized to check multiple prompts in 1 call with high skepticism.
 */
exports.gptBatchPromptAudit = async function gptBatchPromptAudit(brandName, domain, prompts, market = { name: 'Global' }) {
  try {
    if (!process.env.OPENAI_API_KEY) return null;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const promptListStr = prompts.map((k, i) => `${i + 1}. "${k}"`).join('\n');
    
    const prompt = `
ROLE: You are an EXPERT Search Visibility & Market Analyst specializing in the ${market.name} market.
TARGET MARKET: "${market.name}" ${market.context ? `(${market.context})` : ''}
TASK: Analyze the search presence and reputation of "${brandName}" (${domain}) for EACH prompt. Think like a helpful AI assistant (e.g. ChatGPT/Gemini) providing a detailed report to a user.

INSTRUCTIONS:
1. ⚠️ HYBRID RESEARCH: Perform a general search for the prompt. If "${brandName}" is not explicitly in the top few results, perform a targeted second search to verify their specific content and authority.
2. 🚨 DATA INTEGRITY: Be fair and intelligent. For global leaders or established industry brands, recognize their authority even if they aren't the very first result in a snippet.
3. 🚨 RICH ANALYTICS: Your snippet MUST be 2-3 detailed sentences (max 60 words). Provide context on *why* they are a good option or where they fit in the competitive landscape. Avoid robotic one-liners.
4. RANKING & SCORING: 
   - Assign a Rank (1-10) based on actual organic visibility.
   - If found via targeted search but not general search, you may still assign a Rank (e.g. 6-10) to reflect "Verified Specialized Presence." 
   - Score: 0-100 based on prominence and reputation.
4. RANKING: 
   - Rank 1-10: For brands found with strong organic presence or high-authority mentions.
   - Rank 0: ONLY if the brand is genuinely invisible or irrelevant in this market.

OUTPUT FORMAT (JSON ARRAY):
[
  {
    "prompt": "prompt text",
    "brand": "${brandName}",
    "isRecommended": true/false,
    "linkMentioned": true/false,
    "recommendationRank": 1-10 (0 if not found),
    "linkRank": 1-10 (0 if not found),
    "visibilityLevel": "High|Moderate|Low|None",
    "snippet": "Detailed factual summary of findings.",
    "score": 0-100,
    "authoritySignals": {
      "sourceType": "Native OpenAI Search",
      "recallConfidence": "High|Medium|Low",
      "citations": ["FULL URLs discovered."]
    }
  }
]
`;

    logger.info(`🔄 [PROJECT_AUDITOR] GPT Batch Audit for ${prompts.length} prompts...`);
    const res = await client.responses.create({
      model: "gpt-4o",
      tools: [{ type: "web_search" }],
      input: prompt
    });

    const text = res.output_text || (res.choices && res.choices[0]?.message?.content) || (res.output && res.output.text) || '';
    const results = robustParseJSON(text);
    if (!results) {
      logger.warn(`⚠️ [PROJECT_AUDITOR] No valid JSON found in GPT response: ${text.substring(0, 100)}`);
      return null;
    }
    results.forEach(r => {
      if (r.authoritySignals?.citations) {
        r.authoritySignals.citations = r.authoritySignals.citations.map(cleanUrl);
      }
    });

    return results;
  } catch (err) {
    logger.error("❌ GPT Batch Audit Error:", err.message);
    return null;
  }
};

/**
 * GPT INDIVIDUAL PROMPT AUDIT
 */
exports.gptPromptAudit = async function gptPromptAudit(brandName, domain, promptText, market = { name: 'Global' }) {
  try {
    if (!process.env.OPENAI_API_KEY) return null;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const prompt = `
ROLE: You are an Insightful Search Market Analyst.
TARGET MARKET: "${market.name}" ${market.context ? `(${market.context})` : ''}
TASK: Evaluate if and how "${brandName}" (${domain}) appears in YOUR real-time results for: "What are the best options for ${promptText}?" in the ${market.name} market.

INSTRUCTIONS:
1. HYBRID SEARCH: Check general results first, then verify with a brand-specific search if needed.
2. 🚨 NATURAL INTELLIGENCE: Do not be overly narrow. If "${brandName}" is a recognized authority or appears in top articles, confirm their ranking.
3. 🚨 RICH ANALYTICS: Snippets MUST be 2-3 detailed sentences (max 60 words). Explain the findings with the same level of detail as a standard ChatGPT/Gemini response.
4. RANKING: Assign a realistic rank based on evidence. If found only via specific search, use Rank 6-10.
4. CITATION FLEXIBILITY: Provide citation URLs that mention "${brandName}" or its website. ONLY absolute URLs.

OUTPUT FORMAT (JSON):
{
  "prompt": "${promptText}",
  "brandRanking": { "rank": 0-10, "score": 0-100, "isRecommended": true/false, "linkProvided": true/false, "snippet": "Detailed factual info" },
  "authoritySignals": { "sourceType": "Native OpenAI Search", "citations": ["URLs"] }
}
`;

    const res = await client.responses.create({
      model: "gpt-4o",
      tools: [{ type: "web_search" }],
      input: prompt
    });

    const text = res.output_text || (res.choices && res.choices[0]?.message?.content) || (res.output && res.output.text) || '';
    const result = robustParseJSON(text);
    if (!result) {
      logger.warn(`⚠️ [PROJECT_AUDITOR] No valid JSON found in GPT response: ${text.substring(0, 100)}`);
      return null;
    }
    if (result.authoritySignals?.citations) {
      result.authoritySignals.citations = result.authoritySignals.citations.map(cleanUrl);
    }
    return result;
  } catch (err) {
    logger.error("❌ GPT individual Audit Error:", err.message);
    return null;
  }
};

exports.geminiPromptAudit = async function gptPromptAudit(brandName, domain, promptText, market = { name: 'Global' }) {
  try {
    if (!process.env.GEMINI_API_KEY) return null;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      tools: [{ googleSearch: {} }]
    });

    const prompt = `ROLE: Professional Search Market Research Auditor.
TARGET MARKET: "${market.name}" ${market.context ? `(${market.context})` : ''}
TARGET BRAND (The Client): "${brandName}" (${domain})

TASK: Use Google Search to evaluate the visibility and reputation of "${brandName}" in the ${market.name} market for the query: "${promptText}".

INSTRUCTIONS:
1. HYBRID SEARCH: First, search for "${promptText} in ${market.name}". If "${brandName}" is not prominent, perform a targeted second search including the brand name to verify presence.
2. 🚨 DATA INTEGRITY: Be realistic. For global leaders (like Nike, Sony, etc.), use the search data to confirm their status even if they rank below smaller local niche sites in snippets.
3. 🚨 RICH SNIPPETS: Snippet MUST be 1-2 factual sentences (max 60 words). Explain findings clearly.
4. 🚨 PROOF RULES: You MUST return FULL, VALID 'https://' URLs for citations. ONLY absolute URLs.
5. OUTPUT FORMAT (JSON ONLY):
{
  "prompt": "${promptText}",
  "brandRanking": { "rank": 0-10, "score": 0-100, "isRecommended": true/false, "linkProvided": true/false, "snippet": "Factual analysis summary." },
  "authoritySignals": { "sourceType": "Google Search", "citations": [] }
}
🚨 RETURN ONLY JSON.`;

    let text = '';
    let retries = 3;
    let finalResult = null;

    while (retries > 0) {
      try {
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4 }
        });
        text = result.response.text();
        finalResult = robustParseJSON(text);
        if (finalResult) {
            // Extract citations
            try {
              let allUrls = [];
              const candidates = result.response.candidates;
              if (candidates?.[0]?.groundingMetadata?.groundingChunks) {
                let groundingUrls = candidates[0].groundingMetadata.groundingChunks.map(c => c.web?.uri).filter(u => u);
                allUrls.push(...groundingUrls);
              }
              const textUrls = text.match(/(https?:\/\/[^\s]+)/g);
              if (textUrls) allUrls.push(...textUrls);
              if (allUrls.length > 0) {
                const cleanedUrls = [...new Set(allUrls.map(cleanUrl).filter(Boolean))];
                finalResult.authoritySignals.citations = await Promise.all(cleanedUrls.map(resolveVertexRedirect));
              }
            } catch (e) {
              logger.warn("Error extracting Gemini citations:", e.message);
            }
            return finalResult;
        }
        retries--;
      } catch (err) {
        retries--;
        const isRateLimit = err.message && (err.message.includes('429') || err.message.includes('quota'));
        if (retries > 0 && isRateLimit) {
            logger.warn(`⚠️ Gemini Rate Limit. Retrying in 5s...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        } else if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1500));
        } else {
            logger.error(`❌ Gemini Individual Audit Error:`, err.message);
        }
      }
    }
    return null;
  } catch (err) {
    logger.error("❌ Gemini Audit Fatal Error:", err.message);
    return null;
  }
};

/**
 * GPT COMPETITIVE BATCH AUDIT
 * Analyzes the brand and its competitors in a single comparative search for multiple prompts.
 */
exports.gptCompetitiveBatchAudit = async function gptCompetitiveBatchAudit(brandName, domain, competitors, prompts, market = { name: 'Global' }) {
  try {
    if (!process.env.OPENAI_API_KEY) return null;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const promptListStr = prompts.map((k, i) => `${i + 1}. "${k}"`).join('\n');
    const compListStr = (competitors || []).map(c => `${c.name} (${c.domain})`).join(', ');
    
    const prompt = `
ROLE: Professional ACCURATE & OBJECTIVE Search Market Research Auditor.
TARGET MARKET: "${market.name}" ${market.context ? `(${market.context})` : ''}
TARGET BRAND (The Client): "${brandName}" (${domain})
COMPETITORS (The Rivals): [${compListStr}]

TASK: Analyze the search landscape for these prompts and map the visibility of "${brandName}" AGAINST the rivals in the ${market.name} market.

PROMPTS TO AUDIT:
${promptListStr}

INSTRUCTIONS:
1. ⚠️ HYBRID BATTLE VIEW: 
   - Step 1: Search ONLY for the prompt text in ${market.name}. Map the top 10 results.
   - Step 2: If any major brand (target or rivals) is missing, do a targeted verification search for them.
2. 🚨 DATA INTEGRITY: Reporting "Not Found" for a household-name brand (target or rival) just because they aren't the #1 snippet result is WRONG. Use search grounding to find their actual position in the lists.
3. 🚨 RICH SNIPPETS: Snippets MUST be 2-3 detailed sentences (max 60 words).
4. 🚨 CITATIONS: You MUST return FULL, VALID 'https://' URLs.
5. SCORING & MAPPING: 
   - Found gracefully (Organically or via Verification): Rank 1-10, Score 60-100.
   - Assign ranks to BOTH the target brand and any rivals found.
   - Not found after thorough research: Rank 0, Score 0.

OUTPUT FORMAT (JSON ARRAY OF OBJECTS):
    [
      {
        "prompt": "Exact prompt text",
        "brandRanking": { "rank": 0-10, "score": 0-100, "isRecommended": true/false, "linkProvided": true/false, "snippet": "Deep factual findings." },
        "competitorRankings": [ { "name": "Competitor", "domain": "domain.com", "rank": 1-10, "score": 1-100, "found": true/false } ],
        "authoritySignals": { "citations": ["URLs"] }
      }
    ]
    `;

    logger.info(`🔄 [COMPETITIVE] GPT Batch Audit for ${brandName} vs rivals...`);
    let text = '';
    let retries = 3;
    while (retries > 0) {
      try {
        const res = await client.responses.create({
          model: "gpt-4o",
          tools: [{ type: "web_search" }],
          input: prompt
        });
        text = res.output_text || (res.choices && res.choices[0]?.message?.content) || (res.output && res.output.text) || '';
        break; // Success
      } catch (apiErr) {
        retries--;
        const isRateLimit = apiErr.status === 429 || (apiErr.message && apiErr.message.includes('429'));
        const isTimeoutOrServer = apiErr.status >= 500 || apiErr.code === 'ETIMEDOUT' || (apiErr.message && (apiErr.message.includes('timeout') || apiErr.message.includes('socket')));
        
        if (retries > 0 && (isRateLimit || isTimeoutOrServer)) {
            const delay = isRateLimit ? 5000 : 3000;
            logger.warn(`⚠️ OpenAI API Issue (${apiErr.status || 'Timeout'}). Retrying in ${delay/1000}s... (${retries} retries left) | Error: ${apiErr.message}`);
            await new Promise(resolve => setTimeout(resolve, delay));
        } else if (retries > 0) {
            // Unexpected error but try once more with a short delay
            logger.warn(`⚠️ OpenAI API Unexpected Error. Retrying... (${retries} retries left) | Error: ${apiErr.message}`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
            logger.error(`❌ GPT Competitive Batch Audit API Error after retries:`, apiErr.message);
            return null; // Give up
        }
      }
    }
    
    const results = robustParseJSON(text);
    if (!results) {
        logger.warn('ROBUST PARSE JSON FAILED TO PARSE:', text ? text.substring(0, 200) + '...' : 'empty string');
        return null;
    }
    results.forEach(r => {
      if (r.authoritySignals?.citations) {
        r.authoritySignals.citations = r.authoritySignals.citations.map(cleanUrl);
      }
    });
    return results;
  } catch (err) {
    logger.error("❌ GPT Competitive Batch Audit Error:", err.message);
    return null;
  }
};

exports.geminiCompetitiveAudit = async function geminiCompetitiveAudit(brandName, domain, competitors, promptText, market = { name: 'Global' }) {
  try {
    if (!process.env.GEMINI_API_KEY) return null;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      tools: [{ googleSearch: {} }]
    });

    const compListStr = (competitors || []).map(c => `${c.name} (${c.domain})`).join(', ');

    const prompt = `ROLE: Insightful Search Market Analyst.
TARGET MARKET: "${market.name}" ${market.context ? `(${market.context})` : ''}
TARGET BRAND (The Client): "${brandName}" (${domain})
COMPETITORS (The Rivals): [${compListStr}]

TASK: Evaluate the visibility of "${brandName}" AGAINST the rivals for the query: "${promptText}" in the ${market.name} market. Think like a helpful AI providing a balanced comparison.

INSTRUCTIONS:
1. HYBRID BATTLE VIEW: Search for "${promptText} in ${market.name}". If anyone is missing, verify their specific presence with a second search.
2. 🚨 NATURAL ANALYSIS: Avoid being a strict binary auditor. If "${brandName}" or a rival is found via specialized search or mentioned in top-tier guides/lists, rank them appropriately (Rank 1-10).
3. 🚨 RICH ANALYTICS: Snippet MUST be 2-3 factual sentences (max 60 words). Explain the competitive landscape naturally.
4. 🚨 PROOF: You MUST return FULL, VALID 'https://' URLs for citations.
5. SCORING & MAPPING: 
   - Found organically or via specialized search: Rank 1-10, Score 60-100.
   - Assign realistic ranks to both target and rivals.
   - Not found at all: Rank 0, Score 0.
8. OUTPUT FORMAT (JSON ONLY):
{
  "prompt": "${promptText}",
  "brandRanking": { "rank": 0-10, "score": 0-100, "isRecommended": true/false, "linkProvided": true/false, "snippet": "1-sentence info" },
  "competitorRankings": [ { "name": "X", "domain": "x.com", "rank": 0-10, "score": 0-100, "found": true/false } ],
  "authoritySignals": { "sourceType": "Google Search Comparison", "citations": [] }
}
🚨 RETURN ONLY JSON.`;

    let text = '';
    let retries = 3;
    let finalResult = null;

    while (retries > 0) {
      try {
        const result = await model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.4 }
        });
        text = result.response.text();
        finalResult = robustParseJSON(text);
        if (finalResult) {
            // Extract citations
            try {
              let allUrls = [];
              const candidates = result.response.candidates;
              if (candidates?.[0]?.groundingMetadata?.groundingChunks) {
                let groundingUrls = candidates[0].groundingMetadata.groundingChunks.map(c => c.web?.uri).filter(u => u);
                allUrls.push(...groundingUrls);
              }
              const textUrls = text.match(/(https?:\/\/[^\s]+)/g);
              if (textUrls) allUrls.push(...textUrls);
              if (allUrls.length > 0) {
                const cleanedUrls = [...new Set(allUrls.map(cleanUrl).filter(Boolean))];
                finalResult.authoritySignals.citations = await Promise.all(cleanedUrls.map(resolveVertexRedirect));
              }
            } catch (e) {
              logger.warn("Error extracting Gemini competitive citations:", e.message);
            }
            return finalResult;
        }
        retries--;
      } catch (err) {
        retries--;
        const isRateLimit = err.message && (err.message.includes('429') || err.message.includes('quota'));
        if (retries > 0 && isRateLimit) {
            logger.warn(`⚠️ Gemini Competitive Rate Limit. Retrying in 5s...`);
            await new Promise(resolve => setTimeout(resolve, 5000));
        } else if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 1500));
        } else {
            logger.error(`❌ Gemini Competitive Audit Error:`, err.message);
        }
      }
    }
    return null;
  } catch (err) {
    logger.error("❌ Gemini Competitive Audit Fatal Error:", err.message);
    return null;
  }
};

/**
 * GPT SEARCH COMPETITORS
 * Uses live web search to find current, real-world rivals for a brand.
 */
exports.gptSearchCompetitors = async function gptSearchCompetitors(brandName, domain, market = { name: 'Global' }) {
  try {
    if (!process.env.OPENAI_API_KEY) return [];
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const contextStr = market.name !== 'Global' ? `specifically in the ${market.name} market` : 'globally';

    const prompt = `
Who are the top 5 direct competitors of "${brandName}" (${domain}) in the ${market.name} market right now?

Context: ${brandName} is a ${market.name !== 'Global' ? market.name + '-based' : ''} company. I need to know which companies offer similar products/services and compete for the same customers ${market.name !== 'Global' ? 'in ' + market.name : 'globally'}.

Rules:
1. Search the web to find REAL, ACTIVE competitors that customers would actually consider as alternatives to ${brandName}.
2. Focus on competitors that are popular and well-known in ${market.name} specifically.
3. Include both local ${market.name} competitors AND global competitors that serve ${market.name}.
4. Do NOT include ${brandName} itself.
5. Return ONLY a JSON array:
[{"name": "Company Name", "domain": "company.com"}]
`;

    logger.info(`🔍 [PROJECT_AUDITOR] Searching LIVE for competitors of ${brandName}...`);
    const res = await client.responses.create({
      model: "gpt-4o",
      tools: [{ type: "web_search" }],
      input: prompt
    });

    const text = res.output_text || (res.choices && res.choices[0]?.message?.content) || (res.output && res.output.text) || '';
    const discovered = robustParseJSON(text);
    if (!discovered) {
      logger.warn(`⚠️ [PROJECT_AUDITOR] No valid JSON found in competitor search response for ${brandName}: ${text.substring(0, 100)}`);
      return [];
    }
    logger.info(`✅ [PROJECT_AUDITOR] Discovered ${discovered.length} rivals for ${brandName} via Live Search`);
    return discovered;
  } catch (err) {
    logger.error(`❌ [PROJECT_AUDITOR] Competitor Search Error:`, err.message);
    return [];
  }
};

exports.geminiSearchCompetitors = async function geminiSearchCompetitors(brandName, domain, market = { name: 'Global' }) {
  try {
    if (!process.env.GEMINI_API_KEY) return [];
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      tools: [{ googleSearch: {} }]
    });

    const prompt = `Who are the top 5 direct competitors of "${brandName}" (${domain}) in the ${market.name} market?

I need real companies that offer similar products/services and compete for the same customers ${market.name !== 'Global' ? 'in ' + market.name : 'globally'}.

Search Google to find REAL, ACTIVE competitors. Include both local and global companies that serve ${market.name}. Do NOT include ${brandName} itself.

Return ONLY a JSON array:
[{"name": "Company Name", "domain": "company.com"}]`;

    logger.info(`🔍 [PROJECT_AUDITOR] Searching GOOGLE LIVE for rivals of ${brandName}...`);
    
    let retries = 3;
    while (retries > 0) {
        try {
            const result = await model.generateContent({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.5 }
            });

            const text = result.response.text();
            const discovered = robustParseJSON(text);
            if (discovered && Array.isArray(discovered)) {
                logger.info(`✅ [PROJECT_AUDITOR] Gemini discovered ${discovered.length} rivals for ${brandName}`);
                return discovered;
            }
            retries--;
        } catch (err) {
            retries--;
            if (retries > 0) {
                logger.warn(`⚠️ Gemini Competitor Search Error. Retrying... (${retries} left)`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                logger.error(`❌ [PROJECT_AUDITOR] Gemini Competitor Search Error:`, err.message);
            }
        }
    }
    return [];
  } catch (err) {
    logger.error(`❌ [PROJECT_AUDITOR] Gemini Competitor Search Fatal Error:`, err.message);
    return [];
  }
};
