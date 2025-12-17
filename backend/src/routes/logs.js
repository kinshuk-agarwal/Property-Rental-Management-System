const express = require('express');
const jwt = require('jsonwebtoken');
const { query } = require('../db/connection');

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({
            error: 'Access denied',
            message: 'No token provided'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({
            error: 'Invalid token',
            message: 'Authentication failed'
        });
    }
};

// Middleware to check if user is manager or admin
const requireManager = (req, res, next) => {
    if (req.user.role !== 'manager') {
        return res.status(403).json({
            error: 'Access denied',
            message: 'Only managers can view audit logs'
        });
    }
    next();
};

// @route   GET /api/logs
// @desc    Get audit logs (Manager only)
// @access  Private (Manager)
router.get('/', authenticateToken, requireManager, async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;

        const logsQuery = `
            SELECT al.log_id, al.user_id, al.route, al.method, al.status_code, al.timestamp,
                   u.name as user_name
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.aadhar
            ORDER BY al.timestamp DESC
            LIMIT $1 OFFSET $2
        `;

        const countQuery = 'SELECT COUNT(*) as total FROM audit_logs';

        const [logsResult, countResult] = await Promise.all([
            query(logsQuery, [parseInt(limit), parseInt(offset)]),
            query(countQuery)
        ]);

        res.json({
            total: parseInt(countResult.rows[0].total),
            limit: parseInt(limit),
            offset: parseInt(offset),
            logs: logsResult.rows.map(log => ({
                id: log.log_id,
                userId: log.user_id,
                userName: log.user_name,
                route: log.route,
                method: log.method,
                statusCode: log.status_code,
                timestamp: log.timestamp
            }))
        });

    } catch (error) {
        console.error('Get audit logs error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to retrieve audit logs'
        });
    }
});

module.exports = router;


