const { logger } = require('../utils/logger');

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = undefined) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

const badRequest = (message, details) => new AppError(message, 400, 'BAD_REQUEST', details);
const unauthorized = (message = 'Unauthorized') => new AppError(message, 401, 'UNAUTHORIZED');
const forbidden = (message = 'Forbidden') => new AppError(message, 403, 'FORBIDDEN');
const notFound = (message = 'Resource not found') => new AppError(message, 404, 'NOT_FOUND');
const conflict = (message, details) => new AppError(message, 409, 'CONFLICT', details);

const normalizeError = (err) => {
  if (err instanceof AppError) return err;

  if (err.name === 'SequelizeValidationError') {
    return badRequest('Validation failed', err.errors?.map((e) => ({
      field: e.path,
      message: e.message,
      value: e.value
    })));
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return conflict('Duplicate resource', err.errors?.map((e) => ({
      field: e.path,
      message: e.message,
      value: e.value
    })));
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return conflict('Related resource constraint failed', {
      table: err.table,
      fields: err.fields
    });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return unauthorized('Invalid or expired token');
  }

  if (err.name === 'MulterError') {
    return badRequest(err.message, { field: err.field, code: err.code });
  }

  return err;
};

const notFoundHandler = (req, _res, next) => {
  next(notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const normalizedError = normalizeError(err);
  const statusCode = normalizedError.statusCode || normalizedError.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const message = statusCode >= 500 && isProduction
    ? 'Internal server error'
    : normalizedError.message || 'Internal server error';

  const logPayload = {
    requestId: req.id,
    method: req.method,
    path: req.originalUrl,
    statusCode,
    code: normalizedError.code || 'INTERNAL_ERROR',
    userId: req.user?.id,
    userEmail: req.user?.email,
    details: normalizedError.details,
    stack: normalizedError.stack
  };

  if (statusCode >= 500) {
    logger.error(`[ErrorHandler] ${message}`, logPayload);
  } else {
    logger.warn(`[ErrorHandler] ${message}`, logPayload);
  }

  const response = {
    success: false,
    error: {
      message,
      code: normalizedError.code || 'INTERNAL_ERROR',
      requestId: req.id
    }
  };

  if (normalizedError.details !== undefined) {
    response.error.details = normalizedError.details;
  }

  if (!isProduction && normalizedError.stack) {
    response.error.stack = normalizedError.stack;
  }

  return res.status(statusCode).json(response);
};

module.exports = {
  AppError,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  notFoundHandler,
  errorHandler
};
