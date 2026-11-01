const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const gameRoutes = require('./gameRoutes');
const betRoutes = require('./betRoutes');
const walletRoutes = require('./walletRoutes');
const tableRoutes = require('./tableRoutes');
const analyticsRoutes = require('./analyticsRoutes');

// Health check
router.get('/health', (req, res) => {
    res.json({ success: true, message: 'Casino API is running', timestamp: new Date() });
});

router.use('/auth', authRoutes);
router.use('/games', gameRoutes);
router.use('/bets', betRoutes);
router.use('/wallet', walletRoutes);
router.use('/tables', tableRoutes);
router.use('/analytics', analyticsRoutes);

module.exports = router;
