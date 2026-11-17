const express = require('express');
const router = express.Router();

const {
    register,
    login,
    getProfile,
    logout,
    getAllPlayers,
    updatePlayerStatus,
    assignRole,
    revokeRole
} = require('../controllers/authController');

const { authenticate, authorize } = require('../middleware/auth');

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes (any authenticated user)
router.get('/profile', authenticate, getProfile);
router.post('/logout', authenticate, logout);

// Admin-only routes
router.get('/players', authenticate, authorize('ADMIN'), getAllPlayers);
router.patch('/players/:id/status', authenticate, authorize('ADMIN'), updatePlayerStatus);
router.post('/assign-role', authenticate, authorize('ADMIN'), assignRole);
router.post('/revoke-role', authenticate, authorize('ADMIN'), revokeRole);

module.exports = router;
