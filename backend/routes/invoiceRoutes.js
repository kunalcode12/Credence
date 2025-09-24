const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticate } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticate);

router.get('/overdue', invoiceController.getOverdueInvoices);
router.get('/by-date-range', invoiceController.getInvoicesByDateRange);

module.exports = router;
