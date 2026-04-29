require('dotenv').config();
const app = require('./src/app');
const logger = require('./src/utils/logger');
const cronService = require('./src/services/cron.service');

const PORT = process.env.PORT || 5000;

// ─── GLOBAL CRASH GUARDS ──────────────────────────────────────────────────────
// Prevent the entire server from crashing on unhandled errors
process.on('uncaughtException', (err) => {
  logger.error('💥 UNCAUGHT EXCEPTION — Server kept alive:', err.message, err.stack);
  // Do NOT exit — keep serving other users
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 UNHANDLED REJECTION:', reason?.message || reason);
  // Do NOT exit — keep serving other users
});

// ─── GRACEFUL SHUTDOWN ────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  logger.info('SIGTERM received — shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed cleanly.');
    process.exit(0);
  });
});

// Initialize Daily Automated Scans
cronService.initCronJobs();

// Initialize Production Scan Queue Worker
require('./src/queues/scanQueue');
logger.info('✅ Scan queue worker initialized');

const server = app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});

// Request timeout: 5 minutes (prevents hung scan requests blocking the server)
server.timeout = 300000;
