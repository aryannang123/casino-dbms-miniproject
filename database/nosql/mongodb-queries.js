/**
 * MongoDB Queries & Vector RUD Demo - Casino DBMS
 * 
 * Demonstrates:
 * - Criteria 2: "NoSQL/Vector database creation (4)"
 * - Criteria 4: "NoSQL/Vector feature RUD (7)"
 * 
 * Includes:
 * 1. Document READ: Filters, projections, date ranges, aggregation pipelines
 * 2. Document UPDATE: Event appending, atomic increments ($inc, $push, $set)
 * 3. Document DELETE: TTL/expiration cleanup, archiving
 * 4. Vector CREATE: Generate & insert dense embeddings
 * 5. Vector READ: K-Nearest Neighbor (k-NN) Cosine Similarity Search for AI Recommendation
 * 6. Vector UPDATE: Dynamic preference vector re-weighting based on recent play
 * 7. Vector DELETE: Vector index pruning
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../backend/.env') });

const mongoose = require('mongoose');
const {
    GameLog,
    PlayerActivity,
    CasinoAnalytics,
    GameVectorEmbedding,
    PlayerPreferenceVector,
    cosineSimilarity
} = require('./mongodb-schema');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/casino_analytics';

function section(title) {
    console.log(`\n========================================================`);
    console.log(`  ${title}`);
    console.log(`========================================================`);
}

async function connect() {
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
}

// =====================================================
// PART 1: NoSQL Document READ Operations
// =====================================================

// READ-1: Date range & game type filtering with projection
async function readGameLogs(from, to, gameType = null) {
    section(`READ-1: Find Game Logs (${from.toISOString().slice(0,10)} to ${to.toISOString().slice(0,10)})`);
    const filter = { startTime: { $gte: from, $lte: to } };
    if (gameType) filter.gameType = gameType;

    const docs = await GameLog.find(filter)
        .select('gameId gameType tableNumber totalWagered houseProfit status events')
        .sort({ startTime: -1 })
        .lean();

    console.log(`Found ${docs.length} matching game logs:`);
    docs.forEach(d => {
        console.log(` - Game #${d.gameId} [${d.gameType}] Table: ${d.tableNumber} | Wagered: $${d.totalWagered} | Profit: $${d.houseProfit} | Events: ${d.events?.length || 0}`);
    });
    return docs;
}

// READ-2: Aggregation Pipeline - Daily Revenue Breakdown by Game Type
async function aggregateRevenueByGameType() {
    section(`READ-2: MongoDB Aggregation Pipeline - Revenue by Game Type`);

    const result = await GameLog.aggregate([
        { $match: { status: { $in: ['COMPLETED', 'ACTIVE'] } } },
        {
            $group: {
                _id: '$gameType',
                totalSessions: { $sum: 1 },
                totalWagered: { $sum: '$totalWagered' },
                totalPayout: { $sum: '$totalPayout' },
                netCasinoProfit: { $sum: '$houseProfit' },
                avgBetsPerSession: { $avg: '$totalBets' }
            }
        },
        { $sort: { netCasinoProfit: -1 } }
    ]);

    console.table(result.map(r => ({
        GameType: r._id,
        Sessions: r.totalSessions,
        Wagered: `$${r.totalWagered.toFixed(2)}`,
        Payout: `$${r.totalPayout.toFixed(2)}`,
        NetProfit: `$${r.netCasinoProfit.toFixed(2)}`,
        AvgBets: r.avgBetsPerSession.toFixed(1)
    })));
    return result;
}

// =====================================================
// PART 2: NoSQL Document UPDATE Operations
// =====================================================

// UPDATE-1: Push atomic in-game event and increment wager counters
async function updateGameLogAppendEvent(gameId, event) {
    section(`UPDATE-1: Append Event & Atomically Update Game #${gameId}`);

    const updated = await GameLog.findOneAndUpdate(
        { gameId },
        {
            $push: { events: event },
            $inc: {
                totalBets: event.type === 'BET_PLACED' ? 1 : 0,
                totalWagered: event.type === 'BET_PLACED' ? event.amount : 0
            },
            $set: { updatedAt: new Date() }
        },
        { new: true }
    );

    console.log(`Updated GameLog #${gameId}. Total Events: ${updated?.events.length}, Total Wagered: $${updated?.totalWagered}`);
    return updated;
}

// UPDATE-2: Update Player Activity Session Time & Last Seen
async function updatePlayerActivity(playerId, sessionMinutesDelta) {
    section(`UPDATE-2: Update Player #${playerId} Session Metrics`);

    const updated = await PlayerActivity.findOneAndUpdate(
        { playerId },
        {
            $set: { lastSeen: new Date() },
            $inc: {
                sessionCount: 1,
                totalSessionTime: sessionMinutesDelta
            },
            $push: {
                activityLog: {
                    action: 'GAME_JOIN',
                    timestamp: new Date(),
                    details: { durationAdded: sessionMinutesDelta }
                }
            }
        },
        { new: true }
    );

    console.log(`Player #${playerId} updated: SessionCount=${updated?.sessionCount}, TotalTime=${updated?.totalSessionTime} mins`);
    return updated;
}

// =====================================================
// PART 3: NoSQL Document DELETE Operations
// =====================================================

// DELETE-1: Delete / Prune archived logs older than N days
async function deleteOldGameLogs(daysThreshold = 90) {
    section(`DELETE-1: Clean Archived Game Logs Older Than ${daysThreshold} Days`);

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysThreshold);

    const result = await GameLog.deleteMany({
        status: 'ARCHIVED',
        endTime: { $lt: cutoff }
    });

    console.log(`Deleted ${result.deletedCount} expired archived game log documents.`);
    return result;
}

// =====================================================
// PART 4: Vector Database Feature RUD (Criteria 4 & 9)
// =====================================================

/**
 * VECTOR CREATE: Insert high-dimensional game feature vector
 */
async function vectorCreateGameEmbedding(gameData) {
    section(`VECTOR CREATE: Insert 5-D Feature Vector for "${gameData.gameType}"`);

    const doc = await GameVectorEmbedding.findOneAndUpdate(
        { gameType: gameData.gameType },
        gameData,
        { upsert: true, new: true }
    );

    console.log(`Vector Embedding created for [${doc.gameType}]`);
    console.log(`Dimensions: ${doc.vector.length} -> [${doc.vector.join(', ')}]`);
    return doc;
}

/**
 * VECTOR READ: K-Nearest Neighbor (k-NN) Cosine Similarity Search
 * Finds the top K games matching a target preference vector.
 */
async function vectorSearchRecommendations(targetVector, topK = 3) {
    section(`VECTOR READ (k-NN Search): Top ${topK} Recommended Games`);
    console.log(`Target Preference Vector: [${targetVector.join(', ')}]`);

    const allGames = await GameVectorEmbedding.find({}).lean();

    // Compute Cosine Similarity between target query vector and each stored game vector
    const scoredGames = allGames.map(game => {
        const score = cosineSimilarity(targetVector, game.vector);
        return {
            gameType: game.gameType,
            title: game.title,
            similarityScore: parseFloat(score.toFixed(4)),
            vector: game.vector,
            category: game.metadata?.category,
            tags: game.metadata?.tags
        };
    });

    // Sort by cosine similarity descending
    scoredGames.sort((a, b) => b.similarityScore - a.similarityScore);
    const topResults = scoredGames.slice(0, topK);

    console.log(`\nTop ${topK} Vector Search Matches:`);
    topResults.forEach((match, idx) => {
        console.log(` ${idx + 1}. ${match.title} (${match.gameType}) - Match: ${(match.similarityScore * 100).toFixed(1)}% (Cosine Score: ${match.similarityScore})`);
        console.log(`    Tags: [${match.tags?.join(', ')}] | Vector: [${match.vector.join(', ')}]`);
    });

    return topResults;
}

/**
 * VECTOR UPDATE: Dynamically adjust player preference vector
 * Adapts based on player's recent game choices (Machine Learning Feedback Loop)
 */
async function vectorUpdatePlayerPreference(playerId, recentGameVector, learningRate = 0.2) {
    section(`VECTOR UPDATE: Adapt Player #${playerId} Preference Vector`);

    const playerProfile = await PlayerPreferenceVector.findOne({ playerId });
    if (!playerProfile) {
        console.log(`Player preference vector not found.`);
        return null;
    }

    const currentVec = playerProfile.preferenceVector;
    // Exponential moving average update: V_new = (1 - alpha) * V_old + alpha * V_game
    const newVec = currentVec.map((val, i) =>
        parseFloat(((1 - learningRate) * val + learningRate * recentGameVector[i]).toFixed(4))
    );

    // Recompute recommendations
    const allGames = await GameVectorEmbedding.find({}).lean();
    const updatedRecommendations = allGames.map(g => ({
        gameType: g.gameType,
        similarityScore: parseFloat(cosineSimilarity(newVec, g.vector).toFixed(4))
    })).sort((a, b) => b.similarityScore - a.similarityScore);

    playerProfile.preferenceVector = newVec;
    playerProfile.recommendedGames = updatedRecommendations;
    await playerProfile.save();

    console.log(`Old Vector: [${currentVec.join(', ')}]`);
    console.log(`New Vector: [${newVec.join(', ')}]`);
    console.log(`Top New Recommendation: ${updatedRecommendations[0].gameType} (${(updatedRecommendations[0].similarityScore * 100).toFixed(1)}%)`);
    return playerProfile;
}

/**
 * VECTOR DELETE: Remove a vector embedding by game type
 */
async function vectorDeleteEmbedding(gameType) {
    section(`VECTOR DELETE: Prune Vector Embedding for [${gameType}]`);

    const result = await GameVectorEmbedding.deleteOne({ gameType });
    console.log(`Deleted embedding for ${gameType}. DeletedCount: ${result.deletedCount}`);
    return result;
}

// =====================================================
// Main Execution Runner
// =====================================================
async function runDemos() {
    console.log('========================================================');
    console.log('Casino DBMS - NoSQL & Vector Feature Demonstration (RUD)');
    console.log('========================================================');

    try {
        await connect();

        // 1. Read
        const now = new Date();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
        await readGameLogs(thirtyDaysAgo, now);
        await aggregateRevenueByGameType();

        // 2. Update
        await updateGameLogAppendEvent(1, {
            type: 'BET_PLACED',
            playerId: 1,
            amount: 75.00,
            details: { hand: 'Split Aces' }
        });
        await updatePlayerActivity(1, 45);

        // 3. Vector RUD
        // Vector CREATE
        await vectorCreateGameEmbedding({
            gameType: 'SLOTS',
            title: 'Mega Fortune Slots Deluxe',
            description: 'Ultra fast action with high volatility progressive jackpot',
            vector: [0.85, 0.055, 0.95, 0.05, 0.10],
            metadata: { minBetDefault: 1, maxBetDefault: 200, category: 'Electronic', tags: ['jackpot', 'fast'] }
        });

        // Vector READ (Cosine Similarity search for a High-Risk / High-Pace Player)
        const aggressiveGamerVector = [0.80, 0.04, 0.90, 0.20, 0.30];
        await vectorSearchRecommendations(aggressiveGamerVector, 3);

        // Vector UPDATE (Adapt player 1 preference)
        await vectorUpdatePlayerPreference(1, [0.70, 0.025, 0.30, 0.95, 0.90]);

        // 4. Delete
        await deleteOldGameLogs(180);

        console.log('\nAll NoSQL & Vector RUD demonstrations completed successfully!');
    } catch (err) {
        console.error('Demo error:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.\n');
    }
}

if (require.main === module) {
    runDemos();
}

module.exports = {
    readGameLogs,
    aggregateRevenueByGameType,
    updateGameLogAppendEvent,
    updatePlayerActivity,
    deleteOldGameLogs,
    vectorCreateGameEmbedding,
    vectorSearchRecommendations,
    vectorUpdatePlayerPreference,
    vectorDeleteEmbedding
};
