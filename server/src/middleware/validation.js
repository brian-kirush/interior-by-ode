// server/src/middleware/validation.js

// Your existing functions
const validateClient = (req, res, next) => {
    const { name, email, phone, address } = req.body;
    const errors = [];

    if (!name || name.trim().length < 2) {
        errors.push('Name must be at least 2 characters');
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push('Valid email is required');
    }
    if (!phone || phone.trim().length < 10) {
        errors.push('Valid phone number is required');
    }
    if (!address || address.trim().length < 5) {
        errors.push('Address is required');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors
        });
    }
    next();
};

const validateProject = (req, res, next) => {
    const { name, client_id } = req.body;
    const errors = [];

    if (!name || name.trim().length < 3) {
        errors.push('Project name must be at least 3 characters');
    }
    if (!client_id || isNaN(client_id)) {
        errors.push('Valid client ID is required');
    }

    if (errors.length > 0) {
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors
        });
    }
    next();
};

// NEW: Add the missing validateRequest function
const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            return res.status(400).json({ 
                success: false,
                message: 'Validation failed',
                errors: [error.details[0].message]
            });
        }
        next();
    };
};

// Export all functions
module.exports = { 
    validateClient, 
    validateProject, 
    validateRequest
};