const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('../src/models/User');

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/geo');
    console.log('Connected to MongoDB');

    const admin = await User.findOne({ email: 'admin@email.com' });
    if (!admin) {
      console.log('Admin not found!');
    } else {
      admin.password = 'admin123456';
      await admin.save();
      console.log('Admin password updated successfully to admin123456!');
    }

    mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

test();
