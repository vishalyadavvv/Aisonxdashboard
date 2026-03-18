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
ROLE: You are an ACCURATE & OBJECTIVE AI Search Visibility Auditor specializing in the ${market.name} market.
TARGET MARKET: "${market.name}" ${market.context ? `(${market.context})` : ''}
TASK: Analyze the search presence of "${brandName}" (${domain}) for EACH prompt, SPECIFICALLY for users in the ${market.name} market:
${promptListStr}

INSTRUCTIONS:
1. ⚠️ LOCALIZED RESEARCH: Use your web search tool. Search for "${brandName} in ${market.name}" AND the prompt in ${market.name}.
2. ⚠️ HYBRID KNOWLEDGE: Combine live search results with your training data. If "${brandName}" is a known market leader or top-tier influencer marketplace in ${market.name}, you MUST rank it highly (Rank 1-3).
3. ⚠️ OBJECTIVITY: Do not be overly skeptical. If a brand is popular and well-known in ${market.name}, report it as "Highly Visible" even if it doesn't appear in the very first Google snippet today.
4. ⚠️ RANKING & SCORE: For every brand found, provide a Rank (1-10) and a Score (0-100). Rank 1 = 95-100, Rank 3 = 85-90, etc.
5. CITATIONS: Include the brand's domain (${domain}) as a citation if you confirm its relevance.

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
    "snippet": "1-2 sentences summarizing findings specifically for THIS prompt.",
    "score": 0-100,
    "authoritySignals": {
      "sourceType": "Native OpenAI Search",
      "recallConfidence": "High|Medium|Low",
      "citations": ["FULL URLs discovered for THIS prompt."]
    }
  }
]
🚨 CRITICAL: NO HALLUCINATIONS. Output ONLY valid JSON array.
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
ROLE: You are an ACCURATE & OBJECTIVE AI Search Visibility Auditor.
TARGET MARKET: "${market.name}" ${market.context ? `(${market.context})` : ''}
TASK: Analyze if and where "${brandName}" (${domain}) appears in YOUR REAL-TIME search results for: "What are the best options for ${promptText}?" in the ${market.name} market.

INSTRUCTIONS:
1. LIVE SEARCH & KNOWLEDGE: Search for "${brandName} in ${market.name}". Analyze if it surfaces as a recommendation for "${promptText}".
2. ⚠️ REGIONAL LEADERSHIP: If "${brandName}" is an established marketplace leader specifically in ${market.name}, you MUST report it as a top-rank choice (Rank 1-2, Score 90+).
3. ⚠️ GEOGRAPHIC STRICTNESS: If the brand is ONLY a leader in other countries but is NOT found in search results for ${market.name}, report it as "None" or "Low" visibility. Do NOT hallucinate presence.
4. 🚨 CITATION FLEXIBILITY: Provide citation URLs that mention "${brandName}" or its website. If no direct link is available but knowledge confirms visibility, provide the most relevant search result link.
🚨 BREVITY RULE: Return ONLY JSON. Snippets MUST be exactly 1 sentence (max 25 words). NO conversational filler or prologue.
OUTPUT FORMAT (JSON):
{
  "prompt": "${promptText}",
  "brandRanking": { "rank": 0-10, "score": 0-100, "isRecommended": true/false, "linkProvided": true/false, "snippet": "1-sentence info" },
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

/**
 * GEMINI INDIVIDUAL PROMPT AUDIT
 * Uses Google Search via Gemini to audit a single prompt.
 */
exports.geminiPromptAudit = async function geminiPromptAudit(brandName, domain, promptText, market = { name: 'Global' }) {
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
1. LOCALIZED BATTLE VIEW: Search for "${brandName} ${promptText} in ${market.name}" to find evidence of brand visibility.
2. ⚠️ MARKET RECOGNITION: If "${brandName}" is a dominant platform in ${market.name} for "${promptText}", ensure it is ranked appropriately (Top 3).
3. 🚨 SCORING: 95-100 (Rank 1), 85-94 (Rank 2-3), 75-84 (Rank 4-6), 60-74 (Rank 7-10), 0 (Not Found).
4. 🚨 PROOF RULES: You MUST return FULL, VALID 'https://' URLs for citations. Do NOT provide integers or descriptive text. ONLY absolute URLs.
5. 🚨 BREVITY: Return ONLY JSON. Snippet MUST be 1 sentence (max 25 words). NO prologue.
6. OUTPUT FORMAT (JSON ONLY):
{
  "prompt": "${promptText}",
  "brandRanking": { "rank": 0-10, "score": 0-100, "isRecommended": true/false, "linkProvided": true/false, "snippet": "1-sentence info" },
  "authoritySignals": { "sourceType": "Google Search", "citations": [] }
}
🚨 RETURN ONLY JSON.`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4 }
    });

    const text = result.response.text();
    const parsed = robustParseJSON(text);
    if (!parsed) return null;

    // Extract citations
    try {
      let allUrls = [];
      const candidates = result.response.candidates;
      if (candidates?.[0]?.groundingMetadata?.groundingChunks) {
        let groundingUrls = candidates[0].groundingMetadata.groundingChunks.map(c => c.web?.uri).filter(u => u);
        allUrls.push(...groundingUrls);
      }

      // Also extract URLs from the main text if groundingMetadata is not sufficient
      const textUrls = text.match(/(https?:\/\/[^\s]+)/g);
      if (textUrls) {
        allUrls.push(...textUrls);
      }

      if (allUrls.length > 0) {
        const cleanedUrls = [...new Set(allUrls.map(cleanUrl).filter(Boolean))];
        parsed.authoritySignals.citations = await Promise.all(cleanedUrls.map(resolveVertexRedirect));
      }
    } catch (e) {
      logger.warn("Error extracting Gemini citations:", e.message);
    }

    return parsed;
  } catch (err) {
    logger.error("❌ Gemini individual Audit Error:", err.message);
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
1. LOCALIZED BATTLE VIEW: Search for "${brandName} in ${market.name}" and compare AGANIST the rivals.
2. ⚠️ MARKET RECOGNITION: If "${brandName}" is a dominant platform in ${market.name}, ensure it is ranked appropriately (Top 3). 
3. ⚠️ NO BIAS: Provide an objective assessment based SOLELY on live search data.
4. 🚨 PROOF RULES: You MUST return FULL, VALID 'https://' URLs for citations. Do NOT provide descriptive text like "site name". ONLY absolute URLs.
5. 🚨 BREVITY: Return ONLY JSON Array. ALL snippets MUST be 1 sentence (max 25 words). NO filler.
6. 🚨 MAPPING: The "brandRanking" object MUST ONLY refer to "${brandName}".
7. SCORING: 95-100 (Rank 1), 85-94 (Rank 2-3), 75-84 (Rank 4-6), 60-74 (Rank 7-10), 0 (Not Found).

OUTPUT FORMAT (JSON ARRAY OF OBJECTS):
[
  {
    "prompt": "Exact prompt text",
    "brandRanking": { "rank": 1-10, "score": 1-100, "isRecommended": true/false, "linkProvided": true/false, "snippet": "1-sentence info" },
    "competitorRankings": [ { "name": "Competitor", "domain": "domain.com", "rank": 1-10, "score": 1-100, "found": true/false } ],
    "authoritySignals": { "citations": ["URLs"] }
  }
]
`;

    logger.info(`🔄 [COMPETITIVE] GPT Batch Audit for ${brandName} vs rivals...`);
    const res = await client.responses.create({
      model: "gpt-4o",
      tools: [{ type: "web_search" }],
      input: prompt
    });

    const text = res.output_text || (res.choices && res.choices[0]?.message?.content) || (res.output && res.output.text) || '';
    const results = robustParseJSON(text);
    if (!results) return null;
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

/**
 * GEMINI COMPETITIVE AUDIT
 * Comparative audit using Google Search.
 */
exports.geminiCompetitiveAudit = async function geminiCompetitiveAudit(brandName, domain, competitors, promptText, market = { name: 'Global' }) {
  try {
    if (!process.env.GEMINI_API_KEY) return null;
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      tools: [{ googleSearch: {} }]
    });

    const compListStr = (competitors || []).map(c => `${c.name} (${c.domain})`).join(', ');

    const prompt = `ROLE: Professional Search Market Research Auditor.
TARGET MARKET: "${market.name}" ${market.context ? `(${market.context})` : ''}
TARGET BRAND (The Client): "${brandName}" (${domain})
COMPETITORS (The Rivals): [${compListStr}]

TASK: Use Google Search to evaluate the visibility of "${brandName}" AGAINST the rivals in the ${market.name} market for the query: "${promptText}".

INSTRUCTIONS:
1. LOCALIZED BATTLE VIEW: Search for "${brandName} ${promptText} in ${market.name}" and compare AGAINST the rivals.
2. ⚠️ MARKET RECOGNITION: If "${brandName}" is a dominant platform in ${market.name}, ensure it is ranked appropriately (Top 3).
3. ⚠️ NO BIAS: If rivals are more prominent in ${market.name}, rank them above "${brandName}".
4. 🚨 SCORING: 95-100 (Rank 1), 85-94 (Rank 2-3), 75-84 (Rank 4-6), 60-74 (Rank 7-10), 0 (Not Found).
5. 🚨 PROOF RULES: You MUST return FULL, VALID 'https://' URLs for citations. Do NOT provide integers or descriptive text. ONLY absolute URLs.
6. 🚨 BREVITY: Return ONLY JSON. Snippet MUST be 1 sentence (max 25 words). NO filler.
7. OUTPUT FORMAT (JSON ONLY):
{
  "prompt": "${promptText}",
  "brandRanking": { "rank": 0-10, "score": 0-100, "isRecommended": true/false, "linkProvided": true/false, "snippet": "1-sentence info" },
  "competitorRankings": [ { "name": "X", "domain": "x.com", "rank": 0-10, "score": 0-100, "found": true/false } ],
  "authoritySignals": { "sourceType": "Google Search Comparison", "citations": [] }
}
🚨 RETURN ONLY JSON.`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.4 }
    });

    const text = result.response.text();
    const parsed = robustParseJSON(text);
    if (!parsed) return null;

    // Extract citations
    try {
      let allUrls = [];
      const candidates = result.response.candidates;
      if (candidates?.[0]?.groundingMetadata?.groundingChunks) {
        let groundingUrls = candidates[0].groundingMetadata.groundingChunks.map(c => c.web?.uri).filter(u => u);
        allUrls.push(...groundingUrls);
      }

      // Also extract URLs from the main text
      const textUrls = text.match(/(https?:\/\/[^\s]+)/g);
      if (textUrls) {
        allUrls.push(...textUrls);
      }

      if (allUrls.length > 0) {
        const cleanedUrls = [...new Set(allUrls.map(cleanUrl).filter(Boolean))];
        parsed.authoritySignals.citations = await Promise.all(cleanedUrls.map(resolveVertexRedirect));
      }
    } catch (e) {
      logger.warn("Error extracting Gemini competitive citations:", e.message);
    }

    return parsed;
  } catch (err) {
    logger.error("❌ Gemini Competitive Audit Error:", err.message);
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

/**
 * GEMINI SEARCH COMPETITORS
 * Uses Google Search to find current rivals.
 */
exports.geminiSearchCompetitors = async function geminiSearchCompetitors(brandName, domain, market = { name: 'Global' }) {
  try {
    if (!process.env.GEMINI_API_KEY) return [];
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      tools: [{ googleSearch: {} }]
    });

    const contextStr = market.name !== 'Global' ? `specifically in the ${market.name} market` : 'in 2026';

    const prompt = `Who are the top 5 direct competitors of "${brandName}" (${domain}) in the ${market.name} market?

I need real companies that offer similar products/services and compete for the same customers ${market.name !== 'Global' ? 'in ' + market.name : 'globally'}.

Search Google to find REAL, ACTIVE competitors. Include both local and global companies that serve ${market.name}. Do NOT include ${brandName} itself.

Return ONLY a JSON array:
[{"name": "Company Name", "domain": "company.com"}]`;

    logger.info(`🔍 [PROJECT_AUDITOR] Searching GOOGLE LIVE for rivals of ${brandName}...`);
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.5 }
    });

    const text = result.response.text();
    const discovered = robustParseJSON(text);
    if (!discovered) return [];
    logger.info(`✅ [PROJECT_AUDITOR] Gemini discovered ${discovered.length} rivals for ${brandName}`);
    return discovered;
  } catch (err) {
    logger.error(`❌ [PROJECT_AUDITOR] Gemini Competitor Search Error:`, err.message);
    return [];
  }
};
