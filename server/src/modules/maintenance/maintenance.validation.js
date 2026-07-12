const { z } = require('zod');

const createRequestSchema = z.object({
  assetId: z.string().uuid('Invalid assetId format'),
  issueDescription: z.string().trim().min(1, 'Issue description is required'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent'], {
    errorMap: () => ({ message: 'Invalid priority level' }),
  }),
});

const assignTechnicianSchema = z.object({
  technicianName: z.string().trim().min(1, 'Technician name is required'),
  scheduledDate: z.preprocess(
    (val) => (val === '' || val === undefined ? null : new Date(val)),
    z.date({ required_error: 'Scheduled date is required' })
  ),
});

const resolveRequestSchema = z.object({
  resolutionNotes: z.string().trim().min(1, 'Resolution notes are required'),
});

module.exports = {
  createRequestSchema,
  assignTechnicianSchema,
  resolveRequestSchema,
};
