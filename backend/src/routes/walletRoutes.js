const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const { authenticate, authorize } = require('../middleware/auth');
const { 
    walletTransactionValidation,
    paginationValidation 
} = require('../middleware/validator');

// All wallet routes require authentication
router.use(authenticate);
router.use(authorize('PLAYER'));

router.get('/', walletController.getWallet);
router.post('/deposit', walletTransactionValidation, walletController.deposit);
router.post('/withdraw', walletTransactionValidation, walletController.withdraw);
router.get('/transactions', paginationValidation, walletController.getTransactions);

module.exports = router;
