// check-user.js
const mongoose = require('mongoose');
require('dotenv').config();
const { User } = require('./models');

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const user = await User.findOne({ staffId: 'S100' });
    
    if (user) {
      console.log('✅ User found:');
      console.log('   Staff ID:', user.staffId);
      console.log('   Name:', user.name);
      console.log('   Email:', user.email);
      console.log('   Role:', user.role);
      
      // Test password
      const isMatch = await user.comparePassword('smart.edge');
      console.log('   Password "smart.edge" matches:', isMatch);
    } else {
      console.log('❌ User S100 not found in database');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

checkUser();