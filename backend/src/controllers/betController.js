const { query, callProcedure } = require('../config/database');

// Place a bet
const placeBet = async (req, res) => {
    try {
        const { gameId, amount, betType } = req.body;
        const playerId = req.user.playerId;

        // Call the stored procedure
        const result = await callProcedure('place_bet', [playerId, gameId, amount, betType]);

        const betResult = result.rows[0];

        res.status(201).json({
            success: true,
            message: betResult.message,
            data: {
                betId: betResult.bet_id,
                newBalance: betResult.new_balance,
                amount,
                gameId,
                betType
            }
        });
    } catch (error) {
        console.error('Place bet error:', error);
        
        // Handle specific database errors
        if (error.message.includes('Insufficient balance')) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance. Please deposit funds.',
                error: error.message
            });
        }
        
        if (error.message.includes('not active')) {
            return res.status(400).json({
                success: false,
                message: 'Cannot place bet on this game.',
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to place bet.',
            error: error.message
        });
    }
};

// Get bet details
const getBet = async (req, res) => {
    try {
        const { id } = req.params;
        const playerId = req.user.playerId;

        const result = await query(
            `SELECT b.bet_id, b.player_id, b.game_id, b.amount, b.bet_type, 
                    b.outcome, b.payout, b.bet_time,
                    g.game_type, g.status as game_status,
                    ct.table_number
             FROM BET b
             JOIN GAME g ON b.game_id = g.game_id
             JOIN CASINO_TABLE ct ON g.table_id = ct.table_id
             WHERE b.bet_id = ? AND b.player_id = ?`,
            [id, playerId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Bet not found.'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get bet error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bet.',
            error: error.message
        });
    }
};

// Get player's bet history
const getBetHistory = async (req, res) => {
    try {
        const playerId = req.user.playerId;
        const { page = 1, limit = 20, status } = req.query;
        const offset = (page - 1) * limit;

        let queryText = `
            SELECT b.bet_id, b.game_id, b.amount, b.bet_type, b.outcome, 
                   b.payout, b.bet_time,
                   g.game_type, ct.table_number
            FROM BET b
            JOIN GAME g ON b.game_id = g.game_id
            JOIN CASINO_TABLE ct ON g.table_id = ct.table_id
            WHERE b.player_id = ?
        `;
        const params = [playerId];

        // Filter by outcome if provided
        if (status) {
            queryText += ` AND b.outcome = ?`;
            params.push(status);
        }

        queryText += ` ORDER BY b.bet_time DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const result = await query(queryText, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as count FROM BET WHERE player_id = ?';
        const countParams = [playerId];
        if (status) {
            countQuery += ' AND outcome = ?';
            countParams.push(status);
        }
        const countResult = await query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        res.json({
            success: true,
            data: {
                bets: result.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get bet history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bet history.',
            error: error.message
        });
    }
};

// Settle a bet (Dealer only)
const settleBet = async (req, res) => {
    try {
        const { id } = req.params;
        const { outcome, payout = 0 } = req.body;

        // Call the stored procedure
        const result = await callProcedure('settle_bet', [id, outcome, payout]);

        const settleResult = result.rows[0];

        res.json({
            success: true,
            message: settleResult.message,
            data: {
                betId: settleResult.bet_id,
                playerId: settleResult.player_id,
                newBalance: settleResult.new_balance,
                outcome,
                payout
            }
        });
    } catch (error) {
        console.error('Settle bet error:', error);
        
        if (error.message.includes('already settled')) {
            return res.status(400).json({
                success: false,
                message: 'Bet has already been settled.',
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to settle bet.',
            error: error.message
        });
    }
};

// Get player statistics
const getPlayerStats = async (req, res) => {
    try {
        const playerId = req.user.playerId;

        const result = await callProcedure('get_player_statistics', [playerId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Statistics not found.'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get player stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch statistics.',
            error: error.message
        });
    }
};

module.exports = {
    placeBet,
    getBet,
    getBetHistory,
    settleBet,
    getPlayerStats
};
