const { query, callProcedure } = require('../config/database');

// Get wallet balance
const getWallet = async (req, res) => {
    try {
        const playerId = req.user.playerId;

        const result = await query(
            `SELECT wallet_id, player_id, balance, last_updated
             FROM WALLET
             WHERE player_id = ?`,
            [playerId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Wallet not found.'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get wallet error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch wallet.',
            error: error.message
        });
    }
};

// Deposit funds
const deposit = async (req, res) => {
    try {
        const { amount, description = 'Deposit' } = req.body;
        const playerId = req.user.playerId;

        // Call stored procedure
        const result = await callProcedure('deposit_funds', [playerId, amount, description]);

        const depositResult = result.rows[0];

        res.json({
            success: true,
            message: 'Deposit successful!',
            data: {
                walletId: depositResult.wallet_id,
                newBalance: depositResult.new_balance,
                transactionId: depositResult.transaction_id,
                amount
            }
        });
    } catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({
            success: false,
            message: 'Deposit failed. Please try again.',
            error: error.message
        });
    }
};

// Withdraw funds
const withdraw = async (req, res) => {
    try {
        const { amount, description = 'Withdrawal' } = req.body;
        const playerId = req.user.playerId;

        // Call stored procedure
        const result = await callProcedure('withdraw_funds', [playerId, amount, description]);

        const withdrawResult = result.rows[0];

        res.json({
            success: true,
            message: 'Withdrawal successful!',
            data: {
                walletId: withdrawResult.wallet_id,
                newBalance: withdrawResult.new_balance,
                transactionId: withdrawResult.transaction_id,
                amount
            }
        });
    } catch (error) {
        console.error('Withdrawal error:', error);
        
        if (error.message.includes('Insufficient balance')) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance for withdrawal.',
                error: error.message
            });
        }

        res.status(500).json({
            success: false,
            message: 'Withdrawal failed. Please try again.',
            error: error.message
        });
    }
};

// Get transaction history
const getTransactions = async (req, res) => {
    try {
        const playerId = req.user.playerId;
        const { page = 1, limit = 20, type } = req.query;
        const offset = (page - 1) * limit;

        // Get wallet ID
        const walletResult = await query(
            'SELECT wallet_id FROM WALLET WHERE player_id = ?',
            [playerId]
        );

        if (walletResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Wallet not found.'
            });
        }

        const walletId = walletResult.rows[0].wallet_id;

        let queryText = `
            SELECT transaction_id, transaction_type, amount, timestamp,
                   description, reference_id, balance_before, balance_after
            FROM TRANSACTION
            WHERE wallet_id = ?
        `;
        const params = [walletId];

        // Filter by transaction type if provided
        if (type) {
            queryText += ` AND transaction_type = ?`;
            params.push(type);
        }

        queryText += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`;
        params.push(parseInt(limit), offset);

        const result = await query(queryText, params);

        // Get total count
        let countQuery = 'SELECT COUNT(*) as count FROM TRANSACTION WHERE wallet_id = ?';
        const countParams = [walletId];
        if (type) {
            countQuery += ' AND transaction_type = ?';
            countParams.push(type);
        }
        const countResult = await query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);

        res.json({
            success: true,
            data: {
                transactions: result.rows,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total,
                    pages: Math.ceil(total / limit)
                }
            }
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch transactions.',
            error: error.message
        });
    }
};

module.exports = {
    getWallet,
    deposit,
    withdraw,
    getTransactions
};
