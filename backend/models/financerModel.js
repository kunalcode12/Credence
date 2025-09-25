const mongoose = require('mongoose');

const financerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    profile: {
      firstName: String,
      lastName: String,
      companyName: String,
      address: {
        street: String,
        city: String,
        state: String,
        country: String,
        zipCode: String,
      },
      documents: [{ label: String, url: String }],
    },
    balance: { type: Number, default: 0, min: 0 },
    lockedBalance: { type: Number, default: 0, min: 0 },
    ratings: { type: Number, default: 0, min: 0, max: 5 },
    stats: {
      bidsPlaced: { type: Number, default: 0 },
      invoicesWon: { type: Number, default: 0 },
      totalFinanced: { type: Number, default: 0 },
    },
    boughtInvoices: [
      {
        invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
        organization: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Organization',
        },
        amount: Number,
        boughtAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

financerSchema.index({ user: 1, unique: true });

financerSchema.methods.addBalance = async function (amount) {
  if (amount <= 0) throw new Error('Invalid amount');
  this.balance += amount;
  return this.save();
};

financerSchema.methods.lockFunds = async function (amount) {
  if (amount <= 0) throw new Error('Invalid amount');
  if (this.balance < amount) throw new Error('Insufficient balance');
  this.balance -= amount;
  this.lockedBalance += amount;
  return this.save();
};

financerSchema.methods.unlockFunds = async function (amount) {
  if (amount <= 0) throw new Error('Invalid amount');
  if (this.lockedBalance < amount)
    throw new Error('Insufficient locked balance');
  this.lockedBalance -= amount;
  this.balance += amount;
  return this.save();
};

financerSchema.methods.receivePayment = async function (amount) {
  if (amount <= 0) throw new Error('Invalid amount');
  this.balance += amount;
  return this.save();
};

module.exports = mongoose.model('Financer', financerSchema);
