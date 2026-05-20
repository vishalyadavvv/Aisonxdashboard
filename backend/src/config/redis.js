const { Redis } = require('ioredis');

// Upstash Redis — serverless, zero RAM on your EC2 instance
// Set UPSTASH_REDIS_URL in your .env (from console.upstash.com)
const isTls = process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_URL.startsWith('rediss://');

const redisOptions = {
    maxRetriesPerRequest: null,  // Required by BullMQ
    enableReadyCheck: false,
    retryStrategy: (times) => {
        if (times > 5) return null; // Stop retrying after 5 attempts
        return Math.min(times * 500, 3000); // Exponential backoff
    }
};

if (isTls) {
    redisOptions.tls = { rejectUnauthorized: false };  // Required for Upstash TLS
}

const redis = new Redis(process.env.UPSTASH_REDIS_URL, redisOptions);

redis.on('connect', () => console.log(`✅ [Redis] Connected successfully (${isTls ? 'Secure TLS' : 'Local Standard'})`));
redis.on('error', (e) => console.error('❌ [Redis] Connection error:', e.message));

module.exports = redis;
