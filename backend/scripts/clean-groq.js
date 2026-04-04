const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const Project = require('../src/models/Project');

async function cleanGroq() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error('MONGO_URI not found in environment');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('Connected.');

    console.log('Searching for projects with "groq" in targetEngines...');
    
    // Use MongoDB updateMany directly to be more efficient
    const res = await Project.updateMany(
      { targetEngines: 'groq' },
      { $pull: { targetEngines: 'groq' } }
    );
    
    console.log(`Updated projects: ${res.modifiedCount}`);
    
    // Also ensure no project is left with an empty targetEngines array
    const emptyRes = await Project.updateMany(
      { targetEngines: { $size: 0 } },
      { $set: { targetEngines: ['openai', 'gemini'] } }
    );
    
    if (emptyRes.modifiedCount > 0) {
      console.log(`Fixed ${emptyRes.modifiedCount} projects with empty engines.`);
    }

    console.log('Database cleanup complete.');
    process.exit(0);
  } catch (err) {
    console.error('Cleanup failed:', err);
    process.exit(1);
  }
}

cleanGroq();
