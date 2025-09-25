const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  validateCustomerProfile,
  validatePayment,
} = require('../middleware/validation');

// All routes require authentication and customer role
router.use(authenticate);
router.use(authorize('customer'));

router.post(
  '/profile',
  validateCustomerProfile,
  customerController.createProfile,
);
router.get('/profile', customerController.getProfile);
router.patch('/profile', customerController.updateProfile);
router.get('/balance', customerController.getBalance);
router.post('/balance/add', customerController.addBalance);
router.get('/invoices', customerController.getInvoices);
router.get('/invoices/:invoiceId', customerController.getInvoiceById);
router.post(
  '/invoices/:invoiceId/pay',
  validatePayment,
  customerController.payInvoice,
);

// Filters and lookups
router.get('/lookup/organizations', customerController.getOrganizationByEmail);

module.exports = router;
