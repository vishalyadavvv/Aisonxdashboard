const truncate = (msg) => {
    if (typeof msg !== 'string') return msg;
    // Extra safety: block messages that clearly look like HTML/Scripts
    if (msg.includes('<html') || msg.includes('window.google') || msg.includes('<!doctype')) {
        return "[SECURE LOG] HTML content detected and blocked for terminal safety.";
    }
    return msg.length > 5000 ? msg.substring(0, 5000) + '... [TRUNCATED]' : msg;
};

const sanitizeError = (err) => {
    if (!err) return null;
    if (typeof err === 'string') return truncate(err);
    if (err instanceof Error) {
        // Only log the message and stack safely, avoid raw response bodies
        return { 
            message: truncate(err.message), 
            code: err.code,
            status: err.status,
            // Include a snippet of the response data if it's an axios error
            responseData: err.response?.data ? truncate(JSON.stringify(err.response.data)) : undefined
        };
    }
    // For general objects, stringify and truncate
    try {
        const str = JSON.stringify(err);
        if (str.includes('<html') || str.length > 5000) {
            // Instead of blocking, just truncate and mark as potentially containing HTML
            return truncate(str) + " [TRUNCATED - Potential HTML or Large Object]";
        }
        return str;
    } catch (e) {
        return "[SECURE LOG] Complex error object.";
    }
};

const info = (msg) => console.log(`[INFO] ${truncate(msg)}`);

const error = (msg, err) => {
    console.error(`[ERROR] ${truncate(msg)}`, sanitizeError(err));
};

const warn = (msg) => console.warn(`[WARN] ${truncate(msg)}`);

const debug = (msg) => console.debug(`[DEBUG] ${truncate(msg)}`);

module.exports = { info, error, warn, debug };
