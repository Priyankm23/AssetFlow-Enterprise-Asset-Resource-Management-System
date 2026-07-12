const express = require('express');
const reportsController = require('./reports.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

router.get('/reports/utilization', authenticate, authorize(['Admin']), reportsController.getUtilization);
router.get('/reports/maintenance-frequency', authenticate, authorize(['Admin']), reportsController.getMaintenanceFrequency);
router.get('/reports/upcoming-lifecycle', authenticate, authorize(['Admin']), reportsController.getLifecycle);
router.get('/reports/department-allocation', authenticate, authorize(['Admin']), reportsController.getDepartmentAllocation);
router.get('/reports/booking-heatmap', authenticate, authorize(['Admin']), reportsController.getBookingHeatmap);
router.get('/reports/export', authenticate, authorize(['Admin']), reportsController.exportReport);

module.exports = router;
