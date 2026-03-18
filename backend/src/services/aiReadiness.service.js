const axios = require('axios');
const cheerio = require('cheerio');
const xml2js = require('xml2js');
const { URL } = require('url');

// Common queries database
const COMMON_QUERIES = {
    general: [
        { parentQuery: 'Content Creation Strategies', query: 'What are the latest articles?', path: '/blog/', reason: 'Blogs provide updates and insights.', intentType: 'Informational', queryLayer: 'Adjacent Topics' },
        { parentQuery: 'Brand Collaboration Opportunities', query: 'What guides are available?', path: '/guides/', reason: 'Guides offer in-depth resources.', intentType: 'How-to', queryLayer: 'Problem-Solution' },
        { parentQuery: 'Content Creation Strategies', query: 'What topics are covered?', path: '/topics/', reason: 'Topics help categorize content.', intentType: 'Informational', queryLayer: 'Adjacent Topics' },
        { parentQuery: 'Influencer Marketing Trends', query: 'Who are the authors?', path: '/authors/', reason: 'Author pages build credibility.', intentType: 'Informational', queryLayer: 'Related Concepts' },
        { parentQuery: 'Content Creation Strategies', query: 'What resources are available?', path: '/resources/', reason: 'Resources provide valuable tools.', intentType: 'Informational', queryLayer: 'Related Concepts' },
        { parentQuery: 'Brand Consistency', query: 'What is the mission and vision?', path: '/about/', reason: 'About pages establish trust.', intentType: 'Informational', queryLayer: 'Core Entity' },
        { parentQuery: 'Customer Support', query: 'How can I get in touch?', path: '/contact/', reason: 'Contact pages facilitate communication.', intentType: 'Navigational', queryLayer: 'Core Entity' },
        { parentQuery: 'Audience Engagement', query: 'Is there a newsletter?', path: '/newsletter/', reason: 'Newsletters keep users engaged.', intentType: 'Actionable', queryLayer: 'Conversion' },
        { parentQuery: 'Content Organization', query: 'What categories are available?', path: '/categories/', reason: 'Categories help organize content.', intentType: 'Navigational', queryLayer: 'Structure' }
    ],
    ecommerce: [
        { parentQuery: 'Product Availability', query: 'What products are available?', path: '/products/', reason: 'Product pages showcase offerings.', intentType: 'Transactional', queryLayer: 'Core Product' },
        { parentQuery: 'Pricing Information', query: 'How much does it cost?', path: '/pricing/', reason: 'Pricing pages inform purchasing decisions.', intentType: 'Commercial', queryLayer: 'Decision Making' },
        { parentQuery: 'Order Logistics', query: 'What are the shipping options?', path: '/shipping/', reason: 'Shipping info impacts buying decisions.', intentType: 'Informational', queryLayer: 'Logistics' },
        { parentQuery: 'Customer Trust', query: 'What is the return policy?', path: '/returns/', reason: 'Return policies build trust.', intentType: 'Informational', queryLayer: 'Trust & Safety' },
        { parentQuery: 'Special Offers', query: 'Are there any deals?', path: '/deals/', reason: 'Deals attract price-conscious customers.', intentType: 'Transactional', queryLayer: 'Promotion' },
        { parentQuery: 'Product Discovery', query: 'What categories exist?', path: '/categories/', reason: 'Categories help product discovery.', intentType: 'Navigational', queryLayer: 'Structure' },
        { parentQuery: 'Order Logistics', query: 'How can I track my order?', path: '/track-order/', reason: 'Order tracking enhances experience.', intentType: 'Navigational', queryLayer: 'Post-Purchase' },
        { parentQuery: 'Checkout Process', query: 'What payment methods are accepted?', path: '/payment-methods/', reason: 'Payment info reduces friction.', intentType: 'Informational', queryLayer: 'Checkout' },
        { parentQuery: 'Customer Support', query: 'Is there a FAQ?', path: '/faq/', reason: 'FAQs answer common questions.', intentType: 'Informational', queryLayer: 'Support' }
    ],
    saas: [
        { parentQuery: 'Product Capabilities', query: 'What features are available?', path: '/features/', reason: 'Feature pages explain capabilities.', intentType: 'Informational', queryLayer: 'Core Product' },
        { parentQuery: 'Subscription Costs', query: 'How much does it cost?', path: '/pricing/', reason: 'Pricing transparency is crucial for SaaS.', intentType: 'Commercial', queryLayer: 'Decision Making' },
        { parentQuery: 'Technical Implementation', query: 'Is there documentation?', path: '/docs/', reason: 'Documentation helps users implement.', intentType: 'How-to', queryLayer: 'Technical Support' },
        { parentQuery: 'Platform Ecosystem', query: 'What integrations are supported?', path: '/integrations/', reason: 'Integrations show ecosystem fit.', intentType: 'Informational', queryLayer: 'Ecosystem' },
        { parentQuery: 'Social Proof', query: 'Are there case studies?', path: '/case-studies/', reason: 'Case studies prove value.', intentType: 'Commercial', queryLayer: 'Validation' },
        { parentQuery: 'User Acquisition', query: 'Is there a free trial?', path: '/trial/', reason: 'Trial pages reduce friction.', intentType: 'Transactional', queryLayer: 'Conversion' },
        { parentQuery: 'Developer Experience', query: 'What is the API documentation?', path: '/api/', reason: 'API docs enable developers.', intentType: 'Technical', queryLayer: 'Developer Tools' },
        { parentQuery: 'Customer Success', query: 'How do I get support?', path: '/support/', reason: 'Support pages provide help.', intentType: 'Navigational', queryLayer: 'Support' },
        { parentQuery: 'Data Protection', query: 'What security measures exist?', path: '/security/', reason: 'Security info builds trust.', intentType: 'Informational', queryLayer: 'Trust & Compliance' }
    ]
};

// Fetch URL with error handling - Returns full response for header checks
async function fetchUrlResponse(url, timeout = 10000) {
    try {
        const response = await axios.get(url, {
            timeout,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.google.com/',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'cross-site',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1',
                'DNT': '1'
            },
            validateStatus: status => status < 600 // Capture all status codes for better error reporting
        });
        return response;
    } catch (error) {
        // console.error(`Error fetching ${url}:`, error.message);
        return { 
            status: error.response?.status || 0, 
            data: null, 
            error: error.message,
            code: error.code // Capture 'ECONNRESET', 'ETIMEDOUT', etc.
        };
    }
}

// Wrapper for backward compatibility (just body)
async function fetchUrl(url, timeout) {
    const res = await fetchUrlResponse(url, timeout);
    return (res && res.data) ? res.data : null;
}

// Find sitemap
async function findSitemap(baseUrl) {
    console.log(`Searching for sitemap at ${baseUrl}`);
    
    // Check robots.txt FIRST as it is the most authoritative source
    console.log('Checking robots.txt for sitemap');
    const robotsUrl = new URL('/robots.txt', baseUrl).href;
    const robotsContent = await fetchUrl(robotsUrl);
    
    if (robotsContent) {
        const lines = robotsContent.split('\n');
        for (const line of lines) {
            if (line.toLowerCase().startsWith('sitemap:')) {
                let sitemapUrl = line.split(':', 2)[1].trim();
                // Ensure absolute URL
                if (sitemapUrl.startsWith('/')) {
                    sitemapUrl = new URL(sitemapUrl, baseUrl).href;
                }
                
                // Verify it exists and is XML before returning
                const res = await fetchUrlResponse(sitemapUrl);
                if (res && res.status === 200 && res.data) {
                    const content = typeof res.data === 'string' ? res.data.trim() : '';
                    if (content.startsWith('<?xml') || content.includes('<urlset') || content.includes('<sitemapindex')) {
                        console.log(`Found valid sitemap in robots.txt: ${sitemapUrl}`);
                        return sitemapUrl;
                    }
                }
            }
        }
    }

    const sitemapPaths = [
        '/sitemap.xml',
        '/sitemap_index.xml',
        '/sitemap1.xml',
        '/sitemap-index.xml'
    ];
    
    // Try common sitemap locations only if robots.txt didn't specify one
    for (const path of sitemapPaths) {
        const sitemapUrl = new URL(path, baseUrl).href;
        const res = await fetchUrlResponse(sitemapUrl);
        if (res && res.status === 200 && res.data) {
            const content = typeof res.data === 'string' ? res.data.trim() : '';
            if (content.startsWith('<?xml') || content.includes('<urlset') || content.includes('<sitemapindex')) {
                console.log(`Found valid sitemap at ${sitemapUrl}`);
                return sitemapUrl;
            }
        }
    }
    
    console.warn(`No sitemap found for ${baseUrl}`);
    return null;
}

// Parse sitemap XML
async function parseSitemap(sitemapUrl, discoveredSubSitemaps = []) {
    const content = await fetchUrl(sitemapUrl);
    if (!content) {
        console.warn(`Empty content for sitemap: ${sitemapUrl}`);
        return [];
    }
    
    const urls = [];
    
    try {
        const parser = new xml2js.Parser({ explicitArray: true, ignoreAttrs: true });
        const result = await parser.parseStringPromise(content.replace(/&(?!(amp|lt|gt|quot|apos);)/g, '&amp;'));
        
        // Check if it's a sitemap index
        if (result.sitemapindex && result.sitemapindex.sitemap) {
            const sitemaps = result.sitemapindex.sitemap;
            for (let i = 0; i < Math.min(sitemaps.length, 10); i++) { // Increased to 10
                const subUrl = sitemaps[i].loc[0];
                if (!discoveredSubSitemaps.includes(subUrl)) {
                    discoveredSubSitemaps.push(subUrl);
                }
                console.log(`Fetching sub-sitemap: ${subUrl}`);
                const subUrls = await parseSitemap(subUrl, discoveredSubSitemaps); // Recursive
                urls.push(...subUrls);
            }
        } 
        // Regular sitemap
        else if (result.urlset && result.urlset.url) {
            const urlNodes = result.urlset.url;
            for (const urlNode of urlNodes) {
                if (urlNode.loc && urlNode.loc[0]) {
                    urls.push(urlNode.loc[0]);
                }
            }
        }
    } catch (error) {
        console.error('Error parsing sitemap XML:', error.message);
    }
    
    // Fallback: regex parsing if XML parsing failed OR returned 0 URLs (e.g. unrecognized structure or HTML)
    if (urls.length === 0) {
        console.log(`XML parsing yielded 0 URLs. Trying regex fallback for ${sitemapUrl}`);
        const urlPattern = /<loc>(.*?)<\/loc>/g;
        let match;
        while ((match = urlPattern.exec(content)) !== null) {
            urls.push(match[1]);
        }
        console.log(`Regex fallback found ${urls.length} URLs`);
    }
    
    return urls;
}

// Classify business type
// Classify business type
function classifyBusiness(baseUrl, sitemapUrls) {
    const urlText = sitemapUrls.join(' ').toLowerCase();
    
    // E-commerce Indicators (unchanged)
    const ecommerceIndicators = ['product', 'shop', 'cart', 'checkout', 'store', 'marketplace'];
    const ecommerceScore = ecommerceIndicators.reduce((score, indicator) => 
        score + (urlText.includes(indicator) ? 1 : 0), 0);
    
    // SaaS Detection - Require STRONG signals (not just weak ones)
    const saasStrong = ['login', 'signin', 'signup', 'register', 'app.', '/app/', 'dashboard', 'portal', 'trial'];
    const saasMedium = ['api', 'docs', 'documentation', 'integration', 'webhook', 'sdk'];
    
    let saasScore = 0;
    let hasStrongSaasSignal = false;
    
    saasStrong.forEach(indicator => {
        if (urlText.includes(indicator)) {
            saasScore += 3; // Increased from 2
            hasStrongSaasSignal = true;
        }
    });
    
    saasMedium.forEach(indicator => {
        if (urlText.includes(indicator)) {
            saasScore += 1.5; // Increased from 1
        }
    });
    
    /*
    // Agency Detection (NEW - prevents misclassification)
    const agencyIndicators = ['portfolio', 'clients', 'projects', 'services', 'team'];
    const agencyScore = agencyIndicators.reduce((score, indicator) => 
        score + (urlText.includes(indicator) ? 1 : 0), 0);
    */
    
    // Classification Logic with stricter thresholds
    if (ecommerceScore >= 3) {
        return 'E-commerce';
    }
    
    // Require at least ONE strong signal AND score >= 4.5 for SaaS
    if (hasStrongSaasSignal && saasScore >= 4.5) {
        return 'SaaS';
    }
    
    /*
    // Agency if clear indicators
    if (agencyScore >= 3 && saasScore < 4.5) {
        return 'Agency';
    }
    */
    
    return 'General';
}

// Extract and normalize path
function extractPath(url) {
    try {
        const parsed = new URL(url);
        return parsed.pathname.replace(/\/$/, '') || '/';
    } catch {
        return '/';
    }
}

function normalizePath(path) {
    return path.toLowerCase().replace(/\/$/, '');
}

// Dynamically generate queries using OpenAI
async function generateAndCheckQueries(baseUrl, sitemapUrls, businessType) {
    let queriesToCheck = [];
    
    try {
        console.log(`Generating Dynamic Fan-Out Queries for ${baseUrl} (${businessType}) using OpenAI...`);
        const prompt = `You are an expert AI Search optimization engine. Analyze what queries users would ask AI systems (like ChatGPT or Perplexity) to find pages on a ${businessType} website like ${baseUrl}.
Generate exactly 9 high-intent Fan-Out Sub-Queries that a well-structured website in this niche MUST have.
Return ONLY a raw JSON array of objects. Do not wrap in markdown tags like \`\`\`json. Each object must have:
- "parentQuery": A broad category query (e.g. "Content Creation Strategies")
- "query": The specific sub-query someone might ask an AI (e.g. "What are the latest tools for content creation?")
- "path": The expected URL slug/path where the answer should live (e.g., "/blog/content-tools/")
- "reason": Why an AI expects this page to exist.
- "intentType": "Informational", "Transactional", "Navigational", "Commercial", or "How-to".
- "queryLayer": "Core Entity", "Adjacent Topics", "Problem-Solution", "Decision Making", etc.`;

        const response = await fetchOpenAI([
            { role: "system", content: "You are a senior SEO and AI-Readiness technical expert. Output ONLY raw JSON." },
            { role: "user", content: prompt }
        ], 1000, 0.4);

        if (response) {
            queriesToCheck = JSON.parse(response.replace(/```json/g, '').replace(/```/g, '').trim());
            console.log(`Successfully generated ${queriesToCheck.length} dynamic queries.`);
        }
    } catch (e) {
        console.warn(`Failed to generate dynamic queries, falling back to static lists. Error: ${e.message}`);
    }

    // Fallback to static if dynamic failed or returned empty
    if (!queriesToCheck || queriesToCheck.length === 0) {
        queriesToCheck = [...COMMON_QUERIES.general];
        if (businessType === 'SaaS' && COMMON_QUERIES.saas) {
            queriesToCheck = [...queriesToCheck, ...COMMON_QUERIES.saas];
        } else if (businessType === 'E-commerce' && COMMON_QUERIES.ecommerce) {
            queriesToCheck = [...queriesToCheck, ...COMMON_QUERIES.ecommerce];
        }
    }

    // Check each unique query against sitemap
    console.log(`Checking ${queriesToCheck.length} queries against sitemap...`);
    const sitemapPaths = sitemapUrls.map(url => normalizePath(extractPath(url)));
    
    return queriesToCheck.map(queryInfo => {
        const expectedPath = normalizePath(queryInfo.path);
        const isPresent = sitemapPaths.some(path => 
            path.includes(expectedPath) || path.startsWith(expectedPath)
        );
        
        return {
            parentQuery: queryInfo.parentQuery || 'General Query',
            query: queryInfo.query,
            path: queryInfo.path,
            reason: queryInfo.reason,
            intentType: queryInfo.intentType || 'Informational',
            queryLayer: queryInfo.queryLayer || 'Core Layer',
            status: isPresent ? 'present' : 'missing',
            action: isPresent ? 'No Action Needed' : 'Create Page'
        };
    });
}

const { fetchOpenAI } = require('./ai_internal/openai.service');

// Helper to scrape content from a URL
async function scrapeContent(url) {
    console.log(`Scraping content from ${url}...`);
    const html = await fetchUrl(url);
    if (!html) return "";

    try {
        const $ = cheerio.load(html);
        
        // Remove noise
        $('script, style, iframe, nav, footer, header').remove();
        
        // Extract meaningful text specific to the page using semantic tags and headers
        const title = $('title').text().trim();
        const headings = $('h1, h2, h3').map((i, el) => $(el).text().trim()).get().join('\n');
        const mainContent = $('main, article, div.content, div.main').text().replace(/\s+/g, ' ').trim();
        
        // Fallback if semantic tags are missing
        const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
        
        const finalContent = `Title: ${title}\nHeadings: ${headings}\nContent: ${mainContent || bodyText.substring(0, 5000)}`;
        
        // Limit to ~500 words to save tokens while capturing essence
        return finalContent.substring(0, 2000);
    } catch (e) {
        console.warn(`Scraping failed for ${url}:`, e.message);
        return "";
    }
}


const robotsParser = require('robots-parser');
const externalEntityService = require('./externalEntity.service');

// 1. Robots.txt & Bot Accessibility Analysis
async function checkRobotsTxt(baseUrl) {
    const robotsUrl = new URL('/robots.txt', baseUrl).href;
    const result = {
        exists: false,
        status: 404,
        gptBot: 'Allowed',
        googleExtended: 'Allowed',
        claudeBot: 'Allowed', 
        ccBot: 'Allowed', 
        perplexityBot: 'Allowed',
        appleBot: 'Allowed',
        amazonBot: 'Allowed',
        byteSpider: 'Allowed',
        metaBot: 'Allowed',
        contentSignals: {
            search: 'Unknown',
            aiInput: 'Unknown',
            aiTrain: 'Unknown',
            aiTrainFine: 'Unknown',
            aiTrainBase: 'Unknown'
        },
        globalDisallow: false,
        xRobotsTag: 'None',
        metaNoindex: false 
    };

    try {
        // Use fetchUrlResponse to get headers and status
        const response = await fetchUrlResponse(robotsUrl);
        
        if (response) {
            result.status = response.status;
            
            // Only parse if it's a valid 200 OK
            if (response.status === 200 && response.data) {
                const robotsContent = typeof response.data === 'string' ? response.data : '';
                
                // If the response is HTML, it's NOT a valid robots.txt (could be a 404 page returning 200)
                if (robotsContent.trim().toLowerCase().startsWith('<!doctype') || robotsContent.toLowerCase().includes('<html')) {
                    console.warn(`Robots.txt at ${robotsUrl} returned HTML instead of text. Ignoring.`);
                    result.exists = false;
                } else {
                    result.exists = true;
                    const robots = robotsParser(robotsUrl, robotsContent);
                    
                    const agents = [
                        { name: 'GPTBot', key: 'gptBot' },
                        { name: 'Google-Extended', key: 'googleExtended' },
                        { name: 'ClaudeBot', key: 'claudeBot' },
                        { name: 'CCBot', key: 'ccBot' },
                        { name: 'PerplexityBot', key: 'perplexityBot' },
                        { name: 'Applebot-Extended', key: 'appleBot' },
                        { name: 'Amazonbot', key: 'amazonBot' },
                        { name: 'Bytespider', key: 'byteSpider' },
                        { name: 'meta-externalagent', key: 'metaBot' }
                    ];

                    const checkUrl = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';

                    for (const agent of agents) {
                        // Check specific bot block
                        if (robots.isDisallowed(checkUrl, agent.name)) {
                            result[agent.key] = 'Blocked';
                        } else {
                            result[agent.key] = 'Allowed';
                        }
                    }
                    
                    if (robots.isDisallowed(checkUrl, '*')) {
                        result.globalDisallow = true;
                    }

                    // Parse Content-Signal (Cloudflare/Advanced Standard)
                    // Format: Content-Signal: search=yes,ai-train=no
                    const contentSignalMatch = robotsContent.match(/Content-Signal:\s*(.*)/i);
                    if (contentSignalMatch && contentSignalMatch[1]) {
                        const signals = contentSignalMatch[1].split(',');
                        signals.forEach(s => {
                            const [key, val] = s.split('=').map(item => item.trim().toLowerCase());
                            if (key === 'search') result.contentSignals.search = val === 'yes' ? 'Allowed' : 'Restricted';
                            if (key === 'ai-input') result.contentSignals.aiInput = val === 'yes' ? 'Allowed' : 'Restricted';
                            if (key === 'ai-train') result.contentSignals.aiTrain = val === 'yes' ? 'Allowed' : 'Restricted';
                            if (key === 'ai-train-fine') result.contentSignals.aiTrainFine = val === 'yes' ? 'Allowed' : 'Restricted';
                            if (key === 'ai-train-base') result.contentSignals.aiTrainBase = val === 'yes' ? 'Allowed' : 'Restricted';
                        });
                    }
                }
            } 
            // If Forbidden (403), we assume blocked
            else if (response.status === 403 || response.status === 401) {
                result.exists = true; 
                result.gptBot = 'Blocked';
                result.googleExtended = 'Blocked';
                result.claudeBot = 'Blocked';
                result.ccBot = 'Blocked';
                result.perplexityBot = 'Blocked';
                result.appleBot = 'Blocked';
                result.amazonBot = 'Blocked';
                result.byteSpider = 'Blocked';
                result.metaBot = 'Blocked';
                result.globalDisallow = true;
            }
            // 404 is already "Allowed" by default in the 'result' object
        }
        
        // Check X-Robots-Tag header on Homepage
        const homeRes = await fetchUrlResponse(baseUrl);
        if (homeRes && homeRes.headers) {
             const xRobots = homeRes.headers['x-robots-tag'];
             if (xRobots) {
                 result.xRobotsTag = xRobots;
                 if (xRobots.toLowerCase().includes('noindex')) {
                     result.metaNoindex = true;
                 }
             }
        }
        
    } catch (e) {
        console.warn('Robots.txt check failed:', e.message);
    }
    
    return result;
}

// 2. Structured Data Analysis
function analyzeStructuredData(html, baseUrl) {
    const results = {
        jsonLdPresent: false,
        schemaTypes: [], // Store simple names
        errors: [],
        sameAsCount: 0,
        logoDetected: false,
        // Specific Schemas
        organizationPresent: false,
        personPresent: false,
        articlePresent: false,
        faqPresent: false,
        howToPresent: false,
        productPresent: false,
        breadcrumbPresent: false,
        valid: true
    };

    try {
        const $ = cheerio.load(html);
        const scripts = $('script[type="application/ld+json"]');
        
        if (scripts.length > 0) {
            results.jsonLdPresent = true;
            
            scripts.each((i, el) => {
                try {
                    const raw = $(el).html();
                    const json = JSON.parse(raw);
                    
                    const processNode = (node) => {
                         if (!node) return;
                         
                         const checkType = (t) => {
                             if (!t) return;
                             const type = Array.isArray(t) ? t.join(', ') : t;
                             if (!results.schemaTypes.includes(type)) results.schemaTypes.push(type);
                             
                             if (type.includes('Organization') || type.includes('Corporation')) results.organizationPresent = true;
                             if (type.includes('Person')) results.personPresent = true;
                             if (type.includes('Article') || type.includes('BlogPosting') || type.includes('NewsArticle')) results.articlePresent = true;
                             if (type.includes('FAQPage')) results.faqPresent = true;
                             if (type.includes('HowTo')) results.howToPresent = true;
                             if (type.includes('Product') || type.includes('Service')) results.productPresent = true;
                             if (type.includes('BreadcrumbList')) results.breadcrumbPresent = true;
                             
                             if ((type.includes('Organization') || type.includes('Corporation')) && node.logo) {
                                 results.logoDetected = true;
                             }
                         };
                         
                         if (node['@type']) checkType(node['@type']);

                         if (node.sameAs) {
                             const sameAs = Array.isArray(node.sameAs) ? node.sameAs : [node.sameAs];
                             results.sameAsCount += sameAs.length;
                         }
                         
                         // Recurse
                         if (node['@graph']) node['@graph'].forEach(processNode);
                         // Check common nested properties that might hold other entities
                         ['author', 'publisher', 'creator', 'founder', 'employee'].forEach(prop => {
                             if (node[prop]) {
                                 if (Array.isArray(node[prop])) node[prop].forEach(processNode);
                                 else processNode(node[prop]);
                             }
                         });
                    };
                    
                    if (Array.isArray(json)) json.forEach(processNode);
                    else processNode(json);
                } catch (e) {
                    results.errors.push('JSON Parse Error');
                    results.valid = false;
                }
            });
        }
    } catch (e) {
        console.warn('Structured data analysis error:', e.message);
    }
    
    return results;
}

// 3. Crawlability & Extractability
function analyzeCrawlability(html, baseUrl, sitemapUrls) {
    const $ = cheerio.load(html);
    
    // Canonical Check
    const canonical = $('link[rel="canonical"]').attr('href');
    let canonicalSelfReferencing = false;
    if (canonical) {
        try {
            const canonicalUrl = new URL(canonical, baseUrl).href;
            const currentUrl = new URL(baseUrl).href; 
            // Loose comparison to handle trailing slashes
             canonicalSelfReferencing = (canonicalUrl.replace(/\/$/, '') === currentUrl.replace(/\/$/, ''));
        } catch (e) {}
    }

    // Text to HTML Ratio
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    const htmlLength = html.length;
    const textLength = text.length;
    const ratio = htmlLength > 0 ? (textLength / htmlLength) : 0;
    
    // Main Content Node
    const mainNodeDetected = $('main, article, [role="main"]').length > 0;
    
    // Meta Robots
    const metaRobots = $('meta[name="robots"]').attr('content') || 'index, follow';
    const noindex = metaRobots.toLowerCase().includes('noindex');

    return {
        sitemapExists: sitemapUrls.length > 0,
        sitemapAccessible: sitemapUrls.length > 0, // Assumption based on successful fetch check earlier
        sitemap200Ratio: 1.0, // Mocked for now (expensive to check all)
        canonicalPresent: !!canonical,
        canonicalSelfReferencing,
        indexablePagesRatio: 1.0, // Mocked
        renderedHtmlContent: textLength > 200, // Basic check
        primaryContentNotJs: textLength > 200, // If we got text from axios/cheerio, it's not JS only
        renderedWordCount: text.split(/\s+/).length,
        mainContentNode: mainNodeDetected,
        textToHtmlRatio: ratio,
        metaRobots: metaRobots,
        isNoindex: noindex
    };
}

// 4. Entity Identity
function analyzeEntityIdentity(html, sitemapUrls) {
    const $ = cheerio.load(html);
    const text = $('body').text();
    
    // NAP (Phone)
    const phonePattern = /(\+\d{1,3}[-.]?)?\(?\d{3}\)?[-.]?\d{3}[-.]?\d{4}/;
    const hasPhone = phonePattern.test(text);
    
    // Org Schema Check (Re-check simpler regex if parsing failed or just to be sure)
    const hasOrgSchema = /"Organization"|"Corporation"/.test(html);
    
    return {
        hasAboutPage: sitemapUrls.some(u => u.toLowerCase().includes('/about')),
        hasContactPage: sitemapUrls.some(u => u.toLowerCase().includes('/contact')),
        hasPhone: hasPhone,
        hasOrgSchema: hasOrgSchema,
        orgDescriptionLength: $('meta[name="description"]').attr('content')?.length || 0, // Proxy
        socialLinks: sitemapUrls.some(u => u.includes('instagram') || u.includes('facebook') || u.includes('twitter') || u.includes('linkedin')),
        brandConsistencyScore: 0.85 // Heuristic/Mock
    };
}

// 5. Content Structure & AI Extractability
function analyzeContentStructure(html) {
    const $ = cheerio.load(html);
    const text = $('body').text();
    
    // Headings Analysis
    const headings = $('h1, h2, h3').map((i, el) => $(el).text()).get();
    const questionHeadings = headings.filter(h => /^(what|how|why|where|when|who|is)/i.test(h.trim()));
    
    // "Step" Pattern
    const stepPatternLines = text.match(/(step|phase)\s+\d+/gi) || [];
    
    // Definition Pattern
    const definitions = $('b, strong').filter((i, el) => {
        const next = $(el)[0].nextSibling;
        return next && next.nodeType === 3 && /^\s*(is|refers to|defined as)/i.test(next.nodeValue);
    }).length;
    
    // Paragraph Word Counts (40-120 words optimal for snippets)
    let optimalParagraphs = 0;
    $('p').each((i, el) => {
        const words = $(el).text().trim().split(/\s+/).length;
        if (words >= 40 && words <= 120) optimalParagraphs++;
    });

    return {
        questionHeadingsCount: questionHeadings.length,
        hasQuestionHeadings: questionHeadings.length > 0,
        hasFaqBlock: $('.faq, #faq, [itemtype*="FAQPage"]').length > 0 || headings.some(h => /frequently asked questions/i.test(h)),
        orderedLists: $('ol').length,
        unorderedLists: $('ul').length,
        tables: $('table').length,
        stepPatterns: stepPatternLines.length,
        definitionPatterns: definitions,
        hasSummaryBlock: /summary|tl;?dr|key takeaways/i.test($('h2, h3, strong').text()),
        optimalParagraphCount: optimalParagraphs
    };
}

// 6. AI Snippet Formatting
function analyzeSnippetFormatting(html) {
    const $ = cheerio.load(html);
    const text = $('body').text();
    
    // Direct Answer Formatting (p tag immediately after h2/h3, < 60 words)
    let directAnswers = 0;
    $('h2, h3').each((i, el) => {
        const next = $(el).next('p');
        if (next.length) {
            const words = next.text().trim().split(/\s+/).length;
            if (words > 10 && words < 60) directAnswers++;
        }
    });

    // Check for definitions locally (since we can't access variable from other function)
    const definitionsCount = $('b, strong').filter((i, el) => {
        const next = $(el)[0].nextSibling;
        return next && next.nodeType === 3 && /^\s*(is|refers to|defined as)/i.test(next.nodeValue);
    }).length;

    return {
        directAnswerCount: directAnswers,
        hasDirectAnswer: directAnswers > 0,
        hasDefinitionParagraph: definitionsCount > 0,
        hasProsCons: /pros|cons|advantages|disadvantages/i.test(text) && ($('ul').length > 0 || $('table').length > 0),
        hasComparison: /vs|versus|comparison/i.test($('h1, h2, h3').text()) || ($('table').length > 0 && /vs|compare/i.test(text)),
        hasFeatureList: /features|specifications/i.test($('h2, h3').text()) && $('ul').length > 0,
        hasQaPairs: $('.question, .answer, .faq-item').length > 0 || ($('dt').length > 0 && $('dd').length > 0),
        hasBulletSummary: /summary|conclusion/i.test($('h2, h3').text()) && $('ul').length > 0
    };
}

// 8. Topic Authority & Citations
function analyzeTopicAuthority(html, sitemapUrls) {
    const $ = cheerio.load(html);
    const text = $('body').text();
    
    // Outbound Links
    const links = $('a[href^="http"]').map((i, el) => $(el).attr('href')).get();
    const outboundLinks = links.filter(l => !l.includes(sitemapUrls[0] ? new URL(sitemapUrls[0]).hostname : '')); 
    const authorityLinks = outboundLinks.filter(l => l.includes('.gov') || l.includes('.edu') || l.includes('.org') || l.includes('wikipedia'));
    
    // Topic Clusters
    const clusters = {};
    sitemapUrls.forEach(url => {
        try {
            const path = new URL(url).pathname;
            const segment = path.split('/')[1]; 
            if (segment && segment.length > 2) {
                clusters[segment] = (clusters[segment] || 0) + 1;
            }
        } catch(e) {}
    });
    const significantClusters = Object.keys(clusters).filter(k => clusters[k] > 2); 

    // Semantic Anchor Match (Mock)
    // External Citation Domains (Unique domains in outbound)
    const uniqueDomains = new Set(outboundLinks.map(l => new URL(l).hostname));

    return {
        topicClusters: significantClusters,
        hasTopicClusters: significantClusters.length > 0,
        pagesPerCluster: Math.max(...Object.values(clusters)) || 0,
        internalClusterLinks: $('a[href^="/"]').length, // Rough count
        anchorSemanticMatch: 0.75, // Heuristic
        pillarPageWordCount: text.split(/\s+/).length, // Check current page as proxy
        supportingContentCount: sitemapUrls.length,
        
        outboundLinksCount: outboundLinks.length,
        authorityLinksCount: authorityLinks.length,
        hasCitationPhrases: /(according to|study by|research shows|data from|reported by)/i.test(text),
        numericStatsCount: (text.match(/\d+(\.\d+)?%/g) || []).length,
        hasReferenceSection: /references|sources|bibliography/i.test($('h2, h3, h4').text()),
        externalCitationDomains: uniqueDomains.size
    };
}

// 8. Trust Signals & Conversational Intent
function analyzeTrustAndIntent(html, sitemapUrls) {
    const $ = cheerio.load(html);
    const text = $('body').text();
    
    sitemapUrls = sitemapUrls || [];

    // Intent counts
    const intentPages = {
        whatIs: 0,
        howTo: 0,
        best: 0,
        vs: 0,
        alternatives: 0,
        guide: 0
    };
    
    sitemapUrls.forEach(url => {
        const lower = url.toLowerCase();
        if (lower.includes('what-is') || lower.includes('definition')) intentPages.whatIs++;
        if (lower.includes('how-to') || lower.includes('tutorial')) intentPages.howTo++;
        if (lower.includes('best-') || lower.includes('top-')) intentPages.best++;
        if (lower.includes('vs-') || lower.includes('-vs-') || lower.includes('compare')) intentPages.vs++;
        if (lower.includes('alternative')) intentPages.alternatives++;
        if (lower.includes('guide') || lower.includes('checklist')) intentPages.guide++;
    });

    return {
        trust: {
            hasAuthorInfo: /author|written by/i.test(text) || $('[itemprop="author"]').length > 0,
            hasAuthorSchema: /"Person"/.test(html), // Simple check
            hasAuthorBio: $('.author-bio, .bio, .about-author').length > 0,
            hasDate: /published|updated|modified/i.test(text) || $('time').length > 0,
            hasPrivacyPolicy: sitemapUrls.some(u => u.includes('privacy')),
            hasTerms: sitemapUrls.some(u => u.includes('terms') || u.includes('condition')),
            hasEditorialPolicy: sitemapUrls.some(u => u.includes('editorial') || u.includes('policy')),
            hasExernalReview: /testimonial|review/i.test(text) || $('.testimonial').length > 0,
            hasCaseStudy: sitemapUrls.some(u => u.includes('case-study') || u.includes('customers'))
        },
        intent: {
            counts: intentPages
        }
    };
}

// Helper to get AI Analysis
async function getAIAnalysis(url, businessType, totalQueries, presentCount, missingQueries, scrapedData, technicalSignals) {
    const missingList = missingQueries.map(q => q.query).join(', ');
    
    // Construct context from scraped data
    let visualContext = "";
    if (scrapedData && scrapedData.length > 0) {
        visualContext = "We scraped the actual content of the website. Here is what we found:\n\n";
        scrapedData.forEach(page => {
            visualContext += `--- PAGE: ${page.type} (${page.url}) ---\n${page.content}\n\n`;
        });
    }

    // Add Technical Signals to Context
    const techContext = `
    Technical AI Signals Status:
    - Robots.txt: ${technicalSignals.robots.exists ? 'Found' : 'Missing'}
    - Bot Access: GPTBot (${technicalSignals.robots.gptBot}), CCBot (${technicalSignals.robots.ccBot})
    - Structured Data: ${technicalSignals.structuredData.jsonLdPresent ? 'Present' : 'Missing'} (${technicalSignals.structuredData.schemaTypes.join(', ')})
    - Entity Identity: About Page (${technicalSignals.entity.hasAboutPage}), Contact Page (${technicalSignals.entity.hasContactPage})
    
    Content AI Signals:
    - Structure: Question Headings (${technicalSignals.contentStructure.questionHeadingsCount}), Tables (${technicalSignals.contentStructure.tables}), Lists (${technicalSignals.contentStructure.unorderedLists + technicalSignals.contentStructure.orderedLists})
    - Snippets: Direct Answers (${technicalSignals.snippetFormatting.directAnswerCount}), Pros/Cons (${technicalSignals.snippetFormatting.hasProsCons}), Comparison (${technicalSignals.snippetFormatting.hasComparison})
    - Authority: Outbound Links (${technicalSignals.authority.outboundLinksCount}), Authority Links (${technicalSignals.authority.authorityLinksCount}), Topic Clusters (${technicalSignals.authority.topicClusters.join(', ')})
    - Trust: Author Info (${technicalSignals.trust.trust.hasAuthorInfo}), Privacy Policy (${technicalSignals.trust.trust.hasPrivacyPolicy})
    - Intent: How-to Pages (${technicalSignals.trust.intent.counts.howTo}), Best/Top Pages (${technicalSignals.trust.intent.counts.best})
    `;
    
    const prompt = `
    Analyze the AI Readiness of the website: ${url}
    
    Context:
    - Business Type Detection: ${businessType}
    - Sitemap Structure Coverage: ${presentCount}/${totalQueries} core pages found
    - Missing Core Pages: ${missingList || "None"}
    ${techContext}
    
    ${visualContext}
    
    Task:
    Acting as an expert AI Search Optimization Consultant, provide:
    1. A "Readiness Score" (0-100) based on THREE factors:
       - Site Structure (Do they have the right pages?)
       - Content Quality (Is the content clear, structured, and authoritative?)
       - Technical Signals (Is it accessible to bots and machine-readable?)
    2.Produce a short, on-target executive summary (max 2-3 sentences) about the website’s AI visibility performance. Focus only on key findings and impact; no filler text.
    
    Format:
    Return ONLY a JSON object:
    {
        "score": number,
        "summary": "string"
    }
    `;

    try {
        const response = await fetchOpenAI(prompt, true); // true for JSON mode
        try {
            return JSON.parse(response);
        } catch (e) {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) return JSON.parse(jsonMatch[0]);
            throw e;
        }
    } catch (error) {
        console.error("AI Analysis failed, falling back to heuristic:", error);
        return null;
    }
}



// Fallback: Crawl Homepage for Links
async function crawlHomepage(baseUrl) {
    console.log(`Crawling homepage ${baseUrl} for links...`);
    const content = await fetchUrl(baseUrl);
    if (!content) return [];
    
    const links = new Set();
    const hrefPattern = /href=["'](.*?)["']/g;
    let match;
    
    while ((match = hrefPattern.exec(content)) !== null) {
        let link = match[1];
        try {
            // Handle relative URLs
            if (link.startsWith('/')) {
                link = new URL(link, baseUrl).href;
            } else if (!link.startsWith('http')) {
                continue; // Skip javascript:, mailto:, etc.
            }
            
            // Only include internal links
            if (link.startsWith(baseUrl)) {
                links.add(link);
            }
        } catch (e) {
            // Ignore invalid URLs
        }
    }
    
    console.log(`Crawl found ${links.size} internal links.`);
    return Array.from(links);
}

// Default structure to prevent frontend crashes
function getDefaultTechnicalSignals() {
    return {
        robots: { 
            exists: false, status: 0, gptBot: 'Unknown', googleExtended: 'Unknown', 
            claudeBot: 'Unknown', ccBot: 'Unknown', perplexityBot: 'Unknown', 
            appleBot: 'Unknown', amazonBot: 'Unknown', byteSpider: 'Unknown', metaBot: 'Unknown',
            contentSignals: { 
                search: 'Unknown', aiInput: 'Unknown', aiTrain: 'Unknown',
                aiTrainFine: 'Unknown', aiTrainBase: 'Unknown'
            },
            globalDisallow: false, xRobotsTag: 'None' 
        },
        structuredData: { 
            jsonLdPresent: false, schemaTypes: [], valid: false, 
            organizationPresent: false, personPresent: false, articlePresent: false, 
            faqPresent: false, howToPresent: false, productPresent: false, 
            breadcrumbPresent: false, sameAsCount: 0, logoDetected: false 
        },
        crawlability: { 
            sitemapExists: false, sitemapAccessible: false, sitemap200Ratio: 0, 
            canonicalPresent: false, canonicalSelfReferencing: false, indexablePagesRatio: 0, 
            renderedHtmlContent: false, primaryContentNotJs: false, renderedWordCount: 0, 
            mainContentNode: false, textToHtmlRatio: 0, metaRobots: 'None', isNoindex: false 
        },
        entity: { 
            hasAboutPage: false, hasContactPage: false, hasPhone: false, 
            hasOrgSchema: false, orgDescriptionLength: 0, socialLinks: false, 
            brandConsistencyScore: 0 
        },
        contentStructure: { 
            questionHeadingsCount: 0, hasQuestionHeadings: false, hasFaqBlock: false, 
            orderedLists: 0, unorderedLists: 0, tables: 0, stepPatterns: 0, 
            definitionPatterns: 0, hasSummaryBlock: false, optimalParagraphCount: 0 
        },
        snippetFormatting: { 
            directAnswerCount: 0, hasDirectAnswer: false, hasDefinitionParagraph: false, 
            hasProsCons: false, hasComparison: false, hasFeatureList: false, 
            hasQaPairs: false, hasBulletSummary: false 
        },
        authority: { 
            topicClusters: [], hasTopicClusters: false, pagesPerCluster: 0, 
            internalClusterLinks: 0, anchorSemanticMatch: 0, pillarPageWordCount: 0, 
            supportingContentCount: 0, outboundLinksCount: 0, authorityLinksCount: 0, 
            hasCitationPhrases: false, numericStatsCount: 0, hasReferenceSection: false, 
            externalCitationDomains: 0 
        },
        trust: { 
            trust: { 
                hasAuthorInfo: false, hasAuthorSchema: false, hasAuthorBio: false, 
                hasDate: false, hasPrivacyPolicy: false, hasTerms: false, 
                hasEditorialPolicy: false, hasExernalReview: false, hasCaseStudy: false 
            }, 
            intent: { 
                counts: { whatIs: 0, howTo: 0, best: 0, vs: 0, alternatives: 0, guide: 0 } 
            } 
        },
        external: { 
            wikidata: false, knowledgePanel: false, crunchbase: false, 
            clutch: false, referringDomains: 0, brandMentions: 0 
        }
    };
}

// Main analysis function
exports.analyzeWebsite = async (url) => {
    // Normalize URL
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    
    const parsedUrl = new URL(url);
    const baseUrl = `${parsedUrl.protocol}//${parsedUrl.hostname}`;
    
    let sitemapUrls = [];
    let usedMethod = 'sitemap';
    let sitemapUrl = null;

    let discoveredSubSitemaps = [];

    try {
        // Try finding and parsing sitemap
        sitemapUrl = await findSitemap(baseUrl);
        if (sitemapUrl) {
            sitemapUrls = await parseSitemap(sitemapUrl, discoveredSubSitemaps);
        }
    } catch (e) {
        console.warn("Sitemap analysis failed:", e.message);
    }
    
    // Fallback if sitemap failed or is empty
    if (sitemapUrls.length === 0) {
        console.log("Falling back to homepage crawl...");
        sitemapUrls = await crawlHomepage(baseUrl);
        usedMethod = 'crawl';
    }

    if (sitemapUrls.length === 0) {
        const testRes = await fetchUrlResponse(baseUrl);
        console.log('--- DEBUG testRes ---', { status: testRes?.status, code: testRes?.code, error: testRes?.error });
        
        if (testRes) {
            const isBlocked = (testRes.status === 403 || testRes.status === 503 || testRes.code === 'ECONNRESET' || testRes.code === 'ETIMEDOUT' || (testRes.error && testRes.error.toLowerCase().includes('abort')));
            
            if (isBlocked) {
                const statusMsg = testRes.status === 403 ? 'Forbidden (403)' : 
                                 testRes.status === 503 ? 'Service Unavailable (503)' : 
                                 testRes.code || 'Connection Blocked';
                
                // Use default object and override robot status
                const blockedSignals = getDefaultTechnicalSignals();
                blockedSignals.robots = { 
                    exists: true, 
                    status: testRes.status || 0, 
                    gptBot: 'Blocked', 
                    googleExtended: 'Blocked', 
                    claudeBot: 'Blocked', 
                    ccBot: 'Blocked', 
                    perplexityBot: 'Blocked', 
                    appleBot: 'Blocked', 
                    amazonBot: 'Allowed', // Amazon is usually allowed
                    byteSpider: 'Blocked', 
                    metaBot: 'Blocked', 
                    contentSignals: { 
                        search: 'Blocked', 
                        aiInput: 'Blocked', 
                        aiTrain: 'Blocked', 
                        aiTrainFine: 'Blocked', 
                        aiTrainBase: 'Blocked' 
                    }, 
                    globalDisallow: true, 
                    xRobotsTag: 'None' 
                };
                blockedSignals.crawlability.isNoindex = true;

                // Return a "Blocked" state object instead of throwing
                return {
                    businessType: 'General',
                    summary: `Direct analysis of ${baseUrl} was blocked by a firewall or security layer (Status: ${statusMsg}). Our scanner was unable to retrieve technical signals or content depth.`,
                    coverageScore: 0,
                    corePagesFound: 0,
                    totalPages: 0,
                    totalMissing: 0,
                    queries: [],
                    sitemapUrl: 'Blocked by Security',
                    totalSitemapUrls: 0,
                    method: 'blocked',
                    isBlocked: true,
                    blockReason: statusMsg,
                    technicalSignals: blockedSignals
                };
            } else if (testRes.status === 200) {
                 // SPA or single-page site where crawler found 0 links, but site is up
                 console.log("Site is accessible but 0 internal links found. Proceeding with single-page analysis.");
                 sitemapUrls = [baseUrl];
            } else {
                 throw new Error('Could not analyze website. Please check if the URL is accessible and not blocking automated requests.');
            }
        } else {
            throw new Error('Could not analyze website. Please check if the URL is accessible and not blocking automated requests.');
        }
    }
    
    // Classify business
    const businessType = classifyBusiness(baseUrl, sitemapUrls);
    
    // Check queries dynamically using OpenAI (or fallback to static)
    const queryResults = await generateAndCheckQueries(baseUrl, sitemapUrls, businessType);
    
    // Calculate metrics locally (heuristic)
    const totalQueries = queryResults.length;
    const presentCount = queryResults.filter(q => q.status === 'present').length;
    const missingQueries = queryResults.filter(q => q.status === 'missing');
    const missingCount = totalQueries - presentCount;
    let coverageScore = totalQueries > 0 ? Math.round((presentCount / totalQueries) * 100) : 0;
    
    
    // Scrape Content for Real-Time AI Analysis
    // 1. Homepage
    // 2. Up to 2 key pages found in the presence check (e.g. Pricing, About)
    const pagesToScrape = [ { type: 'Homepage', url: baseUrl } ];
    
    // Find interesting discovered pages
    const interestingTypes = ['pricing', 'about', 'features', 'product', 'contact'];
    let scrapedCount = 0;
    
    for (const type of interestingTypes) {
        if (scrapedCount >= 2) break;
        const found = queryResults.find(q => q.status === 'present' && q.path.includes(type));
        
        if (found) {
             const goodUrl = sitemapUrls.find(u => u.toLowerCase().includes(type));
             if (goodUrl && !pagesToScrape.some(p => p.url === goodUrl)) {
                 pagesToScrape.push({ type: type.charAt(0).toUpperCase() + type.slice(1), url: goodUrl });
                 scrapedCount++;
             }
        }
    }

    // Execute scraping & Technical Analysis
    const scrapedData = [];
    
    // Default structure to prevent frontend crashes
    let technicalSignals = getDefaultTechnicalSignals();
    
    try {
        // We need homepage HTML for technical analysis
        const homepageHtml = await fetchUrl(baseUrl);
        
        // 1. Robots Checks
        const robotsAnalysis = await checkRobotsTxt(baseUrl);
        
        // 2. Structured Data
        const structData = analyzeStructuredData(homepageHtml || '', baseUrl);
        
        // 3. Crawlability
        const crawlability = analyzeCrawlability(homepageHtml || '', baseUrl, sitemapUrls);
        

        // 4. Entity Identity
        // Note: sitemapUrls is a good proxy for page existence, crawlability gives text analysis
        const entity = analyzeEntityIdentity(homepageHtml || '', sitemapUrls);
        
        // 5. Content Structure
        const contentStructure = analyzeContentStructure(homepageHtml || '');
        
        // 6. Snippet Formatting
        const snippetFormatting = analyzeSnippetFormatting(homepageHtml || '');
        
        // 7. Topic Authority
        const authority = analyzeTopicAuthority(homepageHtml || '', sitemapUrls);
        
        // 8. Trust & Intent
        const trust = analyzeTrustAndIntent(homepageHtml || '', sitemapUrls);
        
        // --- 9. External Entity Presence ---
        // Extract Brand Name best effort (JSON-LD Organization, then Title, then Domain)
        let brandName = new URL(baseUrl).hostname.replace(/^www\./, '').split('.')[0];
        
        // Priority 1: Use Org Name from Structured Data if found
        if (structData && structData.schemaTypes && structData.schemaTypes.length > 0) {
            // We need a more specialized way to get the Name from structData result
            // Let's rely on the Title fallback if structData doesn't explicitly expose brandName yet
        }

        // Priority 2: Improve Title-based extraction
        const $ = cheerio.load(homepageHtml || '');
        const fullTitle = $('title').text().trim();
        if (fullTitle) {
            // Remove common separators and take first part
            const titlePart = fullTitle.split(/[-|:|—]|About|Home|Official/i)[0].trim();
            // Remove tagline symbols like .com or slogans if they are very short
            if (titlePart.length > 2 && titlePart.length < 50) {
                brandName = titlePart;
            }
        }
        
        console.log(`Final Brand Name selected for External Checks: ${brandName}`);

        const externalSignals = await externalEntityService.checkExternalEntityPresence(brandName, baseUrl);

        // Update with actual data
        technicalSignals = {
            robots: robotsAnalysis,
            structuredData: structData,
            crawlability: crawlability,
            entity: entity,
            contentStructure: contentStructure,
            snippetFormatting: snippetFormatting,
            authority: authority,
            trust: trust,
            external: externalSignals
        };

    } catch (e) {
        console.warn('Technical analysis phase failed:', e.message);
    }


    for (const page of pagesToScrape) {
        const content = await scrapeContent(page.url);
        if (content && content.length > 50) {
            scrapedData.push({ type: page.type, url: page.url, content });
        }
    }
    
    // Get AI Analysis
    let summary = `This report analyzes how AI systems perceive your content. Core structure coverage: ${coverageScore}%.`;
    
    try {
        const aiResult = await getAIAnalysis(url, businessType, totalQueries, presentCount, missingQueries, scrapedData, technicalSignals);
        if (aiResult) {
            coverageScore = aiResult.score;
            summary = aiResult.summary;
        }
    } catch (e) {
        console.warn("AI enhancement failed, using heuristic values.");
    }
    
    return {
        businessType,
        summary,
        coverageScore,
        corePagesFound: presentCount,
        totalPages: totalQueries,
        totalMissing: missingCount,
        queries: queryResults,
        sitemapUrl: sitemapUrl || 'Scanned via Homepage Crawl',
        totalSitemapUrls: sitemapUrls.length,
        discoveredSubSitemaps, // Pass the actual sub-sitemaps found
        method: usedMethod,
        technicalSignals // New field for frontend
    };
};
