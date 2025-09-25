const express = require('express');
const router = express.Router();
const marketplaceController = require('../controllers/marketplaceController');
const { authenticate, authorize } = require('../middleware/authMiddleware');

router.use(authenticate);

// public for authenticated users: list marketplace
router.get('/', marketplaceController.list);

// org creates listing
router.post('/', authorize('organization'), marketplaceController.create);
router.delete(
  '/all',
  authorize('organization'),
  marketplaceController.removeAllForOrganization,
);
router.delete(
  '/invoice/:invoiceId',
  authorize('organization'),
  marketplaceController.removeByInvoice,
);

// financer bids
router.post(
  '/:listingId/bids',
  authorize('financer'),
  marketplaceController.bid,
);
router.post(
  '/:listingId/bids/:bidId/cancel',
  authorize('financer'),
  marketplaceController.cancelBid,
);

// org accepts
router.post(
  '/:listingId/bids/:bidId/accept',
  authorize('organization'),
  marketplaceController.acceptBid,
);

module.exports = router;
