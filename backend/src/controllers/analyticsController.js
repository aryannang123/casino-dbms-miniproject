/**
 * Analytics & Vector Controller
 * 
 * Bridges Express REST routes with MongoDB document models and Vector store.
 * Supports:
 * - High throughput game event streaming
 * - Aggregated daily & hourly telemetry
 * - Vector similarity search (Cosine similarity k-NN) for AI game recommendations
 */

'use strict';

const {
    isMongoConnected,
    connectMongoDB,
    GameLog,
    PlayerActivity,
    CasinoAnalytics,
    GameVectorEmbedding,
    PlayerPreferenceVector,
    cosineSimilarity
} = require('../config/mongodb');

async function requireMongo() {
    if (!isMongoConnected()) {
        try {
            await connectMongoDB();
        } catch (e) {
            const err = new Error('MongoDB is not available. Analytics and Vector features are currently offline.');
            err.statusCode = 503;
            throw err;
        }
    }
}

// =====================================================
// 1. Game Event Logging
// =====================================================
async function logGameEvent(gameId, eventType, details = {}, opts = {}) {
    await requireMongo();

    if (!gameId || !eventType) {
        const err = new Error('gameId and eventType are required.');
        err.statusCode = 400;
        throw err;
    }

    const newEvent = {
        type: eventType,
        playerId: opts.playerId ?? null,
        amount: opts.amount ?? 0,
        timestamp: new Date(),
        details
    };

    const doc = await GameLog.findOneAndUpdate(
        { gameId },
        {
            $setOnInsert: {
                gameType:     opts.gameType     ?? 'OTHER',
                tableNumber:  opts.tableNumber  ?? 'TABLE-01',
                dealerName:   opts.dealerName   ?? null,
                startTime:    new Date(),
                status:       'ACTIVE'
            },
            $push: { events: newEvent },
            $inc: {
                totalBets:    eventType === 'BET_PLACED' ? 1 : 0,
                totalWagered: eventType === 'BET_PLACED' ? (opts.amount ?? 0) : 0,
                totalPayout:  eventType === 'PAYOUT_ISSUED' ? (opts.amount ?? 0) : 0
            }
        },
        { upsert: true, new: true }
    );

    doc.houseProfit = doc.totalWagered - doc.totalPayout;
    await doc.save();
    return doc;
}

async function getGameAnalytics(gameId) {
    await requireMongo();
    return GameLog.findOne({ gameId }).lean();
}

async function getDailyAnalytics(dateString) {
    await requireMongo();
    const date = new Date(dateString);
    const start = new Date(date.setUTCHours(0, 0, 0, 0));
    const end   = new Date(date.setUTCHours(23, 59, 59, 999));

    return CasinoAnalytics.findOne({
        date: { $gte: start, $lte: end }
    }).lean();
}

async function getPlayerActivity(playerId) {
    await requireMongo();
    return PlayerActivity.findOne({ playerId }).lean();
}

async function updateDailyAnalytics() {
    await requireMongo();
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    const [agg] = await GameLog.aggregate([
        {
            $match: {
                startTime: { $gte: todayStart, $lt: todayEnd },
                status: { $in: ['COMPLETED', 'ACTIVE'] }
            }
        },
        {
            $group: {
                _id: null,
                dailyRevenue: { $sum: '$houseProfit' },
                dailyPlayers: { $addToSet: '$events.playerId' }
            }
        }
    ]);

    const gameTypeStats = await GameLog.aggregate([
        {
            $match: {
                startTime: { $gte: todayStart, $lt: todayEnd }
            }
        },
        {
            $group: {
                _id: '$gameType',
                gamesPlayed: { $sum: 1 },
                revenue:     { $sum: '$houseProfit' },
                playerCount: { $sum: '$playersCount' }
            }
        },
        {
            $project: {
                _id: 0,
                gameType: '$_id',
                gamesPlayed: 1,
                revenue: { $round: ['$revenue', 2] },
                playerCount: 1
            }
        }
    ]);

    const updatedDoc = await CasinoAnalytics.findOneAndUpdate(
        { date: { $gte: todayStart, $lt: todayEnd } },
        {
            $set: {
                date: todayStart,
                gameTypeStats,
                dailyRevenue: parseFloat(((agg?.dailyRevenue) ?? 0).toFixed(2)),
                dailyPlayers: agg?.dailyPlayers?.length || 0,
                peakHour: 20
            }
        },
        { new: true, upsert: true }
    );

    return updatedDoc;
}

// =====================================================
// 2. Vector Database Feature Implementation
// =====================================================

/**
 * Get all stored game vector embeddings
 */
async function getAllGameVectors() {
    await requireMongo();
    return GameVectorEmbedding.find({}).lean();
}

/**
 * Cosine similarity search across game embeddings for a query vector
 */
async function searchVectorRecommendations(targetVector, topK = 3) {
    await requireMongo();
    const allGames = await GameVectorEmbedding.find({}).lean();

    const scored = allGames.map(game => ({
        gameType: game.gameType,
        title: game.title,
        description: game.description,
        vector: game.vector,
        metadata: game.metadata,
        similarityScore: parseFloat(cosineSimilarity(targetVector, game.vector).toFixed(4))
    }));

    scored.sort((a, b) => b.similarityScore - a.similarityScore);
    return scored.slice(0, topK);
}

/**
 * Get or compute player recommendations using their stored preference vector
 */
async function getPlayerRecommendations(playerId) {
    await requireMongo();
    let pref = await PlayerPreferenceVector.findOne({ playerId }).lean();
    if (!pref) {
        // Fallback default balanced preference vector
        pref = {
            playerId,
            preferenceVector: [0.5, 0.02, 0.5, 0.5, 0.5],
            riskTolerance: 'BALANCED'
        };
    }

    const recommendations = await searchVectorRecommendations(pref.preferenceVector, 4);
    return {
        playerId,
        preferenceVector: pref.preferenceVector,
        riskTolerance: pref.riskTolerance,
        recommendations
    };
}

/**
 * Upsert game vector embedding (Vector CREATE/UPDATE)
 */
async function upsertGameVector(gameType, data) {
    await requireMongo();
    return GameVectorEmbedding.findOneAndUpdate(
        { gameType },
        { $set: data },
        { upsert: true, new: true }
    );
}

/**
 * Delete game vector embedding (Vector DELETE)
 */
async function deleteGameVector(gameType) {
    await requireMongo();
    return GameVectorEmbedding.deleteOne({ gameType });
}

module.exports = {
    requireMongo,
    logGameEvent,
    getGameAnalytics,
    getDailyAnalytics,
    getPlayerActivity,
    updateDailyAnalytics,
    // Vector operations
    getAllGameVectors,
    searchVectorRecommendations,
    getPlayerRecommendations,
    upsertGameVector,
    deleteGameVector
};
