const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const Project = require('../src/models/Project');
const Snapshot = require('../src/models/Snapshot');

async function inspectSnapshots() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/geo');
    console.log('Connected to MongoDB');

    const project = await Project.findOne({ domain: /creatorsxchange/i });
    if (!project) {
      console.log('Project for creatorsxchange not found!');
      mongoose.disconnect();
      return;
    }

    const snapshots = await Snapshot.find({ projectId: project._id }).sort({ date: -1 });
    console.log(`Found ${snapshots.length} snapshots for project ${project.name}`);

    for (const snap of snapshots) {
      console.log(`\n=============================================`);
      console.log(`SNAPSHOT ID: ${snap._id}`);
      console.log(`DATE: ${snap.date}`);
      console.log(`OVERALL SCORE: ${snap.overallScore}`);
      console.log(`ENGINE SCORES:`, snap.engineScores);
      console.log(`PROMPT RANKINGS COUNT: ${snap.promptRankings?.length}`);
      console.log(`COMPETITOR RANKINGS COUNT: ${snap.competitorRankings?.length}`);
      
      // Let's see some prompt rankings
      if (snap.promptRankings && snap.promptRankings.length > 0) {
        console.log(`First few prompt rankings:`);
        snap.promptRankings.slice(0, 3).forEach(pr => {
          console.log(`  - Prompt: "${pr.prompt}"`);
          console.log(`    Engine: ${pr.engine}, Rank: ${pr.rank}, Score: ${pr.score}, Found: ${pr.found}`);
          console.log(`    Snippet: "${pr.snippet}"`);
        });
      }
    }

    mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

inspectSnapshots();
