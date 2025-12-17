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

// Validation middleware for creating rental request
const validateRentalRequest = [
    body('propertyId').isString().isLength({ min: 1 }).withMessage('Valid property ID is required')
];

// @route   POST /api/rental-requests
// @desc    Create a new rental request (Tenant only)
// @access  Private
router.post('/', authenticateToken, validateRentalRequest, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        if (req.user.role !== 'tenant') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only tenants can create rental requests'
            });
        }

        const { propertyId } = req.body;
        const tenantId = req.user.aadhar;

        // Verify property exists
        const propertyCheck = await query(
            'SELECT property_id FROM property WHERE property_id = $1',
            [propertyId]
        );

        if (propertyCheck.rows.length === 0) {
            return res.status(404).json({
                error: 'Property not found'
            });
        }

        // Check if property is already rented
        const rentalCheck = await query(
            'SELECT tenant_id FROM rental WHERE property_id = $1 AND end_date IS NULL',
            [propertyId]
        );

        if (rentalCheck.rows.length > 0) {
            return res.status(400).json({
                error: 'Property not available',
                message: 'This property is currently rented'
            });
        }

        // Check if tenant already has a pending request for this property
        const existingRequest = await query(
            'SELECT request_id FROM rental_requests WHERE tenant_id = $1 AND property_id = $2 AND status = $3',
            [tenantId, propertyId, 'pending']
        );

        if (existingRequest.rows.length > 0) {
            return res.status(400).json({
                error: 'Request already exists',
                message: 'You already have a pending request for this property'
            });
        }

        // Create rental request
        const insertResult = await query(
            `INSERT INTO rental_requests (tenant_id, property_id, request_date, status)
             VALUES ($1, $2, CURRENT_DATE, 'pending')
             RETURNING request_id`,
            [tenantId, propertyId]
        );

        // Send notification to managers about new rental request
        try {
            // Get all manager IDs
            const managers = await query('SELECT manager_id FROM manager');
            const propertyDetails = await query(
                'SELECT locality, address FROM property WHERE property_id = $1',
                [propertyId]
            );

            if (propertyDetails.rows.length > 0) {
                const propertyInfo = propertyDetails.rows[0];
                for (const manager of managers.rows) {
                    await sendNotification(
                        manager.manager_id,
                        "New Rental Request",
                        `Tenant ${req.user.name} (@${req.user.username}) requested rental for property: ${propertyInfo.locality}, ${propertyInfo.address}`
                    );
                }
            }
        } catch (notifyError) {
            console.error('Failed to send notification for new rental request:', notifyError);
            // Don't fail the request if notification fails
        }

        res.status(201).json({
            message: 'Rental request created successfully',
            requestId: insertResult.rows[0].request_id
        });

    } catch (error) {
        console.error('Create rental request error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to create rental request'
        });
    }
});

// @route   GET /api/rental-requests
// @desc    Get rental requests based on user role
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
    try {
        let requestsQuery = `
            SELECT rr.*, u_tenant.name as tenant_name, p.locality, p.address, p.rent,
                   u_manager.name as reviewed_by_name
            FROM rental_requests rr
            JOIN users u_tenant ON rr.tenant_id = u_tenant.aadhar
            JOIN property p ON rr.property_id = p.property_id
            LEFT JOIN users u_manager ON rr.reviewed_by = u_manager.aadhar
        `;

        let queryParams = [];
        let whereConditions = [];

        if (req.user.role === 'tenant') {
            // Tenants can only see their own requests
            whereConditions.push('rr.tenant_id = $1');
            queryParams.push(req.user.aadhar);
        } else if (req.user.role === 'owner') {
            // Owners can see requests for their properties
            whereConditions.push('p.owner_id = $1');
            queryParams.push(req.user.aadhar);
        }
        // Managers can see all requests (no additional conditions)

        if (whereConditions.length > 0) {
            requestsQuery += ' WHERE ' + whereConditions.join(' AND ');
        }

        requestsQuery += ' ORDER BY rr.request_date DESC, rr.request_id DESC';

        const requests = await query(requestsQuery, queryParams);

        res.json({
            count: requests.rows.length,
            requests: requests.rows.map(request => ({
                requestId: request.request_id,
                tenantId: request.tenant_id,
                tenantName: request.tenant_name,
                propertyId: request.property_id,
                propertyDetails: {
                    locality: request.locality,
                    address: request.address,
                    rent: request.rent
                },
                requestDate: request.request_date,
                status: request.status,
                reviewedBy: request.reviewed_by,
                reviewedByName: request.reviewed_by_name,
                reviewedAt: request.reviewed_at,
                rejectionReason: request.rejection_reason
            }))
        });

    } catch (error) {
        console.error('Get rental requests error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to retrieve rental requests'
        });
    }
});

// @route   GET /api/rental-requests/:id
// @desc    Get specific rental request details
// @access  Private
router.get('/:id', authenticateToken, [
    param('id').isInt().withMessage('Invalid request ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { id } = req.params;

        const requestQuery = `
            SELECT rr.*, u_tenant.name as tenant_name, p.locality, p.address, p.rent,
                   u_manager.name as reviewed_by_name
            FROM rental_requests rr
            JOIN users u_tenant ON rr.tenant_id = u_tenant.aadhar
            JOIN property p ON rr.property_id = p.property_id
            LEFT JOIN users u_manager ON rr.reviewed_by = u_manager.aadhar
            WHERE rr.request_id = $1
        `;

        const request = await query(requestQuery, [id]);

        if (request.rows.length === 0) {
            return res.status(404).json({
                error: 'Request not found'
            });
        }

        // Check if user is authorized to view this request
        const requestData = request.rows[0];
        let authorized = false;

        if (req.user.role === 'manager') {
            authorized = true;
        } else if (req.user.role === 'tenant' && requestData.tenant_id === req.user.aadhar) {
            authorized = true;
        } else if (req.user.role === 'owner') {
            const propertyCheck = await query(
                'SELECT owner_id FROM property WHERE property_id = $1',
                [requestData.property_id]
            );
            if (propertyCheck.rows.length > 0 && propertyCheck.rows[0].owner_id === req.user.aadhar) {
                authorized = true;
            }
        }

        if (!authorized) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'You are not authorized to view this request'
            });
        }

        res.json({
            request: {
                requestId: requestData.request_id,
                tenantId: requestData.tenant_id,
                tenantName: requestData.tenant_name,
                propertyId: requestData.property_id,
                propertyDetails: {
                    locality: requestData.locality,
                    address: requestData.address,
                    rent: requestData.rent
                },
                requestDate: requestData.request_date,
                status: requestData.status,
                reviewedBy: requestData.reviewed_by,
                reviewedByName: requestData.reviewed_by_name,
                reviewedAt: requestData.reviewed_at,
                rejectionReason: requestData.rejection_reason
            }
        });

    } catch (error) {
        console.error('Get rental request error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to retrieve rental request'
        });
    }
});

// @route   PUT /api/rental-requests/:id/approve
// @desc    Approve rental request and create rental agreement (Manager only)
// @access  Private
router.put('/:id/approve', authenticateToken, [
    param('id').isInt().withMessage('Invalid request ID')
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
                message: 'Only managers can approve rental requests'
            });
        }

        const { id } = req.params;
        const managerId = req.user.aadhar;

        // Start transaction
        await query('BEGIN');

        try {
            // Get the request details
            const request = await query(
                'SELECT * FROM rental_requests WHERE request_id = $1 AND status = $2',
                [id, 'pending']
            );

            if (request.rows.length === 0) {
                await query('ROLLBACK');
                return res.status(404).json({
                    error: 'Request not found',
                    message: 'Request does not exist or is not pending'
                });
            }

            const requestData = request.rows[0];

            // Get property rent
            const property = await query(
                'SELECT rent FROM property WHERE property_id = $1',
                [requestData.property_id]
            );

            if (property.rows.length === 0) {
                await query('ROLLBACK');
                return res.status(404).json({
                    error: 'Property not found'
                });
            }

            const monthlyRent = property.rows[0].rent;
            const startDate = new Date().toISOString().split('T')[0];

            // Create rental agreement
            await executeProcedure('create_rental_agreement', {
                p_tenant_id: requestData.tenant_id,
                p_property_id: requestData.property_id,
                p_start_date: startDate,
                p_monthly_rent: monthlyRent,
                p_commission: null
            });

            // Update request status
            await query(
                `UPDATE rental_requests
                 SET status = 'approved', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP
                 WHERE request_id = $2`,
                [managerId, id]
            );

            // Insert notifications atomically
            const propertyDetails = await query('SELECT locality, address FROM property WHERE property_id = $1', [requestData.property_id]);
            const propertyInfo = propertyDetails.rows[0];
            const ownerResult = await query('SELECT owner_id FROM property WHERE property_id = $1', [requestData.property_id]);

            await query(`INSERT INTO notifications (user_id, title, message, is_read, created_at)
                         VALUES ($1, $2, $3, false, CURRENT_TIMESTAMP),
                                ($4, $5, $6, false, CURRENT_TIMESTAMP)`,
                        [
                            requestData.tenant_id,
                            'Rental Request Approved',
                            `Your rental request for property "${propertyInfo.locality}, ${propertyInfo.address}" has been approved. A rental agreement has been created.`,
                            ownerResult.rows[0].owner_id,
                            'Property Rented',
                            `Your property "${propertyInfo.locality}, ${propertyInfo.address}" has been rented out.`
                        ]);

            await query('COMMIT');

            res.json({
                message: 'Rental request approved and agreement created successfully',
                rentalAgreement: {
                    tenantId: requestData.tenant_id,
                    propertyId: requestData.property_id,
                    startDate: startDate,
                    monthlyRent: monthlyRent,
                    commission: null
                }
            });

        } catch (innerError) {
            await query('ROLLBACK');
            throw innerError;
        }

    } catch (error) {
        console.error('Approve rental request error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to approve rental request'
        });
    }
});

// @route   PUT /api/rental-requests/:id/reject
// @desc    Reject rental request (Manager only)
// @access  Private
router.put('/:id/reject', authenticateToken, [
    param('id').isInt().withMessage('Invalid request ID'),
    body('reason').optional().isString().withMessage('Rejection reason must be a string')
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
                message: 'Only managers can reject rental requests'
            });
        }

        const { id } = req.params;
        const { reason } = req.body;
        const managerId = req.user.aadhar;

        // Update request status
        const updateResult = await query(
            `UPDATE rental_requests
             SET status = 'rejected', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP, rejection_reason = $2
             WHERE request_id = $3 AND status = $4`,
            [managerId, reason || null, id, 'pending']
        );

        if (updateResult.rowCount === 0) {
            return res.status(404).json({
                error: 'Request not found',
                message: 'Request does not exist or is not pending'
            });
        }

        // Send notification to tenant about rejection
        try {
            const propertyDetails = await query(
                'SELECT locality, address FROM property WHERE property_id = $1',
                [req.body.propertyId || req.params.propertyId] // Get property ID from request
            );

            if (propertyDetails.rows.length > 0) {
                const propertyInfo = propertyDetails.rows[0];
                const rejectionMsg = reason
                    ? `Your rental request for property "${propertyInfo.locality}, ${propertyInfo.address}" has been rejected. Reason: ${reason}`
                    : `Your rental request for property "${propertyInfo.locality}, ${propertyInfo.address}" has been rejected.`;

                await sendNotification(
                    req.body.tenantId, // Assuming tenant ID is passed or we can get it from the request
                    "Rental Request Rejected",
                    rejectionMsg
                );
            }
        } catch (notifyError) {
            console.error('Failed to send rejection notification:', notifyError);
            // Don't fail the rejection if notification fails
        }

        res.json({
            message: 'Rental request rejected successfully',
            rejectionReason: reason
        });

    } catch (error) {
        console.error('Reject rental request error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to reject rental request'
        });
    }
});

module.exports = router;
