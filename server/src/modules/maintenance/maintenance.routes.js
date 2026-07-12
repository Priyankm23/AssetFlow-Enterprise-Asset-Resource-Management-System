const express = require('express');
const maintenanceController = require('./maintenance.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

router.get('/maintenance-requests', authenticate, maintenanceController.getMaintenanceRequests);
router.post('/maintenance-requests', authenticate, maintenanceController.createRequest);

router.patch(
  '/maintenance-requests/:id/approve',
  authenticate,
  authorize(['AssetManager']),
  maintenanceController.approveRequest
);

router.patch(
  '/maintenance-requests/:id/reject',
  authenticate,
  authorize(['AssetManager']),
  maintenanceController.rejectRequest
);

router.patch(
  '/maintenance-requests/:id/assign-technician',
  authenticate,
  authorize(['AssetManager']),
  maintenanceController.assignRequest
);

router.patch(
  '/maintenance-requests/:id/start',
  authenticate,
  authorize(['AssetManager']),
  maintenanceController.startRequest
);

router.patch(
  '/maintenance-requests/:id/resolve',
  authenticate,
  authorize(['AssetManager']),
  maintenanceController.resolveRequest
);

module.exports = router;
