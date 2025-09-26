const rateLimit = require('express-rate-limit');
const { AppError } = require('../utils/appError');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10000, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    next(new AppError(options.message, 429));
  },
});

module.exports = limiter;
