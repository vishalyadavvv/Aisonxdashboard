const axios = require('axios');
const logger = require('./logger');

/**
 * Google Search Utility
 * Uses GOOGLE_API_KEY and GOOGLE_CX from .env
 */
exports.searchGoogle = async (query) => {
    try {
        const apiKey = process.env.GOOGLE_API_KEY;
        const cx = process.env.GOOGLE_CX;

        if (!apiKey || !cx) {
            logger.warn('⚠️ Google Search: Missing API Key or CX. Falling back to internal knowledge.');
            return null;
        }

        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`;
        const { data } = await axios.get(url);

        if (!data.items || data.items.length === 0) {
            return "No results found on the live web.";
        }

        // Format top 5 results into a concise context string
        const context = data.items.slice(0, 5).map((item, i) => {
            return `[${i + 1}] ${item.title}\nURL: ${item.link}\nSnippet: ${item.snippet}\n`;
        }).join('\n');

        return context;
    } catch (err) {
        logger.error('❌ Google Search Error:', err.message);
        return null;
    }
};
