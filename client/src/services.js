import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000
});

// Add token to requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, error => Promise.reject(error));

// Handle responses and token refresh
api.interceptors.response.use(
  response => {
    // Auto-save refreshed token if server sent one
    const newToken = response.headers['x-new-token'];
    if (newToken) {
      localStorage.setItem('token', newToken);
    }
    return response;
  },
  error => {
    if (error.response?.status === 401) {
      const code = error.response?.data?.code;
      const message = error.response?.data?.message || 'Session expired';

      localStorage.removeItem('token');
      localStorage.removeItem('user');

      if (!window.location.pathname.includes('/login')) {
        toast.error(code === 'TOKEN_EXPIRED' ? 'Session expired. Please login again.' : message);
        setTimeout(() => { window.location.href = '/login'; }, 1500);
      }
    }

    if (error.response?.status === 403) {
      toast.error('Access denied. Insufficient permissions.');
    }

    if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    }

    return Promise.reject(error);
  }
);

// ========== AUTH ==========
export const authService = {
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data)
};

// ========== DYNAMIC FIELDS ==========
export const fieldService = {
  getAll: (type, includeDeleted = false) =>
    api.get('/dynamic-fields', { params: { type, includeDeleted } }),
  create: (data) => api.post('/dynamic-fields', data),
  update: (id, data) => api.put(`/dynamic-fields/${id}`, data),
  delete: (id) => api.delete(`/dynamic-fields/${id}`),
  restore: (id) => api.patch(`/dynamic-fields/${id}/restore`),
  permanentDelete: (id) => api.delete(`/dynamic-fields/${id}/permanent`)
};

// ========== SALES ==========
export const salesService = {
  getAll: (params) => api.get('/sales', { params }),
  create: (data) => api.post('/sales', data),
  update: (id, data) => api.put(`/sales/${id}`, data),
  delete: (id) => api.delete(`/sales/${id}`),
  restore: (id) => api.patch(`/sales/${id}/restore`),
  permanentDelete: (id) => api.delete(`/sales/${id}/permanent`),
  getWeeklySummary: (params) => api.get('/sales/weekly-summary', { params })
};

// ========== COSTS ==========
export const costsService = {
  getAll: (params) => api.get('/costs', { params }),
  create: (data) => api.post('/costs', data),
  update: (id, data) => api.put(`/costs/${id}`, data),
  delete: (id) => api.delete(`/costs/${id}`),
  restore: (id) => api.patch(`/costs/${id}/restore`),
  permanentDelete: (id) => api.delete(`/costs/${id}/permanent`)
};

// ========== REPORTS ==========
export const reportService = {
  getWeekly: (params) => api.get('/reports/weekly', { params }),
  getMonthly: (params) => api.get('/reports/monthly', { params })
};

export default api;