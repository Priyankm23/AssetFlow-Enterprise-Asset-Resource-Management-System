const express = require('express');
const reportsController = require('./reports.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(authorize(['Admin']));

router.get('/reports/utilization', reportsController.getUtilization);
router.get('/reports/maintenance-frequency', reportsController.getMaintenanceFrequency);
router.get('/reports/upcoming-lifecycle', reportsController.getLifecycle);
router.get('/reports/department-allocation', reportsController.getDepartmentAllocation);
router.get('/reports/booking-heatmap', reportsController.getBookingHeatmap);
router.get('/reports/export', reportsController.exportReport);

module.exports = router;
