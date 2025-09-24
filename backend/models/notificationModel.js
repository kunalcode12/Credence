const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: {
      type: String,
      enum: ['customer', 'organization', 'financer', 'admin'],
      required: true,
    },
    type: {
      type: String,
      enum: [
        'invoice_sent',
        'invoice_due_7d',
        'invoice_due_1d',
        'invoice_paid',
        'invoice_overdue',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    data: { type: Map, of: mongoose.Schema.Types.Mixed },
    seen: { type: Boolean, default: false },
    key: { type: String, index: true },
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, seen: 1, createdAt: -1 });
notificationSchema.index({ key: 1 }, { unique: false });

module.exports = mongoose.model('Notification', notificationSchema);
