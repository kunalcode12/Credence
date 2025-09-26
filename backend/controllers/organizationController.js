const Organization = require('../models/organizationModel');
const Invoice = require('../models/invoiceModel');
const Customer = require('../models/customerModel');
const { validationResult } = require('express-validator');
const { AppError } = require('../utils/appError');
const { asyncHandler } = require('../utils/asyncHandler');
const { logger } = require('../utils/logger');
const Notification = require('../models/notificationModel');
const Marketplace = require('../models/marketplaceModel');
const Financer = require('../models/financerModel');

exports.createProfile = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400, errors.array()));
  }

  const existingProfile = await Organization.findOne({ user: req.user.id });
  if (existingProfile) {
    return next(new AppError('Organization profile already exists', 409));
  }

  const organizationData = {
    user: req.user.id,
    ...req.body,
  };

  const organization = await Organization.create(organizationData);

  logger.info(`Organization profile created for user: ${req.user.email}`);

  res.status(201).json({
    success: true,
    message: 'Organization profile created successfully',
    data: { organization },
  });
});

// exports.getProfile = asyncHandler(async (req, res, next) => {
//   const organization = await Organization.findOne({ user: req.user.id })
//     .populate('invoices.created')
//     .populate({
//       path: 'invoices.sent.invoice',
//       select: 'invoiceNumber totalAmount status',
//     })
//     .populate({
//       path: 'invoices.sent.sentTo',
//       select: 'firstName lastName',
//     });

//   console.log('This is first one.....');

//   if (!organization) {
//     return next(new AppError('Organization profile not found', 404));
//   }

//   res.status(200).json({
//     success: true,
//     data: { organization },
//   });
// });

exports.updateProfile = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400, errors.array()));
  }

  const updates = { ...req.body };
  delete updates.user;
  delete updates.invoices;
  delete updates.revenue;
  delete updates.gstId;

  const organization = await Organization.findOneAndUpdate(
    { user: req.user.id },
    { $set: updates },
    { new: true, runValidators: true },
  );

  if (!organization) {
    return next(new AppError('Organization profile not found', 404));
  }

  logger.info(`Organization profile updated: ${req.user.email}`);

  res.status(200).json({
    success: true,
    message: 'Profile updated successfully',
    data: { organization },
  });
});

exports.getRevenue = asyncHandler(async (req, res, next) => {
  const organization = await Organization.findOne({ user: req.user.id }).select(
    'revenue',
  );

  if (!organization) {
    return next(new AppError('Organization profile not found', 404));
  }

  res.status(200).json({
    success: true,
    data: organization.revenue,
  });
});

exports.createInvoice = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400, errors.array()));
  }

  const organization = await Organization.findOne({ user: req.user.id });

  if (!organization) {
    return next(new AppError('Organization profile not found', 404));
  }

  const {
    items,
    dueDate,
    notes,
    termsAndConditions,
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount,
  } = req.body;

  const invoiceData = {
    // customer is intentionally NOT set at creation time
    items,
    dueDate,
    notes,
    termsAndConditions,
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount,
    currency: organization.settings.defaultCurrency,
    paymentTerms: organization.settings.defaultPaymentTerms,
  };

  try {
    const invoice = await organization.createInvoice(invoiceData);

    logger.info(
      `Invoice created by organization ${organization.name}: ${invoice.invoiceNumber}`,
    );

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: { invoice },
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

exports.getInvoices = asyncHandler(async (req, res, next) => {
  const {
    status,
    sortBy = 'dueDate',
    order = 'asc',
    dueBefore,
    dueAfter,
    email,
    minTotal,
    maxTotal,
    unsentOnly,
  } = req.query;

  const organization = await Organization.findOne({ user: req.user.id });
  if (!organization) {
    return next(new AppError('Organization profile not found', 404));
  }

  const query = { _id: { $in: organization.invoices.created } };
  if (status) query.status = status;
  if (unsentOnly === 'true') query.customer = null;
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

  // Filter by customer email via lookup
  if (email) {
    const users = await require('../models/userModal')
      .find({ email: { $regex: email, $options: 'i' } })
      .select('_id');
    const userIds = users.map((u) => u._id);
    const customers = await Customer.find({ user: { $in: userIds } }).select(
      '_id',
    );
    const customerIds = customers.map((c) => c._id);
    query.customer = { $in: customerIds };
  }

  const invoices = await Invoice.find(query)
    .populate({ path: 'customer', populate: { path: 'user', select: 'email' } })
    .sort({ [sortBy]: order === 'asc' ? 1 : -1 });

  res.status(200).json({
    success: true,
    data: {
      invoices,
      total: invoices.length,
      stats: {
        draft: invoices.filter((i) => i.status === 'draft').length,
        sent: invoices.filter((i) => i.status === 'sent').length,
        paid: invoices.filter((i) => i.status === 'paid').length,
        overdue: invoices.filter((i) => i.status === 'overdue').length,
        unsent: invoices.filter((i) => !i.customer).length,
      },
    },
  });
});

exports.getInvoiceById = asyncHandler(async (req, res, next) => {
  const { invoiceId } = req.params;

  const organization = await Organization.findOne({ user: req.user.id });

  if (!organization) {
    return next(new AppError('Organization profile not found', 404));
  }

  const invoice = await Invoice.findById(invoiceId)
    .populate({ path: 'customer', populate: { path: 'user', select: 'email' } })
    .populate('organization')
    .populate({
      path: 'sold.soldTo',
      select: 'user profile',
      populate: { path: 'user', select: 'email' },
    })
    .populate('items');

  if (!invoice) {
    return next(new AppError('Invoice not found', 404));
  }

  if (!invoice.organization._id.equals(organization._id)) {
    return next(new AppError('Unauthorized to view this invoice', 403));
  }

  res.status(200).json({
    success: true,
    data: { invoice },
  });
});

exports.updateInvoice = asyncHandler(async (req, res, next) => {
  const { invoiceId } = req.params;
  const updates = req.body;

  const organization = await Organization.findOne({ user: req.user.id });

  if (!organization) {
    return next(new AppError('Organization profile not found', 404));
  }

  const invoice = await Invoice.findById(invoiceId);

  if (!invoice) {
    return next(new AppError('Invoice not found', 404));
  }

  if (!invoice.organization.equals(organization._id)) {
    return next(new AppError('Unauthorized to update this invoice', 403));
  }

  if (invoice.status !== 'draft') {
    return next(new AppError('Can only update draft invoices', 400));
  }

  Object.assign(invoice, updates);
  await invoice.save();

  logger.info(
    `Invoice updated by organization ${organization.name}: ${invoice.invoiceNumber}`,
  );

  res.status(200).json({
    success: true,
    message: 'Invoice updated successfully',
    data: { invoice },
  });
});

exports.sendInvoice = asyncHandler(async (req, res, next) => {
  const { invoiceId } = req.params;
  const { customerId } = req.body;

  const organization = await Organization.findOne({ user: req.user.id });

  if (!organization) {
    return next(new AppError('Organization profile not found', 404));
  }

  const invoice = await Invoice.findById(invoiceId);

  if (!invoice) {
    return next(new AppError('Invoice not found', 404));
  }

  if (!invoice.organization.equals(organization._id)) {
    return next(new AppError('Unauthorized to send this invoice', 403));
  }

  // Attach customer at send-time
  const customer = await Customer.findById(customerId);
  if (!customer) return next(new AppError('Customer not found', 404));
  invoice.customer = customer._id;

  customer.invoices.all.push(invoice._id);
  customer.invoices.pending.push(invoice._id);
  await customer.save();

  invoice.status = 'sent';
  invoice.sentAt = new Date();
  await invoice.save();

  organization.invoices.sent.push({
    invoice: invoiceId,
    sentTo: invoice.customer,
    sentAt: new Date(),
  });
  await organization.save();

  logger.info(
    `Invoice sent by organization ${organization.name}: ${invoice.invoiceNumber}`,
  );

  // Notify the customer that a new invoice has been sent
  try {
    console.log('Creating a notification.......');
    await Notification.create({
      user: invoice.customer,
      role: 'customer',
      type: 'invoice_sent',
      title: 'New invoice received',
      message: `You received invoice ${invoice.invoiceNumber} from ${organization.name}.`,
      data: {
        invoiceId: String(invoice._id),
        invoiceNumber: invoice.invoiceNumber,
        orgName: organization.name,
      },
      key: `sent:${invoice._id}`,
    });
  } catch (e) {}

  res.status(200).json({
    success: true,
    message: 'Invoice sent successfully',
    data: { invoice },
  });
});

exports.deleteInvoice = asyncHandler(async (req, res, next) => {
  const { invoiceId } = req.params;

  const organization = await Organization.findOne({ user: req.user.id });

  if (!organization) {
    return next(new AppError('Organization profile not found', 404));
  }

  try {
    await organization.deleteInvoice(invoiceId);

    logger.info(
      `Invoice deleted by organization ${organization.name}: ${invoiceId}`,
    );

    res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

exports.getInvoicesByDueDate = asyncHandler(async (req, res, next) => {
  const organization = await Organization.findOne({ user: req.user.id });

  if (!organization) {
    return next(new AppError('Organization profile not found', 404));
  }

  const invoices = await organization.getInvoicesSortedByDueDate();

  res.status(200).json({
    success: true,
    data: {
      invoices,
      upcoming: invoices.filter(
        (i) => i.daysUntilDue > 0 && i.daysUntilDue <= 7,
      ),
      overdue: invoices.filter((i) => i.isOverdue),
    },
  });
});

// Return only invoices in 'sent' status with full details for listing on marketplace
exports.getSentInvoicesFull = asyncHandler(async (req, res, next) => {
  const organization = await Organization.findOne({ user: req.user.id });
  if (!organization)
    return next(new AppError('Organization profile not found', 404));

  const invoices = await Invoice.find({
    organization: organization._id,
    status: 'sent',
    'sold.isSold': { $ne: true },
  })
    .populate({ path: 'customer', populate: { path: 'user', select: 'email' } })
    .populate('organization')
    .populate('items');

  return res.status(200).json({ success: true, data: { invoices } });
});

// Organization profile with categorized invoices
exports.getProfile = asyncHandler(async (req, res, next) => {
  const organization = await Organization.findOne({ user: req.user.id })
    .populate('invoices.created')
    .populate({
      path: 'invoices.sent.invoice',
      select: 'invoiceNumber totalAmount status dueDate customer',
    });

  if (!organization) {
    return next(new AppError('Organization profile not found', 404));
  }

  const allInvoices = await Invoice.find({
    organization: organization._id,
  }).populate({
    path: 'sold.soldTo',
    select: 'user profile',
    populate: { path: 'user', select: 'email' },
  });
  const paid = allInvoices.filter((i) => i.status === 'paid');
  const sent = allInvoices.filter(
    (i) =>
      i.status === 'sent' ||
      i.status === 'viewed' ||
      i.status === 'partially_paid',
  );
  // Exclude financed (sold) invoices from sent
  const sentUnfinanced = sent.filter((i) => !(i.sold && i.sold.isSold));
  const createdUnsent = allInvoices.filter(
    (i) => i.status === 'draft' && !i.customer,
  );
  const financed = allInvoices.filter((i) => i.sold?.isSold);

  console.log('This is 2nd one....');

  res.status(200).json({
    success: true,
    data: {
      organization,
      invoices: {
        all: allInvoices,
        sent: sentUnfinanced,
        paid,
        createdUnsent,
        financed,
      },
    },
  });
});

// List invoices with any bids
exports.getBiddedInvoices = asyncHandler(async (req, res, next) => {
  const organization = await Organization.findOne({ user: req.user.id });
  if (!organization)
    return next(new AppError('Organization profile not found', 404));
  // Include listings with and without bids
  const listings = await Marketplace.find({
    organization: organization._id,
    isOpen: true,
  })
    .populate('invoice')
    .populate({
      path: 'bids.financer',
      select: 'user profile',
      populate: { path: 'user', select: 'email' },
    });
  res.status(200).json({ success: true, data: { listings } });
});

// List invoices sold to financers
exports.getFinancedInvoices = asyncHandler(async (req, res, next) => {
  const organization = await Organization.findOne({ user: req.user.id });
  if (!organization)
    return next(new AppError('Organization profile not found', 404));
  const invoices = await Invoice.find({
    organization: organization._id,
    'sold.isSold': true,
  }).populate({
    path: 'sold.soldTo',
    select: 'user profile',
    populate: { path: 'user', select: 'email' },
  });
  res.status(200).json({ success: true, data: { invoices } });
});

// Search customers by email (regex) and return minimal info
exports.getCustomerByEmail = asyncHandler(async (req, res, next) => {
  const { q } = req.query;
  if (!q || String(q).trim() === '')
    return res.status(200).json({ success: true, data: { results: [] } });
  const User = require('../models/userModal');
  const users = await User.find({ email: { $regex: q, $options: 'i' } }).select(
    '_id email',
  );
  const userIdToEmail = new Map(users.map((u) => [String(u._id), u.email]));
  const customers = await Customer.find({
    user: { $in: users.map((u) => u._id) },
  }).select('_id user firstName lastName');
  const results = customers.map((c) => ({
    id: String(c._id),
    email: userIdToEmail.get(String(c.user)) || '',
    firstName: c.firstName,
    lastName: c.lastName,
  }));
  res.status(200).json({ success: true, data: { results } });
});
