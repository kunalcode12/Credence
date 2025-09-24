const { body, param, query } = require('express-validator');

exports.validateSignup = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),

  body('phoneNumber')
    .matches(/^[0-9]{10,15}$/)
    .withMessage('Please provide a valid phone number'),
];

exports.validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
];

exports.validateCustomerProfile = [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('address.city')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('City is required if address is provided'),
];

exports.validateOrganizationProfile = [
  body('name').trim().notEmpty().withMessage('Organization name is required'),
  // body('gstId')
  //   .matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
  //   .withMessage('Invalid GST ID format'),
  // body('panNumber')
  //   .matches(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
  //   .withMessage('Invalid PAN format'),
  body('address.street').notEmpty().withMessage('Street address is required'),
  body('address.city').notEmpty().withMessage('City is required'),
  body('address.state').notEmpty().withMessage('State is required'),
  body('address.country').notEmpty().withMessage('Country is required'),
  body('address.zipCode').notEmpty().withMessage('Zip code is required'),
];

exports.validateInvoice = [
  // body('customerId').isMongoId().withMessage('Invalid customer ID'),
  // body('items')
  //   .isArray({ min: 1 })
  //   .withMessage('At least one item is required'),
  // body('items.*.description')
  //   .notEmpty()
  //   .withMessage('Item description is required'),
  // body('items.*.quantity')
  //   .isInt({ min: 1 })
  //   .withMessage('Quantity must be at least 1'),
  // body('items.*.unitPrice')
  //   .isFloat({ min: 0 })
  //   .withMessage('Unit price must be positive'),
  // body('dueDate')
  //   .isISO8601()
  //   .withMessage('Valid due date is required')
  //   .custom((value) => {
  //     if (new Date(value) <= new Date()) {
  //       throw new Error('Due date must be in the future');
  //     }
  //     return true;
  //   }),
];

exports.validatePayment = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Payment amount must be positive'),
  param('invoiceId').isMongoId().withMessage('Invalid invoice ID'),
];
