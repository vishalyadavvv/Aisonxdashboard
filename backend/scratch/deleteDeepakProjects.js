const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const Project = require('../src/models/Project');
const Snapshot = require('../src/models/Snapshot');

async function deleteUserProjects() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB.\n');

    const email = 'deepakchandorya@gmail.com';
    const user = await User.findOne({ email });

    if (!user) {
      console.log(`User with email ${email} not found.`);
      await mongoose.connection.close();
      return;
    }

    // Find all project IDs for this user
    const projects = await Project.find({ userId: user._id });
    const projectIds = projects.map(p => p._id);

    if (projectIds.length === 0) {
      console.log('No projects found for Deepak.');
    } else {
      console.log(`Found ${projectIds.length} projects for Deepak. Deleting...`);
      
      // Delete Snapshots first
      const snapResult = await Snapshot.deleteMany({ projectId: { $in: projectIds } });
      console.log(`Deleted ${snapResult.deletedCount} scan snapshots.`);

      // Delete Projects
      const projResult = await Project.deleteMany({ userId: user._id });
      console.log(`Deleted ${projResult.deletedCount} projects.`);
    }

    console.log('\nCleanup complete.');
    await mongoose.connection.close();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

deleteUserProjects();
