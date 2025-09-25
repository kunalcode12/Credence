const express = require('express');
const router = express.Router();
const financerController = require('../controllers/financerController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.use(authenticate);
router.use(authorize('financer'));

router.post('/profile', financerController.createProfile);
router.post('/balance/add', financerController.addBalance);
router.get('/me', financerController.getSelf);
router.get('/bids', financerController.myBids);
router.get('/invoices', financerController.myInvoices);
router.get('/bought', financerController.getBoughtInvoices);
router.get('/invoices/:invoiceId', financerController.getInvoiceDetails);
router.get('/overview', financerController.getOverview);

module.exports = router;
