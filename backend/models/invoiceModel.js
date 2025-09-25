const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
  unitPrice: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative'],
  },
  discount: {
    type: Number,
    default: 0,
    min: [0, 'Discount cannot be negative'],
    max: [100, 'Discount cannot exceed 100%'],
  },
  tax: {
    type: Number,
    default: 0,
    min: [0, 'Tax cannot be negative'],
  },
  total: {
    type: Number,
    required: true,
  },
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: false,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    currentOwner: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'currentOwnerModel',
    },
    currentOwnerModel: {
      type: String,
      enum: ['Organization', 'Financer'],
      default: 'Organization',
    },
    items: [invoiceItemSchema],
    subtotal: {
      type: Number,
      required: true,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paidAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: [
        'draft',
        'sent',
        'viewed',
        'partially_paid',
        'paid',
        'overdue',
        'cancelled',
      ],
      default: 'draft',
    },
    currency: {
      type: String,
      default: 'INR',
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    paymentTerms: {
      type: Number,
      default: 30,
    },
    notes: String,
    termsAndConditions: String,
    // Indicates if this invoice is currently listed on the marketplace (open for bids)
    isOnBid: { type: Boolean, default: false },
    paymentHistory: [
      {
        amount: Number,
        paidAt: Date,
        paymentMethod: String,
        transactionId: String,
        notes: String,
      },
    ],
    sentAt: Date,
    viewedAt: Date,
    paidAt: Date,
    remindersSent: [
      {
        sentAt: Date,
        type: String,
      },
    ],
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    sold: {
      isSold: { type: Boolean, default: false },
      soldTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Financer' },
      soldAmount: { type: Number },
      soldAt: { type: Date },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
invoiceSchema.index({ invoiceNumber: 1, unique: true });
invoiceSchema.index({ organization: 1 });
invoiceSchema.index({ customer: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ createdAt: -1 });

// Virtuals
invoiceSchema.virtual('remainingAmount').get(function () {
  return this.totalAmount - this.paidAmount;
});

invoiceSchema.virtual('isOverdue').get(function () {
  return this.status !== 'paid' && this.dueDate < new Date();
});

invoiceSchema.virtual('daysUntilDue').get(function () {
  const days = Math.ceil((this.dueDate - new Date()) / (1000 * 60 * 60 * 24));
  return days;
});

// Pre-save middleware
invoiceSchema.pre('save', function (next) {
  if (this.isNew) {
    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;
    let discountAmount = 0;

    this.items.forEach((item) => {
      const itemTotal = item.quantity * item.unitPrice;
      const itemDiscount = (itemTotal * item.discount) / 100;
      const itemTax = ((itemTotal - itemDiscount) * item.tax) / 100;

      item.total = itemTotal - itemDiscount + itemTax;
      subtotal += itemTotal;
      discountAmount += itemDiscount;
      taxAmount += itemTax;
    });

    this.subtotal = subtotal;
    this.taxAmount = taxAmount;
    this.discountAmount = discountAmount;
    this.totalAmount = subtotal - discountAmount + taxAmount;
  }

  // Update status based on payment
  if (this.paidAmount >= this.totalAmount && this.status !== 'cancelled') {
    this.status = 'paid';
    if (!this.paidAt) this.paidAt = new Date();
    // If invoice fully paid, it cannot be on bid
    this.isOnBid = false;
  } else if (this.paidAmount > 0 && this.status !== 'cancelled') {
    this.status = 'partially_paid';
  }

  // Check if overdue
  if (
    this.dueDate < new Date() &&
    this.status !== 'paid' &&
    this.status !== 'cancelled'
  ) {
    this.status = 'overdue';
  }

  next();
});

// Methods
invoiceSchema.methods.recordPayment = async function (paymentData) {
  const { amount, paymentMethod, transactionId, notes } = paymentData;

  if (amount > this.remainingAmount) {
    throw new Error('Payment amount exceeds remaining balance');
  }

  this.paymentHistory.push({
    amount,
    paidAt: new Date(),
    paymentMethod,
    transactionId,
    notes,
  });

  this.paidAmount += amount;

  return this.save();
};

invoiceSchema.methods.sendReminder = async function (
  type = 'payment_reminder',
) {
  this.remindersSent.push({
    sentAt: new Date(),
    type,
  });

  return this.save();
};

invoiceSchema.methods.cancel = async function (reason) {
  if (this.status === 'paid') {
    throw new Error('Cannot cancel paid invoice');
  }

  this.status = 'cancelled';
  this.metadata.set('cancellationReason', reason);
  this.metadata.set('cancelledAt', new Date());

  return this.save();
};

// Static methods
invoiceSchema.statics.getOverdueInvoices = function () {
  return this.find({
    dueDate: { $lt: new Date() },
    status: { $nin: ['paid', 'cancelled'] },
  });
};

invoiceSchema.statics.getInvoicesByDateRange = function (startDate, endDate) {
  return this.find({
    issueDate: {
      $gte: startDate,
      $lte: endDate,
    },
  });
};

module.exports = mongoose.model('Invoice', invoiceSchema);
