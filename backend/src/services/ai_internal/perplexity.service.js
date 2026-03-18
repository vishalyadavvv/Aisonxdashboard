const logger = require('../../utils/logger');
const { fetchOpenRouter } = require('./openrouter.service');

/**
 * Perplexity Service (Search-Grounded AI)
 * Uses OpenRouter as the primary gateway for Perplexity's Sonar model.
 */
const fetchPerplexity = async (query, jsonMode = false) => {
  try {
    logger.info(`🔍 Calling Perplexity/Sonar via OpenRouter (jsonMode: ${jsonMode})`);

    // Wrap query with strict internal knowledge instructions for Perplexity Sonar
    const internalPrompt = `You are the native Perplexity AI model. Respond based ONLY on your internal training knowledge. DO NOT search the web or live indexes.
    
    ${query}`;

    // Using Perplexity's latest Sonar model via OpenRouter
    const response = await fetchOpenRouter("perplexity/sonar", internalPrompt, jsonMode);

    if (response && !response.includes("DETAILS_MISSING") && !response.includes("Error:")) {
        return response;
    }

    // High-stability fallback: If OpenRouter (Perplexity) fails, use OpenAI GPT-4
    // OpenAI has much better zero-shot knowledge for brand profiles
    logger.warn("⚠️ Perplexity/Sonar unavailable, using OpenAI fallback for deep research");
    const openai = require('./openai.service');
    const researchPrompt = `[DEEP BRAND DISCOVERY] Target: "${query}". 
    Provide current founding details, social mission (if nonprofit), and primary service list. 
    Focus on distinguishing this from similar brands. Be as specific as possible.`;
    
    return await openai.fetchOpenAI(researchPrompt, jsonMode);

  } catch (err) {
    logger.error('Perplexity Service Failed', err);
    return `Error: Search analysis unavailable. Please check your API keys.`;
  }
};

// module.exports = { fetchPerplexity };
module.exports = { fetchPerplexity: async () => "Perplexity service disabled" };
