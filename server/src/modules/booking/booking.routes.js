const express = require('express');
const bookingController = require('./booking.controller');
const { authenticate } = require('../../middleware/auth');

const router = express.Router();

router.post('/bookings', authenticate, bookingController.createBooking);

router.get('/bookings', authenticate, bookingController.getBookings);

router.patch('/bookings/:id/cancel', authenticate, bookingController.cancelBooking);

router.patch('/bookings/:id/reschedule', authenticate, bookingController.rescheduleBooking);

module.exports = router;
