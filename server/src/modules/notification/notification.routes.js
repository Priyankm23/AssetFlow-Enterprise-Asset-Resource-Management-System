const express = require('express');
const notificationController = require('./notification.controller');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/notifications', notificationController.getNotifications);
router.patch('/notifications/:id/read', notificationController.markRead);

module.exports = router;
