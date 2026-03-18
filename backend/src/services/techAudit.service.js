const axios = require('axios');
const robotsParser = require('robots-parser');
const xml2js = require('xml2js');
const logger = require('../utils/logger');

/**
 * Technical Audit Service
 * Analyzes robots.txt and sitemaps for crawlability/indexability
 */

exports.analyzeRobots = async (domain) => {
    const url = domain.startsWith('http') ? domain : `https://${domain}`;
    const robotsUrl = `${url}/robots.txt`;
    
    try {
        const response = await axios.get(robotsUrl, { timeout: 5000 });
        const robots = robotsParser(robotsUrl, response.data);
        
        return {
            found: true,
            url: robotsUrl,
            sitemaps: robots.getSitemaps(),
            isCrawlable: robots.isAllowed(url, 'GPTBot') || robots.isAllowed(url, '*'),
            raw: response.data.substring(0, 500)
        };
    } catch (err) {
        logger.warn(`Robots.txt not found for ${domain}:`, err.message);
        return { found: false, error: err.message };
    }
};

exports.analyzeSitemap = async (domain, sitemapUrl = null) => {
    const url = domain.startsWith('http') ? domain : `https://${domain}`;
    const targetUrl = sitemapUrl || `${url}/sitemap.xml`;
    
    try {
        const response = await axios.get(targetUrl, { timeout: 8000 });
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(response.data);
        
        let urlCount = 0;
        if (result.urlset && result.urlset.url) {
            urlCount = result.urlset.url.length;
        } else if (result.sitemapindex && result.sitemapindex.sitemap) {
            urlCount = result.sitemapindex.sitemap.length; // This is a sitemap index
        }

        return {
            found: true,
            url: targetUrl,
            urlCount,
            type: result.urlset ? 'Standard Sitemap' : 'Sitemap Index'
        };
    } catch (err) {
        logger.warn(`Sitemap error for ${domain}:`, err.message);
        return { found: false, error: err.message };
    }
};
