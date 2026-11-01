const express = require('express');
const router = express.Router();
const betController = require('../controllers/betController');
const { authenticate, authorize } = require('../middleware/auth');
const { 
    placeBetValidation, 
    settleBetValidation, 
    idParamValidation,
    paginationValidation 
} = require('../middleware/validator');

// Player routes (all authenticated users can place bets)
router.post('/', authenticate, placeBetValidation, betController.placeBet);
router.get('/history', authenticate, paginationValidation, betController.getBetHistory);
router.get('/stats', authenticate, betController.getPlayerStats);
router.get('/:id', authenticate, idParamValidation, betController.getBet);

// Dealer/Admin routes
router.put('/:id/settle', authenticate, authorize('DEALER', 'ADMIN'), idParamValidation, settleBetValidation, betController.settleBet);

module.exports = router;
