const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { executeFunction, query, executeProcedure } = require('../db/connection');
const jwt = require('jsonwebtoken');
const { sendNotification } = require('../utils/notify');

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

// Validation middleware for rental creation
const validateRental = [
    body('propertyId').isInt().withMessage('Invalid property ID'),
    body('startDate').isISO8601().withMessage('Invalid start date'),
    body('monthlyRent').isFloat({ min: 0 }).withMessage('Monthly rent must be positive'),
    body('commission').optional().isFloat({ min: 0 }).withMessage('Commission must be positive')
];

// @route   GET /api/rentals/history/:propertyId
// @desc    Get rental history for a property
// @access  Private
router.get('/history/:propertyId', authenticateToken, [
    param('propertyId').isInt().withMessage('Invalid property ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { propertyId } = req.params;

        // Check if user is authorized (owner of property, tenant of property, or manager)
        if (req.user.role !== 'manager') {
            // Check if user is the owner of this property
            const ownerCheck = await query(
                'SELECT owner_id FROM property WHERE property_id = $1',
                [propertyId]
            );

            if (ownerCheck.rows.length === 0) {
                return res.status(404).json({
                    error: 'Property not found'
                });
            }

            // Allow if user is the owner
            if (ownerCheck.rows[0].owner_id != req.user.aadhar) {
                return res.status(403).json({
                    error: 'Access denied',
                    message: 'You can only view rental history for your own properties'
                });
            }
        }

        // Get rental history using stored function
        const history = await executeFunction('get_rent_history', {
            p_property_id: parseInt(propertyId)
        });

        res.json({
            count: history.length,
            rentals: history.map(rental => ({
                tenantId: rental.tenant_id,
                propertyId: rental.property_id,
                startDate: rental.start_date,
                endDate: rental.end_date,
                rentHike: rental.rent_hike,
                monthlyRent: rental.monthly_rent,
                commission: rental.commission
            }))
        });

    } catch (error) {
        console.error('Get rental history error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to retrieve rental history'
        });
    }
});

// @route   GET /api/rentals/tenant/:propertyId
// @desc    Get current tenant details for a property
// @access  Private
router.get('/tenant/:propertyId', authenticateToken, [
    param('propertyId').isInt().withMessage('Invalid property ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { propertyId } = req.params;

        // Check if user is authorized (owner of property or manager)
        if (req.user.role !== 'manager') {
            const ownerCheck = await query(
                'SELECT owner_id FROM property WHERE property_id = $1',
                [propertyId]
            );

            if (ownerCheck.rows.length === 0) {
                return res.status(404).json({
                    error: 'Property not found'
                });
            }

            if (ownerCheck.rows[0].owner_id != req.user.aadhar) {
                return res.status(403).json({
                    error: 'Access denied',
                    message: 'You can only view tenant details for your own properties'
                });
            }
        }

        // Get current tenant details using stored function
        const tenantDetails = await executeFunction('get_tenant_details', {
            p_property_id: parseInt(propertyId)
        });

        if (tenantDetails.length === 0) {
            return res.json({
                message: 'No current tenant for this property',
                tenant: null
            });
        }

        res.json({
            tenant: {
                aadhar: tenantDetails[0].aadhar,
                name: tenantDetails[0].name,
                age: tenantDetails[0].age,
                doorNo: tenantDetails[0].door_no,
                street: tenantDetails[0].street,
                state: tenantDetails[0].state,
                pincode: tenantDetails[0].pincode,
                username: tenantDetails[0].username
            }
        });

    } catch (error) {
        console.error('Get tenant details error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to retrieve tenant details'
        });
    }
});

// @route   POST /api/rentals
// @desc    Create a new rental agreement (Manager only)
// @access  Private
router.post('/', authenticateToken, validateRental, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        if (req.user.role !== 'manager') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only managers can create rental agreements'
            });
        }

        const {
            tenantId,
            propertyId,
            startDate,
            monthlyRent,
            commission
        } = req.body;

        // Verify tenant exists and is actually a tenant
        const tenantCheck = await query(
            'SELECT tenant_id FROM tenant WHERE tenant_id = $1',
            [tenantId]
        );

        if (tenantCheck.rows.length === 0) {
            return res.status(400).json({
                error: 'Invalid tenant',
                message: 'The specified tenant does not exist'
            });
        }

        // Verify property exists and is available
        const propertyCheck = await query(`
            SELECT p.property_id,
                   CASE WHEN r.property_id IS NULL THEN true ELSE false END as available
            FROM property p
            LEFT JOIN rental r ON p.property_id = r.property_id AND r.end_date IS NULL
            WHERE p.property_id = $1
        `, [propertyId]);

        if (propertyCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Property not found'
            });
        }

        if (!propertyCheck.rows[0].available) {
            return res.status(400).json({
                error: 'Property not available',
                message: 'This property is currently rented'
            });
        }

        // Create rental agreement using stored procedure
        await executeProcedure('create_rental_agreement', {
            p_tenant_id: tenantId,
            p_property_id: propertyId,
            p_start_date: startDate,
            p_monthly_rent: monthlyRent,
            p_commission: commission || null
        });

        // Send notification to tenant about rental creation
        try {
            const propertyDetails = await query(
                'SELECT locality, address FROM property WHERE property_id = $1',
                [propertyId]
            );

            if (propertyDetails.rows.length > 0) {
                const propertyInfo = propertyDetails.rows[0];

                await sendNotification(
                    tenantId,
                    "Rental Agreement Created",
                    `A rental agreement has been created for property "${propertyInfo.locality}, ${propertyInfo.address}" starting from ${startDate}.`
                );
            }
        } catch (notifyError) {
            console.error('Failed to send rental creation notification:', notifyError);
            // Don't fail the rental creation if notification fails
        }

        res.status(201).json({
            message: 'Rental agreement created successfully'
        });

    } catch (error) {
        console.error('Create rental error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to create rental agreement'
        });
    }
});

// @route   PUT /api/rentals/end
// @desc    End a rental agreement (Manager only)
// @access  Private
router.put('/end', authenticateToken, [
    body('tenantId').isInt().withMessage('Invalid tenant ID'),
    body('propertyId').isInt().withMessage('Invalid property ID'),
    body('startDate').isISO8601().withMessage('Invalid start date'),
    body('endDate').isISO8601().withMessage('Invalid end date')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        if (req.user.role !== 'manager') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only managers can end rental agreements'
            });
        }

        const { tenantId, propertyId, startDate, endDate } = req.body;

        // End rental agreement using stored procedure
        await executeProcedure('end_rental_agreement', {
            p_tenant_id: tenantId,
            p_property_id: propertyId,
            p_start_date: startDate,
            p_end_date: endDate
        });

        // Send notifications about rental ending
        try {
            const propertyDetails = await query(
                'SELECT locality, address FROM property WHERE property_id = $1',
                [propertyId]
            );

            if (propertyDetails.rows.length > 0) {
                const propertyInfo = propertyDetails.rows[0];

                // Notify tenant
                await sendNotification(
                    tenantId,
                    "Rental Agreement Ended",
                    `Your rental agreement for property "${propertyInfo.locality}, ${propertyInfo.address}" has ended on ${endDate}.`
                );

                // Notify property owner
                const ownerResult = await query(
                    'SELECT owner_id FROM property WHERE property_id = $1',
                    [propertyId]
                );

                if (ownerResult.rows.length > 0) {
                    await sendNotification(
                        ownerResult.rows[0].owner_id,
                        "Rental Ended",
                        `The rental for your property "${propertyInfo.locality}, ${propertyInfo.address}" has ended on ${endDate}.`
                    );
                }
            }
        } catch (notifyError) {
            console.error('Failed to send rental end notifications:', notifyError);
            // Don't fail the rental ending if notifications fail
        }

        res.json({
            message: 'Rental agreement ended successfully'
        });

    } catch (error) {
        console.error('End rental error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to end rental agreement'
        });
    }
});

// @route   GET /api/rentals/tenant-active
// @desc    Get tenant's active rental (Tenant only)
// @access  Private
router.get('/tenant-active', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'tenant') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only tenants can view their active rental'
            });
        }

        const activeRental = await query(`
            SELECT r.property_id, p.locality, p.address, r.monthly_rent as rent, r.start_date,
                   u_owner.name, u_owner.username
            FROM rental r
            JOIN property p ON r.property_id = p.property_id
            JOIN users u_owner ON p.owner_id = u_owner.aadhar
            WHERE r.tenant_id = $1 AND r.end_date IS NULL
        `, [req.user.aadhar]);

        res.json({
            activeRental: activeRental.rows.length > 0 ? {
                propertyId: activeRental.rows[0].property_id,
                locality: activeRental.rows[0].locality,
                address: activeRental.rows[0].address,
                rent: parseFloat(activeRental.rows[0].rent),
                startDate: activeRental.rows[0].start_date,
                owner: {
                    name: activeRental.rows[0].name,
                    username: activeRental.rows[0].username
                }
            } : null
        });

    } catch (error) {
        console.error('Get tenant active rental error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to retrieve active rental'
        });
    }
});

// @route   GET /api/rentals/owner-active
// @desc    Get owner's active rentals (Owner only)
// @access  Private
router.get('/owner-active', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'owner') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only owners can view their active rentals'
            });
        }

        const activeRentals = await query(`
            SELECT r.property_id, p.locality, p.address, r.monthly_rent as rent, r.start_date,
                   u_tenant.name, u_tenant.username
            FROM rental r
            JOIN property p ON r.property_id = p.property_id
            JOIN users u_tenant ON r.tenant_id = u_tenant.aadhar
            WHERE p.owner_id = $1 AND r.end_date IS NULL
            ORDER BY r.start_date DESC
        `, [req.user.aadhar]);

        res.json({
            activeRentals: activeRentals.rows.map(rental => ({
                tenant: {
                    name: rental.name,
                    username: rental.username
                },
                propertyId: rental.property_id,
                locality: rental.locality,
                address: rental.address,
                rent: parseFloat(rental.rent),
                startDate: rental.start_date
            }))
        });

    } catch (error) {
        console.error('Get owner active rentals error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to retrieve active rentals'
        });
    }
});

// @route   GET /api/rentals
// @desc    Get all active rentals (Manager only)
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'manager') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only managers can view all rentals'
            });
        }

        const rentalsResult = await query(`
            SELECT r.*,
                   p.locality, p.address,
                   u_tenant.name as tenant_name,
                   u_owner.name as owner_name
            FROM rental r
            JOIN property p ON r.property_id = p.property_id
            JOIN users u_tenant ON r.tenant_id = u_tenant.aadhar
            JOIN users u_owner ON p.owner_id = u_owner.aadhar
            WHERE r.end_date IS NULL
            ORDER BY r.start_date DESC
        `);

        res.json({
            count: rentalsResult.rows.length,
            rentals: rentalsResult.rows.map(rental => ({
                tenantId: rental.tenant_id,
                tenantName: rental.tenant_name,
                propertyId: rental.property_id,
                ownerName: rental.owner_name,
                locality: rental.locality,
                address: rental.address,
                startDate: rental.start_date,
                monthlyRent: rental.monthly_rent,
                commission: rental.commission
            }))
        });

    } catch (error) {
        console.error('Get rentals error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to retrieve rentals'
        });
    }
});

module.exports = router;
