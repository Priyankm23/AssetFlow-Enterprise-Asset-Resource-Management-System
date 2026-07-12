const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const config = require('./config/env');
const prisma = require('./config/prisma');
const authRoutes = require('./modules/auth/auth.routes');
const orgRoutes = require('./modules/org/org.routes');
const assetRoutes = require('./modules/asset/asset.routes');
const allocationRoutes = require('./modules/allocation/allocation.routes');
const bookingRoutes = require('./modules/booking/booking.routes');
const maintenanceRoutes = require('./modules/maintenance/maintenance.routes');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');
const { notFound, errorHandler } = require('./middleware/error');

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
app.get('/api/v1/health', async (req, res) => {
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

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', orgRoutes);
app.use('/api/v1', assetRoutes);
app.use('/api/v1', allocationRoutes);
app.use('/api/v1', bookingRoutes);
app.use('/api/v1', maintenanceRoutes);
app.use('/api/v1', dashboardRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server is running in ${config.NODE_ENV} mode on port ${PORT}`);
});

module.exports = { app, server };
