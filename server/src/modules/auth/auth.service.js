const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/prisma');
const config = require('../../config/env');

/**
 * Generate a JWT token for a user
 * @param {object} user - User object
 * @returns {string} JWT token
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role,
      departmentId: user.departmentId,
    },
    config.JWT_SECRET,
    {
      expiresIn: config.JWT_EXPIRES_IN,
    }
  );
};

/**
 * Register a new employee user
 * @param {object} userData - { name, email, password }
 * @returns {Promise<{user: object, token: string}>}
 */
const registerUser = async ({ name, email, password }) => {
  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    const error = new Error('Email address is already registered');
    error.statusCode = 409;
    error.code = 'EMAIL_ALREADY_EXISTS';
    throw error;
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Create user as 'Employee'
  const user = await prisma.user.create({
    data: {
      name,
      email: email.toLowerCase(),
      passwordHash,
      role: 'Employee', // Hardcoded server-side to prevent self-elevation
      status: 'Active',
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      departmentId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const token = generateToken(user);

  return { user, token };
};

/**
 * Authenticate a user
 * @param {object} credentials - { email, password }
 * @returns {Promise<{user: object, token: string}>}
 */
const loginUser = async ({ email, password }) => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  // Generic unauthenticated error for security
  const authError = new Error('Invalid email or password');
  authError.statusCode = 401;
  authError.code = 'INVALID_CREDENTIALS';

  if (!user) {
    throw authError;
  }

  if (user.status === 'Inactive') {
    const inactiveError = new Error('This user account has been deactivated');
    inactiveError.statusCode = 403;
    inactiveError.code = 'USER_INACTIVE';
    throw inactiveError;
  }

  // Verify password
  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw authError;
  }

  // Clean user object for response
  const sanitizedUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId,
    status: user.status,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };

  const token = generateToken(sanitizedUser);

  return { user: sanitizedUser, token };
};

/**
 * Get user by id
 * @param {string} id - User ID
 * @returns {Promise<object>}
 */
const getUserById = async (id) => {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      departmentId: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    const error = new Error('User not found');
    error.statusCode = 404;
    error.code = 'USER_NOT_FOUND';
    throw error;
  }

  return user;
};

module.exports = {
  registerUser,
  loginUser,
  getUserById,
};
