const { z } = require('zod');

const createAuditCycleSchema = z.object({
  scopeDepartmentId: z.string().uuid('Invalid scopeDepartmentId format').optional().nullable(),
  scopeLocation: z.string().trim().optional().nullable(),
  startDate: z.coerce.date({ invalid_type_error: 'Invalid startDate format' }),
  endDate: z.coerce.date({ invalid_type_error: 'Invalid endDate format' }),
  auditorUserIds: z.array(z.string().uuid('Invalid auditor ID format')).optional().default([]),
});

const updateAuditItemSchema = z.object({
  result: z.enum(['Pending', 'Verified', 'Missing', 'Damaged']),
  notes: z.string().trim().optional().nullable(),
});

module.exports = {
  createAuditCycleSchema,
  updateAuditItemSchema,
};
