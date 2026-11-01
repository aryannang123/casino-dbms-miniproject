const express = require('express');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { authenticate, authorize } = require('../middleware/auth');
const { idParamValidation } = require('../middleware/validator');

// Public/Player routes
router.get('/', authenticate, tableController.getTables);
router.get('/available', authenticate, tableController.getAvailableTables);
router.get('/:id', authenticate, idParamValidation, tableController.getTable);

// Manager routes
router.post('/', authenticate, authorize('MANAGER'), tableController.createTable);
router.put('/:id/status', authenticate, authorize('MANAGER'), idParamValidation, tableController.updateTableStatus);

module.exports = router;
