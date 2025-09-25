const mongoose = require('mongoose');

const bidSchema = new mongoose.Schema(
  {
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    financer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Financer',
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'accepted', 'rejected'],
      default: 'active',
    },
  },
  { timestamps: true },
);

const marketplaceSchema = new mongoose.Schema(
  {
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
      required: true,
      unique: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    isOpen: { type: Boolean, default: true },
    bids: [bidSchema],
  },
  { timestamps: true },
);

marketplaceSchema.index({ invoice: 1 }, { unique: true });
marketplaceSchema.index({ isOpen: 1 });

module.exports = mongoose.model('Marketplace', marketplaceSchema);
