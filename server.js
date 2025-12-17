const express = require('express');
const cors = require('cors');
const winston = require('winston');
require('dotenv').config();

// Import database connection
const { pool } = require('./db/connection');

// Import routes
const authRoutes = require('./routes/auth');
const propertyRoutes = require('./routes/properties');
const rentalRoutes = require('./routes/rentals');
const rentalRequestRoutes = require('./routes/rentalRequests');
const userRoutes = require('./routes/users');
const notificationRoutes = require('./routes/notifications');
const logRoutes = require('./routes/logs');

// Import middleware
const auditMiddleware = require('./middleware/audit');

// Create Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Configure Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'property-rental-api' },
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
    ],
});

// If we're not in production, log to console with a simple format
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Audit logging middleware (must be before routes)
app.use(auditMiddleware);

// Request logging middleware
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`, {
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Property Rental API is running',
        timestamp: new Date().toISOString()
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/rentals', rentalRoutes);
app.use('/api/rental-requests', rentalRequestRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/logs', logRoutes);

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Route not found',
        message: `Cannot ${req.method} ${req.originalUrl}`
    });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);

    res.status(err.status || 500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    pool.end(() => {
        logger.info('Database pool closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    logger.info('SIGINT received, shutting down gracefully');
    pool.end(() => {
        logger.info('Database pool closed');
        process.exit(0);
    });
});

// Start server
app.listen(PORT, () => {
    logger.info(`Property Rental API server running on port ${PORT}`);
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    logger.error('Unhandled Promise Rejection:', err);
    process.exit(1);
});

module.exports = app;
