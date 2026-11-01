const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

const routes = require('./routes');
const { pool } = require('./config/database');
const { connectMongoDB } = require('./config/mongodb');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
const corsOptions = {
    origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
    credentials: true,
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// Logging middleware
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// API routes
app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'Casino Database Management System API (Hybrid Relational + NoSQL & Vector)',
        version: '2.0.0',
        endpoints: {
            health: '/api/health',
            auth: '/api/auth',
            games: '/api/games',
            bets: '/api/bets',
            wallet: '/api/wallet',
            tables: '/api/tables',
            analytics: '/api/analytics',
            vectors: '/api/analytics/vectors'
        }
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Global error handler:', err);
    
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        pool.end(() => {
            console.log('Database pool closed');
            process.exit(0);
        });
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        pool.end(() => {
            console.log('Database pool closed');
            process.exit(0);
        });
    });
});

// Start server
const server = app.listen(PORT, async () => {
    console.log('='.repeat(50));
    console.log('Casino Database Management System - Backend API');
    console.log('='.repeat(50));
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Server running on port ${PORT}`);
    console.log(`API available at: http://localhost:${PORT}/api`);
    console.log('='.repeat(50));

    // Connect to NoSQL & Vector Store
    try {
        await connectMongoDB();
    } catch (err) {
        console.warn('MongoDB connection deferred or optional:', err.message);
    }
});

module.exports = app;
