const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');
const { authenticate, authorize } = require('../middleware/auth');
const { 
    createGameValidation, 
    idParamValidation,
    paginationValidation 
} = require('../middleware/validator');

// Public/Player routes (any authenticated user)
router.get('/', authenticate, paginationValidation, gameController.getGames);
router.get('/:id', authenticate, idParamValidation, gameController.getGame);
router.get('/:id/bets', authenticate, idParamValidation, paginationValidation, gameController.getGameBets);

// Dealer/Admin routes
router.post('/', authenticate, authorize('DEALER', 'ADMIN'), createGameValidation, gameController.createGame);
router.put('/:id/end', authenticate, authorize('DEALER', 'ADMIN'), idParamValidation, gameController.endGame);

module.exports = router;
