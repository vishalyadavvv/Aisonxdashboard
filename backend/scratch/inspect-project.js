const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Project = require('../src/models/Project');
const Snapshot = require('../src/models/Snapshot');

async function inspect() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/geo');
    console.log('Connected to MongoDB');

    // Find the creatorsxchange project by ID
    const project = await Project.findById('6a101f4c23edebcd11fc43bc');
    if (!project) {
      console.log('Project not found!');
      mongoose.disconnect();
      return;
    }

    console.log('\n--- PROJECT DETAILS ---');
    console.log('ID:', project._id);
    console.log('Name:', project.name);
    console.log('Brand Name:', project.brandName);
    console.log('Domain:', project.domain);
    console.log('Prompts:', project.prompts);
    console.log('Competitors:', project.competitors);
    console.log('Market:', project.market);
    console.log('isScanning:', project.isScanning);
    console.log('Last Scan At:', project.lastScanAt);

    // Find the latest snapshot for this project
    const snapshot = await Snapshot.findOne({ projectId: project._id }).sort({ date: -1 });
    if (!snapshot) {
      console.log('\nNo snapshots found for this project!');
    } else {
      console.log('\n--- LATEST SNAPSHOT DETAILS ---');
      console.log('ID:', snapshot._id);
      console.log('Date:', snapshot.date);
      console.log('Overall Score:', snapshot.overallScore);
      console.log('Engine Scores:', snapshot.engineScores);
      console.log('Competitor Rankings count:', snapshot.competitorRankings?.length);
      console.log('Competitor Rankings:', JSON.stringify(snapshot.competitorRankings, null, 2));
      console.log('Prompt Rankings count:', snapshot.promptRankings?.length);
      
      console.log('\n--- PROMPT RANKINGS BY PROMPT ---');
      for (const pr of snapshot.promptRankings) {
        console.log(`\nPrompt: "${pr.prompt}"`);
        console.log(`Engine: ${pr.engine}`);
        console.log(`  Rank: ${pr.rank}`);
        console.log(`  Score: ${pr.score}`);
        console.log(`  Found: ${pr.found}`);
        console.log(`  Snippet: "${pr.snippet}"`);
        console.log(`  Citations:`, pr.citations);
      }
    }

    mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

inspect();
