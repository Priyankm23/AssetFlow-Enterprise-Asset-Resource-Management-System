const express = require('express');
const allocationController = require('./allocation.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

router.get('/allocations', authenticate, allocationController.getAllocations);

router.post('/allocations', authenticate, authorize(['AssetManager']), allocationController.allocateAsset);

router.post('/allocations/:id/return', authenticate, allocationController.returnAsset);

router.get('/transfer-requests', authenticate, allocationController.getTransferRequests);

router.post('/transfer-requests', authenticate, allocationController.requestTransfer);

router.patch(
  '/transfer-requests/:id/approve',
  authenticate,
  authorize(['AssetManager', 'DepartmentHead']),
  allocationController.approveTransfer
);

router.patch(
  '/transfer-requests/:id/reject',
  authenticate,
  authorize(['AssetManager', 'DepartmentHead']),
  allocationController.rejectTransfer
);

module.exports = router;
