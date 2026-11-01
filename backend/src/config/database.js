const mysql = require('mysql2/promise');
require('dotenv').config();

// Create MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    database: process.env.DB_NAME || 'casino_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    waitForConnections: true,
    connectionLimit: 20,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test database connection
pool.getConnection()
    .then(connection => {
        console.log('✓ MySQL database connected successfully');
        connection.release();
    })
    .catch(err => {
        console.error('MySQL connection error:', err);
        console.error('Please check your .env file and MySQL credentials');
        process.exit(-1);
    });

// Helper function to execute queries
const query = async (text, params = []) => {
    const start = Date.now();
    try {
        const [rows] = await pool.execute(text, params);
        const duration = Date.now() - start;
        console.log('Executed query', { duration, rowCount: Array.isArray(rows) ? rows.length : rows.affectedRows });
        
        // Return in PostgreSQL-compatible format
        return { 
            rows: Array.isArray(rows) ? rows : [], 
            rowCount: Array.isArray(rows) ? rows.length : rows.affectedRows 
        };
    } catch (error) {
        console.error('Database query error:', error);
        throw error;
    }
};

// Helper function for stored procedures
const callProcedure = async (procedureName, params = []) => {
    const placeholders = params.map(() => '?').join(', ');
    const sql = `CALL ${procedureName}(${placeholders})`;
    
    try {
        const [results] = await pool.execute(sql, params);
        // MySQL returns procedure results in first element of array
        return { rows: Array.isArray(results[0]) ? results[0] : [results[0]] };
    } catch (error) {
        console.error(`Procedure ${procedureName} error:`, error);
        throw error;
    }
};

// Helper function for transactions
const transaction = async (callback) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};

module.exports = {
    query,
    callProcedure,
    transaction,
    pool
};
