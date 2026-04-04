// const Groq = require("groq-sdk");
const logger = require("../../utils/logger");

module.exports = async function groqLive(brand) {
  try {
    if (!process.env.GROQ_API_KEY) {
      logger.error("❌ Groq Live: Missing API Key");
      return "Groq unavailable";
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
      timeout: 30000
    });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",

      messages: [
        {
          role: "system",
          content: `
You are an offline large language model.
You DO NOT have internet access.

Rules:
- Never invent URLs
- Never claim you searched the web
- If brand is not well known say: "Minimal digital footprint found"
- Provide 3-4 concise bullet points only
- Base answer only on known/common knowledge
`
        },
        {
          role: "user",
          content: `What is known about "${brand}"?`
        }
      ],

      temperature: 0.2,
      max_tokens: 300
    });

    return completion.choices?.[0]?.message?.content || "No knowledge available";

  } catch (err) {
    logger.error("❌ Groq Live Error:", err.message);
    return "Groq unavailable";
  }
};
