/**
 * Utility to clean search engine redirects and wrappers from URLs.
 * Handles Bing, OpenAI (ChatGPT), and Google redirects.
 */
function cleanUrl(url) {
  if (!url || typeof url !== 'string') return url;

  try {
    // 1. ChatGPT/OpenAI Redirects
    // Example: https://www.bing.com/ck/a?!&&p=...&u=a1aHR0cHM6Ly93d3cubmlrZS5jb20v&ntb=1
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
    // Regex matches common domain formats like example.com or sub.example.co.uk
    const domainMatch = url.match(/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,10}/);
    if (domainMatch) {
        return 'https://' + domainMatch[0];
    }

    // 5. Generic cleaning for domains or partials
    let cleaned = url.trim();
    
    // Remove brackets/quotes/markdown artifacts
    cleaned = cleaned.replace(/^[(\["'\[]+|[)\]"'\]/]+$/g, '');

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

module.exports = { cleanUrl };
