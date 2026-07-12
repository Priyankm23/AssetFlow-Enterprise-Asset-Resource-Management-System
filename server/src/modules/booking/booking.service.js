const prisma = require('../../config/prisma');

/**
 * Check if a proposed booking overlaps with any active bookings for the same asset
 */
const checkBookingOverlap = async (assetId, startTime, endTime, excludeBookingId = null) => {
  const conflict = await prisma.booking.findFirst({
    where: {
      assetId,
      status: { in: ['Upcoming', 'Ongoing'] },
      id: excludeBookingId ? { not: excludeBookingId } : undefined,
      // Overlap: newStart < existingEnd AND newEnd > existingStart
      startTime: { lt: endTime },
      endTime: { gt: startTime },
    },
  });

  return conflict;
};

/**
 * Helper to compute dynamic booking status on read
 */
const computeDynamicStatus = (booking, now = new Date()) => {
  let status = booking.status;
  if (status === 'Upcoming' && booking.startTime <= now && booking.endTime >= now) {
    status = 'Ongoing';
  } else if ((status === 'Upcoming' || status === 'Ongoing') && booking.endTime < now) {
    status = 'Completed';
  }
  return status;
};

/**
 * Create a new booking slot
 */
const createBooking = async ({ assetId, bookedByUserId, departmentId, startTime, endTime }) => {
  // Check if asset exists and is bookable
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
  });

  if (!asset) {
    const error = new Error('Asset not found');
    error.statusCode = 404;
    error.code = 'ASSET_NOT_FOUND';
    throw error;
  }

  if (!asset.isBookable) {
    const error = new Error('This asset is not a shared bookable resource');
    error.statusCode = 400;
    error.code = 'ASSET_NOT_BOOKABLE';
    throw error;
  }

  // Check overlap conflict
  const conflict = await checkBookingOverlap(assetId, startTime, endTime);
  if (conflict) {
    const formatTime = (d) =>
      new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const error = new Error(
      `Conflicts with existing booking ${formatTime(conflict.startTime)}-${formatTime(conflict.endTime)}`
    );
    error.statusCode = 409;
    error.code = 'BOOKING_OVERLAP';
    error.conflictingBooking = {
      id: conflict.id,
      assetId: conflict.assetId,
      startTime: conflict.startTime.toISOString(),
      endTime: conflict.endTime.toISOString(),
      status: conflict.status.toLowerCase(),
    };
    throw error;
  }

  return await prisma.booking.create({
    data: {
      assetId,
      bookedByUserId,
      departmentId: departmentId || null,
      startTime,
      endTime,
      status: 'Upcoming',
    },
  });
};

/**
 * List bookings for an asset in a specified date range
 */
const listBookings = async ({ assetId, from, to }) => {
  const where = {};
  if (assetId) {
    where.assetId = assetId;
  }

  if (from || to) {
    where.OR = [
      {
        startTime: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
      {
        endTime: {
          gte: from ? new Date(from) : undefined,
          lte: to ? new Date(to) : undefined,
        },
      },
    ];
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      asset: {
        select: { name: true, assetTag: true },
      },
      bookedByUser: {
        select: { id: true, name: true, email: true },
      },
      department: {
        select: { id: true, name: true },
      },
    },
    orderBy: {
      startTime: 'asc',
    },
  });

  const now = new Date();
  return bookings.map((b) => {
    const dynamicStatus = computeDynamicStatus(b, now);
    return {
      id: b.id,
      assetId: b.assetId,
      assetName: b.asset?.name ?? '',
      assetTag: b.asset?.assetTag ?? '',
      userId: b.bookedByUserId,
      userName: b.bookedByUser?.name ?? 'Unknown',
      departmentId: b.departmentId ?? undefined,
      departmentName: b.department?.name ?? undefined,
      startTime: b.startTime.toISOString(),
      endTime: b.endTime.toISOString(),
      status: dynamicStatus === 'Cancelled' ? 'cancelled' : 'active',
    };
  });
};

/**
 * Cancel an active booking
 */
const cancelBooking = async (bookingId, userId, userRole) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'BOOKING_NOT_FOUND';
    throw error;
  }

  // Auth check: Admin/Manager or the user who booked it
  if (userRole !== 'Admin' && userRole !== 'AssetManager' && booking.bookedByUserId !== userId) {
    const error = new Error('You do not have permission to cancel this booking');
    error.statusCode = 403;
    error.code = 'FORBIDDEN_BOOKING_ACTION';
    throw error;
  }

  const now = new Date();
  const currentStatus = computeDynamicStatus(booking, now);
  if (currentStatus === 'Completed' || currentStatus === 'Cancelled') {
    const error = new Error(`Cannot cancel a booking that is already ${currentStatus.toLowerCase()}`);
    error.statusCode = 400;
    error.code = 'INVALID_BOOKING_STATE';
    throw error;
  }

  return await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'Cancelled' },
  });
};

/**
 * Reschedule a booking
 */
const rescheduleBooking = async (bookingId, { startTime, endTime }, userId, userRole) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    const error = new Error('Booking not found');
    error.statusCode = 404;
    error.code = 'BOOKING_NOT_FOUND';
    throw error;
  }

  // Auth check
  if (userRole !== 'Admin' && userRole !== 'AssetManager' && booking.bookedByUserId !== userId) {
    const error = new Error('You do not have permission to reschedule this booking');
    error.statusCode = 403;
    error.code = 'FORBIDDEN_BOOKING_ACTION';
    throw error;
  }

  const now = new Date();
  const currentStatus = computeDynamicStatus(booking, now);
  if (currentStatus === 'Completed' || currentStatus === 'Cancelled') {
    const error = new Error(`Cannot reschedule a booking that is already ${currentStatus.toLowerCase()}`);
    error.statusCode = 400;
    error.code = 'INVALID_BOOKING_STATE';
    throw error;
  }

  // Check overlap conflict excluding this booking
  const conflict = await checkBookingOverlap(booking.assetId, startTime, endTime, bookingId);
  if (conflict) {
    const formatTime = (d) =>
      new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const error = new Error(
      `Conflicts with existing booking ${formatTime(conflict.startTime)}-${formatTime(conflict.endTime)}`
    );
    error.statusCode = 409;
    error.code = 'BOOKING_OVERLAP';
    error.conflictingBooking = {
      id: conflict.id,
      assetId: conflict.assetId,
      startTime: conflict.startTime.toISOString(),
      endTime: conflict.endTime.toISOString(),
      status: conflict.status.toLowerCase(),
    };
    throw error;
  }

  return await prisma.booking.update({
    where: { id: bookingId },
    data: {
      startTime,
      endTime,
      status: 'Upcoming', // Reset back to Upcoming
    },
  });
};

module.exports = {
  createBooking,
  listBookings,
  cancelBooking,
  rescheduleBooking,
};
