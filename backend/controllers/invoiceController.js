const Invoice = require('../models/invoiceModel');
const { AppError } = require('../utils/appError');
const { asyncHandler } = require('../utils/asyncHandler');

exports.getOverdueInvoices = asyncHandler(async (req, res, next) => {
  const invoices = await Invoice.getOverdueInvoices()
    .populate('customer', 'firstName lastName email')
    .populate('organization', 'name');

  res.status(200).json({
    success: true,
    data: {
      invoices,
      total: invoices.length,
      totalAmount: invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0),
    },
  });
});

exports.getInvoicesByDateRange = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return next(new AppError('Start date and end date are required', 400));
  }

  const invoices = await Invoice.getInvoicesByDateRange(
    new Date(startDate),
    new Date(endDate),
  )
    .populate('customer', 'firstName lastName')
    .populate('organization', 'name');

  res.status(200).json({
    success: true,
    data: {
      invoices,
      total: invoices.length,
      totalRevenue: invoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
      totalPaid: invoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
    },
  });
});
