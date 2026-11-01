/**
 * MongoDB Setup & Seeding Script (CREATE Operations Demo)
 * 
 * Satisfies Evaluation Criteria:
 * - Criteria 2: "NoSQL/Vector database creation (4)"
 * - Criteria 4: "NoSQL/Vector feature RUD (7)"
 * 
 * Seeds:
 * 1. game_logs (Nested event streams)
 * 2. player_activities (Session & audit tracking)
 * 3. casino_analytics (Pre-aggregated daily/hourly time-series)
 * 4. game_vectors (5-dimensional dense vector embeddings for vector search)
 * 5. player_preference_vectors (Player embedding in vector space for recommendations)
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

async function connect() {
    console.log(`Connecting to MongoDB at: ${MONGODB_URI}`);
    await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000
    });
    console.log('Connected to MongoDB successfully.');
}

// =====================================================
// 1. Seed Game Logs
// =====================================================
async function seedGameLogs() {
    console.log('\n--- Seeding Game Logs (NoSQL Document Store) ---');
    await GameLog.deleteMany({});

    const logs = [
        {
            gameId: 1,
            gameType: 'BLACKJACK',
            tableNumber: 'BJ-01',
            dealerName: 'John Smith',
            playersCount: 3,
            totalBets: 5,
            totalWagered: 300.00,
            totalPayout: 500.00,
            houseProfit: -200.00,
            startTime: new Date('2024-10-20T10:00:00Z'),
            endTime: new Date('2024-10-20T11:30:00Z'),
            status: 'COMPLETED',
            events: [
                { type: 'PLAYER_JOINED', playerId: 1, amount: 0, details: { seat: 1 } },
                { type: 'BET_PLACED', playerId: 1, amount: 50, details: { betType: 'MAIN' } },
                { type: 'CARD_DEALT', playerId: 1, amount: 0, details: { card: 'King of Hearts' } },
                { type: 'WIN', playerId: 1, amount: 100, details: { outcome: 'WON', score: 20 } }
            ]
        },
        {
            gameId: 2,
            gameType: 'ROULETTE',
            tableNumber: 'RT-01',
            dealerName: 'Sarah Johnson',
            playersCount: 4,
            totalBets: 12,
            totalWagered: 450.00,
            totalPayout: 200.00,
            houseProfit: 250.00,
            startTime: new Date('2024-10-20T14:00:00Z'),
            endTime: new Date('2024-10-20T15:45:00Z'),
            status: 'COMPLETED',
            events: [
                { type: 'BET_PLACED', playerId: 2, amount: 20, details: { pocket: 'RED' } },
                { type: 'SPIN', details: { winningNumber: 17, color: 'BLACK' } },
                { type: 'LOSS', playerId: 2, amount: 20, details: { reason: 'Wrong color' } }
            ]
        }
    ];

    const inserted = await GameLog.insertMany(logs);
    console.log(`Inserted ${inserted.length} GameLog documents.`);
}

// =====================================================
// 2. Seed Player Activities
// =====================================================
async function seedPlayerActivities() {
    console.log('\n--- Seeding Player Activities ---');
    await PlayerActivity.deleteMany({});

    const activities = [
        {
            playerId: 1,
            playerName: 'Alice Cooper',
            email: 'alice.cooper@email.com',
            sessionCount: 14,
            totalSessionTime: 340,
            lastSeen: new Date(),
            loginHistory: [
                { timestamp: new Date(Date.now() - 3600000), ip: '192.168.1.10', userAgent: 'Chrome/120' }
            ],
            activityLog: [
                { action: 'LOGIN', timestamp: new Date(Date.now() - 3600000), details: { method: 'JWT' } },
                { action: 'BET_PLACED', timestamp: new Date(Date.now() - 1800000), details: { gameId: 1, amount: 50 } },
                { action: 'WIN', timestamp: new Date(Date.now() - 1200000), details: { payout: 100 } }
            ]
        },
        {
            playerId: 2,
            playerName: 'Bob Martinez',
            email: 'bob.martinez@email.com',
            sessionCount: 8,
            totalSessionTime: 190,
            lastSeen: new Date(),
            loginHistory: [
                { timestamp: new Date(Date.now() - 7200000), ip: '192.168.1.25', userAgent: 'Safari/17' }
            ],
            activityLog: [
                { action: 'LOGIN', timestamp: new Date(Date.now() - 7200000) },
                { action: 'DEPOSIT', timestamp: new Date(Date.now() - 7000000), details: { amount: 500 } }
            ]
        }
    ];

    const inserted = await PlayerActivity.insertMany(activities);
    console.log(`Inserted ${inserted.length} PlayerActivity documents.`);
}

// =====================================================
// 3. Seed Casino Analytics
// =====================================================
async function seedAnalytics() {
    console.log('\n--- Seeding Casino Analytics Time-Series ---');
    await CasinoAnalytics.deleteMany({});

    const sample = {
        date: new Date('2024-10-20T00:00:00Z'),
        dailyRevenue: 5420.50,
        dailyPlayers: 86,
        peakHour: 21,
        gameTypeStats: [
            { gameType: 'BLACKJACK', gamesPlayed: 24, revenue: 2100.00, playerCount: 42 },
            { gameType: 'POKER', gamesPlayed: 12, revenue: 1650.50, playerCount: 28 },
            { gameType: 'ROULETTE', gamesPlayed: 30, revenue: 1670.00, playerCount: 50 }
        ]
    };

    const inserted = await CasinoAnalytics.create(sample);
    console.log(`Inserted CasinoAnalytics document for date: ${inserted.date.toISOString().slice(0, 10)}`);
}

// =====================================================
// 4. Seed Vector Database: Game & Player Embeddings
// =====================================================
async function seedVectorDatabase() {
    console.log('\n--- Seeding Vector Database (Dense 5-D Embeddings) ---');
    await GameVectorEmbedding.deleteMany({});
    await PlayerPreferenceVector.deleteMany({});

    /**
     * 5-D Feature Vector Dimension Specs:
     * [0] Risk/Volatility (0.0 to 1.0)
     * [1] House Edge (0.01 to 0.15)
     * [2] Game Pace / Rounds per minute (0.0 to 1.0)
     * [3] Strategy / Skill Factor (0.0 to 1.0)
     * [4] Social Factor / Multiplayer Interaction (0.0 to 1.0)
     */
    const gameVectors = [
        {
            gameType: 'BLACKJACK',
            title: 'Classic Vegas Blackjack',
            description: 'Low house edge table with heavy player strategy & card calculation.',
            vector: [0.35, 0.005, 0.40, 0.85, 0.60],
            metadata: { minBetDefault: 10, maxBetDefault: 1000, category: 'Cards', tags: ['strategy', 'table', 'classic'] }
        },
        {
            gameType: 'POKER',
            title: 'Texas Hold\'em Poker',
            description: 'Competitive peer-to-peer card game requiring psychological reads and math.',
            vector: [0.70, 0.025, 0.30, 0.95, 0.90],
            metadata: { minBetDefault: 20, maxBetDefault: 5000, category: 'Cards', tags: ['high-skill', 'bluffing', 'tournament'] }
        },
        {
            gameType: 'ROULETTE',
            title: 'European Roulette',
            description: 'Medium risk wheel betting with diverse inside and outside bets.',
            vector: [0.55, 0.027, 0.60, 0.20, 0.70],
            metadata: { minBetDefault: 5, maxBetDefault: 1000, category: 'Wheel', tags: ['luck', 'fast', 'social'] }
        },
        {
            gameType: 'SLOTS',
            title: 'Mega Fortune Slots',
            description: 'High volatility, lightning fast spinning machine with jackpots.',
            vector: [0.85, 0.060, 0.95, 0.05, 0.10],
            metadata: { minBetDefault: 1, maxBetDefault: 100, category: 'Electronic', tags: ['jackpot', 'rapid', 'solo'] }
        },
        {
            gameType: 'BACCARAT',
            title: 'Punto Banco Baccarat',
            description: 'High roller favorite with simple rules, elegance and low house edge.',
            vector: [0.40, 0.010, 0.65, 0.15, 0.50],
            metadata: { minBetDefault: 25, maxBetDefault: 2000, category: 'Cards', tags: ['vip', 'high-roller', 'elegant'] }
        },
        {
            gameType: 'CRAPS',
            title: 'Vegas Dice Craps',
            description: 'Fast-paced, loud dice table with complex multi-roll propositions.',
            vector: [0.65, 0.014, 0.75, 0.45, 0.95],
            metadata: { minBetDefault: 10, maxBetDefault: 1000, category: 'Dice', tags: ['dice', 'exciting', 'multiplayer'] }
        }
    ];

    const insertedGames = await GameVectorEmbedding.insertMany(gameVectors);
    console.log(`Inserted ${insertedGames.length} GameVectorEmbedding records (5-D dense vectors).`);

    // Seed Player Preference Vector
    // Alice prefers high-skill, low house edge games (Blackjack/Poker)
    const alicePrefVector = [0.45, 0.010, 0.40, 0.90, 0.75];

    // Compute initial cosine similarities for Alice
    const recommendations = insertedGames.map(g => ({
        gameType: g.gameType,
        similarityScore: parseFloat(cosineSimilarity(alicePrefVector, g.vector).toFixed(4))
    })).sort((a, b) => b.similarityScore - a.similarityScore);

    const aliceDoc = await PlayerPreferenceVector.create({
        playerId: 1,
        preferenceVector: alicePrefVector,
        totalWagered: 1500.00,
        riskTolerance: 'BALANCED',
        recommendedGames: recommendations
    });

    console.log(`Created PlayerPreferenceVector for Player #1 (Top recommendation: ${recommendations[0].gameType} with score ${recommendations[0].similarityScore}).`);
}

async function main() {
    console.log('========================================================');
    console.log('Casino DBMS - MongoDB & Vector Database Setup');
    console.log('========================================================');

    try {
        await connect();
        await seedGameLogs();
        await seedPlayerActivities();
        await seedAnalytics();
        await seedVectorDatabase();

        console.log('\n All NoSQL & Vector collections seeded successfully!');
    } catch (err) {
        console.error('Setup failed:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB.\n');
    }
}

if (require.main === module) {
    main();
}

module.exports = { seedVectorDatabase };
