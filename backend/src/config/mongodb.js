/**
 * MongoDB connection configuration
 * 
 * Establishes and maintains a single Mongoose connection that is shared
 * across all controllers. Call connectMongoDB() once at server startup.
 */

'use strict';

const mongoose = require('mongoose');

// ─── Connection state ─────────────────────────────────────────────────────────
let isConnected = false;

/**
 * Connect to MongoDB using the MONGODB_URI environment variable.
 * Idempotent — safe to call multiple times; only the first call connects.
 *
 * @returns {Promise<void>}
 */
async function connectMongoDB() {
    if (mongoose.connection.readyState === 1) {
        isConnected = true;
        return;
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.warn('⚠️  MONGODB_URI not set — skipping MongoDB connection. Analytics features will be unavailable.');
        return;
    }

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,   // Fail fast if Mongo is down
            socketTimeoutMS: 45000,
            maxPoolSize: 10,                  // Connection pool
            minPoolSize: 2
        });

        isConnected = true;
        console.log(`✅  MongoDB connected: ${uri}`);

        // Graceful disconnect handlers
        mongoose.connection.on('disconnected', () => {
            isConnected = false;
            console.warn('⚠️  MongoDB disconnected.');
        });

        mongoose.connection.on('error', (err) => {
            console.error('❌  MongoDB connection error:', err.message);
        });

        process.on('SIGINT',  () => gracefulDisconnect('SIGINT'));
        process.on('SIGTERM', () => gracefulDisconnect('SIGTERM'));

    } catch (err) {
        isConnected = false;
        console.error('❌  MongoDB connection failed:', err.message);
        // Do NOT crash the server — MySQL can still function independently
        console.warn('   → Continuing without MongoDB. Analytics endpoints will return 503.');
        throw err;
    }
}

async function gracefulDisconnect(signal) {
    try {
        await mongoose.disconnect();
        console.log(`🔌  MongoDB disconnected on ${signal}.`);
    } catch (err) {
        console.error('Error during MongoDB disconnect:', err.message);
    }
}

/**
 * Returns true if Mongoose is currently connected.
 * Use this to guard MongoDB-dependent operations.
 */
function isMongoConnected() {
    return mongoose.connection.readyState === 1;
}

// ─── Re-export models so controllers only need one import ─────────────────────
const { 
    GameLog, 
    PlayerActivity, 
    CasinoAnalytics,
    GameVectorEmbedding,
    PlayerPreferenceVector,
    cosineSimilarity
} = require('../../../database/nosql/mongodb-schema');

module.exports = {
    connectMongoDB,
    isMongoConnected,
    // Mongoose models
    GameLog,
    PlayerActivity,
    CasinoAnalytics,
    GameVectorEmbedding,
    PlayerPreferenceVector,
    // Math helpers
    cosineSimilarity
};
