const AppError = require('../utils/appError');

/**
 * A generic middleware factory that validates the request body against a Joi schema.
 * @param {Joi.Schema} schema - The Joi schema to validate against.
 * @returns {function} An Express middleware function.
 */
const validateRequest = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, {
        abortEarly: false, // Report all errors
        stripUnknown: true, // Remove unknown properties
    });

    if (error) {
        const errorMessage = error.details.map((detail) => detail.message).join(', ');
        return next(new AppError(errorMessage, 400));
    }

    next();
};

module.exports = { validateRequest };