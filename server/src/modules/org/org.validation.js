const { z } = require('zod');

const createDepartmentSchema = z.object({
  name: z.string().trim().min(1, 'Department name is required'),
  headUserId: z.string().uuid('Invalid headUserId format').nullable().optional(),
  parentDepartmentId: z.string().uuid('Invalid parentDepartmentId format').nullable().optional(),
  status: z.enum(['Active', 'Inactive']).default('Active').optional(),
});

const updateDepartmentSchema = createDepartmentSchema.partial();

const createCategorySchema = z.object({
  name: z.string().trim().min(1, 'Category name is required'),
  customFields: z.record(z.any()).nullable().optional(),
});

const updateCategorySchema = createCategorySchema.partial();

const updateRoleSchema = z.object({
  role: z.enum(['Employee', 'DepartmentHead', 'AssetManager', 'Admin'], {
    errorMap: () => ({ message: 'Invalid role selection' }),
  }),
});

const updateUserStatusSchema = z.object({
  status: z.enum(['Active', 'Inactive'], {
    errorMap: () => ({ message: 'Invalid status selection' }),
  }),
});

const updateUserDepartmentSchema = z.object({
  departmentId: z.string().uuid('Invalid departmentId format').nullable().optional(),
});

module.exports = {
  createDepartmentSchema,
  updateDepartmentSchema,
  createCategorySchema,
  updateCategorySchema,
  updateRoleSchema,
  updateUserStatusSchema,
  updateUserDepartmentSchema,
};
