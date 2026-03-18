const OpenAI = require('openai');
const logger = require('../../utils/logger');

const fetchOpenAI = async (query, jsonMode = false, enableSearch = false) => {
  try {
    const openai = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000 // 30s timeout
    });

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { 
          role: "system", 
          content: "You are a specific AI model. Follow the user's detailed instructions exactly. Output valid JSON if requested." 
        },
        { role: "user", content: query }
      ],
      temperature: 0.3, // Lower temperature for more stable JSON
      response_format: jsonMode ? { type: "json_object" } : undefined,
    });

    return response.choices[0].message.content;
  } catch (err) {
    logger.error('❌ OpenAI Service Error:', err.message);
    return `Error: ${err.message}`;
  }
};
module.exports = { fetchOpenAI };
