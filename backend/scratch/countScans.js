const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const Project = require('../src/models/Project');
const Snapshot = require('../src/models/Snapshot');

async function countDailyScans() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.\n');

    const users = await User.find({});
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

    console.log('--- DAILY SCAN USAGE REPORT (Last 24 Hours) ---');
    console.log(`${'User Name'.padEnd(20)} | ${'Email'.padEnd(30)} | ${'Scans'}`);
    console.log('-'.repeat(65));

    for (const u of users) {
      // Find all projects for this user
      const projectIds = await Project.find({ userId: u._id }).distinct('_id');
      
      // Count snapshots for these projects in the last 24h
      const count = await Snapshot.countDocuments({ 
        projectId: { $in: projectIds },
        date: { $gte: twentyFourHoursAgo }
      });

      console.log(`${(u.name || 'N/A').padEnd(20)} | ${(u.email || 'N/A').padEnd(30)} | ${count}`);
    }
    console.log('--------------------------------------------------');

    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

countDailyScans();
