const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const { authenticate, authorize } = require('../middleware/authMiddleware');
const {
  validateOrganizationProfile,
  validateInvoice,
} = require('../middleware/validation');

// All routes require authentication and organization role
router.use(authenticate);
router.use(authorize('organization'));

router.post(
  '/profile',
  validateOrganizationProfile,
  organizationController.createProfile,
);
router.get('/profile', organizationController.getProfile);
router.patch('/profile', organizationController.updateProfile);
router.get('/revenue', organizationController.getRevenue);

// Invoice management
router.post('/invoices', validateInvoice, organizationController.createInvoice);
router.get('/invoices', organizationController.getInvoices);
router.get('/invoices/with-bids', organizationController.getBiddedInvoices);
router.get('/invoices/financed', organizationController.getFinancedInvoices);
router.get('/invoices/by-due-date', organizationController.getBiddedInvoices);
router.get('/invoices/sent/full', organizationController.getSentInvoicesFull);
router.get('/invoices/:invoiceId', organizationController.getInvoiceById);
router.patch('/invoices/:invoiceId', organizationController.updateInvoice);
router.post('/invoices/:invoiceId/send', organizationController.sendInvoice);
router.delete('/invoices/:invoiceId', organizationController.deleteInvoice);
router.get('/customers/search', organizationController.getCustomerByEmail);

module.exports = router;
