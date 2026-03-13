const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { User } = require('./models');

async function resetPassword() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    const user = await User.findOne({ staffId: 'S100' });
    
    if (user) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash('smart.edge', salt);
      user.passwordChangedAt = new Date();
      
      await user.save();
      console.log('✅ Password reset successfully to: smart.edge');
      
      const verifyUser = await User.findOne({ staffId: 'S100' });
      const isMatch = await verifyUser.comparePassword('smart.edge');
      console.log('✅ Password verification:', isMatch ? 'SUCCESS' : 'FAILED');
    } else {
      console.log('❌ User not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

resetPassword();