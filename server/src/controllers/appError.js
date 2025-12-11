/**
 * Custom error class to create operational, trusted errors.
 * @param {string} message The error message.
 * @param {number} statusCode The HTTP status code for the error.
 */
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true; // Mark this as a trusted, operational error

        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;