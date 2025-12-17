const express = require('express');
const { body, validationResult, param, query: validationQuery } = require('express-validator');
const { executeFunction, query } = require('../db/connection');
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
        next();
    } catch (error) {
        res.status(401).json({
            error: 'Invalid token',
            message: 'Authentication failed'
        });
    }
};

// Validation middleware for property creation
const validateProperty = [
    body('availableFromDate').isISO8601().withMessage('Invalid available from date'),
    body('availableTillDate').isISO8601().withMessage('Invalid available till date'),
    body('area').isFloat({ min: 0 }).withMessage('Area must be positive'),
    body('plinthArea').isFloat({ min: 0 }).withMessage('Plinth area must be positive'),
    body('rent').isFloat({ min: 0 }).withMessage('Rent must be positive'),
    body('hike').isFloat({ min: 0, max: 100 }).withMessage('Hike must be between 0-100%'),
    body('floorNo').isInt({ min: 0 }).withMessage('Floor number must be non-negative'),
    body('locality').notEmpty().withMessage('Locality is required'),
    body('address').notEmpty().withMessage('Address is required'),
    body('yearOfConstruction').isInt({ min: 1800, max: new Date().getFullYear() }).withMessage('Invalid year of construction')
];

// @route   GET /api/properties/search
// @desc    Search properties by locality
// @access  Public
router.get('/search', [
    validationQuery('locality').notEmpty().withMessage('Locality is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { locality } = req.query;

        // Use stored function to search properties
        const properties = await executeFunction('search_property_for_rent', {
            p_locality: locality
        });

        res.json({
            count: properties.length,
            properties: properties.map(prop => ({
                id: prop.property_id,
                ownerId: prop.owner_id,
                availableFromDate: prop.available_from_date,
                availableTillDate: prop.available_till_date,
                area: prop.area,
                plinthArea: prop.plinth_area,
                rent: prop.rent,
                hike: prop.hike,
                floorNo: prop.floor_no,
                locality: prop.locality,
                address: prop.address,
                yearOfConstruction: prop.year_of_construction
            }))
        });

    } catch (error) {
        console.error('Property search error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to search properties'
        });
    }
});

// @route   POST /api/properties
// @desc    Add a new property (Owner only)
// @access  Private
router.post('/', authenticateToken, validateProperty, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        // Check if user is an owner
        if (req.user.role !== 'owner') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only property owners can add properties'
            });
        }

        const {
            availableFromDate,
            availableTillDate,
            area,
            plinthArea,
            rent,
            hike,
            floorNo,
            locality,
            address,
            yearOfConstruction
        } = req.body;

        // Insert property using stored function
        const result = await executeFunction('insert_property_record', {
            p_owner_id: req.user.aadhar,
            p_available_from_date: availableFromDate,
            p_available_till_date: availableTillDate,
            p_area: area,
            p_plinth_area: plinthArea,
            p_rent: rent,
            p_hike: hike,
            p_floor_no: floorNo,
            p_locality: locality,
            p_address: address,
            p_year_of_construction: yearOfConstruction
        });

        const propertyId = result[0]?.insert_property_record || result[0];

        res.status(201).json({
            message: 'Property added successfully',
            propertyId
        });

    } catch (error) {
        console.error('Add property error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to add property'
        });
    }
});

// @route   GET /api/properties/owner/:ownerId
// @desc    Get properties by owner ID
// @access  Private
router.get('/owner/:ownerId', authenticateToken, [
    param('ownerId').isInt().withMessage('Invalid owner ID')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { ownerId } = req.params;

        // Check if user is the owner or a manager
        if (req.user.role !== 'manager' && req.user.aadhar != ownerId) {
            return res.status(403).json({
                error: 'Access denied',
                message: 'You can only view your own properties'
            });
        }

        // Get properties using stored function
        const properties = await executeFunction('get_property_records', {
            p_owner_id: parseInt(ownerId)
        });

        res.json({
            count: properties.length,
            properties: properties.map(prop => ({
                id: prop.property_id,
                availableFromDate: prop.available_from_date,
                availableTillDate: prop.available_till_date,
                area: prop.area,
                plinthArea: prop.plinth_area,
                rent: prop.rent,
                hike: prop.hike,
                floorNo: prop.floor_no,
                locality: prop.locality,
                address: prop.address,
                yearOfConstruction: prop.year_of_construction
            }))
        });

    } catch (error) {
        console.error('Get owner properties error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to retrieve properties'
        });
    }
});

// @route   GET /api/properties/:id
// @desc    Get property details by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { id } = req.params;

        // Get property details
        const propertyResult = await query(`
            SELECT p.*,
                   array_agg(DISTINCT f.facilities) as facilities,
                   rp.type as residential_type, rp.number_of_beds,
                   cp.type as commercial_type
            FROM property p
            LEFT JOIN other_facilities f ON p.property_id = f.property_id
            LEFT JOIN residential_property rp ON p.property_id = rp.property_id
            LEFT JOIN commercial_property cp ON p.property_id = cp.property_id
            WHERE p.property_id = $1
            GROUP BY p.property_id, rp.type, rp.number_of_beds, cp.type
        `, [id]);

        if (propertyResult.rows.length === 0) {
            return res.status(404).json({
                error: 'Property not found'
            });
        }

        const property = propertyResult.rows[0];

        res.json({
            property: {
                id: property.property_id,
                ownerId: property.owner_id,
                availableFromDate: property.available_from_date,
                availableTillDate: property.available_till_date,
                area: property.area,
                plinthArea: property.plinth_area,
                rent: property.rent,
                hike: property.hike,
                floorNo: property.floor_no,
                locality: property.locality,
                address: property.address,
                yearOfConstruction: property.year_of_construction,
                facilities: property.facilities || [],
                propertyType: property.residential_type ? 'residential' :
                             property.commercial_type ? 'commercial' : 'other',
                residentialType: property.residential_type,
                numberOfBeds: property.number_of_beds,
                commercialType: property.commercial_type
            }
        });

    } catch (error) {
        console.error('Get property details error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to retrieve property details'
        });
    }
});

// @route   GET /api/properties
// @desc    Get all properties (Manager only)
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
    try {
        if (req.user.role !== 'manager' && req.user.role !== 'owner') {
            return res.status(403).json({
                error: 'Access denied',
                message: 'Only managers can view all properties'
            });
        }

        const propertiesResult = await query(`
            SELECT p.*, u.name as owner_name
            FROM property p
            JOIN users u ON p.owner_id = u.aadhar
            ORDER BY p.property_id
        `);

        res.json({
            count: propertiesResult.rows.length,
            properties: propertiesResult.rows.map(prop => ({
                id: prop.property_id,
                ownerId: prop.owner_id,
                ownerName: prop.owner_name,
                availableFromDate: prop.available_from_date,
                availableTillDate: prop.available_till_date,
                area: prop.area,
                plinthArea: prop.plinth_area,
                rent: prop.rent,
                hike: prop.hike,
                floorNo: prop.floor_no,
                locality: prop.locality,
                address: prop.address,
                yearOfConstruction: prop.year_of_construction
            }))
        });

    } catch (error) {
        console.error('Get all properties error:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to retrieve properties'
        });
    }
});

module.exports = router;
