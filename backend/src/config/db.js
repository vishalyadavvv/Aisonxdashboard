const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/geo_db');
    logger.info('MongoDB Connected');
  } catch (err) {
    logger.error('MongoDB Connection Failed', err);
    process.exit(1);
  }
};

module.exports = connectDB;
