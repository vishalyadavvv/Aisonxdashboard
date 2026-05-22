const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Project = require('../src/models/Project');
const { performProjectScan } = require('../src/services/ai_internal/promptOrchestrator');

async function simulate() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/geo');
    console.log('Connected to MongoDB');

    // 1. Fetch our target project
    const project = await Project.findById('6a101f4c23edebcd11fc43bc');
    if (!project) {
      console.log('Project "creatorsxchange performance" not found!');
      mongoose.disconnect();
      return;
    }

    console.log('\n======================================================');
    console.log(`🚀 SIMULATING FULL SCAN FOR: "${project.name}"`);
    console.log(`Domain: ${project.domain}`);
    console.log(`Prompts to Scan:`, project.prompts);
    console.log(`Current Competitors in DB:`, project.competitors);
    console.log('======================================================');

    // 2. Perform the scan
    console.log('\n🔄 Running scan results (AI Audit & Competitor Discovery)...');
    const scanResults = await performProjectScan(project);

    console.log('\n======================================================');
    console.log('✅ SCAN SIMULATION COMPLETED SUCCESSFULLY!');
    console.log('======================================================');

    // 3. Print Competitors
    console.log('\n👥 COMPETITORS DISCOVERED / UPDATED:');
    if (project.competitors.length > 0) {
      project.competitors.forEach((c, idx) => {
        console.log(`  ${idx + 1}. Name: "${c.name}", Domain: "${c.domain}"`);
      });
    } else {
      console.log('  ❌ No competitors discovered!');
    }

    // 4. Print Prompt Rankings
    console.log('\n📊 PROMPT RANKINGS & SCORES:');
    scanResults.promptRankings.forEach((r, idx) => {
      console.log(`\n--------------------------------------------`);
      console.log(`PROMPT ${idx + 1}: "${r.prompt}"`);
      console.log(`Engine: ${r.engine}`);
      console.log(`  Rank: ${r.rank} (0 means not ranked)`);
      console.log(`  Score: ${r.score}`);
      console.log(`  Found: ${r.found}`);
      console.log(`  Snippet: "${r.snippet}"`);
      console.log(`  Citations Found:`, r.citations || r.authoritySignals?.citations || []);
    });

    console.log('\n======================================================');
    mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error during scan simulation:', err);
  }
}

simulate();
