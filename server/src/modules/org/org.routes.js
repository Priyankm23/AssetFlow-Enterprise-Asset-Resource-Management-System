const express = require('express');
const orgController = require('./org.controller');
const { authenticate, authorize } = require('../../middleware/auth');

const router = express.Router();

// ==========================================
// DEPARTMENTS ENDPOINTS
// ==========================================
router.get('/departments', authenticate, orgController.getDepartments);
router.post('/departments', authenticate, authorize(['Admin']), orgController.createDepartment);
router.put('/departments/:id', authenticate, authorize(['Admin']), orgController.updateDepartment);
router.patch('/departments/:id/deactivate', authenticate, authorize(['Admin']), orgController.deactivateDepartment);

// ==========================================
// CATEGORIES ENDPOINTS
// ==========================================
router.get('/categories', authenticate, orgController.getCategories);
router.post('/categories', authenticate, authorize(['Admin']), orgController.createCategory);
router.put('/categories/:id', authenticate, authorize(['Admin']), orgController.updateCategory);

// ==========================================
// EMPLOYEE DIRECTORY ENDPOINTS (Admin Only)
// ==========================================
router.get('/users', authenticate, orgController.getUsers);
router.patch('/users/:id/role', authenticate, authorize(['Admin', 'DepartmentHead']), orgController.updateUserRole);
router.patch('/users/:id/status', authenticate, authorize(['Admin', 'DepartmentHead']), orgController.updateUserStatus);
router.patch('/users/:id/department', authenticate, authorize(['Admin']), orgController.updateUserDepartment);

module.exports = router;
