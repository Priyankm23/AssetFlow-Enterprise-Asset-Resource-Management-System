const express = require('express');
const auditController = require('./audit.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

router.get(
  '/audit-cycles',
  authenticate,
  authorize(['Admin', 'AssetManager']),
  auditController.getAuditCycles
);

router.post(
  '/audit-cycles',
  authenticate,
  authorize(['Admin', 'AssetManager']),
  auditController.createAuditCycle
);

router.patch(
  '/audit-cycles/:id/start',
  authenticate,
  authorize(['Admin', 'AssetManager']),
  auditController.startAuditCycle
);

router.patch(
  '/audit-cycles/:id/close',
  authenticate,
  authorize(['Admin', 'AssetManager']),
  auditController.closeAuditCycle
);

router.get(
  '/audit-items',
  authenticate,
  authorize(['Admin', 'AssetManager']),
  auditController.getAuditItems
);

router.patch(
  '/audit-items/:id',
  authenticate,
  authorize(['Admin', 'AssetManager']),
  auditController.updateAuditItem
);

module.exports = router;
