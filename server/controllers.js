const { User, DynamicField, SalesRecord, CostRecord, WeeklyReport, RunningBalance, extractNumber } = require('./models');
const jwt = require('jsonwebtoken');
const moment = require('moment-timezone');

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const monthOrder = (m) => MONTHS.indexOf(m);

// ==================== AUTH CONTROLLERS ====================
const authController = {
  login: async (req, res) => {
    try {
      const { staffId, password } = req.body;
      if (!staffId || !password) return res.status(400).json({ success: false, message: 'Please provide Staff ID and password' });

      const user = await User.findOne({ staffId: staffId.toUpperCase() });
      if (!user) return res.status(401).json({ success: false, message: 'Invalid Staff ID or password' });

      if (user.lockUntil && user.lockUntil > Date.now()) {
        const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
        return res.status(401).json({ success: false, message: `Account locked. Try again in ${minutesLeft} minutes` });
      }

      if (!user.isActive) return res.status(401).json({ success: false, message: 'Account is deactivated. Contact administrator.' });

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        await user.incLoginAttempts();
        const attemptsLeft = Math.max(0, 5 - user.loginAttempts);
        return res.status(401).json({
          success: false,
          message: attemptsLeft > 0 ? `Invalid password. ${attemptsLeft} attempts remaining` : 'Account locked for 1 hour due to too many failed attempts'
        });
      }

      await user.resetLoginAttempts();
      user.lastLogin = new Date();
      await user.save();

      const token = user.generateToken();
      res.json({
        success: true,
        data: { id: user._id, staffId: user.staffId, name: user.name, email: user.email, role: user.role, lastLogin: user.lastLogin },
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ success: false, message: 'An error occurred during login' });
    }
  },

  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) return res.status(400).json({ success: false, message: 'Please provide current and new password' });
      if (newPassword.length < 6) return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });

      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect' });
      if (currentPassword === newPassword) return res.status(400).json({ success: false, message: 'New password must differ from current' });

      user.password = newPassword;
      await user.save();

      const newToken = user.generateToken();
      res.json({ success: true, message: 'Password changed successfully', token: newToken });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getMe: async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select('-password -loginAttempts -lockUntil');
      res.json({ success: true, data: user });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

// ==================== DYNAMIC FIELD CONTROLLERS ====================
const dynamicFieldController = {
  getAll: async (req, res) => {
    try {
      const { type, includeDeleted } = req.query;
      const filter = {};
      if (type) filter.type = type;
      if (includeDeleted !== 'true') filter.isActive = true;
      const fields = await DynamicField.find(filter).sort('order').populate('createdBy', 'name staffId');
      res.json({ success: true, data: fields });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  create: async (req, res) => {
    try {
      const field = await DynamicField.create({ ...req.body, createdBy: req.user.id });
      res.status(201).json({ success: true, data: field, message: 'Field created successfully' });
    } catch (error) {
      if (error.code === 11000) return res.status(400).json({ success: false, message: 'Field name already exists' });
      res.status(500).json({ success: false, message: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const field = await DynamicField.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!field) return res.status(404).json({ success: false, message: 'Field not found' });
      res.json({ success: true, data: field, message: 'Field updated successfully' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  delete: async (req, res) => {
    try {
      const field = await DynamicField.findByIdAndUpdate(req.params.id, { isActive: false, deletedAt: new Date() }, { new: true });
      if (!field) return res.status(404).json({ success: false, message: 'Field not found' });
      res.json({ success: true, message: 'Field deactivated successfully' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  restore: async (req, res) => {
    try {
      const field = await DynamicField.findByIdAndUpdate(req.params.id, { isActive: true, deletedAt: null }, { new: true });
      if (!field) return res.status(404).json({ success: false, message: 'Field not found' });
      res.json({ success: true, data: field, message: 'Field restored successfully' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  permanentDelete: async (req, res) => {
    try {
      const field = await DynamicField.findByIdAndDelete(req.params.id);
      if (!field) return res.status(404).json({ success: false, message: 'Field not found' });
      res.json({ success: true, message: 'Field permanently deleted' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  }
};

// ==================== SALES CONTROLLERS ====================
const salesController = {
  getAll: async (req, res) => {
    try {
      const { year, month, week, includeDeleted } = req.query;
      const query = {};
      if (year) query.year = parseInt(year);
      if (month) query.month = month;
      if (week) query.week = parseInt(week);
      if (includeDeleted !== 'true') query.isDeleted = { $ne: true };

      const records = await SalesRecord.find(query).sort({ day: 1 });
      const fields = await DynamicField.find({ type: 'sales', isActive: true }).sort('order');
      res.json({ success: true, data: records, dynamicFields: fields });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  create: async (req, res) => {
    try {
      const { week, month, year, day, ...values } = req.body;
      let record = await SalesRecord.findOne({ week, month, year, day, isDeleted: { $ne: true } });
      if (record) {
        Object.assign(record, values);
        await record.save();
      } else {
        record = await SalesRecord.create({ week, month, year, day, ...values, createdBy: req.user.id });
      }
      res.status(201).json({ success: true, data: record, message: 'Sales record saved' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  update: async (req, res) => {
    try {
      const record = await SalesRecord.findById(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
      Object.assign(record, req.body);
      await record.save();
      res.json({ success: true, data: record, message: 'Sales record updated' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  softDelete: async (req, res) => {
    try {
      const record = await SalesRecord.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date() }, { new: true });
      if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
      res.json({ success: true, message: 'Sales record deleted' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  restore: async (req, res) => {
    try {
      const record = await SalesRecord.findByIdAndUpdate(req.params.id, { isDeleted: false, deletedAt: null }, { new: true });
      if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
      res.json({ success: true, data: record, message: 'Sales record restored' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  permanentDelete: async (req, res) => {
    try {
      const record = await SalesRecord.findByIdAndDelete(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
      res.json({ success: true, message: 'Sales record permanently deleted' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  getWeeklySummary: async (req, res) => {
    try {
      const { year, week } = req.query;
      const records = await SalesRecord.find({ year: parseInt(year), week: parseInt(week), isDeleted: { $ne: true } });
      const summary = { total: 0, byDay: {}, byCategory: {} };
      records.forEach(record => {
        summary.total += record.totalSales;
        summary.byDay[record.day] = record.totalSales;
        ['designMovies', 'phoneRepairs', 'laptopRepairs', 'electronicsSales'].forEach(field => {
          const num = extractNumber(record[field]);
          if (num) summary.byCategory[field] = (summary.byCategory[field] || 0) + num;
        });
        if (record.values) {
          for (let [key, value] of record.values) {
            const num = extractNumber(value);
            if (num) summary.byCategory[key] = (summary.byCategory[key] || 0) + num;
          }
        }
      });
      res.json({ success: true, data: summary });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  }
};

// ==================== COSTS CONTROLLERS ====================
const costsController = {
  getAll: async (req, res) => {
    try {
      const { year, month, week, includeDeleted } = req.query;
      const query = {};
      if (year) query.year = parseInt(year);
      if (month) query.month = month;
      if (week) query.week = parseInt(week);
      if (includeDeleted !== 'true') query.isDeleted = { $ne: true };

      const records = await CostRecord.find(query).sort({ day: 1 });
      const fields = await DynamicField.find({ type: 'costs', isActive: true }).sort('order');
      res.json({ success: true, data: records, dynamicFields: fields });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  create: async (req, res) => {
    try {
      const { week, month, year, day, ...values } = req.body;
      let record = await CostRecord.findOne({ week, month, year, day, isDeleted: { $ne: true } });
      if (record) {
        Object.assign(record, values);
        await record.save();
      } else {
        record = await CostRecord.create({ week, month, year, day, ...values, createdBy: req.user.id });
      }
      res.status(201).json({ success: true, data: record, message: 'Cost record saved' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  update: async (req, res) => {
    try {
      const record = await CostRecord.findById(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
      Object.assign(record, req.body);
      await record.save();
      res.json({ success: true, data: record, message: 'Cost record updated' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  softDelete: async (req, res) => {
    try {
      const record = await CostRecord.findByIdAndUpdate(req.params.id, { isDeleted: true, deletedAt: new Date() }, { new: true });
      if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
      res.json({ success: true, message: 'Cost record deleted' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  restore: async (req, res) => {
    try {
      const record = await CostRecord.findByIdAndUpdate(req.params.id, { isDeleted: false, deletedAt: null }, { new: true });
      if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
      res.json({ success: true, data: record, message: 'Cost record restored' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  permanentDelete: async (req, res) => {
    try {
      const record = await CostRecord.findByIdAndDelete(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
      res.json({ success: true, message: 'Cost record permanently deleted' });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  }
};

// ─── Internal helper: fetch sales+costs totals for a period range ─────────────
const getPeriodTotals = async (query) => {
  const [sales, costs] = await Promise.all([
    SalesRecord.find({ ...query, isDeleted: { $ne: true } }),
    CostRecord.find({ ...query, isDeleted: { $ne: true } })
  ]);
  const totalSales = sales.reduce((s, r) => s + (r.totalSales || 0), 0);
  const totalCosts = costs.reduce((s, r) => s + (r.totalCosts || 0), 0);
  return { totalSales, totalCosts, profit: totalSales - totalCosts, salesRecords: sales, costsRecords: costs };
};

// ─── Internal helper: get opening balance for a period ───────────────────────
// Finds the most recent RunningBalance record before this period and returns
// its closingBalance as the opening balance for the current period.
const getOpeningBalance = async (year, month, week) => {
  // Try to find the previous week's closing balance
  const allBalances = await RunningBalance.find().sort({ year: -1, createdAt: -1 });
  if (!allBalances.length) return 0;

  // Find the most recent balance that is before this period
  const currentMonthIdx = monthOrder(month);
  for (const b of allBalances) {
    const bMonthIdx = monthOrder(b.month);
    if (
      b.year < year ||
      (b.year === year && bMonthIdx < currentMonthIdx) ||
      (b.year === year && bMonthIdx === currentMonthIdx && b.week < week)
    ) {
      return b.closingBalance;
    }
  }
  return 0;
};

// ==================== REPORT CONTROLLERS ====================
const reportController = {

  // ── Weekly report ──────────────────────────────────────────────────────────
  getWeeklyReport: async (req, res) => {
    try {
      const { year, week } = req.query;
      const y = parseInt(year), w = parseInt(week);

      const sales = await SalesRecord.find({ year: y, week: w, isDeleted: { $ne: true } });
      const costs = await CostRecord.find({ year: y, week: w, isDeleted: { $ne: true } });

      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      let totalSales = 0, totalCosts = 0;
      const dailyBreakdown = [];

      days.forEach(day => {
        const daySales = sales.find(s => s.day === day)?.totalSales || 0;
        const dayCosts = costs.find(c => c.day === day)?.totalCosts || 0;
        dailyBreakdown.push({ day, sales: daySales, costs: dayCosts, profit: daySales - dayCosts });
        totalSales += daySales;
        totalCosts += dayCosts;
      });

      const profit = totalSales - totalCosts;
      const profitMargin = totalSales > 0 ? (profit / totalSales) * 100 : 0;

      const categoryBreakdown = { sales: {}, costs: {} };
      sales.forEach(record => {
        ['designMovies', 'phoneRepairs', 'laptopRepairs', 'electronicsSales'].forEach(field => {
          const num = extractNumber(record[field]);
          if (num) categoryBreakdown.sales[field] = (categoryBreakdown.sales[field] || 0) + num;
        });
        if (record.values) {
          for (let [key, value] of record.values) {
            const num = extractNumber(value);
            if (num) categoryBreakdown.sales[key] = (categoryBreakdown.sales[key] || 0) + num;
          }
        }
      });
      costs.forEach(record => {
        ['designMovies', 'phoneParts', 'laptopParts', 'electronicsParts', 'lunchMeals', 'other'].forEach(field => {
          const num = extractNumber(record[field]);
          if (num) categoryBreakdown.costs[field] = (categoryBreakdown.costs[field] || 0) + num;
        });
        if (record.values) {
          for (let [key, value] of record.values) {
            const num = extractNumber(value);
            if (num) categoryBreakdown.costs[key] = (categoryBreakdown.costs[key] || 0) + num;
          }
        }
      });

      res.json({
        success: true,
        data: { year: y, week: w, totalSales, totalCosts, profit, profitMargin, dailyBreakdown, categoryBreakdown }
      });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  // ── Monthly report ─────────────────────────────────────────────────────────
  getMonthlyReport: async (req, res) => {
    try {
      const { year, month } = req.query;
      const sales = await SalesRecord.find({ year: parseInt(year), month, isDeleted: { $ne: true } });
      const costs = await CostRecord.find({ year: parseInt(year), month, isDeleted: { $ne: true } });

      const weeks = [...new Set(sales.map(s => s.week).concat(costs.map(c => c.week)))].sort();
      const weeklyData = [];
      let totalSales = 0, totalCosts = 0;

      weeks.forEach(week => {
        const weekSales = sales.filter(s => s.week === week).reduce((sum, s) => sum + s.totalSales, 0);
        const weekCosts = costs.filter(c => c.week === week).reduce((sum, c) => sum + c.totalCosts, 0);
        weeklyData.push({ week, sales: weekSales, costs: weekCosts, profit: weekSales - weekCosts });
        totalSales += weekSales;
        totalCosts += weekCosts;
      });

      res.json({
        success: true,
        data: {
          year, month, totalSales, totalCosts,
          profit: totalSales - totalCosts,
          profitMargin: totalSales > 0 ? ((totalSales - totalCosts) / totalSales) * 100 : 0,
          weeklyData
        }
      });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  // ── Available periods ──────────────────────────────────────────────────────
  getAvailablePeriods: async (req, res) => {
    try {
      const [salesPeriods, costsPeriods] = await Promise.all([
        SalesRecord.aggregate([
          { $match: { isDeleted: { $ne: true } } },
          { $group: { _id: { week: '$week', month: '$month', year: '$year' } } },
          { $sort: { '_id.year': -1, '_id.month': -1, '_id.week': -1 } }
        ]),
        CostRecord.aggregate([
          { $match: { isDeleted: { $ne: true } } },
          { $group: { _id: { week: '$week', month: '$month', year: '$year' } } },
          { $sort: { '_id.year': -1, '_id.month': -1, '_id.week': -1 } }
        ])
      ]);

      const seen = new Set();
      const combined = [];
      [...salesPeriods, ...costsPeriods].forEach(({ _id }) => {
        const key = `${_id.week}-${_id.month}-${_id.year}`;
        if (!seen.has(key)) { seen.add(key); combined.push({ week: _id.week, month: _id.month, year: _id.year }); }
      });

      combined.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        if (monthOrder(b.month) !== monthOrder(a.month)) return monthOrder(b.month) - monthOrder(a.month);
        return b.week - a.week;
      });

      res.json({ success: true, data: combined });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  // ── Daily report ───────────────────────────────────────────────────────────
  getDailyReport: async (req, res) => {
    try {
      const { year, month, week, day } = req.query;
      const query = { year: parseInt(year), month, week: parseInt(week), isDeleted: { $ne: true } };
      if (day) query.day = day;

      const [sales, costs] = await Promise.all([
        SalesRecord.find(query),
        CostRecord.find({ ...query })
      ]);

      const rows = [];
      const days = day ? [day] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

      days.forEach(d => {
        const s = sales.find(r => r.day === d);
        const c = costs.find(r => r.day === d);
        const daySales = s?.totalSales || 0;
        const dayCosts = c?.totalCosts || 0;
        rows.push({
          day: d,
          sales: daySales,
          costs: dayCosts,
          profit: daySales - dayCosts,
          salesDetail: s || null,
          costsDetail: c || null
        });
      });

      const totalSales = rows.reduce((s, r) => s + r.sales, 0);
      const totalCosts = rows.reduce((s, r) => s + r.costs, 0);

      res.json({
        success: true,
        data: {
          year: parseInt(year), month, week: parseInt(week), day: day || 'all',
          rows, totalSales, totalCosts,
          profit: totalSales - totalCosts,
          profitMargin: totalSales > 0 ? ((totalSales - totalCosts) / totalSales) * 100 : 0
        }
      });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  // ── Multi-month report (3, 6, 9, 12 months) ───────────────────────────────
  getMultiMonthReport: async (req, res) => {
    try {
      const { year, endMonth, months } = req.query;
      const numMonths = parseInt(months) || 3;
      const y = parseInt(year);

      // Build list of month+year combinations going backwards from endMonth
      const endMonthIdx = monthOrder(endMonth);
      const periods = [];
      for (let i = 0; i < numMonths; i++) {
        let mIdx = endMonthIdx - i;
        let mYear = y;
        if (mIdx < 0) { mIdx += 12; mYear -= 1; }
        periods.push({ month: MONTHS[mIdx], year: mYear });
      }
      periods.reverse(); // oldest first

      const monthlyResults = [];
      let cumulativeSales = 0, cumulativeCosts = 0;

      for (const p of periods) {
        const [sales, costs] = await Promise.all([
          SalesRecord.find({ year: p.year, month: p.month, isDeleted: { $ne: true } }),
          CostRecord.find({ year: p.year, month: p.month, isDeleted: { $ne: true } })
        ]);
        const mSales = sales.reduce((s, r) => s + (r.totalSales || 0), 0);
        const mCosts = costs.reduce((s, r) => s + (r.totalCosts || 0), 0);
        cumulativeSales += mSales;
        cumulativeCosts += mCosts;

        monthlyResults.push({
          month: p.month, year: p.year,
          totalSales: mSales, totalCosts: mCosts,
          profit: mSales - mCosts,
          profitMargin: mSales > 0 ? ((mSales - mCosts) / mSales) * 100 : 0,
          cumulativeSales, cumulativeCosts,
          cumulativeProfit: cumulativeSales - cumulativeCosts
        });
      }

      res.json({
        success: true,
        data: {
          months: numMonths, endMonth, endYear: y,
          monthlyResults,
          summary: {
            totalSales: cumulativeSales,
            totalCosts: cumulativeCosts,
            totalProfit: cumulativeSales - cumulativeCosts,
            profitMargin: cumulativeSales > 0 ? ((cumulativeSales - cumulativeCosts) / cumulativeSales) * 100 : 0
          }
        }
      });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  // ── P&L Running Balance ────────────────────────────────────────────────────
  // Returns the full P&L statement for a period including the opening balance
  // carried forward from the previous period and the closing balance.
  getProfitLoss: async (req, res) => {
    try {
      const { year, month, week } = req.query;
      const y = parseInt(year), w = parseInt(week);

      const openingBalance = await getOpeningBalance(y, month, w);

      const [sales, costs] = await Promise.all([
        SalesRecord.find({ year: y, month, week: w, isDeleted: { $ne: true } }),
        CostRecord.find({ year: y, month, week: w, isDeleted: { $ne: true } })
      ]);

      const totalSales = sales.reduce((s, r) => s + (r.totalSales || 0), 0);
      const totalCosts = costs.reduce((s, r) => s + (r.totalCosts || 0), 0);
      const netMovement = totalSales - totalCosts;
      const closingBalance = openingBalance + netMovement;

      // Save/update the running balance for this period
      await RunningBalance.findOneAndUpdate(
        { year: y, month, week: w },
        { year: y, month, week: w, openingBalance, totalSales, totalCosts, netMovement, closingBalance },
        { upsert: true, new: true }
      );

      // Build daily breakdown
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dailyBreakdown = days.map(day => {
        const s = sales.find(r => r.day === day)?.totalSales || 0;
        const c = costs.find(r => r.day === day)?.totalCosts || 0;
        return { day, sales: s, costs: c, profit: s - c };
      });

      // Categorised sales breakdown
      const salesBreakdown = {};
      sales.forEach(record => {
        ['designMovies', 'phoneRepairs', 'laptopRepairs', 'electronicsSales'].forEach(field => {
          const val = record[field];
          if (val) salesBreakdown[field] = { raw: val, amount: extractNumber(val) };
        });
        if (record.values) {
          for (let [key, value] of record.values) {
            if (value) salesBreakdown[key] = { raw: value, amount: extractNumber(value) };
          }
        }
      });

      // Categorised costs breakdown
      const costsBreakdown = {};
      costs.forEach(record => {
        ['designMovies', 'phoneParts', 'laptopParts', 'electronicsParts', 'lunchMeals', 'other'].forEach(field => {
          const val = record[field];
          if (val) costsBreakdown[field] = { raw: val, amount: extractNumber(val) };
        });
        if (record.values) {
          for (let [key, value] of record.values) {
            if (value) costsBreakdown[key] = { raw: value, amount: extractNumber(value) };
          }
        }
      });

      res.json({
        success: true,
        data: {
          period: { year: y, month, week: w },
          openingBalance,
          totalSales,
          totalCosts,
          netMovement,
          closingBalance,
          profitMargin: totalSales > 0 ? (netMovement / totalSales) * 100 : 0,
          dailyBreakdown,
          salesBreakdown,
          costsBreakdown,
          statement: [
            { label: 'Opening Balance', amount: openingBalance, type: 'balance' },
            { label: 'Total Sales (Revenue)', amount: totalSales, type: 'income' },
            { label: 'Total Costs (Expenses)', amount: -totalCosts, type: 'expense' },
            { label: 'Net Movement', amount: netMovement, type: 'net' },
            { label: 'Closing Balance', amount: closingBalance, type: 'balance' }
          ]
        }
      });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  },

  // ── Get running balance history ────────────────────────────────────────────
  getRunningBalanceHistory: async (req, res) => {
    try {
      const { limit = 20 } = req.query;
      const balances = await RunningBalance.find()
        .sort({ year: -1, createdAt: -1 })
        .limit(parseInt(limit));
      res.json({ success: true, data: balances });
    } catch (error) { res.status(500).json({ success: false, message: error.message }); }
  }
};

module.exports = { authController, dynamicFieldController, salesController, costsController, reportController };
