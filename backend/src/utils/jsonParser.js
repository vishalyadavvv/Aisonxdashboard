const logger = require('./logger');

/**
 * ROBUST JSON PARSER
 * Specifically handles AI responses that might contain extra text or markdown.
 */
function robustParseJSON(text) {
  if (!text || typeof text !== 'string') return text;
  
  // 1. Clean markdown code blocks
  let clean = text.replace(/```json/g, '').replace(/```/g, '').trim();

  // Helper to safely parse and handle trailing garbage
  const safeParse = (str) => {
    try {
      return JSON.parse(str);
    } catch (e) {
      const msg = e.message;
      
      // Case 1: Extra text after JSON (very common with GPT-4o)
      // Error is usually like "Unexpected non-whitespace character after JSON at position 5634"
      const posMatch = msg.match(/at position (\d+)/);
      if (posMatch && (msg.includes('after JSON') || msg.includes('Unexpected non-whitespace'))) {
        const pos = parseInt(posMatch[1]);
        try {
          return JSON.parse(str.substring(0, pos));
        } catch (e2) {}
      }

      // Case 2: Common trailing comma issue
      try {
        const fixed = str.replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(fixed);
      } catch (e3) {}

      // Case 3: Bracket balancing fallback
      try {
        const firstChar = str.trim().charAt(0);
        const openChar = firstChar === '[' ? '[' : '{';
        const closeChar = firstChar === '[' ? ']' : '}';
        
        let depth = 0;
        let lastClose = -1;
        for (let i = 0; i < str.length; i++) {
          if (str[i] === openChar) depth++;
          else if (str[i] === closeChar) {
            depth--;
            if (depth === 0) {
              lastClose = i;
              break; 
            }
          }
        }
        if (lastClose !== -1) {
          return JSON.parse(str.substring(0, lastClose + 1));
        }
      } catch (e4) {}
      
      return null;
    }
  };

  // 2. Try direct parse first
  const immediate = safeParse(clean);
  if (immediate) return immediate;

  // 3. Extraction Strategy (First available { or [)
  const firstBrace = clean.indexOf('{');
  const firstBracket = clean.indexOf('[');
  
  let startIdx = -1;
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  if (startIdx !== -1) {
    const candidate = clean.substring(startIdx);
    const parsed = safeParse(candidate);
    if (parsed) return parsed;
  }

  return null;
}

module.exports = { robustParseJSON };
