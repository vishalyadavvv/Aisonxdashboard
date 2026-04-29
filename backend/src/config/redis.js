const { Redis } = require('ioredis');

// Upstash Redis — serverless, zero RAM on your EC2 instance
// Set UPSTASH_REDIS_URL in your .env (from console.upstash.com)
const redis = new Redis(process.env.UPSTASH_REDIS_URL, {
    maxRetriesPerRequest: null,  // Required by BullMQ
    enableReadyCheck: false,
    tls: { rejectUnauthorized: false },  // Required for Upstash TLS
    retryStrategy: (times) => {
        if (times > 5) return null; // Stop retrying after 5 attempts
        return Math.min(times * 500, 3000); // Exponential backoff
    }
});

redis.on('connect', () => console.log('✅ [Redis] Connected to Upstash'));
redis.on('error', (e) => console.error('❌ [Redis] Connection error:', e.message));

module.exports = redis;
