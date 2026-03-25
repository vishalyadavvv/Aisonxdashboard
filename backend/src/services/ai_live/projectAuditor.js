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
1. ⚠️ ORGANIC RESEARCH: Use your web search tool. Search ONLY for the prompt text in ${market.name} (e.g. Google search the exact prompt). DO NOT include the brand name in your search query.
2. ⚠️ OBJECTIVE ANALYSIS: Review the organic search results, top articles, and lists. See if "${brandName}" is naturally mentioned or recommended.
     3. ⚠️ OBJECTIVITY: Only report a rank if the brand actually appears or is a known top-tier option.
     4. ⚠️ RANKING & SCORE: Provide a Rank (1-10). If the brand is NOT found or NOT prominently mentioned, you MUST return Rank 0 and Score 0.
     5. CITATIONS: Include the brand's domain (${domain}) as a citation only if it is actually relevant and found.
     
     OUTPUT FORMAT (JSON ARRAY):
     [
       {
         "prompt": "prompt text",
         "brand": "${brandName}",
         "isRecommended": true/false,
         "linkMentioned": true/false,
         "recommendationRank": 1-10 (0 if not found/visible),
         "linkRank": 1-10 (0 if not found/visible),
         "visibilityLevel": "High|Moderate|Low|None",
         "snippet": "1-2 sentences summarizing findings specifically for THIS prompt. If not found, say so explicitly.",
         "score": 0-100,
         "authoritySignals": {
           "sourceType": "Native OpenAI Search",
           "recallConfidence": "High|Medium|Low",
           "citations": ["FULL URLs discovered for THIS prompt."]
         }
       }
     ]
     🚨 CRITICAL: If the brand is not in the top results, Rank MUST be 0.
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
1. ORGANIC SEARCH: Search ONLY for: "What are the best options for ${promptText}?" in the ${market.name} market. DO NOT include "${brandName}" in the search query itself.
2. ⚠️ OBJECTIVE RANKING: Carefully review the search results and generated summaries. If "${brandName}" appears naturally in the top recommended lists or articles, rank it based on its actual position (Rank 1-10).
3. ⚠️ STRICT PENALTY: If the brand is NOT found in the top organic results for this generic query, report it as "None" or "Low" visibility with Rank 0. Do NOT hallucinate presence.
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
1. ORGANIC BATTLE VIEW: Search ONLY for "${promptText} in ${market.name}". DO NOT search for the brand name directly. We need to see if it ranks organically.
2. ⚠️ OBJECTIVE RECOGNITION: Scan the search results. If "${brandName}" is naturally mentioned in top articles, directories, or AI summaries, assign a realistic rank (1-10) based on how prominent it is.
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
1. ORGANIC BATTLE VIEW: Search ONLY for the prompt text in ${market.name}. DO NOT include "${brandName}" or the competitors in the search query. We want to see who ranks naturally.
2. ⚠️ OBJECTIVE MAPPING: Read the top search results. Map which of the competitors OR the target brand natively appear. Rank them based strictly on actual visibility in these results.
3. ⚠️ NO BIAS: Provide an objective assessment based SOLELY on live search data.
4. 🚨 PROOF RULES: You MUST return FULL, VALID 'https://' URLs for citations. Do NOT provide descriptive text like "site name". ONLY absolute URLs.
5. 🚨 BREVITY: Return ONLY JSON Array. ALL snippets MUST be 1 sentence (max 25 words). NO filler.
6. 🚨 MAPPING: The "brandRanking" object MUST ONLY refer to "${brandName}".
7. SCORING: 95-100 (Rank 1), 85-94 (Rank 2-3), 75-84 (Rank 4-6), 60-74 (Rank 7-10), 0 (Not Found).

OUTPUT FORMAT (JSON ARRAY OF OBJECTS):
    [
      {
        "prompt": "Exact prompt text",
        "brandRanking": { "rank": 1-10 (0 if not found), "score": 1-100 (0 if not found), "isRecommended": "true/false. MUST BE false if rank is 0 or if brand not found", "linkProvided": true/false, "snippet": "Specific findings." },
        "competitorRankings": [ { "name": "Competitor", "domain": "domain.com", "rank": 1-10, "score": 1-100, "found": true/false } ],
        "authoritySignals": { "citations": ["URLs"] }
      }
    ]
    🚨 CRITICAL: If the target brand "${brandName}" is not visible or not recommended for a prompt, its rank MUST be 0.
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
1. ORGANIC BATTLE VIEW: Search Google ONLY for "${promptText} in ${market.name}". DO NOT include the brand or competitors in the search string.
2. ⚠️ OBJECTIVE MAPPING: Review the search results. Identify if "${brandName}" or any of the rivals appear organically. Rank them solely based on this unbiased search evidence.
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
