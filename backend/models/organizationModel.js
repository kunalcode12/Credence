const mongoose = require('mongoose');
const { couldStartTrivia } = require('typescript');

const organizationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true,
    },
    gstId: {
      type: String,
      required: [true, 'GST ID is required'],
      unique: true,
      uppercase: true,
      // match: [
      //   /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      //   'Invalid GST ID format',
      // ],
    },
    panNumber: {
      type: String,
      required: true,
      uppercase: true,
      // match: [/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format'],
    },
    registrationNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    address: {
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      zipCode: { type: String, required: true },
    },
    bankDetails: {
      accountNumber: String,
      accountHolderName: String,
      bankName: String,
      ifscCode: String,
      swiftCode: String,
    },
    invoices: {
      created: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Invoice',
        },
      ],
      sent: [
        {
          invoice: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Invoice',
          },
          sentTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
          },
          sentAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      received: [
        {
          invoice: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Invoice',
          },
          fromCustomer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Customer',
          },
          paidAt: {
            type: Date,
            default: Date.now,
          },
          amount: Number,
        },
      ],
      financed: [
        {
          invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
          soldTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Financer' },
          soldAmount: Number,
          soldAt: { type: Date, default: Date.now },
        },
      ],
    },
    revenue: {
      total: { type: Number, default: 0 },
      pending: { type: Number, default: 0 },
      received: { type: Number, default: 0 },
    },
    invoicePrefix: {
      type: String,
      default: 'INV',
    },
    nextInvoiceNumber: {
      type: Number,
      default: 1,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationDocuments: [
      {
        type: String,
        url: String,
        uploadedAt: Date,
      },
    ],
    settings: {
      defaultPaymentTerms: {
        type: Number,
        default: 30,
      },
      defaultCurrency: {
        type: String,
        default: 'INR',
      },
      invoiceFooter: String,
      emailNotifications: {
        type: Boolean,
        default: true,
      },
    },
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
organizationSchema.index({ user: 1, unique: true });
organizationSchema.index({ gstId: 1, unique: true });
organizationSchema.index({ name: 'text' });
organizationSchema.index({ createdAt: -1 });

// Methods
organizationSchema.methods.generateInvoiceNumber = function () {
  const number = `${this.invoicePrefix}-${String(this.nextInvoiceNumber).padStart(6, '0')}`;
  this.nextInvoiceNumber += 2;
  // console.log('Next Invoice Number:', this.nextInvoiceNumber);
  // console.log('Generated Invoice Number:', number);
  return number;
};

organizationSchema.methods.createInvoice = async function (invoiceData) {
  const Invoice = mongoose.model('Invoice');

  const invoiceNumber = this.generateInvoiceNumber();

  const invoice = new Invoice({
    ...invoiceData,
    invoiceNumber,
    organization: this._id,
    createdBy: this._id,
    currentOwner: this._id,
  });

  await invoice.save();

  this.invoices.created.push(invoice._id);
  this.revenue.total += invoice.totalAmount;
  this.revenue.pending += invoice.totalAmount;

  await this.save();

  return invoice;
};

organizationSchema.methods.getInvoicesSortedByDueDate = async function () {
  const Invoice = mongoose.model('Invoice');
  return await Invoice.find({
    _id: { $in: this.invoices.created },
  }).sort({ dueDate: 1 });
};

organizationSchema.methods.deleteInvoice = async function (invoiceId) {
  const Invoice = mongoose.model('Invoice');
  const invoice = await Invoice.findById(invoiceId);

  if (!invoice) throw new Error('Invoice not found');
  if (!invoice.organization.equals(this._id))
    throw new Error('Unauthorized to delete this invoice');
  if (invoice.status !== 'draft')
    throw new Error('Can only delete draft invoices');

  this.invoices.created = this.invoices.created.filter(
    (id) => !id.equals(invoiceId),
  );
  this.revenue.total -= invoice.totalAmount;
  this.revenue.pending -= invoice.remainingAmount;

  await invoice.deleteOne();
  await this.save();

  return true;
};

module.exports = mongoose.model('Organization', organizationSchema);
