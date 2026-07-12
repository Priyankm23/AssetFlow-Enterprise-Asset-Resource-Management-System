const jwt = require('jsonwebtoken');
const config = require('../config/env');
const prisma = require('../config/prisma');

/**
 * Middleware to authenticate requests using JWT tokens
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Access token is missing or invalid',
        },
      });
    }

    const token = authHeader.split(' ')[1];
    
    let decoded;
    try {
      decoded = jwt.verify(token, config.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: err.name === 'TokenExpiredError' ? 'Token has expired' : 'Token is invalid',
        },
      });
    }

    // Retrieve user and ensure they are active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
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
      return res.status(401).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'The user associated with this token does not exist',
        },
      });
    }

    if (user.status === 'Inactive') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'USER_INACTIVE',
          message: 'This user account is inactive',
        },
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware to restrict access based on roles
 * @param {string[]} roles - Allowed roles
 */
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required',
        },
      });
    }

    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to perform this action',
        },
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authorize,
};
