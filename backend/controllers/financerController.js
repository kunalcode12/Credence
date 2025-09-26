const Financer = require('../models/financerModel');
const Marketplace = require('../models/marketplaceModel');
const Invoice = require('../models/invoiceModel');
const { validationResult } = require('express-validator');
const { AppError } = require('../utils/appError');
const { asyncHandler } = require('../utils/asyncHandler');
const User = require('../models/userModal');

// Create/update financer profile
exports.createProfile = asyncHandler(async (req, res, next) => {
  // Basic input; could add validators if desired
  const existing = await Financer.findOne({ user: req.user.id });
  if (existing)
    return next(new AppError('Financer profile already exists', 409));

  const payload = {
    user: req.user.id,
    profile: req.body?.profile || {},
  };

  const financer = await Financer.create(payload);
  res.status(201).json({
    success: true,
    message: 'Financer profile created successfully',
    data: { financer },
  });
});

exports.addBalance = asyncHandler(async (req, res, next) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return next(new AppError('Invalid amount', 400));
  const financer = await Financer.findOne({ user: req.user.id });
  if (!financer) return next(new AppError('Financer profile not found', 404));
  await financer.addBalance(amount);
  res.status(200).json({ success: true, data: { balance: financer.balance } });
});

// Get currently logged-in financer basic info
exports.getSelf = asyncHandler(async (req, res, next) => {
  const financer = await Financer.findOne({ user: req.user.id });
  if (!financer) return next(new AppError('Financer profile not found', 404));

  const user = await User.findById(req.user.id).select('email');
  const firstName = financer.profile?.firstName || '';
  const lastName = financer.profile?.lastName || '';
  const companyName = financer.profile?.companyName || '';
  const name =
    companyName ||
    [firstName, lastName].filter(Boolean).join(' ') ||
    'Financer';

  res.status(200).json({
    success: true,
    data: {
      financerId: String(financer._id),
      name,
      email: user?.email || '',
      balance: financer.balance,
      lockedBalance: financer.lockedBalance,
    },
  });
});

exports.myBids = asyncHandler(async (req, res) => {
  const financer = await Financer.findOne({ user: req.user.id });
  const listings = await Marketplace.find({ 'bids.financer': financer?._id })
    .populate('invoice')
    .populate('organization')
    .populate({ path: 'bids.financer', select: 'user profile' });
  res.status(200).json({ success: true, data: { listings } });
});

exports.myInvoices = asyncHandler(async (req, res) => {
  const financer = await Financer.findOne({ user: req.user.id });
  const listings = await Marketplace.find({
    isOpen: false,
    'bids.financer': financer?._id,
    'bids.status': 'accepted',
  })
    .populate('invoice')
    .populate('organization');
  res.status(200).json({ success: true, data: { listings } });
});

// Bought invoices
exports.getBoughtInvoices = asyncHandler(async (req, res, next) => {
  const financer = await Financer.findOne({ user: req.user.id })
    .populate({ path: 'boughtInvoices.invoice' })
    .populate({ path: 'boughtInvoices.organization' });
  if (!financer) return next(new AppError('Financer profile not found', 404));
  res.status(200).json({
    success: true,
    data: { boughtInvoices: financer.boughtInvoices || [] },
  });
});

// Get invoice details (must either own or have bid on it)
exports.getInvoiceDetails = asyncHandler(async (req, res, next) => {
  const { invoiceId } = req.params;
  const financer = await Financer.findOne({ user: req.user.id });
  if (!financer) return next(new AppError('Financer profile not found', 404));

  const invoice = await Invoice.findById(invoiceId)
    .populate('organization')
    .populate('customer')
    .populate('items')
    .populate({ path: 'sold.soldTo' });
  if (!invoice) return next(new AppError('Invoice not found', 404));

  const owns =
    invoice.currentOwnerModel === 'Financer' &&
    String(invoice.currentOwner) === String(financer._id);
  const listing = await Marketplace.findOne({
    invoice: invoice._id,
    'bids.financer': financer._id,
  });
  if (!owns && !listing)
    return next(new AppError('Unauthorized to view this invoice', 403));

  res.status(200).json({ success: true, data: { invoice } });
});

// Financer overview: profile, balances, bought invoices, bid stats with active bids and highest per listing
exports.getOverview = asyncHandler(async (req, res, next) => {
  const financer = await Financer.findOne({ user: req.user.id })
    .populate({ path: 'boughtInvoices.invoice' })
    .populate({ path: 'boughtInvoices.organization' });
  if (!financer) return next(new AppError('Financer profile not found', 404));

  const listings = await Marketplace.find({ 'bids.financer': financer._id })
    .populate('invoice')
    .populate('organization');

  const bidsSummary = listings.map((listing) => {
    const allAmounts = listing.bids.map((b) => b.amount);
    const highestOnListing = Math.max(...allAmounts, 0);
    const myBids = listing.bids.filter(
      (b) => String(b.financer) === String(financer._id),
    );

    const activeMyBids = myBids.filter((b) => b.status === 'active');
    return {
      listingId: String(listing._id),
      invoiceId: String(listing.invoice._id),
      highestOnListing,
      activeBids: activeMyBids.map((b) => ({
        bidId: String(b._id),
        amount: b.amount,
        status: b.status,
      })),
      myHighestBid: myBids.length
        ? Math.max(...myBids.map((b) => b.amount))
        : 0,
    };
  });

  res.status(200).json({
    success: true,
    data: {
      financer: {
        id: String(financer._id),
        profile: financer.profile,
        balance: financer.balance,
        lockedBalance: financer.lockedBalance,
        stats: financer.stats,
      },
      boughtInvoices: financer.boughtInvoices || [],
      bids: bidsSummary,
    },
  });
});
