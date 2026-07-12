const { z } = require('zod');

const createBookingSchema = z.object({
  assetId: z.string().uuid('Invalid assetId format'),
  startTime: z.preprocess(
    (val) => (val === '' || val === undefined ? null : new Date(val)),
    z.date({ required_error: 'Start time is required' })
  ),
  endTime: z.preprocess(
    (val) => (val === '' || val === undefined ? null : new Date(val)),
    z.date({ required_error: 'End time is required' })
  ),
  departmentId: z.string().uuid('Invalid departmentId format').nullable().optional(),
}).refine(
  (data) => {
    // Start time should be in the future (or very close to present to prevent race condition blocks)
    // We allow a small tolerance of 1 minute back for network lag
    const now = new Date(Date.now() - 60000);
    return data.startTime >= now;
  },
  {
    message: 'Start time must be in the future',
    path: ['startTime'],
  }
).refine(
  (data) => {
    return data.endTime > data.startTime;
  },
  {
    message: 'End time must be after the start time',
    path: ['endTime'],
  }
);

const rescheduleBookingSchema = z.object({
  startTime: z.preprocess(
    (val) => (val === '' || val === undefined ? null : new Date(val)),
    z.date({ required_error: 'Start time is required' })
  ),
  endTime: z.preprocess(
    (val) => (val === '' || val === undefined ? null : new Date(val)),
    z.date({ required_error: 'End time is required' })
  ),
}).refine(
  (data) => {
    return data.endTime > data.startTime;
  },
  {
    message: 'End time must be after the start time',
    path: ['endTime'],
  }
);

module.exports = {
  createBookingSchema,
  rescheduleBookingSchema,
};
