const axios = require('axios');
const logger = require('../../utils/logger');

const SITE_URL = 'https://brandvisibility.aisonx.com';
const SITE_NAME = 'GEO AI Platform';

const SYSTEM_PROMPT =
  "You are a Global Brand Intelligence expert. Identify any business entity mentioned. " +
  "Output MUST be valid JSON. If you don't know the brand, provide a generic assessment based on its name.";

// FREE MODELS ONLY (priority order) - AVOIDING GEMINI TO PREVENT 403 ERRORS
const FREE_MODELS = [
  "perplexity/sonar-reasoning",
  "google/gemini-2.5-flash:free",
  "deepseek/deepseek-r1:free",
  "meta-llama/llama-3.3-70b-instruct:free"
];



async function callModel(model, prompt, jsonMode, apiKey) {
  const body = {
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 2000,
    response_format: jsonMode ? { type: "json_object" } : undefined
  };

  const res = await axios.post(
    "https://openrouter.ai/api/v1/chat/completions",
    body,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": SITE_URL,
        "X-Title": SITE_NAME,
        "Content-Type": "application/json"
      },
      timeout: 60000
    }
  );

  let text = res.data.choices?.[0]?.message?.content || "";

  // JSON Safety Layer
  if (jsonMode) {
    try {
      JSON.parse(text);
    } catch {
      logger.warn(`[${model}] invalid JSON fixed`);
      text = JSON.stringify({ raw: text });
    }
  }

  return text;
}

/**
 * Fetch from OpenRouter with model flexibility
 * @param {string} modelId - Specific model to use (optional)
 * @param {string} prompt - The prompt to send
 * @param {boolean} jsonMode - Whether to return JSON
 */
async function fetchOpenRouter(modelId, prompt, jsonMode = false) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return "DETAILS_MISSING: Missing OpenRouter API Key";

  // If a specific model is requested (e.g. sonar-reasoning), use it directly
  if (modelId && typeof modelId === 'string' && !modelId.includes('\n')) {
    try {
      logger.info(`🧠 Using specific OpenRouter model: ${modelId}`);
      return await callModel(modelId, prompt, jsonMode, apiKey);
    } catch (err) {
      const errorMsg = err.response?.data?.error?.message || err.message;
      logger.warn(`⚠️ Specific model ${modelId} failed: ${errorMsg}`);
      
      if (err.response?.status === 402) {
         logger.warn(`💸 Model ${modelId} requires payment/credit. Falling back to FREE nodes...`);
      }
      // Fall through to free models if the specific one fails
    }
  }

  // Fallback / Default: Try FREE models in order
  let lastError = null;
  for (const model of FREE_MODELS) {
    try {
      logger.info(`🧠 Trying FREE model fallback: ${model}`);
      return await callModel(model, prompt, jsonMode, apiKey);
    } catch (err) {
      lastError = err;
      logger.warn(`⚠️ ${model} failed → trying next`);
    }
  }

  logger.error("All OpenRouter options failed", lastError?.message);
  return `OPENROUTER_ALL_MODELS_FAILED: ${lastError?.message}`;
}

module.exports = { fetchOpenRouter };
