const { GoogleGenerativeAI } = require("@google/generative-ai");
const logger = require("../../utils/logger");

const fetchGemini = async (query, jsonMode = false) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || !apiKey.startsWith("AIza")) {
      logger.error("Invalid Gemini key format");
      return "GEMINI_KEY_INVALID";
    }


    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      systemInstruction: "You are a specific AI model. Follow the user's detailed instructions exactly. Output valid JSON if requested."
    });

    const generationConfig = {
      temperature: 0.1,
      maxOutputTokens: 2048,
      responseMimeType: jsonMode ? "application/json" : "text/plain"
    };

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: query }]
        }
      ],
      generationConfig
    });

    let text = result.response.text();

    // 🔒 Force JSON safety (same as OpenAI stability)
    if (jsonMode) {
      try {
        JSON.parse(text);
      } catch {
        logger.warn("Gemini returned non-JSON, fixing...");
        text = JSON.stringify({ raw: text });
      }
    }

    return text;

  } catch (err) {
    logger.error("❌ Gemini Service Error:", err.message);
    return `Error: ${err.message}`;
  }
};

const fetchGeminiWithSearch = async (query, jsonMode = false) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-flash-latest",
      tools: [{ googleSearch: {} }]
    });

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: query }] }],
      generationConfig: {
        temperature: 0.3,
        responseMimeType: jsonMode ? "application/json" : "text/plain"
      }
    });

    return result.response.text();
  } catch (err) {
    logger.error("❌ Gemini Search Error:", err.message);
    return await fetchGemini(query, jsonMode);
  }
};

module.exports = { fetchGemini, fetchGeminiWithSearch };

