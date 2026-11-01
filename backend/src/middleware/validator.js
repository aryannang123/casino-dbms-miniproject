const { body, param, query, validationResult } = require('express-validator');

// Validation error handler
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors: errors.array()
        });
    }
    next();
};

// Player registration validation
const registerValidation = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Must be a valid email address')
        .normalizeEmail(),
    body('phone')
        .trim()
        .notEmpty().withMessage('Phone is required')
        .matches(/^\+?[1-9]\d{1,14}$/).withMessage('Must be a valid phone number'),
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain uppercase, lowercase, and number'),
    body('dateOfBirth')
        .optional()
        .isISO8601().withMessage('Must be a valid date')
        .custom((value) => {
            const age = Math.floor((new Date() - new Date(value)) / 31557600000);
            if (age < 18) {
                throw new Error('Must be at least 18 years old');
            }
            return true;
        }),
    body('address')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Address must not exceed 500 characters'),
    validate
];

// Login validation
const loginValidation = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Must be a valid email address')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required'),
    validate
];

// Bet placement validation
const placeBetValidation = [
    body('gameId')
        .notEmpty().withMessage('Game ID is required')
        .isInt({ min: 1 }).withMessage('Game ID must be a positive integer'),
    body('amount')
        .notEmpty().withMessage('Bet amount is required')
        .isFloat({ min: 0.01 }).withMessage('Bet amount must be at least 0.01')
        .custom((value) => {
            if (value > 100000) {
                throw new Error('Bet amount cannot exceed 100,000');
            }
            return true;
        }),
    body('betType')
        .notEmpty().withMessage('Bet type is required')
        .isString().withMessage('Bet type must be a string')
        .isLength({ max: 50 }).withMessage('Bet type must not exceed 50 characters'),
    validate
];

// Wallet transaction validation
const walletTransactionValidation = [
    body('amount')
        .notEmpty().withMessage('Amount is required')
        .isFloat({ min: 0.01 }).withMessage('Amount must be at least 0.01')
        .custom((value) => {
            if (value > 50000) {
                throw new Error('Transaction amount cannot exceed 50,000');
            }
            return true;
        }),
    body('description')
        .optional()
        .trim()
        .isLength({ max: 255 }).withMessage('Description must not exceed 255 characters'),
    validate
];

// Game creation validation
const createGameValidation = [
    body('tableId')
        .notEmpty().withMessage('Table ID is required')
        .isInt({ min: 1 }).withMessage('Table ID must be a positive integer'),
    body('dealerId')
        .notEmpty().withMessage('Dealer ID is required')
        .isInt({ min: 1 }).withMessage('Dealer ID must be a positive integer'),
    body('gameType')
        .notEmpty().withMessage('Game type is required')
        .isIn(['BLACKJACK', 'POKER', 'ROULETTE', 'CRAPS', 'BACCARAT', 'SLOTS'])
        .withMessage('Invalid game type'),
    validate
];

// Settle bet validation
const settleBetValidation = [
    body('outcome')
        .notEmpty().withMessage('Outcome is required')
        .isIn(['WON', 'LOST', 'CANCELLED']).withMessage('Invalid outcome'),
    body('payout')
        .optional()
        .isFloat({ min: 0 }).withMessage('Payout must be non-negative'),
    validate
];

// ID parameter validation
const idParamValidation = [
    param('id')
        .isInt({ min: 1 }).withMessage('ID must be a positive integer'),
    validate
];

// Query pagination validation
const paginationValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    validate
];

module.exports = {
    registerValidation,
    loginValidation,
    placeBetValidation,
    walletTransactionValidation,
    createGameValidation,
    settleBetValidation,
    idParamValidation,
    paginationValidation,
    validate
};
