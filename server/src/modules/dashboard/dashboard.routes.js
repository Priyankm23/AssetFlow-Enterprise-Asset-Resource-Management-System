const express = require('express');
const dashboardController = require('./dashboard.controller');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

router.get('/dashboard', authenticate, dashboardController.getStats);
router.get('/activity', authenticate, dashboardController.getActivity);

module.exports = router;
