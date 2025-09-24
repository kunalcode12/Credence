const Customer = require('../models/customerModel');
const Invoice = require('../models/invoiceModel');
const { validationResult } = require('express-validator');
const { AppError } = require('../utils/appError');
const { asyncHandler } = require('../utils/asyncHandler');
const { logger } = require('../utils/logger');
const Notification = require('../models/notificationModel');

exports.createProfile = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400, errors.array()));
  }

  const existingProfile = await Customer.findOne({ user: req.user.id });
  if (existingProfile) {
    return next(new AppError('Profile already exists', 409));
  }

  const customerData = {
    user: req.user.id,
    ...req.body,
  };

  const customer = await Customer.create(customerData);

  logger.info(`Customer profile created for user: ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Customer profile created successfully',
    data: { customer },
  });
});

exports.getProfile = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findOne({ user: req.user.id })
    .populate('invoices.all')
    .populate('invoices.pending')
    .populate({
      path: 'invoices.paid.invoice',
      select: 'invoiceNumber totalAmount',
    })
    .populate({
      path: 'invoices.paid.paidTo',
      select: 'name',
    });

  if (!customer) {
    return next(new AppError('Customer profile not found', 404));
  }

  res.status(200).json({
    success: true,
    data: { customer },
  });
});

exports.updateProfile = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400, errors.array()));
  }

  const updates = { ...req.body };
  delete updates.user;
  delete updates.balance;
  delete updates.invoices;

  const customer = await Customer.findOneAndUpdate(
    { user: req.user.id },
    { $set: updates },
    { new: true, runValidators: true },
  );

  if (!customer) {
    return next(new AppError('Customer profile not found', 404));
  }

  logger.info(`Customer profile updated: ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: { customer },
  });
});

exports.getBalance = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findOne({ user: req.user.id }).select(
    'balance creditLimit totalSpent',
  );

  if (!customer) {
    return next(new AppError('Customer profile not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      balance: customer.balance,
      creditLimit: customer.creditLimit,
      availableCredit: customer.creditLimit - customer.totalSpent,
      totalSpent: customer.totalSpent,
    },
  });
});

exports.addBalance = asyncHandler(async (req, res, next) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return next(new AppError('Invalid amount', 400));
  }

  const customer = await Customer.findOne({ user: req.user.id });

  if (!customer) {
    return next(new AppError('Customer profile not found', 404));
  }

  await customer.updateBalance(amount, 'add');

  logger.info(`Balance added for customer ${req.user.email}: ${amount}`);

  res.status(200).json({
    success: true,
    message: 'Balance added successfully',
    data: {
      newBalance: customer.balance,
    },
  });
});

exports.getInvoices = asyncHandler(async (req, res, next) => {
  const { status, sortBy = 'dueDate', order = 'asc' } = req.query;

  const customer = await Customer.findOne({ user: req.user.id })
    .populate({
      path: 'invoices.all',
      match: status ? { status } : {},
      options: {
        sort: { [sortBy]: order === 'asc' ? 1 : -1 },
      },
    })
    .populate({
      path: 'invoices.pending',
      populate: {
        path: 'organization',
        select: 'name',
      },
    });

  if (!customer) {
    return next(new AppError('Customer profile not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      all: customer.invoices.all,
      pending: customer.invoices.pending,
      totalPending: customer.invoices.pending.length,
      totalPaid: customer.invoices.paid.length,
    },
  });
});

exports.payInvoice = asyncHandler(async (req, res, next) => {
  const { invoiceId } = req.params;
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return next(new AppError('Invalid payment amount', 400));
  }

  const customer = await Customer.findOne({ user: req.user.id });

  if (!customer) {
    return next(new AppError('Customer profile not found', 404));
  }

  try {
    await customer.payInvoice(invoiceId, amount);

    logger.info(
      `Invoice ${invoiceId} paid by customer ${req.user.email}: ${amount}`,
    );

    // Notify organization about payment
    try {
      const invoice = await Invoice.findById(invoiceId);
      await Notification.create({
        user: invoice.organization,
        role: 'organization',
        type: 'invoice_paid',
        title: 'Invoice paid',
        message: `Invoice ${invoice.invoiceNumber} has been paid by ${req.user.email}.`,
        data: { invoiceId: String(invoice._id), amount },
        key: `paid:${invoice._id}:${Date.now()}`,
      });
    } catch (e) {}

    res.status(200).json({
      success: true,
      message: 'Payment processed successfully',
      data: {
        remainingBalance: customer.balance,
        transactionId: `TXN${Date.now()}`,
      },
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

// Get a single invoice belonging to the authenticated customer
exports.getInvoice = asyncHandler(async (req, res, next) => {
  const { invoiceId } = req.params;

  const customer = await Customer.findOne({ user: req.user.id });

  if (!customer) {
    return next(new AppError('Customer profile not found', 404));
  }

  const Invoice = require('../models/invoiceModel');
  const invoice = await Invoice.findById(invoiceId)
    .populate('organization', 'name')
    .populate('customer', 'firstName lastName');

  if (!invoice) {
    return next(new AppError('Invoice not found', 404));
  }

  // Ensure invoice belongs to this customer
  if (!invoice.customer.equals(customer._id)) {
    return next(new AppError('Unauthorized to view this invoice', 403));
  }

  // Optionally restrict to unpaid invoice for payment flow
  const isUnpaid = !['paid', 'cancelled'].includes(invoice.status);

  res.status(200).json({
    success: true,
    data: { invoice, isUnpaid },
  });
});
