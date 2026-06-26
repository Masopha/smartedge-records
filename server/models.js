const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ─── Helper: extract the last number from a string value ─────────────────────
// Examples: "Kettle 70.00" → 70.00 | "2x Screen 30.00" → 30.00 | "50" → 50
const extractNumber = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  const matches = String(val).match(/[\d]+\.?[\d]*/g);
  if (!matches || matches.length === 0) return 0;
  return parseFloat(matches[matches.length - 1]) || 0;
};

module.exports.extractNumber = extractNumber;

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
// Fields changed to String (varchar) so entries like "Kettle 70.00" are allowed.
// The pre-save hook extracts the last number for totalSales calculation.
const salesRecordSchema = new mongoose.Schema({
  week: { type: Number, required: true },
  month: { type: String, required: true },
  year: { type: Number, required: true },
  day: { type: String, required: true },
  // Dynamic field values stored as strings
  values: { type: Map, of: String, default: {} },
  // Base fields stored as strings — e.g. "Phone Screen 70.00" or just "70.00"
  designMovies: { type: String, default: '' },
  phoneRepairs: { type: String, default: '' },
  laptopRepairs: { type: String, default: '' },
  electronicsSales: { type: String, default: '' },
  // totalSales is always a computed Number for calculations
  totalSales: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

salesRecordSchema.index({ year: 1, month: 1, week: 1, day: 1 });

// Pre-save: extract numeric value from each string field and sum them
salesRecordSchema.pre('save', function() {
  let total = extractNumber(this.designMovies) +
              extractNumber(this.phoneRepairs) +
              extractNumber(this.laptopRepairs) +
              extractNumber(this.electronicsSales);
  if (this.values) {
    for (let value of this.values.values()) {
      total += extractNumber(value);
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
  values: { type: Map, of: String, default: {} },
  designMovies: { type: String, default: '' },
  phoneParts: { type: String, default: '' },
  laptopParts: { type: String, default: '' },
  electronicsParts: { type: String, default: '' },
  lunchMeals: { type: String, default: '' },
  other: { type: String, default: '' },
  totalCosts: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null }
}, { timestamps: true });

costRecordSchema.index({ year: 1, month: 1, week: 1, day: 1 });

costRecordSchema.pre('save', function() {
  let total = extractNumber(this.designMovies) +
              extractNumber(this.phoneParts) +
              extractNumber(this.laptopParts) +
              extractNumber(this.electronicsParts) +
              extractNumber(this.lunchMeals) +
              extractNumber(this.other);
  if (this.values) {
    for (let value of this.values.values()) {
      total += extractNumber(value);
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

// ==================== RUNNING BALANCE MODEL ====================
// Stores the closing balance carried forward from one period to the next.
// This powers the P&L running balance feature.
const runningBalanceSchema = new mongoose.Schema({
  week: { type: Number, required: true },
  month: { type: String, required: true },
  year: { type: Number, required: true },
  closingBalance: { type: Number, default: 0 },
  openingBalance: { type: Number, default: 0 },
  totalSales: { type: Number, default: 0 },
  totalCosts: { type: Number, default: 0 },
  netMovement: { type: Number, default: 0 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

runningBalanceSchema.index({ year: 1, month: 1, week: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);
const DynamicField = mongoose.model('DynamicField', dynamicFieldSchema);
const SalesRecord = mongoose.model('SalesRecord', salesRecordSchema);
const CostRecord = mongoose.model('CostRecord', costRecordSchema);
const WeeklyReport = mongoose.model('WeeklyReport', weeklyReportSchema);
const RunningBalance = mongoose.model('RunningBalance', runningBalanceSchema);

module.exports = { User, DynamicField, SalesRecord, CostRecord, WeeklyReport, RunningBalance, extractNumber };
