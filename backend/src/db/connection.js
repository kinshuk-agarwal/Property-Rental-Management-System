const { Pool } = require('pg');
require('dotenv').config();

// Create a pool for database connections
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'property_rental',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Test the database connection
pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

// Query helper function
const query = async (text, params) => {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { text, duration, rows: res.rowCount });
        return res;
    } catch (err) {
        console.error('Query error:', err);
        throw err;
    }
};

// Function to execute stored procedures/functions
const executeFunction = async (functionName, params = {}) => {
    try {
        const paramKeys = Object.keys(params);
        const paramValues = Object.values(params);
        const placeholders = paramKeys.map((_, index) => `$${index + 1}`).join(', ');

        const queryText = `SELECT * FROM ${functionName}(${placeholders})`;
        const result = await query(queryText, paramValues);
        return result.rows;
    } catch (err) {
        console.error(`Error executing function ${functionName}:`, err);
        throw err;
    }
};

// Function to call stored procedures that don't return data
const executeProcedure = async (procedureName, params = {}) => {
    try {
        const paramKeys = Object.keys(params);
        const paramValues = Object.values(params);
        const placeholders = paramKeys.map((_, index) => `$${index + 1}`).join(', ');

        const queryText = `SELECT ${procedureName}(${placeholders})`;
        await query(queryText, paramValues);
    } catch (err) {
        console.error(`Error executing procedure ${procedureName}:`, err);
        throw err;
    }
};

module.exports = {
    pool,
    query,
    executeFunction,
    executeProcedure
};
