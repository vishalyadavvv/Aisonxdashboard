const axios = require('axios');
const cheerio = require('cheerio');
const logger = require('../utils/logger');

/**
 * Scrapes the text content from a given URL to provide real-time context.
 * @param {string} url - The URL to scrape.
 * @returns {Promise<string|null>} - The cleaned text content or null if failed.
 */
const scrapeUrl = async (url) => {
    try {
        // Ensure protocol
        if (!url.startsWith('http')) {
            url = 'https://' + url;
        }

        logger.info(`🌐 Live-Scraping URL: ${url}`);

        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000 // 10s timeout
        });

        const html = response.data;
        const $ = cheerio.load(html);

        // Remove junk elements
        $('script, style, noscript, iframe, svg, header, footer').remove();

        // Extract main text
        let text = $('body').text()
            .replace(/\s+/g, ' ') // Collapse whitespace
            .trim();

        // Limit length to avoid token overflow (approx 3000 chars is usually enough for context)
        if (text.length > 4000) {
            text = text.substring(0, 4000) + "... [Content Truncated]";
        }

        logger.info(`✅ Successfully scraped ${text.length} chars from ${url}`);
        return `[REAL-TIME WEBSITE CONTENT FROM ${url}]\n${text}`;

    } catch (error) {
        logger.error(`❌ Scrape failed for ${url}: ${error.message}`);
        return null;
    }
};

module.exports = { scrapeUrl };
