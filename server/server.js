const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const routes = require('./routes');
const { errorHandler } = require('./middleware');
const app = express();

// Connect to MongoDB with retry logic
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB Error:', err.message);
    setTimeout(connectDB, 5000);
  }
};

connectDB();

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected. Reconnecting...');
  setTimeout(connectDB, 3000);
});

mongoose.connection.once('open', async () => {
  try {
    const { User } = require('./models');
    const bcrypt = require('bcryptjs');
    const user = await User.findOne({ staffId: 'S100' });
    if (user) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash('smart.edge', salt);
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();
      console.log('✅ Password reset on Atlas');
    } else {
      console.log('❌ User S100 not found');
    }
  } catch (err) {
    console.error('❌ Password reset error:', err.message);
  }
});

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false
}));

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://smartedge-records.vercel.app',
    process.env.CLIENT_URL
  ].filter(Boolean),
  credentials: true,
  exposedHeaders: ['X-New-Token']
}));

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// More permissive rate limiting - 500 requests per 15 min per IP
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
}));

// Auth routes get more lenient rate limiting
app.use('/api/auth', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { success: false, message: 'Too many login attempts, please try again later.' }
}));

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timezone: process.env.TIMEZONE || 'Africa/Johannesburg',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime()
  });
});

app.use(errorHandler);

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`⏰ Timezone: ${process.env.TIMEZONE || 'Africa/Johannesburg'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
