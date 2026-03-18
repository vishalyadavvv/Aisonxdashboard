const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./src/models/User');

dotenv.config();

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined in .env');
    }

    await mongoose.connect(mongoUri);
    console.log('📦 Connected to MongoDB');

    // Default Admin details - USER can change these later
    const adminData = {
      name: 'Super Admin',
      email: 'admin@aisonx.com',
      phone: '1234567890',
      password: 'AdminPassword123!',
      role: 'admin'
    };

    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log('⚠️ Admin already exists');
      process.exit(0);
    }

    await User.create(adminData);
    console.log('✅ Admin account seeded successfully');
    console.log('📧 Email:', adminData.email);
    console.log('🔑 Password:', adminData.password);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error seeding admin:', err.message);
    process.exit(1);
  }
};

seedAdmin();
