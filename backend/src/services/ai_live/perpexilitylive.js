const logger = require("../../utils/logger");
const OpenAI = require("openai");
const axios = require("axios");

module.exports = async function perplexityLive(brand) {
  logger.info(`🌐 [PERPLEXITY] Initiating live search for: ${brand}`);
  
  try {
    // Check for required keys (Suppress error log if missing as user confirmed they don't have them)
    if (!process.env.OXYLABS_API_KEY) {
      logger.info("ℹ️ Perplexity Live: OXYLABS_API_KEY not configured. Skipping.");
      return "Perplexity service not configured (Missing Oxylabs Key)";
    }

    if (!process.env.OPENAI_API_KEY) {
      logger.warn("⚠️ Perplexity Live: Missing OPENAI_API_KEY for synthesis");
      return "Error: OpenAI API Key missing for synthesis";
    }

    // Dynamic import for Oxylabs SDK (ESM)
    const { OxylabsAIStudioSDK } = await import('oxylabs-ai-studio');
    
    const sdk = new OxylabsAIStudioSDK({
      apiKey: process.env.OXYLABS_API_KEY,
      timeout: 60000,
      retryAttempts: 2,
    });

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // 1. Perform Live Search with Oxylabs
    logger.info(`🔍 Oxylabs Search: Executing for "${brand}"...`);
    const searchOptions = {
      query: `${brand} official website recent news reviews`,
      limit: 5,
      return_content: true,
      geo_location: "United States",
    };

    const searchResults = await sdk.aiSearch.search(searchOptions);
    
    if (!searchResults || !searchResults.results || searchResults.results.length === 0) {
      logger.warn(`⚠️ Oxylabs Search: No results found for "${brand}"`);
      return "No significant live search results discovered for this brand.";
    }

    logger.info(`✅ Oxylabs Search: Found ${searchResults.results.length} sources.`);

    // 2. Synthesize results into structured JSON using OpenAI directly
    // (Bypassing OpenRouter per user request that it is not working)
    logger.info(`🔍 Synthesis: Using GPT-4o-mini directly for Oxylabs results...`);
    
    const synthesisPrompt = `Analyze the following raw search results for the brand "${brand}" and synthesize them into a professional, structured JSON report.

RAW SEARCH DATA:
${JSON.stringify(searchResults.results.map(r => ({ title: r.title, url: r.url, snippet: r.content })), null, 2)}

OUTPUT FORMAT (JSON ONLY):
{
  "summary": "A concise overview of the brand's digital presence (3-4 bullet points). Be specific about current activity.",
  "insights": [
    { "fact": "Direct evidence found (e.g. Current HQ, Recent funding, Official site launch)", "source": "URL" }
  ],
  "authority_score": 0-100
}

RULES:
- ONLY use the provided search data.
- If data is sparse, give a lower authority score.
- Ensure 'summary' contains only bullet points.
- Ensure ONLY valid JSON is returned.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a factual brand analyst. Output ONLY JSON." },
        { role: "user", content: synthesisPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 1000
    });

    const resultText = completion.choices[0]?.message?.content || "";
    logger.info(`✅ Perplexity Live (Oxylabs+GPT): Synthesis complete`);
    return resultText;

  } catch (err) {
    logger.error("❌ Perplexity Live (Oxylabs) Error:", err.message);
    return `Error: ${err.message}`;
  }
}
