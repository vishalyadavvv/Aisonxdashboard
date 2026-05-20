const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const User = require('../src/models/User');

async function test() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/geo');
    console.log('Connected to MongoDB');

    const users = await User.find({}, 'name email role');
    console.log('--- USERS ---');
    console.log(JSON.stringify(users, null, 2));

    mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

test();
