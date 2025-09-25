const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const customerRoutes = require('./customerRoutes');
const organizationRoutes = require('./organizationRoutes');
const invoiceRoutes = require('./invoiceRoutes');
const notificationRoutes = require('./notificationRoutes');
const marketplaceRoutes = require('./marketplaceRoutes');
const financerRoutes = require('./financerRoutes');

router.use('/auth', authRoutes);
router.use('/customer', customerRoutes);
router.use('/organization', organizationRoutes);
router.use('/invoices', invoiceRoutes);
router.use('/notifications', notificationRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/financer', financerRoutes);

// API documentation endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Invoice Management System API v1',
    endpoints: {
      auth: {
        signup: 'POST /api/v1/auth/signup',
        login: 'POST /api/v1/auth/login',
        chooseRole: 'POST /api/v1/auth/choose-role',
      },
      customer: {
        createProfile: 'POST /api/v1/customer/profile',
        getProfile: 'GET /api/v1/customer/profile',
        updateProfile: 'PATCH /api/v1/customer/profile',
        getBalance: 'GET /api/v1/customer/balance',
        addBalance: 'POST /api/v1/customer/balance/add',
        getInvoices: 'GET /api/v1/customer/invoices',
        payInvoice: 'POST /api/v1/customer/invoices/:invoiceId/pay',
      },
      organization: {
        createProfile: 'POST /api/v1/organization/profile',
        getProfile: 'GET /api/v1/organization/profile',
        updateProfile: 'PATCH /api/v1/organization/profile',
        getRevenue: 'GET /api/v1/organization/revenue',
        createInvoice: 'POST /api/v1/organization/invoices',
        getInvoices: 'GET /api/v1/organization/invoices',
        getInvoicesByDueDate: 'GET /api/v1/organization/invoices/by-due-date',
        getInvoiceById: 'GET /api/v1/organization/invoices/:invoiceId',
        updateInvoice: 'PATCH /api/v1/organization/invoices/:invoiceId',
        sendInvoice: 'POST /api/v1/organization/invoices/:invoiceId/send',
        deleteInvoice: 'DELETE /api/v1/organization/invoices/:invoiceId',
      },
      invoices: {
        getOverdue: 'GET /api/v1/invoices/overdue',
        getByDateRange: 'GET /api/v1/invoices/by-date-range',
      },
    },
    documentation:
      'For detailed API documentation, please refer to the README.md file',
  });
});

module.exports = router;
