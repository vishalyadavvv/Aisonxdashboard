const mongoose = require('mongoose');
require('dotenv').config();
const Project = require('./src/models/Project');

async function findProjectWithPrompts() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const projects = await Project.find({}, 'name brandName prompts customPrompts');
        const withPrompts = projects.filter(p => p.prompts && p.prompts.length > 0);
        console.log('Projects with prompts:');
        withPrompts.forEach(p => {
            console.log(`- ${p.brandName || p.name}: ${p.prompts.length} prompts`);
            console.log(`  First prompt: ${p.prompts[0]}`);
        });

        const withCustomPrompts = projects.filter(p => p.customPrompts && p.customPrompts.length > 0);
        console.log('\nProjects with custom prompts:');
        withCustomPrompts.forEach(p => {
            console.log(`- ${p.brandName || p.name}: ${p.customPrompts.length} custom prompts`);
            console.log(`  First custom: ${p.customPrompts[0].text}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

findProjectWithPrompts();
