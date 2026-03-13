const mongoose = require('mongoose');
require('dotenv').config();
const { User } = require('./models');

async function createDefaultUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    let user = await User.findOne({ staffId: 'S100' });

    if (user) {
      user.password = 'smart.edge';
      user.name = 'System Administrator';
      user.email = 'admin@smartedge.com';
      user.role = 'admin';
      user.isActive = true;
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();
      console.log('✅ Default user updated');
    } else {
      user = new User({
        staffId: 'S100',
        name: 'System Administrator',
        email: 'admin@smartedge.com',
        password: 'smart.edge',
        role: 'admin',
        isActive: true
      });
      await user.save();
      console.log('✅ Default admin user created!');
    }

    console.log('\n📋 Login Credentials:');
    console.log('   Staff ID: S100');
    console.log('   Password: smart.edge');
    console.log('   Role: Admin');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

createDefaultUser();