const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');


/**
 * Fetch website content with better error handling and robust parsing
 */
const fetchWebsiteContent = async (domain) => {
    // If no TLD provided, try common TLDs to find the real one
    if (!domain.includes('.')) {
        const commonTLDs = ['.com', '.in', '.org', '.net', '.co', '.io'];
        logger.info(`[Profiler] No TLD provided for "${domain}", trying common extensions...`);

        for (const tld of commonTLDs) {
            const testDomain = `${domain}${tld}`;
            try {
                await axios.head(`https://${testDomain}`, {
                    timeout: 5000,
                    maxRedirects: 3,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                    }
                });
                domain = testDomain;
                logger.info(`[Profiler] Resolved "${domain}" via TLD detection`);
                break;
            } catch (err) {
                // This TLD didn't work, try next
                continue;
            }
        }

        // If none resolved, default to .com and let main fetch handle the error
        if (!domain.includes('.')) {
            domain = `${domain}.com`;
            logger.info(`[Profiler] No TLD resolved, defaulting to: ${domain}`);
        }
    }

    const urls = [
        `https://${domain}`,
        `https://www.${domain}`,
        `http://${domain}`
    ];

    let lastError = null;

    for (const url of urls) {
        try {
            logger.info(`Attempting to fetch: ${url}`);
            const response = await axios.get(url, {
                timeout: 10000,
                maxRedirects: 5,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                }
            });
            
            const html = response.data;
            const $ = cheerio.load(html);
            
            const title = $('title').text().trim() || $('meta[property="og:title"]').attr('content') || '';
            const metaDesc = $('meta[name="description"]').attr('content') || $('meta[property="og:description"]').attr('content') || '';
            const h1s = $('h1').map((i, el) => $(el).text()).get().join(' | ');
            const h2s = $('h2').map((i, el) => $(el).text()).get().slice(0, 5).join(' | ');

            $('script, style, noscript, iframe, footer, nav, svg').remove();
            let bodyText = $('body').text().replace(/\s+/g, ' ').trim().substring(0, 10000);
            
            const context = `
DOMAIN: ${domain}
TITLE: ${title}
META: ${metaDesc}
H1: ${h1s}
H2: ${h2s}
BODY: ${bodyText}
            `.trim();

            logger.info(`Successfully fetched content from: ${url}`);
            return context;
            
        } catch (error) {
            lastError = error;
            logger.warn(`Failed to fetch ${url}: ${error.message}`);
            if (error.code === 'ENOTFOUND') continue;
        }
    }
    
    if (lastError && lastError.code === 'ENOTFOUND') {
        return { error: `Domain not found: "${domain}".`, isNotFound: true };
    }

    return { error: 'Website unreachable or blocking requests.', isBlocked: true };
};

/**
 * Provider: OpenAI
 */
const analyzeWithOpenAI = async (domain, content) => {
    try {
        const response = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: 'You are an Elite Venture Capital Analyst. Analyze the business model and strategic positioning. Output JSON.' },
                { role: 'user', content: `Analyze "${domain}" using this context: ${content}\n\nStrictly identify: Brand Type (include B2B/B2C/D2C classifications, Business Model, and Niche), Brand Focus (Core Value), and Strategic Interpretation.` }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1
        }, {
            headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
        });
        return JSON.parse(response.data.choices[0].message.content);
    } catch (e) { logger.error('OpenAI Error'); return null; }
};

/**
 * Provider: Gemini (The Content Architect)
 */
const analyzeWithGemini = async (domain, content) => {
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
            {
                contents: [{
                    parts: [{
                        text: `You are a Brand Architect. Analyze domain "${domain}" for Brand Profiling. Context: ${content}\n\nDefine the Brand Type as a [Target Audience: B2B/B2C/D2C] [Business Model] in a [Specific Niche]. Extract exhaustive tags, topics, and machine-perceived prompts (the 5-8 search queries someone would use to find this brand). Output JSON with these keys: brandType, brandFocus, description, presenceTags, topics, prompts.`
                    }]
                }]
            }
        );
        const text = response.data.candidates?.[0]?.content?.parts?.[0]?.text;
        const match = text?.match(/\{[\s\S]*\}/);
        const data = match ? JSON.parse(match[0]) : null;
        
        if (data) {
            return {
                ...data,
                brandType: data.brandType || 'B2C',
                brandFocus: data.brandFocus || 'General Market',
                description: data.description || `Digital platform for ${domain}`,
                presenceTags: data.presenceTags || [],
                topics: data.topics || []
            };
        }
        return null;
    } catch (e) { 
        logger.error(`Gemini Error: ${e.response?.data?.error?.message || e.message}`); 
        return null; 
    }
};


/**
 * The Master Synthesizer: Elevating Accuracy to Professional Grade
 */
const synthesizeResults = async (domain, results, websiteContent) => {
    const valid = [];
    const providers = ['OpenAI', 'Gemini'/*, 'Groq'*/];
    results.forEach((r, idx) => {
        if (r.status === 'fulfilled' && r.value) valid.push({ p: providers[idx], d: r.value });
    });

    if (valid.length === 0) throw new Error('Consensus failed: Check API keys and network.');

    const synthesisPrompt = `You are the Lead Brand Architect and Chief Strategist. I have diverse analysis feeds for the domain "${domain}".
    
    GROUND TRUTH CONTENT:
    ${websiteContent.substring(0, 8000)}
    
    AI RAW FEEDS:
    ${JSON.stringify(valid.map(v => v.d))}
    
    YOUR OBJECTIVE:
    Synthesize these into a single, high-fidelity brand intelligence report. 
    
    REFINEMENT RULES:
    1. BRAND TYPE: Strictly identify the Audience Model only (MUST be B2B, B2C, or D2C).
    2. DOMAIN TYPE: Strictly identify the Core Architecture only (e.g., "Marketplace", "SaaS Platform", "Digital Agency", "E-commerce").
    3. BRAND FOCUS: A concise 2-3 word label combining audience and architecture (e.g., "B2B Marketplace" or "B2C SaaS").
    4. DESCRIPTION: Use **Bold Typography** for the brand name. Use one powerful, high-impact sentence defining their mission (STRICT MAX 25 WORDS).
    5. SENTIMENT: One professional sentence explaining the AI's perspective (STRICT MAX 20 WORDS).
    6. INTERPRETATION: Use **Bold Typography** for key differentiators. Focus on the "Value Hypothesis"—what specific problem they solve. (STRICT MAX 20 WORDS).
    
    OUTPUT SCHEMA (Strictly JSON):
    {
      "brandType": "string",
      "brandFocus": "string",
      "description": "string",
      "sentiment": "string",
      "domainType": "string",
      "coreOffering": "string",
      "presenceTags": ["array of 10 strings"],
      "topics": ["array of strings"],
      "competitors": ["array of strings"],
      "prompts": ["array of strings"]
    }

    EVERY key must be present. Do not use generic results like 'No data found'.`;

    // Helper to run synthesis through Gemini
    const runGeminiSynthesis = async (prompt) => {
        try {
            const geminiRes = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
                {
                    contents: [{ parts: [{ text: prompt + "\n\nOutput only the valid JSON object." }] }]
                }
            );
            const geminiText = geminiRes.data.candidates?.[0]?.content?.parts?.[0]?.text;
            const geminiMatch = geminiText?.match(/\{[\s\S]*\}/);
            if (!geminiMatch) throw new Error('Gemini synthesis produced no JSON');
            return JSON.parse(geminiMatch[0]);
        } catch (err) {
            logger.error(`Gemini Synthesis Error: ${err.message}`);
            throw err;
        }
    };

    try {
        // Attempt Synthesis with OpenAI (Preferred Master)
        const res = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-4o',
            messages: [{ role: 'user', content: synthesisPrompt }],
            response_format: { type: "json_object" },
            temperature: 0.1
        }, {
            headers: { 'Authorization': `Bearer ${process.env.OPENAI_API_KEY}` }
        });
        const finalized = JSON.parse(res.data.choices[0].message.content);
        
        // Post-processing: Ensure brevity and limit arrays for premium UI
        finalized.presenceTags = (finalized.presenceTags || []).slice(0, 10);
        finalized.topics = (finalized.topics || []).slice(0, 12);
        finalized.competitors = (finalized.competitors || []).slice(0, 5);
        
        logger.info(`Successfully synthesized consensus for ${domain} via OpenAI`);
        return finalized;
    } catch (openaiError) { 
        logger.warn(`OpenAI Synthesis failed for ${domain} (${openaiError.message}). Attempting Gemini Fallback...`);
        
        try {
            // Attempt Synthesis with Gemini (Secondary Master)
            const finalized = await runGeminiSynthesis(synthesisPrompt);
            
            // Post-processing: Ensure brevity and limit arrays for premium UI (Gemini Fallback)
            finalized.presenceTags = (finalized.presenceTags || []).slice(0, 10);
            finalized.topics = (finalized.topics || []).slice(0, 12);
            finalized.competitors = (finalized.competitors || []).slice(0, 5);

            logger.info(`Successfully synthesized consensus for ${domain} via Gemini (Fallback)`);
            return finalized;
        } catch (geminiError) {
            logger.error(`Critical: Both synthesis models failed for ${domain}. Using raw data fallback.`);
            
            // Final raw data fallback
            const fallback = valid[0].d;
            return {
                brandType: fallback.brandType || 'Digital Asset',
                brandFocus: fallback.brandFocus || 'General Market',
                description: fallback.description || '',
                sentiment: fallback.sentiment || 'Neutral market sentiment.',
                domainType: fallback.domainType || 'Digital Property',
                coreOffering: fallback.coreOffering || '',
                presenceTags: (fallback.presenceTags || []).slice(0, 10),
                topics: (fallback.topics || []).slice(0, 12),
                competitors: (fallback.competitors || []).slice(0, 5),
                prompts: (fallback.prompts || []).slice(0, 8)
            };
        }
    }
};

/**
 * Multi-LLM Main Flow
 */
const analyzeDomainMulti = async (domain, content) => {
    logger.info(`Starting Multi-Agent Analysis for ${domain}`);

    let context = content;
    if (content && (content.isBlocked || content.isNotFound)) {
        logger.warn(`[Profiler] Domain ${domain} is blocked/not found. Switching to Independent Intelligence Analysis (IIA)...`);
        context = `This domain (${domain}) was unreachable by our live scraper. Perform an internal intelligence lookup using only the brand/domain name to determine its likely architecture, audience, and industry position.`;
    }

    const startTime = Date.now();
    
    // 1. Run base agents in parallel
    const results = await Promise.allSettled([
        analyzeWithOpenAI(domain, context),
        analyzeWithGemini(domain, context)
        // analyzeWithGroq(domain, context)
    ]);
    return await synthesizeResults(domain, results, context);
};

module.exports = {
    fetchWebsiteContent,
    analyzeDomainMulti
};
