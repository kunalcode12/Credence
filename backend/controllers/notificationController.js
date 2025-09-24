const Notification = require('../models/notificationModel');
const { asyncHandler } = require('../utils/asyncHandler');
const { AppError } = require('../utils/appError');
const Invoice = require('../models/invoiceModel');

exports.list = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(parseInt(req.query.limit) || 100);
  res.status(200).json({ success: true, data: { notifications } });
});

exports.markSeen = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const notif = await Notification.findOne({ _id: id, user: req.user.id });
  if (!notif) return next(new AppError('Notification not found', 404));
  notif.seen = true;
  await notif.save();
  res.status(200).json({ success: true, data: { notification: notif } });
});

exports.markAllSeen = asyncHandler(async (req, res) => {
  await Notification.updateMany(
    { user: req.user.id, seen: false },
    { $set: { seen: true } },
  );
  res.status(200).json({ success: true });
});

// Create due-date notifications (idempotent-ish via key)
exports.runDueChecks = asyncHandler(async (req, res) => {
  const now = new Date();
  const in7d = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const in1d = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);

  const invoices = await Invoice.find({
    status: { $in: ['draft', 'sent', 'viewed', 'partially_paid', 'overdue'] },
  }).select(
    '_id customer organization dueDate invoiceNumber status totalAmount paidAmount',
  );

  let created = 0;
  for (const inv of invoices) {
    const due = inv.dueDate;
    if (!due) continue;

    // 7-day notification
    if (due > now && due <= in7d) {
      await Notification.updateOne(
        { key: `due7:${inv._id}` },
        {
          $setOnInsert: {
            user: inv.customer,
            role: 'customer',
            type: 'invoice_due_7d',
            title: 'Invoice due in 7 days',
            message: `Invoice ${inv.invoiceNumber} is due within 7 days`,
            data: {
              invoiceId: String(inv._id),
              invoiceNumber: inv.invoiceNumber,
              dueDate: due,
            },
            key: `due7:${inv._id}`,
          },
        },
        { upsert: true },
      );
      created++;
    }

    // 1-day notification
    if (due > now && due <= in1d) {
      await Notification.updateOne(
        { key: `due1:${inv._id}` },
        {
          $setOnInsert: {
            user: inv.customer,
            role: 'customer',
            type: 'invoice_due_1d',
            title: 'Invoice due tomorrow',
            message: `Invoice ${inv.invoiceNumber} is due in 1 day`,
            data: {
              invoiceId: String(inv._id),
              invoiceNumber: inv.invoiceNumber,
              dueDate: due,
            },
            key: `due1:${inv._id}`,
          },
        },
        { upsert: true },
      );
      created++;
    }

    // Overdue notification for organization
    if (
      inv.status === 'overdue' ||
      (due < now && inv.status !== 'paid' && inv.status !== 'cancelled')
    ) {
      await Notification.updateOne(
        { key: `overdue:${inv._id}` },
        {
          $setOnInsert: {
            user: inv.organization,
            role: 'organization',
            type: 'invoice_overdue',
            title: 'Invoice overdue',
            message: `Invoice ${inv.invoiceNumber} is overdue`,
            data: {
              invoiceId: String(inv._id),
              invoiceNumber: inv.invoiceNumber,
              customerId: String(inv.customer),
            },
            key: `overdue:${inv._id}`,
          },
        },
        { upsert: true },
      );
      created++;
    }
  }

  res.status(200).json({ success: true, data: { created } });
});
