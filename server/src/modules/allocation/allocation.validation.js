const { z } = require('zod');

const createAllocationSchema = z.object({
  assetId: z.string().uuid('Invalid assetId format'),
  holderUserId: z.string().uuid('Invalid holderUserId format').nullable().optional(),
  holderDepartmentId: z.string().uuid('Invalid holderDepartmentId format').nullable().optional(),
  expectedReturnDate: z.preprocess(
    (val) => (val === '' || val === undefined ? null : new Date(val)),
    z.date().nullable().optional()
  ),
}).refine(
  (data) => {
    const hasUser = !!data.holderUserId;
    const hasDept = !!data.holderDepartmentId;
    return (hasUser && !hasDept) || (!hasUser && hasDept);
  },
  {
    message: 'Allocation must be assigned to either a holderUserId or a holderDepartmentId, but not both',
    path: ['holderUserId'], // flag on holderUserId
  }
);

const returnAssetSchema = z.object({
  returnConditionNotes: z.string().trim().nullable().optional(),
});

const createTransferRequestSchema = z.object({
  assetId: z.string().uuid('Invalid assetId format'),
  requestedToUserId: z.string().uuid('Invalid requestedToUserId format').nullable().optional(),
  requestedToDepartmentId: z.string().uuid('Invalid requestedToDepartmentId format').nullable().optional(),
}).refine(
  (data) => {
    const hasUser = !!data.requestedToUserId;
    const hasDept = !!data.requestedToDepartmentId;
    return (hasUser && !hasDept) || (!hasUser && hasDept);
  },
  {
    message: 'Transfer must target either a requestedToUserId or a requestedToDepartmentId, but not both',
    path: ['requestedToUserId'],
  }
);

module.exports = {
  createAllocationSchema,
  returnAssetSchema,
  createTransferRequestSchema,
};
