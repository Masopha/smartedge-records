const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const { User } = require('./models');

async function forceReset() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Find the user
    const user = await User.findOne({ staffId: 'S100' });
    
    if (!user) {
      console.log('❌ User not found');
      process.exit();
    }
    
    console.log('📋 User found:', user.staffId);
    
    // Method 1: Direct bcrypt hash
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('smart.edge', salt);
    
    // Update password directly
    await User.updateOne(
      { staffId: 'S100' },
      { 
        $set: { 
          password: hashedPassword,
          passwordChangedAt: new Date()
        } 
      }
    );
    
    console.log('✅ Password updated via direct update');
    
    // Verify with direct bcrypt compare
    const updatedUser = await User.findOne({ staffId: 'S100' });
    const directCompare = await bcrypt.compare('smart.edge', updatedUser.password);
    console.log('✅ Direct bcrypt compare:', directCompare ? 'SUCCESS' : 'FAILED');
    
    // Test the model method
    try {
      const methodCompare = await updatedUser.comparePassword('smart.edge');
      console.log('✅ Model method compare:', methodCompare ? 'SUCCESS' : 'FAILED');
    } catch (e) {
      console.log('❌ Model method error:', e.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit();
  }
}

forceReset();