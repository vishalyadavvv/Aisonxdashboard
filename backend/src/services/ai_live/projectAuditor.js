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
1. ⚠️ HYBRID RESEARCH: Use your web search tool. 
   - First, perform an "Organic Battle View" (Search ONLY for the prompt text in ${market.name}). 
   - Second, if "${brandName}" is NOT found in the top results, you MUST perform a "Brand Verification Search" (e.g. "${brandName} ${market.name} [prompt]") to see if they have relevant high-authority pages.
2. 🚨 DATA INTEGRITY: Provide a REALISTIC assessment. 
   - DO NOT fabricate ranks or snippets. 
   - If a brand is a global leader (like Apple, Nike, etc.) and is mentioned in top articles/lists, rank it logically (1-10) even if its own domain is not the #1 result.
   - If NO search evidence exists after both searches, return Rank 0 and Score 0 with "Not Found" in the snippet.
3. 🚨 RICH SNIPPETS: Snippet MUST be 1-2 detailed sentences (max 60 words). Explain *why* the brand ranks or what specific sentiment/content was found.
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
ROLE: You are an ACCURATE & OBJECTIVE AI Search Visibility Auditor.
TARGET MARKET: "${market.name}" ${market.context ? `(${market.context})` : ''}
TASK: Analyze if and where "${brandName}" (${domain}) appears in YOUR REAL-TIME search results for: "What are the best options for ${promptText}?" in the ${market.name} market.

INSTRUCTIONS:
1. HYBRID SEARCH: 
   - Search 1: Search for "${promptText} in ${market.name}". 
   - Search 2: If result 1 is thin, search for "${brandName} ${promptText}" to verify specific presence.
2. 🚨 DATA INTEGRITY: Provide a REALISTIC assessment. 
   - DO NOT fabricate details. If the brand is a global leader (e.g. Nike, Apple), ensure its presence is confirmed via search before reporting it as not found.
   - If NOT visible after both searches, Rank MUST be 0.
3. 🚨 RICH SNIPPETS: Snippets MUST be 1-2 detailed sentences (max 60 words). No conversational filler.
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
2. 🚨 DATA INTEGRITY: Reporting "Not Found" for a household-name brand just because it's not the #1 snippet result is WRONG. Use search grounding to find their actual position in the lists.
3. 🚨 RICH SNIPPETS: Snippets MUST be 1-2 detailed sentences (max 60 words).
4. 🚨 CITATIONS: You MUST return FULL, VALID 'https://' URLs.
5. SCORING: 
   - Strong Organic Presence: Rank 1-10, Score 60-100.
   - Mentioned but less prominent: Rank 7-10, Score 30-60.
   - Not found after thorough search: Rank 0, Score 0.

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

    const prompt = `ROLE: Professional Search Market Research Auditor.
TARGET MARKET: "${market.name}" ${market.context ? `(${market.context})` : ''}
TARGET BRAND (The Client): "${brandName}" (${domain})
COMPETITORS (The Rivals): [${compListStr}]

TASK: Use Google Search to evaluate the visibility of "${brandName}" AGAINST the rivals in the ${market.name} market for the query: "${promptText}".

INSTRUCTIONS:
1. ORGANIC BATTLE VIEW: Search Google ONLY for "${promptText} in ${market.name}". DO NOT include the brand or competitors in the search string.
2. ⚠️ TARGETED FALLBACK: If "${brandName}" is NOT found in the organic battle view, you MUST perform a second search that INCLUDES their name (e.g., "${brandName} ${promptText}") to see if they at least have relevant content.
3. ⚠️ OBJECTIVE MAPPING: Review the search results. Identify if "${brandName}" or any of the rivals appear organically. Rank them solely based on this unbiased search evidence.
4. ⚠️ NO BIAS: If rivals are more prominent in ${market.name}, rank them above "${brandName}".
5. 🚨 SCORING: 
   - Found organically: Rank 1-10, Score 60-100. 
   - Not found organically but found in fallback: Rank 0, Score 15-30.
   - Not found at all: Rank 0, Score 0.
6. 🚨 PROOF RULES: You MUST return FULL, VALID 'https://' URLs for citations. Do NOT provide integers or descriptive text. ONLY absolute URLs.
7. 🚨 BREVITY: Return ONLY JSON. Snippet MUST be 1 sentence (max 25 words). NO filler.
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
