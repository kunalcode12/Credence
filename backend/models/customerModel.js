const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      // unique: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Balance cannot be negative'],
    },
    creditLimit: {
      type: Number,
      default: 10000,
    },
    invoices: {
      all: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Invoice',
        },
      ],
      pending: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Invoice',
        },
      ],
      paid: [
        {
          invoice: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Invoice',
          },
          paidTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Organization',
          },
          paidAt: {
            type: Date,
            default: Date.now,
          },
          amount: Number,
          transactionId: String,
        },
      ],
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    preferredPaymentMethod: {
      type: String,
      enum: ['credit_card', 'debit_card', 'bank_transfer', 'cash', 'upi'],
      default: 'bank_transfer',
    },
    notes: String,
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Indexes
customerSchema.index({ user: 1, unique: true });
customerSchema.index({ 'invoices.pending': 1 });
customerSchema.index({ createdAt: -1 });

// Virtual for full name
customerSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Methods
customerSchema.methods.canAfford = function (amount) {
  return this.balance >= amount;
};

customerSchema.methods.updateBalance = async function (
  amount,
  operation = 'add',
) {
  if (operation === 'add') {
    this.balance += amount;
  } else if (operation === 'subtract') {
    if (this.balance < amount) {
      throw new Error('Insufficient balance');
    }
    this.balance -= amount;
    this.totalSpent += amount;
  }
  return this.save();
};

customerSchema.methods.payInvoice = async function (invoiceId, amount) {
  const Invoice = mongoose.model('Invoice');
  const invoice = await Invoice.findById(invoiceId).populate('organization');

  if (!invoice) throw new Error('Invoice not found');
  if (invoice.status === 'paid') throw new Error('Invoice already paid');
  if (amount > invoice.remainingAmount)
    throw new Error('Payment exceeds invoice amount');

  await this.updateBalance(amount, 'subtract');

  // Update invoice
  invoice.paidAmount += amount;
  if (invoice.paidAmount >= invoice.totalAmount) {
    invoice.status = 'paid';
    invoice.paidAt = Date.now();
  } else {
    invoice.status = 'partially_paid';
  }
  await invoice.save();

  // Move from pending to paid if fully paid
  if (invoice.status === 'paid') {
    this.invoices.pending = this.invoices.pending.filter(
      (id) => !id.equals(invoiceId),
    );
    this.invoices.paid.push({
      invoice: invoiceId,
      paidTo: invoice.organization._id,
      amount: amount,
      transactionId: `TXN${Date.now()}`,
    });
  }

  return this.save();
};

module.exports = mongoose.model('Customer', customerSchema);
