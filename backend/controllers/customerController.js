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
    .populate({
      path: 'invoices.all',
      populate: [
        {
          path: 'organization',
          select: 'name user',
          populate: { path: 'user', select: 'email' },
        },
        {
          path: 'currentOwner',
          select: 'name user profile',
          populate: { path: 'user', select: 'email' },
        },
      ],
    })
    .populate({
      path: 'invoices.pending',
      populate: [
        {
          path: 'organization',
          select: 'name user',
          populate: { path: 'user', select: 'email' },
        },
        {
          path: 'currentOwner',
          select: 'name user profile',
          populate: { path: 'user', select: 'email' },
        },
      ],
    })
    .populate({
      path: 'invoices.paid.invoice',
      select: 'invoiceNumber totalAmount organization',
      populate: {
        path: 'organization',
        select: 'name user',
        populate: { path: 'user', select: 'email' },
      },
    })
    .populate({
      path: 'invoices.paid.paidTo',
      select: 'name user profile',
      populate: { path: 'user', select: 'email' },
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
  const {
    status,
    sortBy = 'dueDate',
    order = 'asc',
    dueBefore,
    dueAfter,
    email, // organization email
    financerEmail,
    minTotal,
    maxTotal,
    unpaidOnly,
  } = req.query;

  const customer = await Customer.findOne({ user: req.user.id });

  if (!customer) {
    return next(new AppError('Customer profile not found', 404));
  }

  const query = { customer: customer._id };
  if (status) query.status = status;
  if (unpaidOnly === 'true') query.status = { $nin: ['paid', 'cancelled'] };
  if (dueBefore || dueAfter) {
    query.dueDate = {};
    if (dueBefore) query.dueDate.$lte = new Date(dueBefore);
    if (dueAfter) query.dueDate.$gte = new Date(dueAfter);
  }
  if (minTotal || maxTotal) {
    query.totalAmount = {};
    if (minTotal) query.totalAmount.$gte = Number(minTotal);
    if (maxTotal) query.totalAmount.$lte = Number(maxTotal);
  }

  // Filter by organization email
  if (email) {
    const users = await require('../models/userModal')
      .find({ email: { $regex: email, $options: 'i' } })
      .select('_id');
    const userIds = users.map((u) => u._id);
    const organizations = await require('../models/organizationModel')
      .find({ user: { $in: userIds } })
      .select('_id');
    const orgIds = organizations.map((o) => o._id);
    query.organization = { $in: orgIds };
  }

  // Filter by financer email
  if (financerEmail) {
    const users = await require('../models/userModal')
      .find({ email: { $regex: financerEmail, $options: 'i' } })
      .select('_id');
    const Financer = require('../models/financerModel');
    const financers = await Financer.find({
      user: { $in: users.map((u) => u._id) },
    }).select('_id');
    const finIds = financers.map((f) => f._id);
    query.currentOwner = { $in: finIds };
    query.currentOwnerModel = 'Financer';
  }

  const invoices = await Invoice.find(query)
    .populate({
      path: 'organization',
      select: 'name user',
      populate: { path: 'user', select: 'email' },
    })
    .sort({ [sortBy]: order === 'asc' ? 1 : -1 });

  res.status(200).json({
    success: true,
    data: {
      all: invoices,
      pending: invoices.filter(
        (i) => i.status !== 'paid' && i.status !== 'cancelled',
      ),
      totalPending: invoices.filter(
        (i) => i.status !== 'paid' && i.status !== 'cancelled',
      ).length,
      totalPaid: invoices.filter((i) => i.status === 'paid').length,
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

// Get a single invoice with full details belonging to the authenticated customer
exports.getInvoiceById = asyncHandler(async (req, res, next) => {
  const { invoiceId } = req.params;

  const customer = await Customer.findOne({ user: req.user.id });

  if (!customer) {
    return next(new AppError('Customer profile not found', 404));
  }

  const Invoice = require('../models/invoiceModel');
  const invoice = await Invoice.findById(invoiceId)
    .populate({
      path: 'organization',
      select: 'name user',
      populate: { path: 'user', select: 'email' },
    })
    .populate({
      path: 'customer',
      select: 'firstName lastName user',
      populate: { path: 'user', select: 'email' },
    })
    .populate({
      path: 'currentOwner',
      select: 'name user profile',
      populate: { path: 'user', select: 'email' },
    })
    .populate('items');

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

// Search organizations or financers by email (regex) and return minimal info
exports.getOrganizationByEmail = asyncHandler(async (req, res, next) => {
  const { q } = req.query;
  if (!q || String(q).trim() === '')
    return res.status(200).json({ success: true, data: { results: [] } });
  const User = require('../models/userModal');
  const users = await User.find({ email: { $regex: q, $options: 'i' } }).select(
    '_id email',
  );
  const userIdToEmail = new Map(users.map((u) => [String(u._id), u.email]));
  const Organization = require('../models/organizationModel');
  const orgs = await Organization.find({
    user: { $in: users.map((u) => u._id) },
  }).select('_id user name');
  const Financer = require('../models/financerModel');
  const fins = await Financer.find({
    user: { $in: users.map((u) => u._id) },
  }).select('_id user profile');
  const results = orgs
    .map((o) => ({
      id: String(o._id),
      email: userIdToEmail.get(String(o.user)) || '',
      name: o.name,
      type: 'organization',
    }))
    .concat(
      fins.map((f) => ({
        id: String(f._id),
        email: userIdToEmail.get(String(f.user)) || '',
        name:
          f.profile?.companyName ||
          `${f.profile?.firstName || ''} ${f.profile?.lastName || ''}`.trim(),
        type: 'financer',
      })),
    );
  res.status(200).json({ success: true, data: { results } });
});
