const OpenAI = require("openai");
const logger = require("../../utils/logger");
const { cleanUrl } = require("../../utils/urlCleaner");

module.exports = async function chatgptLive(brand) {

  try {
    if (!process.env.OPENAI_API_KEY) {
      logger.error("❌ ChatGPT Live: Missing OPENAI_API_KEY");
      return "ChatGPT unavailable";
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    const prompt = `Role: Brand Analyst. Task: Deep real-time audit for brand: "${brand}"
Instructions:
1. Search specifically for brand's current 2026 status and official site.
2. Report FACTUAL findings only (MAX 30 WORDS PER POINT).
3. Format: EXACTLY 4 single-line findings.
4. Categories: 1. Summary 2. Status 3. Offerings 4. Market Positioning.
5. EACH point MUST start with bold category name and end with [Source: URL]. NO intro.`;

    // Primary: Try the Responses API with web_search
    try {
      logger.info(`🔍 ChatGPT Live: Executing DEEP SEARCH for "${brand}"...`);
      const res = await client.responses.create({
        model: "gpt-4o-mini",
        tools: [{ type: "web_search" }],
        input: prompt + "\nOptimization: Max 2 searches. Do not read full pages if snippets suffice."
      });

      let text = res.output_text || (res.choices && res.choices[0]?.message?.content) || (res.output && res.output.text);
      if (text && text.length > 30) {
        // Clean any search wrapper URLs in the text
        text = text.replace(/https?:\/\/[^\s\]]+/g, match => cleanUrl(match));
        logger.info(`✅ ChatGPT Live: Live evidence discovered (${text.length} chars)`);
        return text;
      }
      logger.warn(`⚠️ ChatGPT Live: Search yielded minimal results (${text ? text.length : 0} chars), falling back...`);
    } catch (responsesErr) {
      logger.warn(`⚠️ ChatGPT Live: Search tool failed (${responsesErr.message}), falling back to direct analysis...`);
    }

    // Fallback: Use standard Chat Completions API
    // We strictly tell it NOT to guess if it doesn't have live search access here
    logger.info("🔍 ChatGPT Live: Using direct analysis fallback (Warning: No search tool)...");
    const fallbackRes = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional brand intelligence analyst. If you cannot search the live web, you must be extremely cautious and state your limitations. DO NOT guess or use outdated training data for small/obscure brands."
        },
        {
          role: "user",
          content: `Analyze the brand "${brand}" based ONLY on known public facts as of your latest knowledge. 
If this is a specific recent website or small brand you don't know, state: "Minimal digital footprint discovered in current knowledge base."
Otherwise, provide 4 concise evidence-based findings.`
        }
      ],
      temperature: 0.1, // Low temperature to reduce hallucination
      max_tokens: 600
    });

    const fallbackText = fallbackRes.choices?.[0]?.message?.content;
    if (fallbackText && fallbackText.length > 20) {
      return fallbackText;
    }

    return "No verifiable live data discovered for this brand.";

  } catch (err) {
    console.error("ChatGPT Live Error:", err.message);
    return "ChatGPT unavailable";
  }
};

/**
 * ChatGPT Profile Generator — Returns structured JSON profile directly
 * This is the MASTER PROFILE used for the AI Interpretation card.
 * STICK RULES: Prioritize liveResearchContext. Detect "Guessing" and prevent it.
 */
module.exports.chatgptProfile = async function chatgptProfile(brand, liveResearchContext) {

  try {
    if (!process.env.OPENAI_API_KEY) {
      logger.error("❌ ChatGPT Profile: Missing OPENAI_API_KEY");
      return null;
    }

    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const synthesisPrompt = `Goal: Synthesize LIVE RESEARCH for brand: "${brand}".
Data: ${liveResearchContext || "None"}
Requirements:
1. JSON ONLY. Output exactly one JSON object.
2. Interpretation: Max 2 professional sentences.
3. CHECKLIST: Provide 5 actionable brand recommendations for AI optimization.
4. Citations: Extract EVERY unique URL found in the research data, especially those from [LIVE_RESEARCH_GEMINI] and [LIVE_RESEARCH_CHATGPT].
🚨 DO NOT use "#" or "..." for URLs. DO NOT filter out Gemini sources. Include ALL valid links.
Schema: {interpretation:string, visibilityLevel:string, visibilityScore:number, sentiment:string, domainType:string, brandType:string, coreOffering:string, prompts:string[], checklist:string[], citations:[{domain:string, url:string, context:string}], aiVisibilityAssessment:{overallLevel:string, interpretation:string, criteria:[{name:string, assessment:"Strong"|"Moderate"|"Low", evidence:string}]}}`;

    logger.info(`🧠 ChatGPT Profile: Synthesizing profile for "${brand}" using live context (${liveResearchContext?.length || 0} chars)...`);

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a factual brand analyst. Output ONLY JSON. prioritize live search evidence provided in the prompt." },
        { role: "user", content: synthesisPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 800
    });

    const content = response.choices[0].message.content;
    const parsed = JSON.parse(content);
    
    if (parsed.citations && Array.isArray(parsed.citations)) {
      parsed.citations = parsed.citations.map(c => ({
        ...c,
        url: cleanUrl(c.url)
      })).filter(c => c.url && c.url !== '#');
    }
    
    parsed.generatedAt = new Date().toISOString();
    parsed.dataSource = liveResearchContext ? 'chatgpt-synthesized-live' : 'chatgpt-expert-fallback';
    parsed.engine = 'ChatGPT-Master-Direct';

    logger.info(`✅ [MASTER_PROFILE] Generation complete. Accuracy status: ${liveResearchContext ? 'Evidence-based' : 'Context-derived'}`);
    return parsed;

  } catch (err) {
    logger.error("❌ ChatGPT Profile Error:", err.message);
    return null;
  }
};

module.exports.gptPromptAudit = async function gptPromptAudit(brandName, domain, promptText) {
  try {
    if (!process.env.OPENAI_API_KEY) return null;

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const prompt = `
ROLE: You are an AI Search Visibility Auditor.
TASK: Analyze if and where "${brandName}" (${domain}) appears in your native recommendations and search results for the query: "What are the best options for ${promptText}?"

INSTRUCTIONS:
1. USE YOUR NATIVE WEB SEARCH to find current, real-time data for 2026.
2. ⚠️ TOKEN OPTIMIZATION: Perform a MAXIMUM of 1 search query. Read a MAXIMUM of 2 result pages. Do not perform deep or recursive searches.
3. Be 100% objective.
4. Determine the "Recommendation Rank" (Position in top 10 results, 0 if not found).
5. ⚠️ SOURCE DIVERSITY: You MUST include citations for BOTH the official ${domain} AND 3rd-party validation sites (News, Reviews, LinkedIn, PR). DO NOT remove the brand domain link if found.
6. SCORING CONSISTENCY: If you find ${domain} in search results or cite it as a source, "isRecommended" MUST be true and "score" MUST be > 0.
7. 🚨 LINK VS SCORE: It is a logical error to find a functional link to ${domain} and then state "Not in Top List" or 0% score. If it's discovered, it's visible.

OUTPUT FORMAT (JSON ONLY):
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
    "sourceType": "Native OpenAI Search",
    "recallConfidence": "High|Medium|Low",
    "citations": ["FULL URLs only (e.g., https://example.com/page). If no URLs found, use empty array []."]
  }
}
🚨 CRITICAL: Output ONLY valid JSON.
`;

    const res = await client.responses.create({
      model: "gpt-4o-mini",
      tools: [{ type: "web_search" }],
      input: prompt
    });

    const text = res.output_text || (res.choices && res.choices[0]?.message?.content) || (res.output && res.output.text);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in OpenAI search response");
    
    const result = JSON.parse(jsonMatch[0]);
    
    // Clean citations
    if (result.authoritySignals && Array.isArray(result.authoritySignals.citations)) {
      result.authoritySignals.citations = result.authoritySignals.citations.map(url => cleanUrl(url));
    }
    
    return result;
  } catch (err) {
    logger.error("❌ GPT Prompt Audit Error:", err.message);
    return null;
  }
};

/**
 * BATCH Prompt Audit — Sends ALL prompts in a single API call.
 * Reduces token usage from ~42K (5 separate calls) to ~10-12K (1 call).
 */
module.exports.gptBatchPromptAudit = async function gptBatchPromptAudit(brandName, domain, prompts) {
  try {
    if (!process.env.OPENAI_API_KEY) return null;

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const promptListStr = prompts.map((k, i) => `${i + 1}. "${k}"`).join('\n');
    
const prompt = `
ROLE: You are an AI Search Visibility Auditor.
TASK: Analyze if and where "${brandName}" (${domain}) appears in search results for EACH of these prompts:
${promptListStr}

INSTRUCTIONS:
1. USE YOUR NATIVE WEB SEARCH to find current, real-time data for 2026.
2. ⚠️ TOKEN OPTIMIZATION: Perform a MAXIMUM of 2 search queries total for ALL prompts.
3. ⚠️ SOURCE DIVERSITY: Include BOTH the official ${domain} AND 3rd-party "referral" links (PR, News, Reviews, etc.) in your citations. DO NOT omit the official domain if discovered.
4. SCORING CONSISTENCY: If you find ${domain} in search results for a prompt, "isRecommended" MUST be true and "score" MUST be > 0.
5. 🚨 LINK VS SCORE: Do not cite ${domain} as a source and simultaneously report 0% visibility.

OUTPUT FORMAT (JSON ARRAY — one object per prompt):
[
  {
    "prompt": "prompt text",
    "brand": "${brandName}",
    "isRecommended": true/false,
    "linkMentioned": true/false,
    "recommendationRank": 1-10 (0 if not found),
    "linkRank": 1-10 (0 if not found),
    "visibilityLevel": "High|Moderate|Low|None",
    "snippet": "1-2 sentences summarizing findings for THIS prompt",
    "score": 0-100,
    "authoritySignals": {
      "sourceType": "Native OpenAI Search",
      "recallConfidence": "High|Medium|Low",
      "citations": ["FULL URLs only. If no URLs found, use empty array []."]
    }
  }
]
🚨 CRITICAL: Output ONLY a valid JSON ARRAY with exactly ${prompts.length} objects, one per prompt. No extra text.
`;

    logger.info(`🔄 [GPT_BATCH] Auditing ${prompts.length} prompts in ONE call...`);

    const res = await client.responses.create({
      model: "gpt-4o-mini",
      tools: [{ type: "web_search" }],
      input: prompt
    });

    const text = res.output_text || (res.choices && res.choices[0]?.message?.content) || '';
    
    // Log token usage
    if (res.usage) {
      logger.info(`📊 [GPT_BATCH_TOKENS] Input: ${res.usage.input_tokens}, Output: ${res.usage.output_tokens}, Total: ${res.usage.total_tokens}`);
    }

    // Try to parse as JSON array
    const arrayMatch = text.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      const results = JSON.parse(arrayMatch[0]);
      if (Array.isArray(results)) {
        // Clean citations for each prompt in batch
        results.forEach(r => {
          if (r.authoritySignals && Array.isArray(r.authoritySignals.citations)) {
            r.authoritySignals.citations = r.authoritySignals.citations.map(url => cleanUrl(url));
          }
        });
        logger.info(`✅ [GPT_BATCH] Successfully parsed ${results.length} prompt audits`);
        return results;
      }
    }

    // Fallback: try individual JSON objects
    logger.warn('⚠️ [GPT_BATCH] Could not parse array, falling back to single prompt mode');
    return null;
  } catch (err) {
    logger.error("❌ GPT Batch Prompt Audit Error:", err.message);
    return null;
  }
};
