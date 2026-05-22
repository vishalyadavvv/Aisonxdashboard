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
ROLE: You are an Expert Search Visibility & Brand Authority Analyst for the ${market.name} market.
TARGET MARKET: "${market.name}" ${market.context ? `(${market.context})` : ''}
TARGET BRAND: "${brandName}" (${domain})

TASK: Evaluate the search presence and reputation of "${brandName}" for the following queries. Think like a helpful strategist provide a detailed report.

INSTRUCTIONS:
1. ⚠️ HYBRID RESEARCH: Perform a general search. If "${brandName}" isn't in the top snippets, perform a targeted search for "${brandName} ${market.name}" to verify their depth and niche authority.
2. 🚨 DATA INTEGRITY: Prioritize finding the client. Recognize their authority if they appear in relevant articles, listicles, or niche sites.
3. 🚨 RICH ANALYTICS: Your snippet MUST be 2-3 detailed sentences (max 60 words). Explain *where* they fit in the landscape and why they are a valid option.
4. RANKING & SCORING: 
   - Assign Rank 1-10 based on evidence.
   - If found via targeted search but not general search, assign Rank 6-10 to reflect "Verified Specialized Presence."
   - Score: 0-100 based on prominence and reputation.
5. RANKING: 
   - Rank 1-10: For brands with organic presence, authoritative mentions, or verified specialized content.
   - Rank 0: ONLY if the brand is genuinely invisible or completely irrelevant.

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
    
    const prompt = `ROLE: Strict Search Market Auditor.
TARGET BRAND: "${brandName}" (${domain})
QUERY: "${promptText}" in ${market.name}

TASK: Perform an UNBIASED audit with authority proof.

INSTRUCTIONS:
1. HONEST BENCHMARK: Report Rank 1-10 only if the brand is a top leader. Report Rank 0 otherwise.
2. VERIFIED DISCOVERY: Even if Rank is 0, you MUST find the brand's verified domain and citations to prove it was audited.
3. SNIPPET: Provide a professional summary of the brand's position and offering.
4. CITATIONS: Provide 1-3 valid 'https://' links for evidence.
5. RETURN ONLY RAW JSON.

{
  "prompt": "${promptText}",
  "brandRanking": { "rank": 0-10, "score": 0-100, "isRecommended": true/false, "linkProvided": true/false, "snippet": "Objective standing + Evidence" },
  "authoritySignals": { "sourceType": "OpenAI Benchmark + Evidence", "citations": [] }
}`;

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
      model: "gemini-flash-latest",
      tools: [{ googleSearch: {} }]
    });

    const prompt = `ROLE: Strict Search Market Auditor with Authority Verification.
TARGET MARKET: "${market.name}" ${market.context ? `(${market.context})` : ''}
TARGET BRAND (The Client): "${brandName}" (${domain})

TASK: Perform a Benchmark Audit for: "${promptText}".

STRICT INSTRUCTIONS:
1. MARKET BENCHMARK (The Rank): Identify the top 10 industry leaders for this query. 
   - Report Rank 1-10 only if "${brandName}" is naturally in the top tier.
   - Report Rank 0 if the brand is not a top-tier recommendation.
2. AUTHORITY PROOF (The Evidence): Regardless of rank, you MUST perform a targeted search for "${brandName}" (${domain}) to find its citations and authority signals.
3. OUTPUT DATA:
   - "rank": The honest benchmark position (1-10 or 0).
   - "snippet": A 1-2 sentence professional analysis of their standing + specific offering.
   - "citations": You MUST return valid 'https://' URLs found for this brand.
4. 🚨 PROOF RULES: Never return empty citations if the brand exists online.
5. FORMAT: RETURN ONLY RAW JSON.

{
  "prompt": "${promptText}",
  "brandRanking": { "rank": 0-10, "score": 0-100, "isRecommended": true/false, "linkProvided": true/false, "snippet": "Honest benchmark + brand details." },
  "authoritySignals": { "sourceType": "Benchmark + Verified Discovery", "citations": ["URLs"] }
}`;

    // MAX 2 retries. On 429 rate limit → HARD STOP immediately (no retry = no spam).
    const MAX_RETRIES = 2;
    let finalResult = null;

    const callGemini = async (retriesLeft) => {
        try {
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.4 }
            });
            const text = result.response.text();
            finalResult = robustParseJSON(text);
            if (finalResult) {
                try {
                    let allUrls = [];
                    const candidates = result.response.candidates;
                    if (candidates?.[0]?.groundingMetadata?.groundingChunks) {
                        const groundingUrls = candidates[0].groundingMetadata.groundingChunks.map(c => c.web?.uri).filter(u => u);
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
            // No valid JSON parsed — try again if we have retries
            if (retriesLeft > 0) {
                await new Promise(r => setTimeout(r, 1500));
                return callGemini(retriesLeft - 1);
            }
            return null;
        } catch (err) {
            const isRetryable = err.message && (
                err.message.includes('429') || 
                err.message.includes('quota') || 
                err.message.includes('503') || 
                err.message.includes('demand')
            );
            
            if (isRetryable && retriesLeft > 0) {
                const waitTime = err.message.includes('503') ? 10000 : 3000;
                logger.warn(`⚠️ [GEMINI] Server busy/503, retrying in ${waitTime/1000}s... (${retriesLeft} left)`);
                await new Promise(r => setTimeout(r, waitTime));
                return callGemini(retriesLeft - 1);
            }

            if (retriesLeft > 0) {
                logger.warn(`⚠️ Gemini individual audit error, retrying (${retriesLeft} left): ${err.message}`);
                await new Promise(r => setTimeout(r, 2000));
                return callGemini(retriesLeft - 1);
            }
            logger.error(`❌ Gemini Individual Audit Error (max retries reached):`, err.message);
            return null;
        }
    };

    return await callGemini(MAX_RETRIES);
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
    
    // Mix the client and rivals into a single neutral list
    const allDomains = [
      { name: brandName, domain: domain },
      ...(competitors || [])
    ];
    const domainsListStr = allDomains.map(d => `${d.name} (${d.domain})`).join(', ');
    
    const prompt = `
ROLE: Professional Neutral Search Market Research Auditor.
BRANDS TO AUDIT: [${domainsListStr}]

TASK: Perform a neutral web search audit for the following prompts in the ${market.name} market.
Identify which of the audited brands naturally appear in the top organic search results for each prompt.

PROMPTS:
${promptListStr}

INSTRUCTIONS:
1. STRICTLY NEUTRAL: Treat all audited brands with absolute, 100% equality. Do NOT prioritize or perform special/dedicated searches for any single brand.
2. EVIDENCE BASED: You must only rank a brand if it naturally appears in the top organic results of a general web search for the prompt.
3. If a brand is not naturally present in the top organic search results, its rank MUST be 0 and score MUST be 0.
4. EVIDENCE ONLY: Every rank must be backed by a snippet of text from the search results that proves their presence.
5. SCORING:
   - Ranked #1: Rank 1, Score 95-100.
   - Ranked Top 3: Rank 2-3, Score 80-90.
   - Mentioned but unranked: Rank 0, Score 15-40.
   - Not found/mentioned: Rank 0, Score 0.

OUTPUT FORMAT (JSON ARRAY):
    [
      {
        "prompt": "Exact prompt text",
        "rankings": [
          {
            "name": "Brand Name",
            "domain": "brand-domain.com",
            "rank": 1-10 (0 if not found),
            "score": 0-100 (0 if not found),
            "found": true/false,
            "snippet": "Text snippet backing the ranking, or empty if not found."
          }
        ],
        "authoritySignals": { "citations": ["URLs"] }
      }
    ]
    `;

    logger.info(`🔄 [COMPETITIVE] GPT Batch Audit for ${brandName} vs rivals (Double-Blind)...`);
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

    // Map the double-blind results back to the contract format expected by controllers
    const mappedResults = results.map(r => {
      const cleanTargetDomain = domain.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').trim();
      const targetRankObj = (r.rankings || []).find(brand => {
        const cleanBrandDomain = (brand.domain || '').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').trim();
        return cleanBrandDomain === cleanTargetDomain || (brand.name && brand.name.toLowerCase() === brandName.toLowerCase());
      });

      const brandRanking = {
        rank: targetRankObj?.rank || 0,
        score: targetRankObj?.score || 0,
        isRecommended: !!(targetRankObj?.rank > 0 && targetRankObj?.rank <= 3),
        linkProvided: !!(targetRankObj?.snippet && targetRankObj.snippet.includes('http')),
        snippet: targetRankObj?.snippet || ""
      };

      // Extract competitors
      const competitorRankings = (r.rankings || [])
        .filter(brand => {
          const cleanBrandDomain = (brand.domain || '').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').trim();
          return cleanBrandDomain !== cleanTargetDomain && !(brand.name && brand.name.toLowerCase() === brandName.toLowerCase());
        })
        .map(brand => ({
          competitorName: brand.name,
          competitorDomain: brand.domain,
          rank: brand.rank || 0,
          score: brand.score || 0,
          found: brand.found || brand.rank > 0
        }));

      return {
        prompt: r.prompt,
        brandRanking,
        competitorRankings,
        authoritySignals: {
          citations: (r.authoritySignals?.citations || []).map(cleanUrl)
        }
      };
    });

    return mappedResults;
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
      model: "gemini-flash-latest",
      tools: [{ googleSearch: {} }]
    });

    const allDomains = [
      { name: brandName, domain: domain },
      ...(competitors || [])
    ];
    const domainsListStr = allDomains.map(d => `${d.name} (${d.domain})`).join(', ');

    const prompt = `ROLE: Insightful Search Market Analyst.
BRANDS TO AUDIT: [${domainsListStr}]

TASK: Perform a neutral web search audit for the query: "${promptText}" in the ${market.name} market.
Identify which of the audited brands naturally appear in the top organic search results for this prompt.

INSTRUCTIONS:
1. STRICTLY NEUTRAL: Treat all audited brands with absolute, 100% equality. Do NOT perform special/dedicated searches for any single brand.
2. EVIDENCE BASED: You must only rank a brand if it naturally appears in the top organic results of a general web search for the prompt.
3. If a brand is not naturally present in the top organic search results, its rank MUST be 0 and score MUST be 0.
4. EVIDENCE ONLY: Every rank must be backed by a snippet of text from the search results that proves their presence.
5. SCORING:
   - Ranked #1: Rank 1, Score 95-100.
   - Ranked Top 3: Rank 2-3, Score 80-90.
   - Mentioned but unranked: Rank 0, Score 15-40.
   - Not found/mentioned: Rank 0, Score 0.

OUTPUT FORMAT (JSON ONLY):
{
  "prompt": "${promptText}",
  "rankings": [
    {
      "name": "Brand Name",
      "domain": "brand-domain.com",
      "rank": 1-10 (0 if not found),
      "score": 0-100 (0 if not found),
      "found": true/false,
      "snippet": "Text snippet backing the ranking, or empty if not found."
    }
  ],
  "authoritySignals": { "sourceType": "Google Search Comparison", "citations": [] }
}
🚨 RETURN ONLY JSON.`;

    // MAX 2 retries. On 429 rate limit → HARD STOP immediately (no retry = no spam).
    const MAX_RETRIES = 2;
    let finalResult = null;

    const callGeminiCompetitive = async (retriesLeft) => {
        try {
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.4 }
            });
            const text = result.response.text();
            const rawResult = robustParseJSON(text);
            if (rawResult) {
                // Find our target brand's ranking in the blind search rankings list
                const cleanTargetDomain = domain.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').trim();
                const targetRankObj = (rawResult.rankings || []).find(brand => {
                  const cleanBrandDomain = (brand.domain || '').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').trim();
                  return cleanBrandDomain === cleanTargetDomain || (brand.name && brand.name.toLowerCase() === brandName.toLowerCase());
                });

                const brandRanking = {
                  rank: targetRankObj?.rank || 0,
                  score: targetRankObj?.score || 0,
                  isRecommended: !!(targetRankObj?.rank > 0 && targetRankObj?.rank <= 3),
                  linkProvided: !!(targetRankObj?.snippet && targetRankObj.snippet.includes('http')),
                  snippet: targetRankObj?.snippet || ""
                };

                // Extract competitors
                const competitorRankings = (rawResult.rankings || [])
                  .filter(brand => {
                    const cleanBrandDomain = (brand.domain || '').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '').trim();
                    return cleanBrandDomain !== cleanTargetDomain && !(brand.name && brand.name.toLowerCase() === brandName.toLowerCase());
                  })
                  .map(brand => ({
                    competitorName: brand.name,
                    competitorDomain: brand.domain,
                    rank: brand.rank || 0,
                    score: brand.score || 0,
                    found: brand.found || brand.rank > 0
                  }));

                finalResult = {
                  prompt: rawResult.prompt || promptText,
                  brandRanking,
                  competitorRankings,
                  authoritySignals: rawResult.authoritySignals || { sourceType: "Google Search Comparison", citations: [] }
                };

                try {
                    let allUrls = [];
                    const candidates = result.response.candidates;
                    if (candidates?.[0]?.groundingMetadata?.groundingChunks) {
                        const groundingUrls = candidates[0].groundingMetadata.groundingChunks.map(c => c.web?.uri).filter(u => u);
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
            if (retriesLeft > 0) {
                await new Promise(r => setTimeout(r, 1500));
                return callGeminiCompetitive(retriesLeft - 1);
            }
            return null;
        } catch (err) {
            const isRetryable = err.message && (
                err.message.includes('429') || 
                err.message.includes('quota') || 
                err.message.includes('503') || 
                err.message.includes('demand')
            );
            
            if (isRetryable && retriesLeft > 0) {
                const waitTime = err.message.includes('503') ? 10000 : 3000;
                logger.warn(`⚠️ [GEMINI] Server busy (503/429), retrying in ${waitTime/1000}s... (${retriesLeft} left)`);
                await new Promise(r => setTimeout(r, waitTime));
                return callGeminiCompetitive(retriesLeft - 1);
            }
            if (retriesLeft > 0) {
                logger.warn(`⚠️ Gemini competitive error, retrying (${retriesLeft} left): ${err.message}`);
                await new Promise(r => setTimeout(r, 2000));
                return callGeminiCompetitive(retriesLeft - 1);
            }
            logger.error(`❌ Gemini Competitive Audit Error (max retries reached):`, err.message);
            return null;
        }
    };

    return await callGeminiCompetitive(MAX_RETRIES);
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
1. CATEGORY FIRST: Identify the brand's actual business category (e.g., EdTech, SaaS, E-commerce).
2. REAL RIVALS: Search for competitors that offer the SAME service as ${brandName}. Do NOT match by name similarity (e.g., if a brand is 'Apple' for technology, do NOT return 'Apple Orchard' for agriculture).
3. ACTIVE PLAYERS: Only return brands that are currently active in the ${market.name} market.
4. VARIETY: Include both major global leaders and strong local players in ${market.name}.
5. Return ONLY a JSON array:
[{"name": "Company Name", "domain": "company.com"}]
`;

    logger.info(`🔍 [PROJECT_AUDITOR] Searching LIVE for competitors of ${brandName}...`);
    
    let retries = 3;
    while (retries > 0) {
      try {
        const res = await client.responses.create({
          model: "gpt-4o",
          tools: [{ type: "web_search" }],
          input: prompt
        });

        const text = res.output_text || (res.choices && res.choices[0]?.message?.content) || (res.output && res.output.text) || '';
        const discovered = robustParseJSON(text);
        if (discovered && Array.isArray(discovered)) {
          logger.info(`✅ [PROJECT_AUDITOR] Discovered ${discovered.length} rivals for ${brandName} via Live Search`);
          return discovered;
        }
        retries--;
      } catch (err) {
        retries--;
        const isRetryable = err.message && (err.message.includes('429') || err.message.includes('503') || err.message.includes('timeout'));
        if (isRetryable && retries > 0) {
          logger.warn(`⚠️ OpenAI Competitor Search Error. Retrying... (${retries} left)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
          logger.error(`❌ [PROJECT_AUDITOR] Competitor Search Error:`, err.message);
          return [];
        }
      }
    }
    return [];
  } catch (err) {
    logger.error(`❌ [PROJECT_AUDITOR] Competitor Search Fatal Error:`, err.message);
    return [];
  }
};

exports.geminiSearchCompetitors = async function geminiSearchCompetitors(brandName, domain, market = { name: 'Global' }) {
  try {
    if (!process.env.GEMINI_API_KEY) return [];
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
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
