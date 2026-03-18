/**
 * LINK FIXER UTILITY (Frontend)
 * Retroactively fixes malformed, truncated, or markdown links from AI responses.
 * Safe to call on any string.
 */
export function fixAIUrl(url, depth = 0) {
    if (!url || typeof url !== 'string' || depth > 5) return url;
    
    // 1. Basic Cleaning
    let cleaned = url.trim();

    // 2. ULTRA-AGGRESSIVE: Handle Google/Vertex Search Redirects
    if (cleaned.includes('google') || cleaned.includes('vertex')) {
        try {
            // Pattern A: Look for recognized redirect parameters
            const paramMatch = cleaned.match(/[?&](?:url|uri|q|dest)=([^& \n"]+)/i);
            if (paramMatch) {
                let extracted = paramMatch[1];
                if (extracted.includes('%')) {
                    try { extracted = decodeURIComponent(extracted); } catch(e) {}
                }
                if (extracted.startsWith('http') && !extracted.includes('vertexaisearch') && !extracted.includes('google.com')) {
                    return fixAIUrl(extracted, depth + 1);
                }
                if (extracted.match(/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/) && !extracted.includes('google') && !extracted.includes('vertex')) {
                    return fixAIUrl('https://' + extracted, depth + 1);
                }
            }

            // Pattern B: Look for ANY nested http string (plain) that isn't Google/Vertex
            const nestedMatch = cleaned.match(/https?:\/\/(?!(vertexaisearch|google|cloud\.google|gstatic))[^\s&"']+/i);
            if (nestedMatch && nestedMatch[0] !== url) {
                return fixAIUrl(nestedMatch[0], depth + 1);
            }
            
            // Pattern C: Encoded nested http
            const encodedMatch = cleaned.match(/https?%3A%2F%2F[^&% \n"]+/i);
            if (encodedMatch) {
                const decoded = decodeURIComponent(encodedMatch[0]);
                if (decoded.startsWith('http') && !decoded.includes('vertexaisearch') && !decoded.includes('google.com')) {
                    return fixAIUrl(decoded, depth + 1);
                }
            }

            // Pattern D: Path-based URI
            const uriPathMatch = cleaned.match(/\/uri\/(https?%3A%2F%2F[^\s&"']+|https?:\/\/[^\s&"']+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s&"']*)/i);
            if (uriPathMatch) {
                let extracted = uriPathMatch[1];
                if (extracted.includes('%')) { try { extracted = decodeURIComponent(extracted); } catch(e) {} }
                if (!extracted.includes('vertexaisearch') && !extracted.includes('google.com')) {
                    if (!extracted.startsWith('http')) extracted = 'https://' + extracted;
                    return fixAIUrl(extracted, depth + 1);
                }
            }

            // BRUTE FORCE: Look for ANY domain-like string inside that isn't Google/Vertex
            // We use a negative lookahead to skip known Google-owned technical domains
            const bruteMatch = cleaned.match(/(?:https?:\/\/|www\.)?((?!(?:vertex|google|gstatic|cloud\.google|googleapis|googleusercontent))([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,10}[^\s&"']*)/i);
            if (bruteMatch && bruteMatch[1]) {
                let domain = bruteMatch[1];
                if (!domain.startsWith('http')) domain = 'https://' + domain;
                return fixAIUrl(domain, depth + 1);
            }
        } catch (e) {}
    }

    // 3. Handle malformed/truncated markdown [text](https://...
    const robustUrlMatch = cleaned.match(/(https?:\/\/[^\s)\]"']+)/);
    if (robustUrlMatch) {
        const extracted = robustUrlMatch[1];
        if (extracted.length > 8 && extracted.includes('.')) {
            if (extracted !== url && (extracted.includes('google') || extracted.includes('vertex'))) {
                return fixAIUrl(extracted, depth + 1);
            }
            return extracted;
        }
    }

    // 4. Detect domains without protocol
    const domainMatch = cleaned.match(/([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,10}/);
    if (domainMatch && !cleaned.includes(' ') && !cleaned.includes('google') && !cleaned.includes('vertex')) {
        const withProtocol = 'https://' + domainMatch[0];
        if (withProtocol !== url) return withProtocol;
    }

    // 5. Cleanup
    cleaned = cleaned.replace(/^[(\["'\[]+|[)\]"'\]/]+$/g, '');

    // 6. Final Protocol Check
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
        if (cleaned.includes('.') && !cleaned.includes(' ') && !cleaned.includes(':')) {
            cleaned = 'https://' + cleaned;
        }
    }

    return cleaned;
}
