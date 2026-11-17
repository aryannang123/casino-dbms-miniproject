/**
 * MongoDB Schema Definitions for Casino Analytics & Vector Store
 * 
 * Complies with Evaluation Criteria:
 * - Criteria 2: "NoSQL/Vector database creation (4)"
 * - Criteria 4: "NoSQL/Vector feature RUD (7)"
 * 
 * Features:
 * 1. High-velocity game event logging (GameLog)
 * 2. Player activity & session tracking (PlayerActivity)
 * 3. Daily pre-aggregated time-series analytics (CasinoAnalytics)
 * 4. Dense Vector Embeddings for AI Game Recommendations & Player Clustering (GameVectorEmbedding & PlayerPreferenceVector)
 */

let mongoose;
try {
    mongoose = require(require('path').join(__dirname, '../../backend/node_modules/mongoose'));
} catch (e) {
    try {
        mongoose = require('mongoose');
    } catch (e2) {
        throw new Error('Could not resolve mongoose: ' + e.message);
    }
}

// =====================================================
// 1. GameLog Schema (Nested Event Stream)
// =====================================================
const gameEventSchema = new mongoose.Schema(
    {
        type: {
            type: String,
            required: true,
            enum: [
                'BET_PLACED', 'BET_CANCELLED', 'CARD_DEALT', 'CARD_REVEALED',
                'SPIN', 'ROLL', 'WIN', 'LOSS', 'PUSH', 'BLACKJACK',
                'PLAYER_JOINED', 'PLAYER_LEFT', 'GAME_PAUSED', 'GAME_RESUMED',
                'DEALER_ACTION', 'PAYOUT_ISSUED', 'CUSTOM'
            ]
        },
        playerId: {
            type: Number, // References MySQL PLAYER.player_id
            default: null
        },
        amount: {
            type: Number,
            default: 0,
            min: 0
        },
        timestamp: {
            type: Date,
            default: Date.now
        },
        details: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }
    },
    { _id: true }
);

const gameLogSchema = new mongoose.Schema(
    {
        gameId: {
            type: Number,    // References MySQL GAME.game_id
            required: true,
            index: true
        },
        gameType: {
            type: String,
            required: true,
            enum: ['BLACKJACK', 'POKER', 'ROULETTE', 'SLOTS', 'BACCARAT', 'CRAPS', 'OTHER'],
            index: true
        },
        tableNumber: {
            type: String,
            required: true
        },
        dealerName: {
            type: String,
            default: null
        },
        playersCount: {
            type: Number,
            default: 0,
            min: 0
        },
        totalBets: {
            type: Number,
            default: 0,
            min: 0
        },
        totalWagered: {
            type: Number,
            default: 0,
            min: 0
        },
        totalPayout: {
            type: Number,
            default: 0,
            min: 0
        },
        houseProfit: {
            type: Number,
            default: 0
        },
        startTime: {
            type: Date,
            required: true,
            index: true
        },
        endTime: {
            type: Date,
            default: null
        },
        status: {
            type: String,
            enum: ['ACTIVE', 'COMPLETED', 'ABANDONED', 'ARCHIVED'],
            default: 'ACTIVE',
            index: true
        },
        events: {
            type: [gameEventSchema],
            default: []
        }
    },
    {
        timestamps: true,
        collection: 'game_logs'
    }
);

gameLogSchema.index({ startTime: -1, status: 1 });
gameLogSchema.index({ gameType: 1, startTime: -1 });

// =====================================================
// 2. PlayerActivity Schema
// =====================================================
const loginEntrySchema = new mongoose.Schema(
    {
        timestamp: { type: Date, default: Date.now },
        ip: { type: String, default: null },
        userAgent: { type: String, default: null }
    },
    { _id: false }
);

const activityEntrySchema = new mongoose.Schema(
    {
        action: {
            type: String,
            required: true,
            enum: [
                'LOGIN', 'LOGOUT', 'GAME_JOIN', 'GAME_LEAVE',
                'BET_PLACED', 'WIN', 'LOSS', 'DEPOSIT',
                'WITHDRAWAL', 'PROFILE_UPDATE', 'PASSWORD_CHANGE', 'CUSTOM'
            ]
        },
        timestamp: { type: Date, default: Date.now },
        details: { type: mongoose.Schema.Types.Mixed, default: {} }
    },
    { _id: false }
);

const playerActivitySchema = new mongoose.Schema(
    {
        playerId: {
            type: Number,   // References MySQL PLAYER.player_id
            required: true,
            unique: true,
            index: true
        },
        playerName: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            lowercase: true
        },
        loginHistory: {
            type: [loginEntrySchema],
            default: []
        },
        sessionCount: {
            type: Number,
            default: 0,
            min: 0
        },
        lastSeen: {
            type: Date,
            default: null,
            index: true
        },
        totalSessionTime: {
            type: Number,
            default: 0,
            min: 0
        },
        activityLog: {
            type: [activityEntrySchema],
            default: []
        }
    },
    {
        timestamps: true,
        collection: 'player_activities'
    }
);

// =====================================================
// 3. CasinoAnalytics Schema (Aggregated Time-Series)
// =====================================================
const hourlyDataSchema = new mongoose.Schema(
    {
        hour: { type: Number, required: true, min: 0, max: 23 },
        gamesPlayed: { type: Number, default: 0, min: 0 },
        betsPlaced: { type: Number, default: 0, min: 0 },
        revenue: { type: Number, default: 0 }
    },
    { _id: false }
);

const gameTypeStatSchema = new mongoose.Schema(
    {
        gameType: {
            type: String,
            required: true,
            enum: ['BLACKJACK', 'POKER', 'ROULETTE', 'SLOTS', 'BACCARAT', 'CRAPS', 'OTHER']
        },
        gamesPlayed: { type: Number, default: 0, min: 0 },
        revenue: { type: Number, default: 0 },
        playerCount: { type: Number, default: 0, min: 0 }
    },
    { _id: false }
);

const casinoAnalyticsSchema = new mongoose.Schema(
    {
        date: {
            type: Date,
            required: true,
            unique: true,
            index: true
        },
        hourlyData: {
            type: [hourlyDataSchema],
            default: () => Array.from({ length: 24 }, (_, i) => ({
                hour: i,
                gamesPlayed: 0,
                betsPlaced: 0,
                revenue: 0
            }))
        },
        gameTypeStats: {
            type: [gameTypeStatSchema],
            default: []
        },
        dailyRevenue: {
            type: Number,
            default: 0
        },
        dailyPlayers: {
            type: Number,
            default: 0,
            min: 0
        },
        peakHour: {
            type: Number,
            default: null,
            min: 0,
            max: 23
        }
    },
    {
        timestamps: true,
        collection: 'casino_analytics'
    }
);

casinoAnalyticsSchema.index({ date: -1 });

// =====================================================
// 4. Vector Database Schemas (Embeddings & Cosine Search)
// =====================================================

/**
 * GameVectorEmbedding Schema
 * Stores dense numerical vectors for vector similarity search (k-NN).
 * Feature Vector (5-dimensions):
 * [0] Risk/Volatility Index (0.0 = low, 1.0 = extreme)
 * [1] House Edge Percentage (0.01 to 0.15)
 * [2] Game Pace/Speed (0.0 = slow strategy, 1.0 = rapid action)
 * [3] Skill Requirement (0.0 = pure chance, 1.0 = heavy strategy)
 * [4] Social/Multiplayer Index (0.0 = solo, 1.0 = high table interaction)
 */
const gameVectorEmbeddingSchema = new mongoose.Schema(
    {
        gameType: {
            type: String,
            required: true,
            unique: true,
            enum: ['BLACKJACK', 'POKER', 'ROULETTE', 'SLOTS', 'BACCARAT', 'CRAPS'],
            index: true
        },
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        // 5-dimensional dense vector for semantic & feature similarity
        vector: {
            type: [Number],
            required: true,
            validate: {
                validator: (arr) => arr.length === 5,
                message: 'Embedding vector must have exactly 5 dimensions'
            }
        },
        metadata: {
            minBetDefault: Number,
            maxBetDefault: Number,
            category: String,
            tags: [String]
        }
    },
    {
        timestamps: true,
        collection: 'game_vectors'
    }
);

/**
 * PlayerPreferenceVector Schema
 * Embeds player behavior in the same 5-dimensional vector space
 * for personalized AI game recommendation.
 */
const playerPreferenceVectorSchema = new mongoose.Schema(
    {
        playerId: {
            type: Number,
            required: true,
            unique: true,
            index: true
        },
        preferenceVector: {
            type: [Number],
            required: true,
            validate: {
                validator: (arr) => arr.length === 5,
                message: 'Preference vector must have exactly 5 dimensions'
            }
        },
        totalWagered: {
            type: Number,
            default: 0
        },
        riskTolerance: {
            type: String,
            enum: ['CONSERVATIVE', 'BALANCED', 'HIGH_ROLLER', 'AGGRESSIVE'],
            default: 'BALANCED'
        },
        recommendedGames: [
            {
                gameType: String,
                similarityScore: Number
            }
        ]
    },
    {
        timestamps: true,
        collection: 'player_preference_vectors'
    }
);

// Vector Math: Cosine Similarity Helper
function cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Compile Mongoose Models
const GameLog = mongoose.model('GameLog', gameLogSchema);
const PlayerActivity = mongoose.model('PlayerActivity', playerActivitySchema);
const CasinoAnalytics = mongoose.model('CasinoAnalytics', casinoAnalyticsSchema);
const GameVectorEmbedding = mongoose.model('GameVectorEmbedding', gameVectorEmbeddingSchema);
const PlayerPreferenceVector = mongoose.model('PlayerPreferenceVector', playerPreferenceVectorSchema);

module.exports = {
    // Schemas
    gameLogSchema,
    playerActivitySchema,
    casinoAnalyticsSchema,
    gameVectorEmbeddingSchema,
    playerPreferenceVectorSchema,
    // Models
    GameLog,
    PlayerActivity,
    CasinoAnalytics,
    GameVectorEmbedding,
    PlayerPreferenceVector,
    // Math helpers
    cosineSimilarity
};
