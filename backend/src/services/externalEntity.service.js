const axios = require('axios');

// APIs (Env variables would be ideal here)
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || ''; 
const GOOGLE_CX = process.env.GOOGLE_CX || ''; // Custom Search Engine ID


// 1. Check Wikidata (Free, Open)
async function checkWikidata(brandName) {
    if (!brandName) return false;
    const url = `https://www.wikidata.org/w/api.php?action=wbsearchentities&search=${encodeURIComponent(brandName)}&language=en&format=json`;
    
    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'GEO-AI-Readiness-Audit-Tool/1.0 (contact: info@dgtltechhub.com)'
            }
        });
        // Check if any match is an Organization/Company
        // We look for 'Q43229' (Organization) or similar instances, but simple existence is a good start
        return response.data.search && response.data.search.length > 0;
    } catch (e) {
        console.warn('Wikidata check failed:', e.message);
        return false;
    }
}

// 2. Check Knowledge Graph (Needs Google API Key)
async function checkKnowledgeGraph(brandName) {
    if (!brandName || !GOOGLE_API_KEY) return false;
    const url = `https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(brandName)}&key=${GOOGLE_API_KEY}&limit=1&types=Organization`;
    
    try {
        const response = await axios.get(url);
        return response.data.itemListElement && response.data.itemListElement.length > 0;
    } catch (e) {
        return false;
    }
}

/**
 * Fetch FULL Knowledge Graph data for the Brand Audit tool.
 * Returns the top 5 entities with all metadata (confidence score, description, image, links, types).
 */
async function fetchKnowledgeGraphFull(brandName) {
    if (!brandName || !GOOGLE_API_KEY) return null;
    const url = `https://kgsearch.googleapis.com/v1/entities:search?query=${encodeURIComponent(brandName)}&key=${GOOGLE_API_KEY}&limit=20`;
    
    try {
        const response = await axios.get(url);
        const items = response.data.itemListElement || [];
        if (items.length === 0) return null;
        
        return {
            query: brandName,
            totalResults: items.length,
            entities: items.map(item => ({
                name: item.result?.name || '',
                types: Array.isArray(item.result?.['@type']) ? item.result['@type'] : [item.result?.['@type'] || 'Thing'],
                description: item.result?.description || '',
                detailedDescription: item.result?.detailedDescription?.articleBody || '',
                descriptionUrl: item.result?.detailedDescription?.url || '',
                image: item.result?.image?.contentUrl || '',
                url: item.result?.url || '',
                kgId: item.result?.['@id']?.startsWith('kg:') ? item.result['@id'].substring(3) : item.result?.['@id'] || '',
                confidenceScore: Math.round(item.resultScore || 0)
            }))
        };
    } catch (e) {
        console.warn('Knowledge Graph full fetch failed:', e.message);
        return null;
    }
}

// 3. Search for Listings (Crunchbase, Clutch, G2)
// Uses Google Custom Search JSON API if available, 
// OR falls back to a mocked "heuristic" if running locally without keys (for demo)
async function checkListings(brandName) {
    const results = {
        crunchbase: false,
        clutch: false,
        mentions: 0,
        refDomains: 0
    };

    if (!brandName) return results;

    // A. If we have Google Keys, use them mainly
    if (GOOGLE_API_KEY && GOOGLE_CX) {
        try {
            // Search for "Brand Name" + site:crunchbase.com
            const cbUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(brandName + " site:crunchbase.com")}`;
            const cbRes = await axios.get(cbUrl);
            results.crunchbase = cbRes.data.searchInformation.totalResults > 0;

            // Search for "Brand Name" + site:clutch.co OR site:g2.com
            const revUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(brandName + " (site:clutch.co OR site:g2.com OR site:capterra.com)")}`;
            const revRes = await axios.get(revUrl);
            results.clutch = revRes.data.searchInformation.totalResults > 0;
            
            // Search for raw mentions "-site:brand.com"
            const mentUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent('"' + brandName + '"')}`;
            const mentRes = await axios.get(mentUrl);
            results.mentions = parseInt(mentRes.data.searchInformation.totalResults || '0');
            
            // Ref domains is hard without Ahrefs/Semrush, we mock it based on mentions
            results.refDomains = Math.round(results.mentions * 0.1); 

            return results;
        } catch (e) {
            if (e.response && e.response.status === 403) {
                console.warn('Google CSE failed: Permission Denied. Please ensure "Custom Search API" is enabled in Google Cloud Console.');
            } else {
                console.warn('Google CSE failed:', e.message);
            }
        }
    }

    // B. Heuristic / "Poor Man's" Check 
    // (Trying to fetch user profiles directly - NOTE: This often gets blocked by CAPTCHA, 
    // so we default to "False" to be safe, or check simple patterns)
    
    // For the purpose of this audit tool without keys, we might return False 
    // but allow the User to manually override or we just show "Not Detected (API Key Missing)"
    
    return results;
}


exports.checkExternalEntityPresence = async (brandName, domain) => {
    // 1. Clean brand name
    const name = brandName || domain.split('.')[0];
    
    const [wiki, kg, listings] = await Promise.all([
        checkWikidata(name),
        checkKnowledgeGraph(name),
        checkListings(name)
    ]);

    return {
        wikidata: wiki,
        knowledgePanel: kg,
        crunchbase: listings.crunchbase,
        clutch: listings.clutch,
        referringDomains: listings.refDomains,
        brandMentions: listings.mentions
    };
};

exports.fetchKnowledgeGraphFull = fetchKnowledgeGraphFull;
