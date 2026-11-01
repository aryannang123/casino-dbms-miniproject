const { query } = require('../config/database');

// Get all tables
const getTables = async (req, res) => {
    try {
        const { status, gameType } = req.query;

        let queryText = `
            SELECT table_id, table_number, game_type, minimum_bet, maximum_bet, 
                   status, capacity, created_at, updated_at
            FROM CASINO_TABLE
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            queryText += ` AND status = $${params.length + 1}`;
            params.push(status);
        }

        if (gameType) {
            queryText += ` AND game_type = $${params.length + 1}`;
            params.push(gameType);
        }

        queryText += ' ORDER BY table_number';

        const result = await query(queryText, params);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get tables error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tables.',
            error: error.message
        });
    }
};

// Get available tables
const getAvailableTables = async (req, res) => {
    try {
        const { gameType } = req.query;

        let queryText = `
            SELECT table_id, table_number, game_type, minimum_bet, maximum_bet, capacity
            FROM CASINO_TABLE
            WHERE status = 'AVAILABLE'
        `;
        const params = [];

        if (gameType) {
            queryText += ` AND game_type = $${params.length + 1}`;
            params.push(gameType);
        }

        queryText += ' ORDER BY minimum_bet, table_number';

        const result = await query(queryText, params);

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get available tables error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch available tables.',
            error: error.message
        });
    }
};

// Get table details
const getTable = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT table_id, table_number, game_type, minimum_bet, maximum_bet, 
                    status, capacity, created_at, updated_at
             FROM CASINO_TABLE
             WHERE table_id = $1`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Table not found.'
            });
        }

        // Get current game at table
        const gameResult = await query(
            `SELECT game_id, game_type, start_time, status, dealer_id,
                    d.name as dealer_name
             FROM GAME g
             JOIN DEALER d ON g.dealer_id = d.dealer_id
             WHERE g.table_id = $1 AND g.status = 'ACTIVE'`,
            [id]
        );

        res.json({
            success: true,
            data: {
                table: result.rows[0],
                currentGame: gameResult.rows[0] || null
            }
        });
    } catch (error) {
        console.error('Get table error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch table.',
            error: error.message
        });
    }
};

// Create a new table (Manager only)
const createTable = async (req, res) => {
    try {
        const { tableNumber, gameType, minimumBet, maximumBet, capacity = 7 } = req.body;

        const result = await query(
            `INSERT INTO CASINO_TABLE (table_number, game_type, minimum_bet, maximum_bet, capacity, status)
             VALUES ($1, $2, $3, $4, $5, 'AVAILABLE')
             RETURNING *`,
            [tableNumber, gameType, minimumBet, maximumBet, capacity]
        );

        res.status(201).json({
            success: true,
            message: 'Table created successfully!',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Create table error:', error);
        
        if (error.code === '23505') { // Unique violation
            return res.status(409).json({
                success: false,
                message: 'Table number already exists.'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create table.',
            error: error.message
        });
    }
};

// Update table status (Manager only)
const updateTableStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const result = await query(
            `UPDATE CASINO_TABLE
             SET status = $1
             WHERE table_id = $2
             RETURNING *`,
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Table not found.'
            });
        }

        res.json({
            success: true,
            message: 'Table status updated successfully!',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update table status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update table status.',
            error: error.message
        });
    }
};

module.exports = {
    getTables,
    getAvailableTables,
    getTable,
    createTable,
    updateTableStatus
};
