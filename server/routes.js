const express = require('express');
const { auth, authorize } = require('./middleware');
const {
  authController,
  dynamicFieldController,
  salesController,
  costsController,
  reportController
} = require('./controllers');

const router = express.Router();

// ==================== AUTH ROUTES ====================
router.post('/auth/login', authController.login);
router.post('/auth/change-password', auth, authController.changePassword);
router.get('/auth/me', auth, authController.getMe);

// ==================== DYNAMIC FIELD ROUTES ====================
router.get('/dynamic-fields', auth, dynamicFieldController.getAll);
router.post('/dynamic-fields', auth, authorize('admin'), dynamicFieldController.create);
router.put('/dynamic-fields/:id', auth, authorize('admin'), dynamicFieldController.update);
router.delete('/dynamic-fields/:id', auth, authorize('admin'), dynamicFieldController.delete);
router.patch('/dynamic-fields/:id/restore', auth, authorize('admin'), dynamicFieldController.restore);
router.delete('/dynamic-fields/:id/permanent', auth, authorize('admin'), dynamicFieldController.permanentDelete);

// ==================== SALES ROUTES ====================
router.get('/sales', auth, salesController.getAll);
router.post('/sales', auth, salesController.create);
router.put('/sales/:id', auth, salesController.update);
router.delete('/sales/:id', auth, authorize('admin', 'manager'), salesController.softDelete);
router.patch('/sales/:id/restore', auth, authorize('admin', 'manager'), salesController.restore);
router.delete('/sales/:id/permanent', auth, authorize('admin'), salesController.permanentDelete);
router.get('/sales/weekly-summary', auth, salesController.getWeeklySummary);

// ==================== COSTS ROUTES ====================
router.get('/costs', auth, costsController.getAll);
router.post('/costs', auth, costsController.create);
router.put('/costs/:id', auth, costsController.update);
router.delete('/costs/:id', auth, authorize('admin', 'manager'), costsController.softDelete);
router.patch('/costs/:id/restore', auth, authorize('admin', 'manager'), costsController.restore);
router.delete('/costs/:id/permanent', auth, authorize('admin'), costsController.permanentDelete);

// ==================== REPORT ROUTES ====================
router.get('/reports/weekly', auth, reportController.getWeeklyReport);
router.get('/reports/monthly', auth, reportController.getMonthlyReport);

// ── NEW: Smart period dropdown — returns only periods with real data ──────────
router.get('/reports/available-periods', auth, reportController.getAvailablePeriods);

module.exports = router;
