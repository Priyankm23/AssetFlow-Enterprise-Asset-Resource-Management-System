const express = require('express');
const authController = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

// Public routes
router.post('/signup', authController.signup);
router.post('/login', authController.login);

// Protected routes
router.get('/me', authenticate, authController.me);

module.exports = router;
