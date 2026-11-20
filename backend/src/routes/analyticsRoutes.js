/**
 * Analytics & Vector Routes
 * 
 * Supports:
 * - GET  /api/analytics/daily/:date        - Daily aggregated stats
 * - GET  /api/analytics/game/:gameId       - Full game log with event stream
 * - GET  /api/analytics/player/:playerId   - Player activity tracking
 * - POST /api/analytics/game/:gameId/event - Append game event
 * - POST /api/analytics/daily/refresh      - Recompute analytics
 * - GET  /api/analytics/vectors            - All game vector embeddings
 * - POST /api/analytics/vectors/recommend  - Cosine similarity k-NN search
 * - GET  /api/analytics/vectors/player/:id - Tailored vector recommendations
 * - POST /api/analytics/vectors/game       - Create/Update vector embedding
 * - DELETE /api/analytics/vectors/game/:gt - Delete vector embedding
 */

'use strict';

const express = require('express');
const router  = express.Router();

const { authenticate, authorize } = require('../middleware/auth');

const {
    logGameEvent,
    getGameAnalytics,
    getDailyAnalytics,
    getPlayerActivity,
    updateDailyAnalytics,
    getAllGameVectors,
    searchVectorRecommendations,
    getPlayerRecommendations,
    upsertGameVector,
    deleteGameVector
} = require('../controllers/analyticsController');

function handleError(res, err) {
    const status = err.statusCode || 500;
    const message = err.message || 'An unexpected error occurred.';
    return res.status(status).json({ success: false, message });
}

// =====================================================
// Casino Financial & Operations Overview (for Admin Dashboard)
// =====================================================
router.get('/overview', authenticate, async (req, res) => {
    try {
        const { query } = require('../config/database');

        // 1. Overall casino financials
        const financialResult = await query(`
            SELECT 
                COUNT(b.bet_id) as total_bets,
                COALESCE(SUM(b.amount), 0) as total_wagered,
                COALESCE(SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END), 0) as total_payouts,
                COALESCE(SUM(b.amount), 0) - COALESCE(SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END), 0) as net_profit
            FROM BET b
        `);

        // 2. Active games right now
        const activeGamesResult = await query(`
            SELECT g.game_id, g.game_type, g.status, g.start_time,
                   ct.table_number, ct.minimum_bet, ct.maximum_bet,
                   d.name as dealer_name,
                   (SELECT COUNT(*) FROM BET b WHERE b.game_id = g.game_id) as bets_count,
                   (SELECT COALESCE(SUM(b.amount), 0) FROM BET b WHERE b.game_id = g.game_id) as total_wagered
            FROM GAME g
            JOIN CASINO_TABLE ct ON g.table_id = ct.table_id
            JOIN DEALER d ON g.dealer_id = d.dealer_id
            WHERE g.status = 'ACTIVE'
            ORDER BY g.start_time DESC
        `);

        // 3. Game counts
        const gameStatsResult = await query(`
            SELECT 
                COUNT(*) as total_games,
                SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_games,
                SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_games
            FROM GAME
        `);

        // 4. Revenue breakdown by game variant
        const variantResult = await query(`
            SELECT 
                g.game_type,
                COUNT(DISTINCT g.game_id) as games_count,
                COUNT(b.bet_id) as bets_count,
                COALESCE(SUM(b.amount), 0) as total_wagered,
                COALESCE(SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END), 0) as total_payouts,
                COALESCE(SUM(b.amount), 0) - COALESCE(SUM(CASE WHEN b.outcome = 'WON' THEN b.payout ELSE 0 END), 0) as house_profit
            FROM GAME g
            LEFT JOIN BET b ON g.game_id = b.game_id
            GROUP BY g.game_type
            ORDER BY house_profit DESC
        `);

        // 5. Total players
        const playersResult = await query(`
            SELECT COUNT(*) as total_players,
                   SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active_players
            FROM PLAYER
        `);

        return res.json({
            success: true,
            data: {
                financials: financialResult.rows[0],
                gameStats: gameStatsResult.rows[0],
                activeGames: activeGamesResult.rows,
                variants: variantResult.rows,
                players: playersResult.rows[0]
            }
        });
    } catch (err) {
        return handleError(res, err);
    }
});

// =====================================================
// Get all game logs (NoSQL document store)
router.get('/games/all', authenticate, async (req, res) => {
    try {
        const { requireMongo } = require('../controllers/analyticsController');
        await requireMongo();
        const { GameLog } = require('../config/mongodb');
        const logs = await GameLog.find({}).sort({ gameId: -1 }).limit(50).lean();
        return res.json({ success: true, data: logs });
    } catch (err) {
        return handleError(res, err);
    }
});

// Daily & Game Event Analytics
// =====================================================
router.get('/daily/:date', authenticate, async (req, res) => {
    try {
        const data = await getDailyAnalytics(req.params.date);
        return res.json({ success: true, data: data || { message: 'No records for this date.' } });
    } catch (err) {
        return handleError(res, err);
    }
});

router.get('/game/:gameId', authenticate, async (req, res) => {
    try {
        const gameId = parseInt(req.params.gameId, 10);
        const data = await getGameAnalytics(gameId);
        return res.json({ success: true, data: data || { message: 'Game log not found.' } });
    } catch (err) {
        return handleError(res, err);
    }
});

router.get('/player/:playerId', authenticate, async (req, res) => {
    try {
        const playerId = parseInt(req.params.playerId, 10);
        const data = await getPlayerActivity(playerId);
        return res.json({ success: true, data: data || { message: 'Player activity not found.' } });
    } catch (err) {
        return handleError(res, err);
    }
});

router.post('/game/:gameId/event', authenticate, async (req, res) => {
    try {
        const gameId = parseInt(req.params.gameId, 10);
        const { eventType, amount, details, gameType, tableNumber, dealerName } = req.body;

        const doc = await logGameEvent(gameId, eventType, details || {}, {
            playerId: req.user.playerId,
            amount: amount ?? 0,
            gameType: gameType ?? 'OTHER',
            tableNumber: tableNumber ?? 'TABLE-01',
            dealerName: dealerName ?? null
        });

        return res.status(201).json({
            success: true,
            message: 'Event logged successfully in NoSQL store.',
            data: doc
        });
    } catch (err) {
        return handleError(res, err);
    }
});

router.post('/daily/refresh', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        const doc = await updateDailyAnalytics();
        return res.json({ success: true, message: "Analytics recalculated.", data: doc });
    } catch (err) {
        return handleError(res, err);
    }
});

// =====================================================
// Vector Database Endpoints (Embeddings & Cosine Search)
// =====================================================

// Get all vector embeddings
router.get('/vectors', authenticate, async (req, res) => {
    try {
        const vectors = await getAllGameVectors();
        return res.json({ success: true, data: vectors });
    } catch (err) {
        return handleError(res, err);
    }
});

// Vector k-NN Search: Recommend games for a given preference vector
router.post('/vectors/recommend', authenticate, async (req, res) => {
    try {
        const { vector, topK } = req.body;
        if (!Array.isArray(vector) || vector.length !== 5) {
            return res.status(400).json({
                success: false,
                message: 'Query vector must be an array of 5 numeric dimensions: [risk, houseEdge, pace, skill, social]'
            });
        }

        const recommendations = await searchVectorRecommendations(vector, topK || 3);
        return res.json({
            success: true,
            data: {
                queryVector: vector,
                matches: recommendations
            }
        });
    } catch (err) {
        return handleError(res, err);
    }
});

// Personalized vector recommendations for a specific player
router.get('/vectors/player/:playerId', authenticate, async (req, res) => {
    try {
        const playerId = parseInt(req.params.playerId, 10);
        const data = await getPlayerRecommendations(playerId);
        return res.json({ success: true, data });
    } catch (err) {
        return handleError(res, err);
    }
});

// Create or update a game vector embedding (Admin only)
router.post('/vectors/game', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        const { gameType, title, description, vector, metadata } = req.body;
        if (!gameType || !Array.isArray(vector) || vector.length !== 5) {
            return res.status(400).json({ success: false, message: 'Invalid vector data or dimensions.' });
        }

        const doc = await upsertGameVector(gameType, { gameType, title, description, vector, metadata });
        return res.status(201).json({ success: true, message: 'Game vector embedding stored.', data: doc });
    } catch (err) {
        return handleError(res, err);
    }
});

// Delete a game vector embedding (Admin only)
router.delete('/vectors/game/:gameType', authenticate, authorize('ADMIN'), async (req, res) => {
    try {
        const result = await deleteGameVector(req.params.gameType);
        return res.json({ success: true, message: `Vector embedding deleted.`, result });
    } catch (err) {
        return handleError(res, err);
    }
});

module.exports = router;
