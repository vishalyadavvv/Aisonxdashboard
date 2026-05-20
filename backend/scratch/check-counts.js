const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const ProfilerReport = require('../src/models/ProfilerReport');
const ReadinessReport = require('../src/models/ReadinessReport');
const WebsearchReport = require('../src/models/WebsearchReport');

async function check() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/geo');
    console.log('Connected to MongoDB');

    const profCount = await ProfilerReport.countDocuments();
    const readCount = await ReadinessReport.countDocuments();
    const webCount = await WebsearchReport.countDocuments();

    console.log(`ProfilerReport Count: ${profCount}`);
    console.log(`ReadinessReport Count: ${readCount}`);
    console.log(`WebsearchReport Count: ${webCount}`);

    mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

check();
