const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
const logger = require("../../utils/logger");
const { cleanUrl } = require("../../utils/urlCleaner");

/**
 * Utility to follow Google Vertex AI redirect and get real URL
 */
async function resolveVertexRedirect(url) {
  if (!url || !url.includes('vertexaisearch')) return url;
  try {
    const res = await axios.head(url, {
      maxRedirects: 0,
      validateStatus: (status) => status >= 300 && status < 400,
      timeout: 3000 // 3s timeout to avoid hanging
    });
    return res.headers.location || url;
  } catch (e) {
    return url;
  }
}

/**
 * Utility to clean Google Vertex AI Grounding links and extract the destination URL
 */
function cleanGroundingUrl(url) {
  return cleanUrl(url);
}

async function geminiLive(brand) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      logger.error("❌ Gemini Live: Missing API Key");
      return "Gemini unavailable";
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // Using gemini-2.0-flash for maximum stability with search tool
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      tools: [{ googleSearch: {} }]
    });

    const prompt = `You are a Brand Intelligence Investigative Analyst performing a DEEP REAL-TIME web audit for the brand: "${brand}"

INSTRUCTIONS:
1. Use Google Search to find the MOST RECENT and FACTUAL evidence about this entity.
2. Focus on:
   - The brand's official current website and its 2026 active status.
   - SECONDARY SEARCH: Find 2-3 unique EXTERNAL domains (Trustpilot, LinkedIn, News, or Industry Directories).
   - Verifiable business classification (Company type, HQ location, Core services).
   - If the brand is obscure or small, report EXACTLY what you find (or don't find).

━━━━━━━━━━━━━━━━━━━━━━━━━━
CRITICAL RULES:
- ONLY use verifiable information discovered via Google Search in THIS session.
- NEVER rely on internal training knowledge.
- NO PREAMBLE, NO INTRODUCTIONS, and NO CONVERSATIONAL FILLER. 
- Start immediately with the findings.
- If information is missing → describe the "Void" (e.g., "Official website not discovered in search results").
- Avoid generic descriptions like "X is a global leader" unless you found a current source saying so.
━━━━━━━━━━━━━━━━━━━━━━━━━━

Write EXACTLY 4 professional audit findings. 

EACH POINT MUST:
• Be EXACTLY 1-2 lines (STRICT CONCISENESS - MAX 30 WORDS PER POINT).
• Start with the category name in bold (e.g., **Summary:**).
• Include a citation link at the end using [Source: URL] format.
• NO headers, NO paragraphs, NO preamble.

REQUIRED ORDER (Numerically 1-4):
1. **Summary**: (Market position + [Source: URL])
2. **Status**: (Active 2026 operational status + [Source: Brand Domain URL])
3. **Offering**: (Core products/services + [Source: URL])
4. **Market Positioning**: (Competitive edge and strategic differentiation + [Source: URL])

STYLE: Investigative, factual, NO marketing fluff.
If data is missing for a point, state: "Digital record limited for [Category]."

Maintain exactly one line per point. DO NOT EXCEED 30 WORDS.`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 1000
      }
    });

    if (!result || !result.response) {
      throw new Error("Empty response from Gemini API");
    }

    const response = result.response;
    
    // Check metadata explicitly and log
    const candidates = response.candidates || [];
    if (candidates[0]?.groundingMetadata) {
      const searchQueries = candidates[0].groundingMetadata.webSearchQueries || [];
      logger.info(`✅ Gemini Search used: ${JSON.stringify(searchQueries)}`);
    } else {
      logger.warn("⚠️ Gemini: No search triggered - model skipped grounding");
    }

    const text = response.text();
    
    if (!text) {
        logger.warn("⚠️ Gemini returned empty text but no error");
        return "No significant search results found by Gemini.";
    }

    // EXTRACT GROUNDING METADATA (URLs)
    let finalOutput = text;
    try {
        if (candidates[0]?.groundingMetadata) {
            const sources = candidates[0].groundingMetadata.groundingChunks || [];
            const urls = sources
                .map(chunk => chunk.web?.url)
                .filter(url => url && url.startsWith('http'));
            
            if (urls.length > 0) {
                const uniqueUrls = [...new Set(urls.map(cleanGroundingUrl))].slice(0, 5);
                logger.info(`🔗 Gemini extracted ${uniqueUrls.length} grounding URLs`);
                finalOutput += "\n\nREFERENCES FOUND:\n" + uniqueUrls.map(u => `[Source: ${u}]`).join('\n');
            }
        }
    } catch (groundingErr) {
        logger.warn("⚠️ Error extracting Gemini grounding metadata:", groundingErr.message);
    }

    return finalOutput;

  } catch (err) {
    // If the error seems search-tool related, try ONCE without search as fallback
    if (err.message.toLowerCase().includes('tool') || 
        err.message.toLowerCase().includes('grounding') || 
        err.message.toLowerCase().includes('search') ||
        err.message.toLowerCase().includes('403')) {
      
      logger.warn(`🔄 Gemini Search failed (${err.message}). Retrying WITHOUT search tool...`);
      try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const modelSafe = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const resultSafe = await modelSafe.generateContent(`Analyze "${brand}" based ONLY on known public facts as of your latest knowledge. 
If this is a specific recent website or small brand you don't know, state: "Minimal digital footprint discovered in current knowledge base."
Otherwise, provide 4 concise evidence-based findings.`);
        return resultSafe.response.text() + "\n\n(Note: Live search failed, using internal knowledge)";
      } catch (fallbackErr) {
        logger.error("❌ Gemini Fallback also failed:", fallbackErr.message);
      }
    }

    // Log more details about the error
    const detailedError = {
        message: err.message,
        stack: err.stack,
        response: err.response ? JSON.stringify(err.response) : 'No response data'
    };
    logger.error("❌ Gemini Live Error:", detailedError);
    return `Gemini search failed: ${err.message}`;
  }
}

async function geminiPromptAudit(brandName, domain, promptText) {
  try {
    if (!process.env.GEMINI_API_KEY) return null;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      tools: [{ googleSearch: {} }]
    });

    const prompt = `Use your Google Search tool to research the current (2026) visibility of "${brandName}" (${domain}) for the prompt: "${promptText}".

Analyze if "${brandName}" is recommended when searching for "best ${promptText}".

Return ONLY a JSON object in this format:
{
  "prompt": "${promptText}",
  "brand": "${brandName}",
  "isRecommended": true/false,
  "linkMentioned": true/false,
  "recommendationRank": 1-10 (0 if not found),
  "linkRank": 1-10 (0 if not found),
  "visibilityLevel": "High|Moderate|Low|None",
  "snippet": "1-2 sentences summarizing the search findings",
  "score": 0-100,
  "authoritySignals": {
    "sourceType": "Google Search Tool",
    "recallConfidence": "High|Medium|Low",
    "citations": ["List of FULL, RAW URLs found. ⚠️ SOURCE DIVERSITY: Include BOTH the official ${domain} AND any 3rd-party referral sites (reviews, news, etc.). DO NOT remove the brand's own domain from the list."]
  }
}
🚨 IMPORTANT: DO NOT say you cannot search. USE THE TOOL. Output ONLY JSON.`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1
      }
    });

    const text = result.response.text();
    logger.info(`🔍 [GEMINI_LIVE_RAW]: ${text.substring(0, 500)}...`);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in Gemini search response");

    const parsed = JSON.parse(jsonMatch[0]);
    
    // Extract REAL grounding URLs from Gemini's response metadata
    try {
      const candidates = result.response.candidates;
      if (candidates && candidates[0]?.groundingMetadata) {
        const meta = candidates[0].groundingMetadata;
        const groundingUrls = [];
        
        // Extract from groundingChunks (contains the actual web sources)
        if (meta.groundingChunks) {
          for (const chunk of meta.groundingChunks) {
            if (chunk.web && chunk.web.uri) {
              groundingUrls.push(chunk.web.uri);
            }
          }
        }
        
        // Extract from groundingSupports webSearchQueries
        if (meta.webSearchQueries) {
          logger.info(`🔍 [GEMINI_SEARCH_QUERIES]: ${meta.webSearchQueries.join(', ')}`);
        }
        
        // Override the AI's citations with REAL URLs from grounding metadata
        if (groundingUrls.length > 0) {
          // Clean all extracted grounding URLs
          const preCleaned = groundingUrls.map(url => cleanUrl(url));
          
          // STEP 2: Deep Redirect Resolution (Parallel)
          const resolvedUrls = await Promise.all(
            preCleaned.map(url => url.includes('vertexaisearch') ? resolveVertexRedirect(url) : Promise.resolve(url))
          );

          if (!parsed.authoritySignals) parsed.authoritySignals = {};
          parsed.authoritySignals.citations = [...new Set(resolvedUrls)];
          logger.info(`✅ [GEMINI_GROUNDING_URLS]: Resolved ${resolvedUrls.length} real URLs`);
        }
      }
    } catch (metaErr) {
      logger.warn(`⚠️ Could not extract Gemini grounding metadata: ${metaErr.message}`);
    }

    return parsed;
  } catch (err) {
    logger.error("❌ Gemini Prompt Audit Error:", err.message);
    return null;
  }
}

/**
 * Gemini Profile Generator — Redundant Synthesizer
 * Falls back to this if ChatGPT fails to generate the Master Profile.
 */
async function geminiProfile(brand, liveResearchContext) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      logger.error("❌ Gemini Profile: Missing GEMINI_API_KEY");
      return null;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use gemini-2.0-flash with JSON mode enforcement
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" }
    });

    const synthesisPrompt = `You are a Global Brand Analyst. Your task is to synthesize the provided LIVE RESEARCH data into a professional profile for the brand: "${brand}".

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LIVE RESEARCH DATA (PRIMARY SOURCE):
${liveResearchContext || "NO LIVE DATA FOUND IN THIS SCAN."}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STRICT REQUIREMENTS:
1. EVIDENCE PRIORITY: Every field MUST be based on the LIVE RESEARCH DATA above. 
2. INTERPRETATION: Provide a professional 2-sentence summary. Keep it concise, high-impact, and "on target". Do NOT exceed 2 sentences.
3. BRAND OPTIMIZATION CHECKLIST: Create 5 actionable items specifically for improving this brand's AI search visibility and digital footprint.
4. CITATIONS: Extract every verifiable URL found in the research text or JSON data above. 
   - You MUST look for URLs in [Source: URL] tags and extract the full URL.
   - 🚨 DO NOT use "#" or "..." for URLs. If no URL is found, omit the citation.
   - You MUST include links from ALL research data provided, including those from OpenAI/ChatGPT search nodes.
5. SCORING GUIDE: 
   - If official website + multiple citations found: Score 85-100 (High).
   - If official website found with minor mentions: Score 65-84 (Moderate).
   - If only mentions found (no official site): Score 40-64 (Low).
   - If NO verifiable live data found: Score 0-15 (Very Low).
6. NO GUESSING: If the research data is "Minimal presence" or "failed", your profile MUST reflect that brand's invisibility. 

OUTPUT FORMAT (JSON ONLY):
{
  "interpretation": "2 powerful sentences based strictly on research.",
  "visibilityLevel": "Market Leader|Highly Visible|Moderate Presence|Minimal Visibility",
  "visibilityScore": 0-100,
  "sentiment": "Positive|Neutral|Negative",
  "domainType": "Industry",
  "brandType": "Business Model",
  "coreOffering": "Main product/service",
  "prompts": ["tag1", "tag2"],
  "checklist": ["Brand Action 1", "Brand Action 2", "Brand Action 3", "Brand Action 4", "Brand Action 5"],
  "citations": [{"domain": "Official Site", "url": "https://...", "context": "Verified source"}],
  "aiVisibilityAssessment": {
    "overallLevel": "High|Moderate|Low|Very Low",
    "interpretation": "Analysis of data signals.",
    "criteria": [
      {"name": "Real-time Discoverability", "assessment": "Strong|Moderate|Low", "evidence": "Mention specific research points"},
      {"name": "Domain Authority Signal", "assessment": "Strong|Moderate|Low", "evidence": "Mention source discovery"}
    ]
  }
}`;

    logger.info(`🧠 Gemini Profile: Synthesizing profile for "${brand}" using live context...`);

    const result = await model.generateContent(synthesisPrompt);
    const text = result.response.text();
    
    // Parse JSON safely
    let parsed;
    try {
        parsed = JSON.parse(text);
    } catch (e) {
        // Fallback cleanup if Gemini includes markdown blocks despite mimeType
        const cleanText = text.replace(/```json|```/g, "").trim();
        parsed = JSON.parse(cleanText);
    }

    if (parsed.citations && Array.isArray(parsed.citations)) {
        parsed.citations = parsed.citations.map(c => ({
            ...c,
            url: cleanUrl(c.url)
        })).filter(c => c.url && c.url !== '#');
    }

    parsed.generatedAt = new Date().toISOString();
    parsed.dataSource = liveResearchContext ? 'gemini-synthesized-live' : 'gemini-expert-fallback';
    parsed.engine = 'Gemini-2.0-Flash-Master';

    logger.info(`✅ [MASTER_PROFILE] Gemini Generation complete.`);
    return parsed;

  } catch (err) {
    logger.error("❌ Gemini Profile Error:", err.message);
    return null;
  }
}

// Properly set exports
module.exports = geminiLive;
module.exports.geminiLive = geminiLive;
module.exports.geminiPromptAudit = geminiPromptAudit;
module.exports.geminiProfile = geminiProfile;
