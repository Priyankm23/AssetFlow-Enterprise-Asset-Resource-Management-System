const config = require('../config/env');

/**
 * Middleware to handle 404 Not Found errors
 */
const notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.url}`,
    },
  });
};

/**
 * Global centralized error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error(err);

  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
      ...(err.details && { details: err.details }), // include validation details (e.g., Zod) if available
      ...(err.currentHolder && { currentHolder: err.currentHolder }),
      ...(config.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
};

module.exports = {
  notFound,
  errorHandler,
};
