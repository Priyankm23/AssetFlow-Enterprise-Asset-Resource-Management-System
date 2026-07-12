const { z } = require('zod');

const createAssetSchema = z.object({
  name: z.string().trim().min(1, 'Asset name is required'),
  categoryId: z.string().uuid('Invalid categoryId format'),
  serialNumber: z.string().trim().nullable().optional(),
  acquisitionDate: z.preprocess(
    (val) => (val === '' || val === undefined ? null : new Date(val)),
    z.date().nullable().optional()
  ),
  acquisitionCost: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? null : Number(val)),
    z.number().min(0, 'Acquisition cost must be positive').nullable().optional()
  ),
  condition: z.enum(['New', 'Good', 'Fair', 'Poor', 'Damaged'], {
    errorMap: () => ({ message: 'Invalid asset condition' }),
  }),
  location: z.string().trim().nullable().optional(),
  photoUrl: z.string().trim().nullable().optional(),
  documentUrls: z.any().optional(), // Can be JSON array of strings
  isBookable: z.preprocess(
    (val) => val === 'true' || val === true,
    z.boolean()
  ).default(false).optional(),
});

const updateAssetSchema = createAssetSchema.partial();

module.exports = {
  createAssetSchema,
  updateAssetSchema,
};
