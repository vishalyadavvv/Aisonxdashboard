const mongoose = require('mongoose');
require('dotenv').config();
const { gptCompetitiveBatchAudit } = require('./src/services/ai_live/projectAuditor');
const Project = require('./src/models/Project');

async function debug() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const project = await Project.findOne({ brandName: 'CreatorsXchange' });
        if (!project) {
            console.error('Project not found');
            process.exit(1);
        }

        console.log('--- DEBUGGING OPENAI AUDIT ---');
        console.log(`Brand: ${project.brandName}`);
        console.log(`Prompts: ${project.prompts.join(', ')}`);

        // We will monkey-patch the logger to capture output if needed, 
        // but for now let's just run it.
        const results = await gptCompetitiveBatchAudit(
            project.brandName, 
            project.domain, 
            project.competitors, 
            project.prompts, 
            project.market
        );

        console.log('--- RESULTS SAVED TO openai_debug_results.json ---');
        require('fs').writeFileSync('openai_debug_results.json', JSON.stringify(results, null, 2));

        process.exit(0);
    } catch (err) {
        console.error('CRITICAL ERROR:', err);
        process.exit(1);
    }
}

debug();
