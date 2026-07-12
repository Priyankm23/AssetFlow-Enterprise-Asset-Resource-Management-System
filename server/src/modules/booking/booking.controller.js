const bookingService = require('./booking.service');
const { createBookingSchema, rescheduleBookingSchema } = require('./booking.validation');

const createBooking = async (req, res, next) => {
  try {
    const parsed = createBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = parsed.error.format();
      return next(error);
    }

    const { assetId, startTime, endTime, departmentId } = parsed.data;

    const booking = await bookingService.createBooking({
      assetId,
      bookedByUserId: req.user.id,
      departmentId,
      startTime,
      endTime,
    });

    res.status(201).json({
      success: true,
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

const getBookings = async (req, res, next) => {
  try {
    const { assetId, from, to } = req.query;

    const bookings = await bookingService.listBookings({
      assetId,
      from,
      to,
    });

    res.status(200).json({
      success: true,
      data: { bookings },
    });
  } catch (error) {
    next(error);
  }
};

const cancelBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.cancelBooking(
      req.params.id,
      req.user.id,
      req.user.role
    );

    res.status(200).json({
      success: true,
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

const rescheduleBooking = async (req, res, next) => {
  try {
    const parsed = rescheduleBookingSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = parsed.error.format();
      return next(error);
    }

    const booking = await bookingService.rescheduleBooking(
      req.params.id,
      parsed.data,
      req.user.id,
      req.user.role
    );

    res.status(200).json({
      success: true,
      data: { booking },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createBooking,
  getBookings,
  cancelBooking,
  rescheduleBooking,
};
