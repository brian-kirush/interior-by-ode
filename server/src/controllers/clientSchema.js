const Joi = require('joi');

// Common validation patterns
const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const createClientSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': 'Name must be at least 2 characters long',
            'string.max': 'Name cannot exceed 100 characters',
            'any.required': 'Name is required'
        }),
    
    email: Joi.string()
        .pattern(emailRegex)
        .required()
        .messages({
            'string.pattern.base': 'Please provide a valid email address',
            'any.required': 'Email is required'
        }),
    
    phone: Joi.string()
        .pattern(phoneRegex)
        .optional()
        .allow('', null)
        .messages({
            'string.pattern.base': 'Please provide a valid phone number'
        }),
    
    address: Joi.string()
        .max(500)
        .optional()
        .allow('', null)
        .messages({
            'string.max': 'Address cannot exceed 500 characters'
        }),
    
    company: Joi.string()
        .max(100)
        .optional()
        .allow('', null)
        .messages({
            'string.max': 'Company name cannot exceed 100 characters'
        }),
    
    notes: Joi.string()
        .max(2000)
        .optional()
        .allow('', null)
        .messages({
            'string.max': 'Notes cannot exceed 2000 characters'
        })
});

const updateClientSchema = Joi.object({
    name: Joi.string()
        .min(2)
        .max(100)
        .optional()
        .messages({
            'string.min': 'Name must be at least 2 characters long',
            'string.max': 'Name cannot exceed 100 characters'
        }),
    
    email: Joi.string()
        .pattern(emailRegex)
        .optional()
        .messages({
            'string.pattern.base': 'Please provide a valid email address'
        }),
    
    phone: Joi.string()
        .pattern(phoneRegex)
        .optional()
        .allow('', null)
        .messages({
            'string.pattern.base': 'Please provide a valid phone number'
        }),
    
    address: Joi.string()
        .max(500)
        .optional()
        .allow('', null)
        .messages({
            'string.max': 'Address cannot exceed 500 characters'
        }),
    
    company: Joi.string()
        .max(100)
        .optional()
        .allow('', null)
        .messages({
            'string.max': 'Company name cannot exceed 100 characters'
        }),
    
    notes: Joi.string()
        .max(2000)
        .optional()
        .allow('', null)
        .messages({
            'string.max': 'Notes cannot exceed 2000 characters'
        })
}).min(1); // At least one field must be provided for update

// Validation middleware
const validateClient = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, { 
        abortEarly: false,
        stripUnknown: true // Remove unknown fields
    });
    
    if (error) {
        const errors = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
        }));
        
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors
        });
    }
    
    next();
};

// Export schemas and middleware
module.exports = {
    createClientSchema,
    updateClientSchema,
    validateClient,
    
    // Export for use in other schemas if needed
    phoneRegex,
    emailRegex
};