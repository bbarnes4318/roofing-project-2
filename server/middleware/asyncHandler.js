/**
 * Async handler middleware to wrap async routes
 * Catches errors and passes them to error handler
 */

const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;