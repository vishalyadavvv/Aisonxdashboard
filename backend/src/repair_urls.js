const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Project = require('../models/Project');

async function repair() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/geo');
        
        const projects = await Project.find({ 'competitors.name': /Accro/i });
        console.log(`Found ${projects.length} projects with Accro-Tech.`);
        
        let updated = 0;
        for (const p of projects) {
            let changed = false;
            p.competitors = p.competitors.map(c => {
                if (c.name.match(/Accro/i) && c.domain === 'accrotech.in') {
                    console.log(`Updating ${c.name}: accrotech.in -> accrotech.com`);
                    c.domain = 'accrotech.com';
                    changed = true;
                    updated++;
                }
                return c;
            });
            if (changed) {
                await p.save();
            }
        }
        
        console.log(`Successfully updated ${updated} competitor URLs.`);
        process.exit(0);
    } catch (err) {
        console.error('Repair failed:', err);
        process.exit(1);
    }
}

repair();
