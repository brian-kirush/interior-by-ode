const AppError = require('../utils/appError');
const logger = require('../utils/logger');

/**
 * Handles PostgreSQL unique constraint violation errors (code: 23505).
 * @param {Error} err The original database error.
 * @returns {AppError} A new AppError with a user-friendly message.
 */
const handleUniqueViolationDB = (err) => {
    const value = err.detail.match(/\((.*?)\)/)[1];
    const message = `Duplicate field value: ${value}. Please use another value.`;
    return new AppError(message, 400);
};

const handleInvalidInputDB = (err) => new AppError(`Invalid input: ${err.value}.`, 400);

const handleJWTError = () => new AppError('Invalid token. Please log in again.', 401);
const handleJWTExpiredError = () => new AppError('Your token has expired. Please log in again.', 401);


const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack,
    });
};

const sendErrorProd = (err, req, res) => {
    // For operational, trusted errors: send a specific message to the client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
    } else {
        // For programming or unknown errors, log them with context but don't leak details to client
        logger.error(err.message, {
            error: {
                message: err.message,
                stack: err.stack,
            },
            request: {
                url: req.originalUrl,
                method: req.method,
                user: req.session?.userId || 'Not Authenticated',
            },
        });
        // For programming or unknown errors: don't leak error details
        res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!',
        });
    }
};

/**
 * Global error handling middleware.
 */
module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else if (process.env.NODE_ENV === 'production') {
        let error = { ...err, message: err.message };

        // Handle specific PostgreSQL errors
        if (error.code === '23505') error = handleUniqueViolationDB(error);
        if (error.code === '22P02') error = handleInvalidInputDB(error);
        // Handle JWT errors
        if (error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

        sendErrorProd(error, req, res);
    }
};