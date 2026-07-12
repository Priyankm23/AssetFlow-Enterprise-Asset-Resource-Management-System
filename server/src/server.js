const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config/env');
const prisma = require('./config/prisma');

const app = express();
const PORT = config.PORT;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (config.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Basic DB connection check
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({
      success: true,
      data: {
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_CONNECTION_ERROR',
        message: 'Database check failed',
        details: error.message,
      },
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'AssetFlow API is running',
    },
  });
});

// Global 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.url}`,
    },
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  
  const statusCode = err.statusCode || 500;
  
  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
      ...(config.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server is running in ${config.NODE_ENV} mode on port ${PORT}`);
});

module.exports = { app, server };
