const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Project = require('../src/models/Project');

async function listProjects() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/geo');
    console.log('Connected to MongoDB');

    const projects = await Project.find({});
    console.log(`Found ${projects.length} projects total:`);
    projects.forEach(p => {
      console.log(`- ID: ${p._id}, Name: ${p.name}, Domain: ${p.domain}, BrandName: ${p.brandName}, LastScanAt: ${p.lastScanAt}`);
    });

    mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

listProjects();
