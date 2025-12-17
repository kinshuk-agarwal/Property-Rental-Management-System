const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { query, executeProcedure } = require('../db/connection');

const router = express.Router();

// Validation middleware
const validateSignup = [
    body('aadhar').isLength({ min: 12, max: 12 }).isNumeric().withMessage('Aadhar must be exactly 12 digits'),
    body('name').isLength({ min: 2, max: 15 }).withMessage('Name must be 2-15 characters'),
    body('age').isInt({ min: 18, max: 100 }).withMessage('Age must be between 18-100'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('doorNo').isInt({ min: 1 }).withMessage('Door number must be positive'),
    body('street').notEmpty().withMessage('Street is required'),
    body('state').notEmpty().withMessage('State is required'),
    body('pincode').isInt({ min: 100000, max: 999999 }).withMessage('Pincode must be 6 digits'),
    body('username').isLength({ min: 3, max: 20 }).withMessage('Username must be 3-20 characters'),
    body('role').isIn(['owner', 'tenant', 'manager']).withMessage('Role must be owner, tenant, or manager')
];

const validateLogin = [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
];

// Helper function to generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        {
            aadhar: user.aadhar,
            username: user.username,
            role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );
};

// @route   POST /api/auth/signup
// @desc    Register a new user
// @access  Public
router.post('/signup', validateSignup, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const {
            aadhar,
            name,
            age,
            password,
            doorNo,
            street,
            state,
            pincode,
            username,
            role
        } = req.body;

        // Check if user already exists
        const existingUser = await query(
            'SELECT aadhar FROM users WHERE aadhar = $1 OR username = $2',
            [aadhar, username]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({
                error: 'User already exists',
                message: 'A user with this Aadhar number or username already exists'
            });
        }

        // Hash password
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        // Create new user using stored procedure
        await executeProcedure('create_new_user', {
            p_aadhar: aadhar,
            p_name: name,
            p_age: age,
            p_password: hashedPassword,
            p_door_no: doorNo,
            p_street: street,
            p_state: state,
            p_pincode: pincode,
            p_username: username
        });

        // Assign user role
        await executeProcedure('assign_user_role', {
            p_aadhar: aadhar,
            p_role: role
        });

        // Generate JWT token
        const token = generateToken({
            aadhar,
            username,
            role
        });

        res.status(201).json({
            message: 'User created successfully',
            token,
            user: {
                aadhar,
                name,
                username,
                role
            }
        });

    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to create user account'
        });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user and get token
// @access  Public
router.post('/login', validateLogin, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { username, password } = req.body;

        // Find user by username
        const userResult = await query(
            `SELECT u.*, ot.owner_id, tt.tenant_id, mt.manager_id
             FROM users u
             LEFT JOIN owner ot ON u.aadhar = ot.owner_id
             LEFT JOIN tenant tt ON u.aadhar = tt.tenant_id
             LEFT JOIN manager mt ON u.aadhar = mt.manager_id
             WHERE u.username = $1`,
            [username]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid username or password'
            });
        }

        const user = userResult.rows[0];

        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                error: 'Authentication failed',
                message: 'Invalid username or password'
            });
        }

        // Determine user role
        let role = null;
        if (user.owner_id) role = 'owner';
        else if (user.tenant_id) role = 'tenant';
        else if (user.manager_id) role = 'manager';

        // Generate JWT token
        const token = generateToken({
            aadhar: user.aadhar,
            username: user.username,
            role
        });

        res.json({
            message: 'Login successful',
            token,
            user: {
                aadhar: user.aadhar,
                name: user.name,
                username: user.username,
                role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to authenticate user'
        });
    }
});

// @route   POST /api/auth/verify
// @desc    Verify JWT token
// @access  Private
router.post('/verify', (req, res) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                error: 'No token provided'
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({
            valid: true,
            user: decoded
        });

    } catch (error) {
        res.status(401).json({
            valid: false,
            error: 'Invalid token'
        });
    }
});

module.exports = router;
