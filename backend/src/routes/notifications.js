const express = require('express');
const { param } = require('express-validator');
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

// @route   GET /api/notifications
// @desc    Get notifications for the logged-in user
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
    try {
        const notifications = await query(
            `SELECT notification_id, title, message, is_read, created_at
             FROM notifications
             WHERE user_id = $1
             ORDER BY created_at DESC`,
            [req.user.aadhar]
        );

        res.json({
            count: notifications.rows.length,
            notifications: notifications.rows.map(notification => ({
                id: notification.notification_id,
                title: notification.title,
                message: notification.message,
                isRead: notification.is_read,
                createdAt: notification.created_at
            }))
        });

    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to retrieve notifications'
        });
    }
});

// @route   PUT /api/notifications/mark-read/:id
// @desc    Mark a notification as read
// @access  Private
router.put('/mark-read/:id', authenticateToken, [
    param('id').isInt().withMessage('Invalid notification ID')
], async (req, res) => {
    try {
        const errors = require('express-validator').validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { id } = req.params;

        // Check if notification belongs to user
        const notificationCheck = await query(
            'SELECT notification_id FROM notifications WHERE notification_id = $1 AND user_id = $2',
            [id, req.user.aadhar]
        );

        if (notificationCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Notification not found',
                message: 'Notification does not exist or does not belong to you'
            });
        }

        // Mark as read
        const updateResult = await query(
            'UPDATE notifications SET is_read = TRUE WHERE notification_id = $1',
            [id]
        );

        if (updateResult.rowCount === 0) {
            return res.status(404).json({
                error: 'Notification not found'
            });
        }

        res.json({
            message: 'Notification marked as read'
        });

    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to mark notification as read'
        });
    }
});

module.exports = router;


