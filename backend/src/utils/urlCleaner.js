/**
 * Utility to clean search engine redirects and wrappers from URLs.
 * Handles Bing, OpenAI (ChatGPT), and Google redirects.
 */
function cleanUrl(url) {
  if (!url || typeof url !== 'string') return url;

  try {
    // 1. ChatGPT/OpenAI Redirects
    if (url.includes('bing.com/ck/')) {
      const parsedUrl = new URL(url);
      const uParam = parsedUrl.searchParams.get('u');
      if (uParam) {
        // Strip the 'a1' prefix often added by Bing before base64
        const base64Str = uParam.startsWith('a1') ? uParam.substring(2) : uParam;
        try {
          return Buffer.from(base64Str, 'base64').toString('utf-8');
        } catch (e) {
          // If base64 fails, try to see if it's just a raw URL
          return url;
        }
      }
    }

    // 2. Google / Vertex AI search redirects
    if (url.includes('google.com/url?') || url.includes('vertexaisearch')) {
      const parsedUrl = new URL(url);
      const realUrl = parsedUrl.searchParams.get('url') || 
             parsedUrl.searchParams.get('q') || 
             parsedUrl.searchParams.get('uri');
      // If we can extract a real URL, use it. Otherwise keep the redirect (it still works when clicked).
      return realUrl || url;
    }

    // 3. Markdown/Text Extraction
    // First, try a robust regex to find the first valid-looking URL (must have a protocol AND a dot in the domain)
    const robustUrlMatch = url.match(/(https?:\/\/[^\s)\]"']+)/);
    if (robustUrlMatch) {
      const extracted = robustUrlMatch[1];
      // If it's just "https:" or "http://", it's invalid
      if (extracted.length > 8 && extracted.includes('.')) {
        return extracted;
      }
    }

    // 4. Secondary: Look for domain-like strings even if protocol is missing or malformed
    const domainMatch = url.match(/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,10}/);
    if (domainMatch && !url.includes(' ')) {
        return 'https://' + domainMatch[0];
    }

    // 5. Generic cleaning for domains or partials
    let cleaned = url.trim();
    
    // Remove brackets/quotes/markdown artifacts
    cleaned = cleaned.replace(/^[(\["'\[]+|[)\]"'\]/]+$/g, '');

    // FIX REDUNDANT PROTOCOLS
    cleaned = cleaned.replace(/^(https?:\/\/)+/, '$1');
    cleaned = cleaned.replace(/^www\.(https?:\/\/)/i, '$1');
    cleaned = cleaned.replace(/^(https?:\/\/)+/g, 'https://');

    // Remove trailing periods often added by LLMs
    if (cleaned.endsWith('.') && !cleaned.endsWith('..')) {
      const lastSlash = cleaned.lastIndexOf('/');
      const lastDot = cleaned.lastIndexOf('.', cleaned.length - 2);
      if (lastDot < lastSlash || lastSlash === -1) {
        cleaned = cleaned.substring(0, cleaned.length - 1);
      }
    }

    // Final protocol enforcement if it looks like a domain
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      if (cleaned.includes('.') && !cleaned.includes(' ')) {
        cleaned = 'https://' + cleaned;
      }
    }

    return cleaned;
  } catch (err) {
    return url;
  }
}

/**
 * Extracts both a clean domain for scraping and a human-friendly brand name for AI lookup.
 * Goal: "https://www.nike.com/running" -> { domain: "nike.com", brandName: "Nike" }
 */
function extractIdentity(input) {
    if (!input || typeof input !== 'string') return { domain: '', brandName: '', brandQuery: '' };
    
    let domain = '';
    let brandName = '';
    
    // 1. Clean the URL first
    const cleaned = cleanUrl(input);
    
    try {
        if (cleaned.startsWith('http')) {
            const parsed = new URL(cleaned);
            domain = parsed.hostname.toLowerCase().replace(/^www\./, '');
            
            // Extract brand name from hostname
            // Logic: Take the segment before the TLD
            const parts = domain.split('.');
            if (parts.length >= 2) {
                // Check for multi-segment TLDs like .co.uk (simplified check for segments of length <= 3)
                if (parts[parts.length - 2].length <= 3 && parts.length >= 3) {
                    brandName = parts[parts.length - 3];
                } else {
                    brandName = parts[parts.length - 2];
                }
            } else {
                brandName = parts[0];
            }
        } else {
            // It's likely just a brand name (e.g. "Apple")
            // But check if it's a domain without a protocol (e.g. "nike.com")
            if (input.includes('.') && !input.includes(' ')) {
                domain = input.toLowerCase().replace(/^www\./, '');
                const parts = domain.split('.');
                brandName = parts[0];
            } else {
                brandName = input.trim();
                domain = ''; // Unknown domain
            }
        }
    } catch (e) {
        brandName = input.trim();
    }
    
    // Final Polish for Brand Name
    // 1. Capitalize
    if (brandName.length > 0) {
        brandName = brandName.charAt(0).toUpperCase() + brandName.slice(1);
    }
    // 2. Remove common file extensions or TLD leftovers if it was a weird string
    brandName = brandName.replace(/\.(com|net|org|io|ai|co|in|uk|au|us)$/i, '');
    
    return {
        domain: domain,
        brandName: brandName,
        brandQuery: `${brandName} business description and AI search footprint`
    };
}

module.exports = { cleanUrl, extractIdentity };
