const orgService = require('./org.service');
const {
  createDepartmentSchema,
  updateDepartmentSchema,
  createCategorySchema,
  updateCategorySchema,
  updateRoleSchema,
  updateUserStatusSchema,
  updateUserDepartmentSchema,
} = require('./org.validation');

// ==========================================
// DEPARTMENTS CONTROLLERS
// ==========================================

const getDepartments = async (req, res, next) => {
  try {
    const departments = await orgService.listDepartments();
    res.status(200).json({
      success: true,
      data: { departments },
    });
  } catch (error) {
    next(error);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const parsed = createDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = parsed.error.format();
      return next(error);
    }

    const newDept = await orgService.createDepartment(parsed.data);
    res.status(201).json({
      success: true,
      data: { department: newDept },
    });
  } catch (error) {
    next(error);
  }
};

const updateDepartment = async (req, res, next) => {
  try {
    const parsed = updateDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = parsed.error.format();
      return next(error);
    }

    const updatedDept = await orgService.updateDepartment(req.params.id, parsed.data);
    res.status(200).json({
      success: true,
      data: { department: updatedDept },
    });
  } catch (error) {
    next(error);
  }
};

const deactivateDepartment = async (req, res, next) => {
  try {
    const deactivatedDept = await orgService.deactivateDepartment(req.params.id);
    res.status(200).json({
      success: true,
      data: { department: deactivatedDept },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// CATEGORIES CONTROLLERS
// ==========================================

const getCategories = async (req, res, next) => {
  try {
    const categories = await orgService.listCategories();
    res.status(200).json({
      success: true,
      data: { categories },
    });
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  try {
    const parsed = createCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = parsed.error.format();
      return next(error);
    }

    const newCategory = await orgService.createCategory(parsed.data);
    res.status(201).json({
      success: true,
      data: { category: newCategory },
    });
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const parsed = updateCategorySchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = parsed.error.format();
      return next(error);
    }

    const updatedCategory = await orgService.updateCategory(req.params.id, parsed.data);
    res.status(200).json({
      success: true,
      data: { category: updatedCategory },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EMPLOYEE DIRECTORY CONTROLLERS
// ==========================================

const getUsers = async (req, res, next) => {
  try {
    const { department, role, status } = req.query;
    const users = await orgService.listUsers({
      departmentId: department,
      role,
      status,
    });
    res.status(200).json({
      success: true,
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};

const updateUserRole = async (req, res, next) => {
  try {
    const parsed = updateRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = parsed.error.format();
      return next(error);
    }

    const updatedUser = await orgService.changeUserRole(req.params.id, parsed.data.role, req.user);
    res.status(200).json({
      success: true,
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

const updateUserStatus = async (req, res, next) => {
  try {
    const parsed = updateUserStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = parsed.error.format();
      return next(error);
    }

    const updatedUser = await orgService.changeUserStatus(req.params.id, parsed.data.status, req.user);
    res.status(200).json({
      success: true,
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

const updateUserDepartment = async (req, res, next) => {
  try {
    const parsed = updateUserDepartmentSchema.safeParse(req.body);
    if (!parsed.success) {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.code = 'VALIDATION_ERROR';
      error.details = parsed.error.format();
      return next(error);
    }

    const updatedUser = await orgService.changeUserDepartment(req.params.id, parsed.data.departmentId, req.user);
    res.status(200).json({
      success: true,
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDepartments,
  createDepartment,
  updateDepartment,
  deactivateDepartment,
  getCategories,
  createCategory,
  updateCategory,
  getUsers,
  updateUserRole,
  updateUserStatus,
  updateUserDepartment,
};
