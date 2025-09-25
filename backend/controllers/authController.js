const User = require('../models/userModal');
const Customer = require('../models/customerModel');
const Organization = require('../models/organizationModel');
const { validationResult } = require('express-validator');
const { AppError } = require('../utils/appError');
const { asyncHandler } = require('../utils/asyncHandler');
const { logger } = require('../utils/logger');

exports.signup = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  console.log('Errors checking: ', errors);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400, errors.array()));
  }

  const { email, password, confirmPassword, phoneNumber } = req.body;

  if (password !== confirmPassword) {
    return next(new AppError('Passwords do not match', 400));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new AppError('Email already registered', 409));
  }

  const user = await User.create({
    email,
    password,
    phoneNumber,
  });

  const token = user.generateAuthToken();

  logger.info(`New user registered: ${email}`);

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please choose your role.',
    data: {
      user: {
        id: user._id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
      token,
    },
  });
});

exports.login = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError('Validation failed', 400, errors.array()));
  }

  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return next(new AppError('Invalid email or password', 401));
  }

  if (user.isLocked) {
    return next(
      new AppError(
        'Account is locked due to multiple failed login attempts',
        423,
      ),
    );
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    await user.incLoginAttempts();
    return next(new AppError('Invalid email or password', 401));
  }

  await user.resetLoginAttempts();

  const token = user.generateAuthToken();

  logger.info(`User logged in: ${email}`);

  res.status(200).json({
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user._id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
      token,
    },
  });
});

exports.chooseRole = asyncHandler(async (req, res, next) => {
  const { role } = req.body;
  const userId = req.user.id;

  if (!['customer', 'organization', 'financer'].includes(role)) {
    return next(new AppError('Invalid role selection', 400));
  }

  const user = await User.findById(userId);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  if (user.role !== 'pending') {
    return next(new AppError('Role already assigned', 400));
  }

  user.role = role;
  await user.save();

  logger.info(`User ${user.email} selected role: ${role}`);

  res.status(200).json({
    success: true,
    message: `Role set as ${role}. Please complete your profile.`,
    data: {
      role,
      nextStep:
        role === 'customer'
          ? '/api/v1/customer/profile'
          : '/api/v1/organization/profile',
    },
  });
});

// Get current authenticated user and profile status
exports.me = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new AppError('User not found', 404));
  }

  let profile = { exists: false, id: null, type: null };

  if (user.role === 'customer') {
    const existing = await Customer.findOne({ user: user._id }).select('_id');
    if (existing)
      profile = { exists: true, id: existing._id, type: 'customer' };
  }

  if (user.role === 'organization') {
    const existing = await Organization.findOne({ user: user._id }).select(
      '_id',
    );
    if (existing)
      profile = { exists: true, id: existing._id, type: 'organization' };
  }

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
      profile,
    },
  });
});

// Logout (stateless JWT) - client should discard token
exports.logout = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, message: 'Logged out' });
});
