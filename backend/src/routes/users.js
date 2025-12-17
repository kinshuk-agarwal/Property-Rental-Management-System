const express = require('express');
const { query } = require('../db/connection');
const jwt = require('jsonwebtoken');

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
        console.log("Authenticated user:", req.user); // Added logging
        next();
    } catch (error) {
        res.status(401).json({
            error: 'Invalid token',
            message: 'Authentication failed'
        });
    }
};

// @route   GET /api/users/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const userResult = await query(`
            SELECT u.aadhar, u.name, u.age, u.door_no, u.street, u.state, u.pincode, u.username,
                   CASE
                       WHEN o.owner_id IS NOT NULL THEN 'owner'
                       WHEN t.tenant_id IS NOT NULL THEN 'tenant'
                       WHEN m.manager_id IS NOT NULL THEN 'manager'
                   END as role,
                   array_agg(p.phone_no) as phone_numbers
            FROM users u
            LEFT JOIN owner o ON u.aadhar = o.owner_id
            LEFT JOIN tenant t ON u.aadhar = t.tenant_id
            LEFT JOIN manager m ON u.aadhar = m.manager_id
            LEFT JOIN phone p ON u.aadhar = p.aadhar_no
            WHERE u.aadhar = $1
            GROUP BY u.aadhar, u.name, u.age, u.door_no, u.street, u.state, u.pincode, u.username, o.owner_id, t.tenant_id, m.manager_id
        `, [req.user.aadhar]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                error: 'User not found'
            });
        }

        const user = userResult.rows[0];

        res.json({
            user: {
                aadhar: user.aadhar,
                name: user.name,
                age: user.age,
                address: {
                    doorNo: user.door_no,
                    street: user.street,
                    state: user.state,
                    pincode: user.pincode
                },
                username: user.username,
                role: user.role,
                phoneNumbers: user.phone_numbers || []
            }
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to retrieve user profile'
        });
    }
});

// @route   GET /api/users
// @desc    Get all users (Manager only)
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'manager') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only managers can view all users'
            });
        }

        const usersResult = await query(`
            SELECT u.aadhar, u.name, u.age, u.username,
                   CASE
                       WHEN o.owner_id IS NOT NULL THEN 'owner'
                       WHEN t.tenant_id IS NOT NULL THEN 'tenant'
                       WHEN m.manager_id IS NOT NULL THEN 'manager'
                   END as role,
                   array_agg(p.phone_no) as phone_numbers
            FROM users u
            LEFT JOIN owner o ON u.aadhar = o.owner_id
            LEFT JOIN tenant t ON u.aadhar = t.tenant_id
            LEFT JOIN manager m ON u.aadhar = m.manager_id
            LEFT JOIN phone p ON u.aadhar = p.aadhar_no
            GROUP BY u.aadhar, u.name, u.age, u.username, o.owner_id, t.tenant_id, m.manager_id
            ORDER BY u.name
        `);

        res.json({
            count: usersResult.rows.length,
            users: usersResult.rows.map(user => ({
                aadhar: user.aadhar,
                name: user.name,
                age: user.age,
                username: user.username,
                role: user.role,
                phoneNumbers: user.phone_numbers || []
            }))
        });

    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to retrieve users'
        });
    }
});

// @route   GET /api/users/owners
// @desc    Get all property owners
// @access  Private (Manager or Tenant)
router.get('/owners', authenticateToken, async (req, res) => {
    try {
        if (!['manager', 'tenant'].includes(req.user.role)) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only managers and tenants can view property owners'
            });
        }

        const ownersResult = await query(`
            SELECT u.aadhar, u.name, u.username,
                   COUNT(p.property_id) as property_count
            FROM users u
            JOIN owner o ON u.aadhar = o.owner_id
            LEFT JOIN property p ON u.aadhar = p.owner_id
            GROUP BY u.aadhar, u.name, u.username
            ORDER BY u.name
        `);

        res.json({
            count: ownersResult.rows.length,
            owners: ownersResult.rows.map(owner => ({
                aadhar: owner.aadhar,
                name: owner.name,
                username: owner.username,
                propertyCount: parseInt(owner.property_count)
            }))
        });

    } catch (error) {
        console.error('Get owners error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to retrieve property owners'
        });
    }
});

// @route   GET /api/users/tenants
// @desc    Get all tenants
// @access  Private (Manager or Owner)
router.get('/tenants', authenticateToken, async (req, res) => {
    try {
        if (!['manager', 'owner'].includes(req.user.role)) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only managers and owners can view tenants'
            });
        }

        const tenantsResult = await query(`
            SELECT u.aadhar, u.name, u.username, u.age,
                   CASE WHEN r.property_id IS NOT NULL THEN true ELSE false END as currently_renting,
                   COUNT(r.property_id) as rental_count
            FROM users u
            JOIN tenant t ON u.aadhar = t.tenant_id
            LEFT JOIN rental r ON u.aadhar = r.tenant_id AND r.end_date IS NULL
            GROUP BY u.aadhar, u.name, u.username, u.age, r.property_id
            ORDER BY u.name
        `);

        res.json({
            count: tenantsResult.rows.length,
            tenants: tenantsResult.rows.map(tenant => ({
                aadhar: tenant.aadhar,
                name: tenant.name,
                username: tenant.username,
                age: tenant.age,
                currentlyRenting: tenant.currently_renting,
                rentalCount: parseInt(tenant.rental_count)
            }))
        });

    } catch (error) {
        console.error('Get tenants error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to retrieve tenants'
        });
    }
});

// @route   GET /api/users/managers
// @desc    Get all managers (Manager only)
// @access  Private
router.get('/managers', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'manager') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only managers can view other managers'
            });
        }

        const managersResult = await query(`
            SELECT u.aadhar, u.name, u.username
            FROM users u
            JOIN manager m ON u.aadhar = m.manager_id
            ORDER BY u.name
        `);

        res.json({
            count: managersResult.rows.length,
            managers: managersResult.rows.map(manager => ({
                aadhar: manager.aadhar,
                name: manager.name,
                username: manager.username
            }))
        });

    } catch (error) {
        console.error('Get managers error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to retrieve managers'
        });
    }
});

module.exports = router;
