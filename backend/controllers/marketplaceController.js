const Marketplace = require('../models/marketplaceModel');
const Invoice = require('../models/invoiceModel');
const Organization = require('../models/organizationModel');
const Financer = require('../models/financerModel');
const { AppError } = require('../utils/appError');
const { asyncHandler } = require('../utils/asyncHandler');

// List open marketplace listings
exports.list = asyncHandler(async (req, res) => {
  const listings = await Marketplace.find({ isOpen: true })
    .populate({ path: 'invoice', populate: { path: 'organization' } })
    .populate({ path: 'organization' })
    .populate({ path: 'bids.financer', select: 'user profile' });
  res.status(200).json({ success: true, data: { listings } });
});

// Create listing(s) for invoices (organization only)
exports.create = asyncHandler(async (req, res, next) => {
  const org = await Organization.findOne({ user: req.user.id });
  if (!org) return next(new AppError('Organization profile not found', 404));

  const { invoiceId, organizationId } = req.body;
  if (organizationId) {
    if (String(organizationId) !== String(org.user))
      return next(new AppError('Unauthorized organization', 403));
    const invoices = await Invoice.find({
      organization: org._id,
      status: { $nin: ['paid', 'cancelled', 'draft'] },
      'sold.isSold': { $ne: true },
    }).select('_id');
    const ids = invoices.map((i) => i._id);
    const existing = await Marketplace.find({ invoice: { $in: ids } }).select(
      'invoice',
    );
    const existingIds = new Set(existing.map((e) => String(e.invoice)));
    const toCreate = ids.filter((id) => !existingIds.has(String(id)));
    const docs = toCreate.map((id) => ({ invoice: id, organization: org._id }));
    if (docs.length > 0) {
      await Marketplace.insertMany(docs);
      try {
        await Invoice.updateMany(
          { _id: { $in: toCreate } },
          { $set: { isOnBid: true } },
        );
      } catch (e) {}
    }
    return res
      .status(201)
      .json({ success: true, data: { listed: docs.length } });
  }

  if (invoiceId) {
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) return next(new AppError('Invoice not found', 404));
    if (!invoice.organization.equals(org._id))
      return next(new AppError('Unauthorized invoice', 403));
    if (invoice.status === 'paid' || invoice.sold?.isSold)
      return next(new AppError('Invoice is not eligible', 400));
    const exists = await Marketplace.findOne({ invoice: invoiceId });
    if (exists)
      return res.status(200).json({ success: true, data: { listing: exists } });
    const listing = await Marketplace.create({
      invoice: invoiceId,
      organization: org._id,
    });
    try {
      // Mark invoice as listed on marketplace
      invoice.isOnBid = true;
      await invoice.save();
    } catch (e) {}
    return res.status(201).json({ success: true, data: { listing } });
  }

  return next(new AppError('Provide invoiceId or organizationId', 400));
});

// Place bid (financer only)
exports.bid = asyncHandler(async (req, res, next) => {
  const { listingId } = req.params;
  const { amount } = req.body;
  if (!amount || amount <= 0) return next(new AppError('Invalid amount', 400));
  const financer = await Financer.findOne({ user: req.user.id });
  if (!financer) return next(new AppError('Financer profile not found', 404));

  const listing = await Marketplace.findById(listingId).populate('invoice');
  if (!listing || !listing.isOpen)
    return next(new AppError('Listing not found', 404));
  if (listing.invoice.status === 'paid' || listing.invoice.sold?.isSold)
    return next(new AppError('Invoice is not eligible', 400));

  await financer.lockFunds(amount);
  financer.stats.bidsPlaced += 1;
  await financer.save();

  listing.bids.push({
    invoice: listing.invoice._id,
    organization: listing.organization,
    financer: financer._id,
    amount,
  });
  await listing.save();
  res.status(200).json({ success: true, data: { listing } });
});

// Cancel bid (financer only)
exports.cancelBid = asyncHandler(async (req, res, next) => {
  const { listingId, bidId } = req.params;
  const financer = await Financer.findOne({ user: req.user.id });
  if (!financer) return next(new AppError('Financer profile not found', 404));

  const listing = await Marketplace.findById(listingId);
  if (!listing) return next(new AppError('Listing not found', 404));
  const bid = listing.bids.id(bidId);
  if (!bid) return next(new AppError('Bid not found', 404));
  if (!String(bid.financer) === String(financer._id))
    return next(new AppError('Unauthorized bid', 403));
  if (bid.status !== 'active')
    return next(new AppError('Bid is not active', 400));

  const bidAmount = bid.amount;
  // Remove the bid subdocument from listing (pull semantics)
  bid.deleteOne();
  await listing.save();

  // Unlock previously locked funds back to financer balance
  await financer.unlockFunds(bidAmount);

  res.status(200).json({ success: true, message: 'Bid cancelled' });
});

// Accept bid (organization only) - transfer ownership and funds
exports.acceptBid = asyncHandler(async (req, res, next) => {
  const { listingId, bidId } = req.params;
  const org = await Organization.findOne({ user: req.user.id });
  if (!org) return next(new AppError('Organization profile not found', 404));

  const listing = await Marketplace.findById(listingId).populate('invoice');
  if (!listing || !listing.isOpen)
    return next(new AppError('Listing not found', 404));
  if (!listing.organization.equals(org._id))
    return next(new AppError('Unauthorized listing', 403));

  const bid = listing.bids.id(bidId);
  if (!bid || bid.status !== 'active')
    return next(new AppError('Bid not found', 404));

  // Funds distribution
  const winner = await Financer.findById(bid.financer);
  if (!winner) return next(new AppError('Financer not found', 404));
  if (winner.lockedBalance < bid.amount)
    return next(new AppError('Locked funds insufficient', 400));

  winner.lockedBalance -= bid.amount;
  winner.stats.invoicesWon += 1;
  winner.stats.totalFinanced += bid.amount;
  await winner.save();

  // Credit organization revenue
  org.revenue.received += bid.amount;
  org.revenue.pending = Math.max(0, org.revenue.pending - bid.amount);
  org.invoices.financed.push({
    invoice: listing.invoice._id,
    soldTo: winner._id,
    soldAmount: bid.amount,
    soldAt: new Date(),
  });
  await org.save();

  // Update invoice ownership
  const invoice = await Invoice.findById(listing.invoice._id);
  invoice.currentOwner = winner._id;
  invoice.currentOwnerModel = 'Financer';
  // invoice.isOnBid = false;
  invoice.sold = {
    isSold: true,
    soldTo: winner._id,
    soldAmount: bid.amount,
    soldAt: new Date(),
  };
  // Once accepted, no longer on bid
  invoice.isOnBid = false;
  await invoice.save();

  // Record to winner boughtInvoices
  try {
    winner.boughtInvoices = winner.boughtInvoices || [];
    winner.boughtInvoices.push({
      invoice: invoice._id,
      organization: org._id,
      amount: bid.amount,
      boughtAt: new Date(),
    });
    await winner.save();
  } catch (e) {}

  // Close listing and settle other bids (refund)
  listing.isOpen = false;
  listing.bids.forEach((b) => {
    if (String(b._id) === String(bidId)) b.status = 'accepted';
    else if (b.status === 'active') b.status = 'rejected';
  });
  await listing.save();

  const otherFinancers = await Financer.find({
    _id: {
      $in: listing.bids
        .filter((b) => b.status === 'rejected')
        .map((b) => b.financer),
    },
  });
  const idToAmount = new Map(
    listing.bids
      .filter((b) => b.status === 'rejected')
      .map((b) => [String(b.financer), b.amount]),
  );
  for (const f of otherFinancers) {
    const amt = idToAmount.get(String(f._id)) || 0;
    if (amt > 0) await f.unlockFunds(amt);
  }

  // Remove listing entirely
  await listing.deleteOne();

  res.status(200).json({ success: true, message: 'Bid accepted' });
});

// Remove all listings for an organization
exports.removeAllForOrganization = asyncHandler(async (req, res, next) => {
  const org = await Organization.findOne({ user: req.user.id });
  if (!org) return next(new AppError('Organization profile not found', 404));
  const result = await Marketplace.deleteMany({ organization: org._id });
  res
    .status(200)
    .json({ success: true, data: { deleted: result.deletedCount || 0 } });
});

// Remove listing by invoice id
exports.removeByInvoice = asyncHandler(async (req, res, next) => {
  const org = await Organization.findOne({ user: req.user.id });
  if (!org) return next(new AppError('Organization profile not found', 404));
  const { invoiceId } = req.params;
  const listing = await Marketplace.findOne({ invoice: invoiceId });
  if (!listing)
    return res.status(200).json({ success: true, message: 'No listing found' });
  if (!listing.organization.equals(org._id))
    return next(new AppError('Unauthorized listing', 403));
  await listing.deleteOne();
  res.status(200).json({ success: true, message: 'Listing removed' });
});
