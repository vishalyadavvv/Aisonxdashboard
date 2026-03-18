require('dotenv').config();
const app = require('./src/app');
const logger = require('./src/utils/logger');
const cronService = require('./src/services/cron.service');

const PORT = process.env.PORT || 5000;

// Initialize Daily Automated Scans
cronService.initCronJobs();

app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
});
