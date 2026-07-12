const prisma = require('../../config/prisma');

/**
 * Trace the parent hierarchy to detect circular dependencies
 * @param {string} departmentId - ID of the department being updated
 * @param {string} proposedParentId - ID of the proposed parent department
 * @returns {Promise<boolean>} - True if circular dependency detected
 */
const checkCircularDependency = async (departmentId, proposedParentId) => {
  if (departmentId === proposedParentId) {
    return true;
  }

  let currentParentId = proposedParentId;
  while (currentParentId) {
    if (currentParentId === departmentId) {
      return true;
    }
    const dept = await prisma.department.findUnique({
      where: { id: currentParentId },
      select: { parentDepartmentId: true },
    });
    currentParentId = dept ? dept.parentDepartmentId : null;
  }
  return false;
};

/**
 * Validate that headUserId is a user with role 'DepartmentHead'
 * @param {string} headUserId - User ID
 */
const validateDepartmentHead = async (headUserId) => {
  const user = await prisma.user.findUnique({
    where: { id: headUserId },
  });

  if (!user) {
    const error = new Error('Selected head user does not exist');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  if (user.role !== 'DepartmentHead') {
    const error = new Error('Department head must have the role of DepartmentHead');
    error.statusCode = 400;
    error.code = 'INVALID_ROLE_FOR_DEPT_HEAD';
    throw error;
  }
};

/**
 * List all departments
 */
const listDepartments = async () => {
  return await prisma.department.findMany({
    include: {
      headUser: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      parentDepartment: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });
};

/**
 * Create a new department
 */
const createDepartment = async ({ name, headUserId, parentDepartmentId, status }) => {
  // Validate department head if provided
  if (headUserId) {
    await validateDepartmentHead(headUserId);
    
    // Check if user is already a head of another department
    const existingHead = await prisma.department.findFirst({
      where: { headUserId },
    });
    if (existingHead) {
      const error = new Error('Selected user is already heading another department');
      error.statusCode = 400;
      error.code = 'USER_ALREADY_DEPT_HEAD';
      throw error;
    }
  }

  // Validate parent department if provided
  if (parentDepartmentId) {
    const parent = await prisma.department.findUnique({
      where: { id: parentDepartmentId },
    });
    if (!parent) {
      const error = new Error('Parent department does not exist');
      error.statusCode = 404;
      error.code = 'PARENT_DEPT_NOT_FOUND';
      throw error;
    }
  }

  return await prisma.department.create({
    data: {
      name,
      headUserId: headUserId || null,
      parentDepartmentId: parentDepartmentId || null,
      status: status || 'Active',
    },
  });
};

/**
 * Update an existing department
 */
const updateDepartment = async (id, data) => {
  const department = await prisma.department.findUnique({
    where: { id },
  });

  if (!department) {
    const error = new Error('Department not found');
    error.statusCode = 404;
    error.code = 'DEPT_NOT_FOUND';
    throw error;
  }

  // Validate department head if updated
  if (data.headUserId) {
    await validateDepartmentHead(data.headUserId);
    
    // Check if user is already a head of another department
    const existingHead = await prisma.department.findFirst({
      where: {
        headUserId: data.headUserId,
        id: { not: id },
      },
    });
    if (existingHead) {
      const error = new Error('Selected user is already heading another department');
      error.statusCode = 400;
      error.code = 'USER_ALREADY_DEPT_HEAD';
      throw error;
    }
  }

  // Validate parent and circular dependency
  if (data.parentDepartmentId) {
    const parent = await prisma.department.findUnique({
      where: { id: data.parentDepartmentId },
    });
    if (!parent) {
      const error = new Error('Parent department does not exist');
      error.statusCode = 404;
      error.code = 'PARENT_DEPT_NOT_FOUND';
      throw error;
    }

    const isCircular = await checkCircularDependency(id, data.parentDepartmentId);
    if (isCircular) {
      const error = new Error('Circular dependency detected in department hierarchy');
      error.statusCode = 400;
      error.code = 'CIRCULAR_DEPENDENCY';
      throw error;
    }
  }

  return await prisma.department.update({
    where: { id },
    data,
  });
};

/**
 * Deactivate a department
 */
const deactivateDepartment = async (id) => {
  const department = await prisma.department.findUnique({
    where: { id },
  });

  if (!department) {
    const error = new Error('Department not found');
    error.statusCode = 404;
    error.code = 'DEPT_NOT_FOUND';
    throw error;
  }

  return await prisma.department.update({
    where: { id },
    data: { status: 'Inactive' },
  });
};

/**
 * List all asset categories
 */
const listCategories = async () => {
  return await prisma.assetCategory.findMany({
    orderBy: {
      createdAt: 'asc',
    },
  });
};

/**
 * Create a new asset category
 */
const createCategory = async ({ name, customFields }) => {
  // Check unique category name
  const existingCategory = await prisma.assetCategory.findUnique({
    where: { name },
  });

  if (existingCategory) {
    const error = new Error('Category name already exists');
    error.statusCode = 409;
    error.code = 'CATEGORY_ALREADY_EXISTS';
    throw error;
  }

  return await prisma.assetCategory.create({
    data: {
      name,
      customFields: customFields || null,
    },
  });
};

/**
 * Update an asset category
 */
const updateCategory = async (id, { name, customFields }) => {
  const category = await prisma.assetCategory.findUnique({
    where: { id },
  });

  if (!category) {
    const error = new Error('Asset category not found');
    error.statusCode = 404;
    error.code = 'CATEGORY_NOT_FOUND';
    throw error;
  }

  if (name && name !== category.name) {
    const existingCategory = await prisma.assetCategory.findUnique({
      where: { name },
    });
    if (existingCategory) {
      const error = new Error('Category name already exists');
      error.statusCode = 409;
      error.code = 'CATEGORY_ALREADY_EXISTS';
      throw error;
    }
  }

  return await prisma.assetCategory.update({
    where: { id },
    data: {
      name,
      customFields,
    },
  });
};

/**
 * List all users with filtering
 */
const listUsers = async ({ departmentId, role, status }) => {
  const where = {};
  if (departmentId) where.departmentId = departmentId;
  if (role) where.role = role;
  if (status) where.status = status;

  return await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      departmentId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      department: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });
};

/**
 * Promote/Change user role (Admin only)
 */
const changeUserRole = async (userId, role, requestingUser) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  // If requester is HOD, enforce department scope and role level boundaries
  if (requestingUser.role === 'DepartmentHead') {
    if (user.departmentId !== requestingUser.departmentId) {
      const error = new Error('HOD can only modify users within their own department');
      error.statusCode = 403;
      error.code = 'UNAUTHORIZED_DEPARTMENT_ACCESS';
      throw error;
    }

    const highPrivilegeRoles = ['Admin', 'AssetManager'];
    if (highPrivilegeRoles.includes(user.role) || highPrivilegeRoles.includes(role)) {
      const error = new Error('HOD cannot modify Admin or AssetManager roles');
      error.statusCode = 403;
      error.code = 'UNAUTHORIZED_ROLE_PROMOTION';
      throw error;
    }
  }

  return await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      departmentId: true,
      status: true,
    },
  });
};

/**
 * Change user active status
 */
const changeUserStatus = async (userId, status, requestingUser) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  // If requester is HOD, enforce department scope and role boundaries
  if (requestingUser.role === 'DepartmentHead') {
    if (user.departmentId !== requestingUser.departmentId) {
      const error = new Error('HOD can only modify users within their own department');
      error.statusCode = 403;
      error.code = 'UNAUTHORIZED_DEPARTMENT_ACCESS';
      throw error;
    }

    const highPrivilegeRoles = ['Admin', 'AssetManager'];
    if (highPrivilegeRoles.includes(user.role)) {
      const error = new Error('HOD cannot modify Admin or AssetManager status');
      error.statusCode = 403;
      error.code = 'UNAUTHORIZED_ROLE_MODIFICATION';
      throw error;
    }
  }

  return await prisma.user.update({
    where: { id: userId },
    data: { status },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      departmentId: true,
      status: true,
    },
  });
};

module.exports = {
  listDepartments,
  createDepartment,
  updateDepartment,
  deactivateDepartment,
  listCategories,
  createCategory,
  updateCategory,
  listUsers,
  changeUserRole,
  changeUserStatus,
};
