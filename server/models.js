const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ==================== USER MODEL ====================
const userSchema = new mongoose.Schema({
  staffId: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'staff'], default: 'staff' },
  preferences: {
    theme: { type: String, default: 'light' },
    defaultView: { type: String, default: 'weekly' },
    notifications: { type: Boolean, default: true }
  },
  passwordChangedAt: { type: Date },
  lastLogin: Date,
  loginAttempts: { type: Number, default: 0 },
  lockUntil: { type: Date },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  this.passwordChangedAt = new Date();
});

userSchema.methods.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateToken = function() {
  return jwt.sign(
    { id: this._id, staffId: this.staffId, name: this.name, email: this.email, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

userSchema.methods.incLoginAttempts = async function() {
  this.loginAttempts += 1;
  if (this.loginAttempts >= 5) {
    this.lockUntil = Date.now() + 60 * 60 * 1000;
  }
  return await this.save();
};

userSchema.methods.resetLoginAttempts = async function() {
  this.loginAttempts = 0;
  this.lockUntil = undefined;
  return await this.save();
};

// ==================== DYNAMIC FIELD MODEL ====================
const dynamicFieldSchema = new mongoose.Schema({
  type: { type: String, enum: ['sales', 'costs'], required: true },
  fieldName: { type: String, required: true, trim: true },
  fieldType: { type: String, enum: ['text', 'number', 'currency', 'percentage'], default: 'currency' },
  isRequired: { type: Boolean, default: false },
  order: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isActive: { type: Boolean, default: true },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

// ==================== SALES RECORD MODEL ====================
const salesRecordSchema = new mongoose.Schema({
  week: { type: Number, required: true },
  month: { type: String, required: true },
  year: { type: Number, required: true },
  day: { type: String, required: true },
  values: { type: Map, of: Number, default: {} },
  designMovies: { type: Number, default: 0 },
  phoneRepairs: { type: Number, default: 0 },
  laptopRepairs: { type: Number, default: 0 },
  electronicsSales: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

salesRecordSchema.index({ year: 1, month: 1, week: 1, day: 1 });

salesRecordSchema.pre('save', function() {
  let total = (this.designMovies || 0) + (this.phoneRepairs || 0) +
              (this.laptopRepairs || 0) + (this.electronicsSales || 0);
  if (this.values) {
    for (let value of this.values.values()) {
      if (typeof value === 'number') total += value;
    }
  }
  this.totalSales = total;
});

// ==================== COST RECORD MODEL ====================
const costRecordSchema = new mongoose.Schema({
  week: { type: Number, required: true },
  month: { type: String, required: true },
  year: { type: Number, required: true },
  day: { type: String, required: true },
  values: { type: Map, of: Number, default: {} },
  designMovies: { type: Number, default: 0 },
  phoneParts: { type: Number, default: 0 },
  laptopParts: { type: Number, default: 0 },
  electronicsParts: { type: Number, default: 0 },
  lunchMeals: { type: Number, default: 0 },
  other: { type: Number, default: 0 },
  totalCosts: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

costRecordSchema.index({ year: 1, month: 1, week: 1, day: 1 });

costRecordSchema.pre('save', function() {
  let total = (this.designMovies || 0) + (this.phoneParts || 0) +
              (this.laptopParts || 0) + (this.electronicsParts || 0) +
              (this.lunchMeals || 0) + (this.other || 0);
  if (this.values) {
    for (let value of this.values.values()) {
      if (typeof value === 'number') total += value;
    }
  }
  this.totalCosts = total;
});

// ==================== WEEKLY REPORT MODEL ====================
const weeklyReportSchema = new mongoose.Schema({
  week: { type: Number, required: true },
  month: { type: String, required: true },
  year: { type: Number, required: true },
  totalSales: { type: Number, default: 0 },
  totalCosts: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  profitMargin: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

weeklyReportSchema.index({ year: 1, week: 1 }, { unique: true });

weeklyReportSchema.pre('save', function() {
  this.profit = (this.totalSales || 0) - (this.totalCosts || 0);
  this.profitMargin = this.totalSales > 0 ? (this.profit / this.totalSales) * 100 : 0;
});

const User = mongoose.model('User', userSchema);
const DynamicField = mongoose.model('DynamicField', dynamicFieldSchema);
const SalesRecord = mongoose.model('SalesRecord', salesRecordSchema);
const CostRecord = mongoose.model('CostRecord', costRecordSchema);
const WeeklyReport = mongoose.model('WeeklyReport', weeklyReportSchema);

module.exports = { User, DynamicField, SalesRecord, CostRecord, WeeklyReport };