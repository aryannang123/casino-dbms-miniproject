const { query } = require('../config/database');

// Get all games
const getGames = async (req, res) => {
    try {
        const { status, gameType, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;

        let queryText = `
            SELECT g.game_id, g.table_id, g.dealer_id, g.game_type, 
                   g.start_time, g.end_time, g.status,
                   ct.table_number, ct.minimum_bet, ct.maximum_bet,
                   d.name as dealer_name
            FROM GAME g
            JOIN CASINO_TABLE ct ON g.table_id = ct.table_id
            JOIN DEALER d ON g.dealer_id = d.dealer_id
            WHERE 1=1
        `;
        const params = [];

        if (status) {
            queryText += ` AND g.status = ?`;
            params.push(status);
        }

        if (gameType) {
            queryText += ` AND g.game_type = ?`;
            params.push(gameType);
        }

        queryText += ` ORDER BY g.start_time DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const result = await query(queryText, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as count FROM GAME g WHERE 1=1';
        const countParams = [];
        if (status) {
            countQuery += ` AND g.status = ?`;
            countParams.push(status);
        }
        if (gameType) {
            countQuery += ` AND g.game_type = ?`;
            countParams.push(gameType);
        }
        const countResult = await query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        res.json({
            success: true,
            data: {
                games: result.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get games error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch games.',
            error: error.message
        });
    }
};

// Get game details
const getGame = async (req, res) => {
    try {
        const { id } = req.params;

        const result = await query(
            `SELECT g.game_id, g.game_type, ct.table_number, ct.minimum_bet, ct.maximum_bet,
                    d.name as dealer_name, g.start_time, g.end_time, g.status
             FROM GAME g
             JOIN CASINO_TABLE ct ON g.table_id = ct.table_id
             JOIN DEALER d ON g.dealer_id = d.dealer_id
             WHERE g.game_id = ?`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Game not found.'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get game error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch game.',
            error: error.message
        });
    }
};

// Create a new game (Dealer only)
const createGame = async (req, res) => {
    try {
        const { tableId, dealerId, gameType } = req.body;

        const result = await query(
            'CALL create_game(?, ?, ?)',
            [tableId, dealerId, gameType]
        );

        const gameResult = result.rows[0];
        const newGameId = gameResult.game_id;

        // Async sync to MongoDB GameLog
        (async () => {
            try {
                const { logGameEvent } = require('./analyticsController');
                const tRes = await query('SELECT table_number FROM CASINO_TABLE WHERE table_id = ?', [tableId]);
                const dRes = await query('SELECT name FROM DEALER WHERE dealer_id = ?', [dealerId]);
                await logGameEvent(newGameId, 'GAME_STARTED', {
                    tableId,
                    dealerId,
                    gameType
                }, {
                    gameType,
                    tableNumber: tRes.rows[0]?.table_number || `TABLE-${tableId}`,
                    dealerName: dRes.rows[0]?.name || 'Dealer'
                });
            } catch (mongoErr) {
                console.warn('MongoDB game creation log warning:', mongoErr.message);
            }
        })();

        res.status(201).json({
            success: true,
            message: gameResult.message,
            data: {
                gameId: newGameId,
                tableId,
                dealerId,
                gameType
            }
        });
    } catch (error) {
        console.error('Create game error:', error);
        
        if (error.sqlMessage) {
            return res.status(400).json({
                success: false,
                message: error.sqlMessage,
                error: error.sqlMessage
            });
        }

        if (error.message.includes('not available') || error.message.includes('not active')) {
            return res.status(400).json({
                success: false,
                message: 'Cannot create game with current settings.',
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Failed to create game.',
            error: error.message
        });
    }
};

// End a game (Dealer only)
const endGame = async (req, res) => {
    try {
        const { id } = req.params;
        const { status = 'COMPLETED' } = req.body;

        const result = await query(
            'CALL end_game(?, ?)',
            [id, status]
        );

        const endResult = result.rows[0];

        // Async sync to MongoDB GameLog
        (async () => {
            try {
                const { logGameEvent } = require('./analyticsController');
                const { GameLog } = require('../config/mongodb');
                await logGameEvent(parseInt(id, 10), 'GAME_ENDED', { status });
                await GameLog.findOneAndUpdate(
                    { gameId: parseInt(id, 10) },
                    { status, endTime: new Date() }
                );
            } catch (mongoErr) {
                console.warn('MongoDB game end log warning:', mongoErr.message);
            }
        })();

        res.json({
            success: true,
            message: endResult?.message || 'Game ended successfully',
            data: {
                gameId: endResult?.game_id || id,
                pendingBets: endResult?.pending_bets || 0,
                status
            }
        });
    } catch (error) {
        console.error('End game error:', error);
        
        if (error.sqlMessage) {
            return res.status(400).json({
                success: false,
                message: error.sqlMessage,
                error: error.sqlMessage
            });
        }

        if (error.message && error.message.includes('not active')) {
            return res.status(400).json({
                success: false,
                message: 'Game is not active.',
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: error.message || 'Failed to end game.',
            error: error.message
        });
    }
};

// Get game bets
const getGameBets = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        const result = await query(
            `SELECT b.bet_id, b.player_id, p.name as player_name, 
                    b.amount, b.bet_type, b.outcome, b.payout, b.bet_time
             FROM BET b
             JOIN PLAYER p ON b.player_id = p.player_id
             WHERE b.game_id = ?
             ORDER BY b.bet_time DESC
             LIMIT ? OFFSET ?`,
            [id, parseInt(limit), offset]
        );

        const countResult = await query(
            'SELECT COUNT(*) as count FROM BET WHERE game_id = ?',
            [id]
        );
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
        console.error('Get game bets error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch game bets.',
            error: error.message
        });
    }
};

// Get all dealers (Active)
const getDealers = async (req, res) => {
    try {
        const result = await query(
            'SELECT dealer_id, name, employee_id, status FROM DEALER WHERE status = "ACTIVE" ORDER BY name ASC'
        );
        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get dealers error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch dealers.',
            error: error.message
        });
    }
};

module.exports = {
    getGames,
    getGame,
    createGame,
    endGame,
    getGameBets,
    getDealers
};
