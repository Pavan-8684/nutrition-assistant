const ApiError = require('../utils/ApiError');

const notFound = (req, res, next) => {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = statusCode === 500 ? 'Internal server error' : err.message;
  let details = err.details || null;

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired authentication token';
  }

  if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate value violates a unique constraint';
    details = err.keyValue || null;
  }

  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid ${err.path}`;
    details = err.value;
  }

  if (req.log) {
    req.log.error({ err }, message);
  }

  res.status(statusCode).json({
    success: false,
    data: null,
    error: {
      message,
      details
    }
  });
};

module.exports = { notFound, errorHandler };
