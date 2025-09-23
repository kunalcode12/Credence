require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { errorHandler } = require('./src/middleware/errorHandler');
const { logger } = require('./src/utils/logger');
const routes = require('./src/routes');
const rateLimiter = require('./src/middleware/rateLimiter');

const app = express();

// Security Middleware
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(
  morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  }),
);

// Rate Limiting
app.use('/api/', rateLimiter);

// API Routes
app.use('/api/v1', routes);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Error Handler
app.use(errorHandler);

// Database Connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    logger.info('MongoDB connected successfully');
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => {
      logger.info(
        `Server running on port ${PORT} in ${process.env.NODE_ENV} mode`,
      );
    });
  })
  .catch((err) => {
    logger.error('MongoDB connection failed:', err);
    process.exit(1);
  });

// Graceful Shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received.');
  mongoose.connection.close(() => {
    logger.info('MongoDB connection closed.');
    process.exit(0);
  });
});
