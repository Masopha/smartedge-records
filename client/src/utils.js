import { formatInTimeZone } from 'date-fns-tz';

const SA_TIMEZONE = 'Africa/Johannesburg';

export const formatDateInSA = (date, formatStr = 'yyyy-MM-dd HH:mm:ss') =>
  formatInTimeZone(date, SA_TIMEZONE, formatStr);

export const getCurrentDateInSA = () =>
  new Date().toLocaleString('en-ZA', { timeZone: SA_TIMEZONE });

export const formatCurrency = (amount) => {
  const formatted = new Intl.NumberFormat('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount || 0);
  return `M${formatted}`;
};

export const formatNumber = (number) =>
  new Intl.NumberFormat('en-ZA').format(number || 0);

export const calculateProfitMargin = (sales, costs) => {
  if (!sales || sales === 0) return 0;
  return ((sales - costs) / sales) * 100;
};

export const getWeekNumber = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

export const getMonthName = (date) =>
  date.toLocaleString('default', { month: 'long', timeZone: SA_TIMEZONE });

export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => { clearTimeout(timeout); func(...args); }, wait);
  };
};

export const storage = {
  set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
  get: (key) => {
    const item = localStorage.getItem(key);
    try { return JSON.parse(item); } catch { return item; }
  },
  remove: (key) => localStorage.removeItem(key),
  clear: () => localStorage.clear()
};