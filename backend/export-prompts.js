const mongoose = require('mongoose');
require('dotenv').config();
const Project = require('./src/models/Project');
const fs = require('fs');

async function exportPrompts() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const project = await Project.findOne({ brandName: 'CreatorsXchange' });
        fs.writeFileSync('creatorsxchange_prompts.json', JSON.stringify(project.prompts, null, 2));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

exportPrompts();
