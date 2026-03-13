const moment = require('moment-timezone');

const getCurrentDateInSA = () => moment.tz(new Date(), 'Africa/Johannesburg');

const formatCurrency = (amount) => {
  const formatted = new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
  return `M${formatted}`;
};

const getWeekNumber = (date) => moment(date).week();
const getMonthName = (date) => moment(date).format('MMMM');
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const paginateResults = (page = 1, limit = 10) => ({ skip: (page - 1) * limit, limit: parseInt(limit) });

module.exports = { getCurrentDateInSA, formatCurrency, getWeekNumber, getMonthName, isValidEmail, paginateResults };