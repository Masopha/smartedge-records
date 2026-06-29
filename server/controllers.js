const { User, DynamicField, SalesRecord, CostRecord, WeeklyReport, ProfitLoss, ReportTemplate } = require('./models');
const jwt = require('jsonwebtoken');
const moment = require('moment-timezone');

// ==================== AUTH CONTROLLERS ====================
const authController = {
  login: async (req, res) => {
    try {
      const { staffId, password } = req.body;

      if (!staffId || !password) {
        return res.status(400).json({ success: false, message: 'Please provide Staff ID and password' });
      }

      const user = await User.findOne({ staffId: staffId.toUpperCase() });

      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid Staff ID or password' });
      }

      if (user.lockUntil && user.lockUntil > Date.now()) {
        const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
        return res.status(401).json({ success: false, message: `Account locked. Try again in ${minutesLeft} minutes` });
      }

      if (!user.isActive) {
        return res.status(401).json({ success: false, message: 'Account is deactivated. Contact administrator.' });
      }

      const isMatch = await user.comparePassword(password);

      if (!isMatch) {
        await user.incLoginAttempts();
        const attemptsLeft = Math.max(0, 5 - user.loginAttempts);
        return res.status(401).json({
          success: false,
          message: attemptsLeft > 0
            ? `Invalid password. ${attemptsLeft} attempts remaining`
            : 'Account locked for 1 hour due to too many failed attempts'
        });
      }

      await user.resetLoginAttempts();
      user.lastLogin = new Date();
      await user.save();

      const token = user.generateToken();

      res.json({
        success: true,
        data: {
          id: user._id,
          staffId: user.staffId,
          name: user.name,
          email: user.email,
          role: user.role,
          lastLogin: user.lastLogin
        },
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
      const userId = req.user.id;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Please provide current and new password' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
      }

      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

      if (currentPassword === newPassword) {
        return res.status(400).json({ success: false, message: 'New password must differ from current' });
      }

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
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const field = await DynamicField.create({ ...req.body, createdBy: req.user.id });
      res.status(201).json({ success: true, data: field, message: 'Field created successfully' });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(400).json({ success: false, message: 'Field name already exists' });
      }
      res.status(500).json({ success: false, message: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const field = await DynamicField.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
      if (!field) return res.status(404).json({ success: false, message: 'Field not found' });
      res.json({ success: true, data: field, message: 'Field updated successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  delete: async (req, res) => {
    try {
      const field = await DynamicField.findByIdAndUpdate(
        req.params.id,
        { isActive: false, deletedAt: new Date() },
        { new: true }
      );
      if (!field) return res.status(404).json({ success: false, message: 'Field not found' });
      res.json({ success: true, message: 'Field deactivated successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  restore: async (req, res) => {
    try {
      const field = await DynamicField.findByIdAndUpdate(
        req.params.id,
        { isActive: true, deletedAt: null },
        { new: true }
      );
      if (!field) return res.status(404).json({ success: false, message: 'Field not found' });
      res.json({ success: true, data: field, message: 'Field restored successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  permanentDelete: async (req, res) => {
    try {
      const field = await DynamicField.findByIdAndDelete(req.params.id);
      if (!field) return res.status(404).json({ success: false, message: 'Field not found' });
      res.json({ success: true, message: 'Field permanently deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
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
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const { week, month, year, day, ...values } = req.body;

      let record = await SalesRecord.findOne({ week, month, year, day, isDeleted: { $ne: true } });

      if (record) {
        Object.assign(record, values);
        await record.save();
      } else {
        record = await SalesRecord.create({
          week, month, year, day,
          ...values,
          createdBy: req.user.id
        });
      }

      res.status(201).json({ success: true, data: record, message: 'Sales record saved' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const record = await SalesRecord.findById(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'Record not found' });

      Object.assign(record, req.body);
      await record.save();

      res.json({ success: true, data: record, message: 'Sales record updated' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  softDelete: async (req, res) => {
    try {
      const record = await SalesRecord.findByIdAndUpdate(
        req.params.id,
        { isDeleted: true, deletedAt: new Date() },
        { new: true }
      );
      if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
      res.json({ success: true, message: 'Sales record deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  restore: async (req, res) => {
    try {
      const record = await SalesRecord.findByIdAndUpdate(
        req.params.id,
        { isDeleted: false, deletedAt: null },
        { new: true }
      );
      if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
      res.json({ success: true, data: record, message: 'Sales record restored' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  permanentDelete: async (req, res) => {
    try {
      const record = await SalesRecord.findByIdAndDelete(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
      res.json({ success: true, message: 'Sales record permanently deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getWeeklySummary: async (req, res) => {
    try {
      const { year, week } = req.query;
      const records = await SalesRecord.find({
        year: parseInt(year),
        week: parseInt(week),
        isDeleted: { $ne: true }
      });

      const summary = { total: 0, byDay: {}, byCategory: {} };

      records.forEach(record => {
        summary.total += record.totalSales;
        summary.byDay[record.day] = record.totalSales;

        ['designMovies', 'phoneRepairs', 'laptopRepairs', 'electronicsSales'].forEach(field => {
          if (record[field]) {
            summary.byCategory[field] = (summary.byCategory[field] || 0) + record[field];
          }
        });

        if (record.values) {
          for (let [key, value] of record.values) {
            if (typeof value === 'number') {
              summary.byCategory[key] = (summary.byCategory[key] || 0) + value;
            }
          }
        }
      });

      res.json({ success: true, data: summary });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
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
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  create: async (req, res) => {
    try {
      const { week, month, year, day, ...values } = req.body;

      let record = await CostRecord.findOne({ week, month, year, day, isDeleted: { $ne: true } });

      if (record) {
        Object.assign(record, values);
        await record.save();
      } else {
        record = await CostRecord.create({
          week, month, year, day,
          ...values,
          createdBy: req.user.id
        });
      }

      res.status(201).json({ success: true, data: record, message: 'Cost record saved' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const record = await CostRecord.findById(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
      Object.assign(record, req.body);
      await record.save();
      res.json({ success: true, data: record, message: 'Cost record updated' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  softDelete: async (req, res) => {
    try {
      const record = await CostRecord.findByIdAndUpdate(
        req.params.id,
        { isDeleted: true, deletedAt: new Date() },
        { new: true }
      );
      if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
      res.json({ success: true, message: 'Cost record deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  restore: async (req, res) => {
    try {
      const record = await CostRecord.findByIdAndUpdate(
        req.params.id,
        { isDeleted: false, deletedAt: null },
        { new: true }
      );
      if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
      res.json({ success: true, data: record, message: 'Cost record restored' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  permanentDelete: async (req, res) => {
    try {
      const record = await CostRecord.findByIdAndDelete(req.params.id);
      if (!record) return res.status(404).json({ success: false, message: 'Record not found' });
      res.json({ success: true, message: 'Cost record permanently deleted' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

// ==================== REPORT CONTROLLERS ====================
const reportController = {
  getWeeklyReport: async (req, res) => {
    try {
      const { year, week } = req.query;
      const y = parseInt(year);
      const w = parseInt(week);

      const sales = await SalesRecord.find({ year: y, week: w, isDeleted: { $ne: true } });
      const costs = await CostRecord.find({ year: y, week: w, isDeleted: { $ne: true } });

      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const dailyBreakdown = [];
      let totalSales = 0, totalCosts = 0;

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
          if (record[field]) categoryBreakdown.sales[field] = (categoryBreakdown.sales[field] || 0) + record[field];
        });
        if (record.values) {
          for (let [key, value] of record.values) {
            if (typeof value === 'number') categoryBreakdown.sales[key] = (categoryBreakdown.sales[key] || 0) + value;
          }
        }
      });

      costs.forEach(record => {
        ['designMovies', 'phoneParts', 'laptopParts', 'electronicsParts', 'lunchMeals', 'other'].forEach(field => {
          if (record[field]) categoryBreakdown.costs[field] = (categoryBreakdown.costs[field] || 0) + record[field];
        });
        if (record.values) {
          for (let [key, value] of record.values) {
            if (typeof value === 'number') categoryBreakdown.costs[key] = (categoryBreakdown.costs[key] || 0) + value;
          }
        }
      });

      res.json({
        success: true,
        data: {
          year: y, week: w,
          totalSales, totalCosts, profit, profitMargin,
          dailyBreakdown, categoryBreakdown
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

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
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

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
        if (!seen.has(key)) {
          seen.add(key);
          combined.push({ week: _id.week, month: _id.month, year: _id.year });
        }
      });

      const monthOrder = {
        January: 1, February: 2, March: 3, April: 4,
        May: 5, June: 6, July: 7, August: 8,
        September: 9, October: 10, November: 11, December: 12
      };

      combined.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        if (monthOrder[b.month] !== monthOrder[a.month]) return monthOrder[b.month] - monthOrder[a.month];
        return b.week - a.week;
      });

      res.json({ success: true, data: combined });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getDailyReport: async (req, res) => {
    try {
      const { date } = req.query;
      if (!date) return res.status(400).json({ success: false, message: 'Date is required' });

      const targetDate = new Date(date);
      const day = targetDate.toLocaleString('default', { weekday: 'short', timeZone: 'Africa/Johannesburg' });
      const month = targetDate.toLocaleString('default', { month: 'long', timeZone: 'Africa/Johannesburg' });
      const year = targetDate.getFullYear();
      
      const startOfYear = new Date(year, 0, 1);
      const diff = (targetDate - startOfYear + (startOfYear.getTimezoneOffset() - targetDate.getTimezoneOffset()) * 60000) / 86400000;
      const week = Math.ceil((diff + startOfYear.getDay() + 1) / 7);

      const sales = await SalesRecord.findOne({ day, week, month, year, isDeleted: { $ne: true } });
      const costs = await CostRecord.findOne({ day, week, month, year, isDeleted: { $ne: true } });

      const report = {
        date: targetDate,
        day, week, month, year,
        sales: sales || { totalSales: 0 },
        costs: costs || { totalCosts: 0 },
        profit: (sales?.totalSales || 0) - (costs?.totalCosts || 0)
      };

      res.json({ success: true, data: report });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getCustomPeriodReport: async (req, res) => {
    try {
      const { months, startDate, endDate } = req.query;
      
      let start, end;
      let numMonths = parseInt(months);

      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
        numMonths = 'custom';
      } else if (months && startDate) {
        start = new Date(startDate);
        end = new Date(start);
        end.setMonth(end.getMonth() + parseInt(months));
      } else {
        return res.status(400).json({ success: false, message: 'Invalid parameters' });
      }

      const monthNames = [];
      const current = new Date(start);
      while (current < end) {
        monthNames.push({
          month: current.toLocaleString('default', { month: 'long' }),
          year: current.getFullYear()
        });
        current.setMonth(current.getMonth() + 1);
      }

      const monthlyData = [];
      let totalSales = 0, totalCosts = 0;

      for (const { month, year } of monthNames) {
        const sales = await SalesRecord.find({ month, year, isDeleted: { $ne: true } });
        const costs = await CostRecord.find({ month, year, isDeleted: { $ne: true } });
        
        const monthSales = sales.reduce((sum, s) => sum + s.totalSales, 0);
        const monthCosts = costs.reduce((sum, c) => sum + c.totalCosts, 0);
        
        monthlyData.push({
          month, year,
          sales: monthSales,
          costs: monthCosts,
          profit: monthSales - monthCosts
        });
        
        totalSales += monthSales;
        totalCosts += monthCosts;
      }

      const totalProfit = totalSales - totalCosts;
      const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

      res.json({
        success: true,
        data: {
          period: typeof numMonths === 'number' ? `${numMonths} months` : 'custom',
          startDate: start,
          endDate: end,
          totalSales,
          totalCosts,
          totalProfit,
          profitMargin,
          monthlyData
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getProfitLossStatement: async (req, res) => {
    try {
      const { period, year, month, week, startDate, endDate } = req.query;
      
      let openingBalance = 0;
      let periodData = [];

      const prevReports = await WeeklyReport.find({
        year: { $lte: parseInt(year) }
      }).sort({ year: -1, week: -1 }).limit(1);
      
      if (prevReports.length > 0) {
        openingBalance = prevReports[0].closingBalance || 0;
      }

      if (period === 'daily' && month && year) {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const sales = await SalesRecord.find({ month, year: parseInt(year), isDeleted: { $ne: true } });
        const costs = await CostRecord.find({ month, year: parseInt(year), isDeleted: { $ne: true } });
        
        periodData = days.map(day => {
          const daySales = sales.find(s => s.day === day)?.totalSales || 0;
          const dayCosts = costs.find(c => c.day === day)?.totalCosts || 0;
          return { day, sales: daySales, costs: dayCosts, profit: daySales - dayCosts };
        });
      } else if (period === 'weekly' && week && year) {
        const sales = await SalesRecord.find({ week: parseInt(week), year: parseInt(year), isDeleted: { $ne: true } });
        const costs = await CostRecord.find({ week: parseInt(week), year: parseInt(year), isDeleted: { $ne: true } });
        
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        periodData = days.map(day => {
          const daySales = sales.find(s => s.day === day)?.totalSales || 0;
          const dayCosts = costs.find(c => c.day === day)?.totalCosts || 0;
          return { day, sales: daySales, costs: dayCosts, profit: daySales - dayCosts };
        });
      } else if (period === 'monthly' && month && year) {
        const weeks = [1, 2, 3, 4, 5];
        const sales = await SalesRecord.find({ month, year: parseInt(year), isDeleted: { $ne: true } });
        const costs = await CostRecord.find({ month, year: parseInt(year), isDeleted: { $ne: true } });
        
        periodData = weeks.map(week => {
          const weekSales = sales.filter(s => s.week === week).reduce((sum, s) => sum + s.totalSales, 0);
          const weekCosts = costs.filter(c => c.week === week).reduce((sum, c) => sum + c.totalCosts, 0);
          return { week, sales: weekSales, costs: weekCosts, profit: weekSales - weekCosts };
        }).filter(item => item.sales > 0 || item.costs > 0);
      } else if (period === 'custom' && startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        const sales = await SalesRecord.find({
          year: { $gte: start.getFullYear(), $lte: end.getFullYear() },
          isDeleted: { $ne: true }
        });
        const costs = await CostRecord.find({
          year: { $gte: start.getFullYear(), $lte: end.getFullYear() },
          isDeleted: { $ne: true }
        });
        const grouped = {};
        [...sales, ...costs].forEach(record => {
          const key = `${record.week}-${record.month}-${record.year}`;
          if (!grouped[key]) grouped[key] = { sales: 0, costs: 0, week: record.week, month: record.month, year: record.year };
          if (record.totalSales) grouped[key].sales += record.totalSales;
          if (record.totalCosts) grouped[key].costs += record.totalCosts;
        });
        periodData = Object.values(grouped).map(item => ({
          week: item.week,
          month: item.month,
          year: item.year,
          sales: item.sales,
          costs: item.costs,
          profit: item.sales - item.costs
        }));
      }

      let runningBalance = openingBalance;
      const detailedData = periodData.map(item => {
        runningBalance += item.profit || 0;
        return { ...item, balance: runningBalance };
      });

      const totalProfit = detailedData.reduce((sum, d) => sum + (d.profit || 0), 0);
      const closingBalance = openingBalance + totalProfit;

      res.json({
        success: true,
        data: {
          openingBalance,
          closingBalance,
          totalProfit,
          periodData: detailedData
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getRunningBalance: async (req, res) => {
    try {
      const { year, month } = req.query;
      
      const query = {};
      if (year) query.year = parseInt(year);
      if (month) query.month = month;
      
      const reports = await WeeklyReport.find(query).sort({ year: 1, week: 1 });
      
      let runningBalance = 0;
      const balanceHistory = reports.map(report => {
        runningBalance += report.profit || 0;
        return {
          week: report.week,
          month: report.month,
          year: report.year,
          profit: report.profit,
          balance: runningBalance
        };
      });

      if (balanceHistory.length === 0 && year) {
        const sales = await SalesRecord.find({ year: parseInt(year), isDeleted: { $ne: true } });
        const costs = await CostRecord.find({ year: parseInt(year), isDeleted: { $ne: true } });
        const totalSales = sales.reduce((sum, s) => sum + s.totalSales, 0);
        const totalCosts = costs.reduce((sum, c) => sum + c.totalCosts, 0);
        runningBalance = totalSales - totalCosts;
      }

      res.json({
        success: true,
        data: {
          currentBalance: runningBalance,
          history: balanceHistory
        }
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  saveReportTemplate: async (req, res) => {
    try {
      const template = await ReportTemplate.create({
        ...req.body,
        createdBy: req.user.id
      });
      res.status(201).json({ success: true, data: template, message: 'Template saved successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getReportTemplates: async (req, res) => {
    try {
      const templates = await ReportTemplate.find({ createdBy: req.user.id }).sort({ createdAt: -1 });
      res.json({ success: true, data: templates });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  deleteReportTemplate: async (req, res) => {
    try {
      const template = await ReportTemplate.findByIdAndDelete(req.params.id);
      if (!template) return res.status(404).json({ success: false, message: 'Template not found' });
      res.json({ success: true, message: 'Template deleted successfully' });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

module.exports = { authController, dynamicFieldController, salesController, costsController, reportController };
