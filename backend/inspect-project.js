const mongoose = require('mongoose');
require('dotenv').config();
const Project = require('./src/models/Project');

async function inspect() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const project = await Project.findOne({ brandName: 'Treecampus' });
        if (!project) {
            const projects = await Project.find({});
            console.log('Available projects:', projects.map(p => p.brandName || p.name));
        } else {
            console.log('Project Data:', JSON.stringify(project, null, 2));
        }
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspect();
