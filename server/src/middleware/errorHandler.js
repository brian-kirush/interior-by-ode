const errorHandler = (err, req, res, next) => {
    console.error('Error:', err.stack);

    // Database errors
    if (err.code === '23505') { // Unique violation
        return res.status(409).json({
            success: false,
            message: 'Duplicate entry found'
        });
    }
    
    if (err.code === '23503') { // Foreign key violation
        return res.status(400).json({
            success: false,
            message: 'Referenced record not found'
        });
    }

    // Default error
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};

const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found'
    });
};

module.exports = { errorHandler, notFoundHandler };
