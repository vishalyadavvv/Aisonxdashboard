const Groq = require("groq-sdk");
const logger = require('../../utils/logger');

const fetchGroq = async (query, jsonMode = false, enableSearch = false) => {
  if (!process.env.GROQ_API_KEY) return 'DETAILS_MISSING: Missing Groq API Key';

  try {
    const groq = new Groq({ 
        apiKey: process.env.GROQ_API_KEY,
        timeout: 30000 
    });
    
    let systemMessage = "You are a specific AI model. Follow the user's detailed instructions exactly. Output valid JSON if requested.";
    
    const messages = [
      { role: "system", content: systemMessage },
      { role: "user", content: query }
    ];
    
    const completion = await groq.chat.completions.create({
      messages: messages,
      model: "llama-3.3-70b-versatile",
      response_format: jsonMode ? { type: "json_object" } : undefined,
      temperature: 0.1, 
      max_tokens: 2000
    });

    const response = completion.choices[0]?.message?.content || "";
    return response;
  } catch (err) {
    logger.error('❌ Groq Service Error:', err.message);
    return `Error: ${err.message}`;
  }
};

module.exports = { fetchGroq };