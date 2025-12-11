/**
 * A higher-order function to wrap async route handlers and centralize error catching.
 * This prevents the need for repetitive try...catch blocks in every async controller.
 * @param {function} fn The async controller function to wrap.
 * @returns {function} A new function that executes the original function and catches any rejected promises, passing errors to the error handling logic.
 */
const catchAsync = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = catchAsync;