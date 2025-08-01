

// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Prisma error handlers are now handled inline in the main errorHandler function

// Handle JWT errors
const handleJWTError = () => new AppError('Invalid token. Please log in again', 401);

const handleJWTExpiredError = () => new AppError('Your token has expired. Please log in again', 401);

// Send error response in development
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });
};

// Send error response in production
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      timestamp: new Date().toISOString()
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    
    res.status(500).json({
      success: false,
      message: 'Something went wrong on our end. Please try again later.',
      timestamp: new Date().toISOString()
    });
  }
};

// Log error details
const logError = (err, req) => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.user ? req.user.id : 'Anonymous',
    error: {
      name: err.name,
      message: err.message,
      statusCode: err.statusCode,
      stack: err.stack
    }
  };

  if (err.statusCode >= 500) {
    console.error('🚨 SERVER ERROR:', JSON.stringify(errorInfo, null, 2));
  } else if (err.statusCode >= 400) {
    console.warn('⚠️ CLIENT ERROR:', JSON.stringify(errorInfo, null, 2));
  }
};

// Main error handling middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log error
  logError(error, req);

  // Prisma validation error
  if (err.name === 'PrismaClientValidationError') {
    error = new AppError('Invalid input data', 400);
  }

  // Prisma unique constraint error
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    error = new AppError(`${field.charAt(0).toUpperCase() + field.slice(1)} already exists`, 400);
  }

  // Prisma foreign key constraint error
  if (err.code === 'P2003') {
    error = new AppError('Referenced record does not exist', 400);
  }

  // Prisma record not found error
  if (err.code === 'P2025') {
    error = new AppError('Record not found', 404);
  }

  // Prisma connection error
  if (err.code === 'P1001') {
    error = new AppError('Database connection failed', 500);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }

  if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = new AppError('File too large. Maximum size is 10MB', 400);
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    error = new AppError('Too many files. Maximum is 10 files', 400);
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = new AppError('Unexpected file field', 400);
  }

  // Send error response
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

// Handle 404 errors
const notFound = (req, res, next) => {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(error);
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Success response helper
const sendSuccess = (res, statusCode, data, message) => {
  res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

// Paginated response helper
const sendPaginatedResponse = (res, data, page, limit, total, message) => {
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      currentPage: page,
      totalPages,
      totalItems: total,
      itemsPerPage: limit,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null
    },
    timestamp: new Date().toISOString()
  });
};

// Format validation errors helper
const formatValidationErrors = (errors) => {
  return errors.array().map(error => ({
    field: error.path,
    message: error.msg,
    value: error.value
  }));
};

module.exports = {
  AppError,
  errorHandler,
  notFound,
  asyncHandler,
  formatValidationErrors,
  sendSuccess,
  sendPaginatedResponse
}; 