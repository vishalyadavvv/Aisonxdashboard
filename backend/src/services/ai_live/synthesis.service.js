const OpenAI = require("openai");
const logger = require("../../utils/logger");
const { cleanUrl } = require("../../utils/urlCleaner");

const client = new OpenAI({
    tools: [{ type: "web_search" }],
    apiKey: process.env.OPENAI_API_KEY,
    timeout: 45000 // 45s for deep synthesis
});

/**
 * Perform expert synthesis of research results into a structured brand profile.
 * This service lives strictly within the ai_live folder to maintain architectural boundaries.
 */
const synthesizeBrandProfile = async (brand, validInsights) => {
    logger.info(`🧠 [ai_live] Starting expert synthesis for: ${brand}`);

    if (!process.env.OPENAI_API_KEY) {
        logger.error("❌ [ai_live] Synthesis: Missing OPENAI_API_KEY");
        throw new Error("OPENAI_API_KEY not configured");
    }

    logger.info(`🧠 [ai_live] Valid insights length: ${validInsights ? validInsights.length : 0} chars`);

    const synthesisPrompt = `You are a Global Brand Analyst. Analyze brand: "${brand}".

${validInsights ? `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATA:
${validInsights}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` : `NOTICE: No live research results. Use expert synthesis.`}

🚨 RULES:
1. BREVITY: 1-sentence summary (max 20 words) for "interpretation". 1-sentence for assessment "evidence".
2. NO FILLER: Return ONLY JSON.
3. CHECKLIST: 5 HIGH-IMPACT actions.

OUTPUT FORMAT (JSON ONLY):
{
  "interpretation": "1-sentence professional summary.",
  "visibilityLevel": "Market Leader|Highly Visible|Moderate Presence|Minimal Visibility",
  "visibilityScore": 0-100,
  "sentiment": "Positive|Neutral|Negative",
  "domainType": "Category",
  "brandType": "Model",
  "coreOffering": "Service",
  "prompts": ["Tag1", "Tag2"],
  "checklist": ["Action 1", "Action 2", "Action 3", "Action 4", "Action 5"],
  "citations": [{"domain": "Site", "url": "url", "context": "desc", "engine": "Gemini"}],
  "aiVisibilityAssessment": {
    "overallLevel": "High|Low",
    "interpretation": "1-sentence analysis.",
    "criteria": [
      {"name": "Search Footprint", "assessment": "Result", "evidence": "1-sentence proof"}
    ]
  }
}
`;

    try {
        const response = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a professional brand analyst. Output ONLY valid JSON." },
                { role: "user", content: synthesisPrompt }
            ],
            response_format: { type: "json_object" },
            temperature: 0.2
        });

        const content = response.choices[0].message.content;
        logger.info(`🧠 [ai_live] Synthesis raw response length: ${content ? content.length : 0}`);
        
        let parsed;
        try {
            parsed = JSON.parse(content);
            // Clean citations
            if (parsed.citations && Array.isArray(parsed.citations)) {
                parsed.citations = parsed.citations.map(c => ({
                    ...c,
                    url: cleanUrl(c.url)
                }));
            }
        } catch (parseErr) {
            logger.error(`❌ [ai_live] JSON parse failed: ${parseErr.message}`);
            logger.error(`❌ [ai_live] Raw content: ${content?.substring(0, 200)}`);
            throw new Error("Synthesis returned invalid JSON");
        }
        
        parsed.generatedAt = new Date().toISOString();
        parsed.dataSource = validInsights ? 'synthesized-live-research' : 'expert-synthesis-fallback';
        parsed.engine = 'OpenAI-Synthesizer-Direct';
        
        logger.info(`✅ [ai_live] Synthesis complete: domainType=${parsed.domainType}, sentiment=${parsed.sentiment}, score=${parsed.visibilityScore}`);
        return parsed;
    } catch (error) {
        logger.error(`❌ [ai_live] Synthesis Service Error: ${error.message}`);
        throw error;
    }
};

module.exports = { synthesizeBrandProfile };
