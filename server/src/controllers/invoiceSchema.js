const Joi = require('joi');

const invoiceItemSchema = Joi.object({
    description: Joi.string().required().max(500),
    quantity: Joi.number().positive().required(),
    unit_price: Joi.number().positive().required(),
    total: Joi.number().positive().required()
});

const createInvoiceSchema = Joi.object({
    client_id: Joi.number().integer().positive().required(),
    quotation_id: Joi.number().integer().positive().optional(),
    project_id: Joi.number().integer().positive().optional(),
    subtotal: Joi.number().positive().required(),
    tax_rate: Joi.number().min(0).max(100).default(16),
    tax_amount: Joi.number().min(0).required(),
    discount_amount: Joi.number().min(0).required(),
    total: Joi.number().positive().required(),
    status: Joi.string().valid('draft', 'sent', 'paid', 'overdue', 'cancelled').default('draft'),
    issue_date: Joi.date().iso().default(Date.now),
    due_date: Joi.date().iso().greater(Joi.ref('issue_date')).required(),
    notes: Joi.string().allow('').max(1000).optional(),
    items: Joi.array().items(invoiceItemSchema).min(1).required()
});

const updateInvoiceStatusSchema = Joi.object({
    status: Joi.string().valid('draft', 'sent', 'paid', 'overdue', 'cancelled').required()
});

const updateInvoiceSchema = Joi.object({
    client_id: Joi.number().integer().positive().optional(),
    quotation_id: Joi.number().integer().positive().optional(),
    project_id: Joi.number().integer().positive().optional(),
    subtotal: Joi.number().positive().optional(),
    tax_rate: Joi.number().min(0).max(100).optional(),
    tax_amount: Joi.number().min(0).optional(),
    discount_amount: Joi.number().min(0).optional(),
    total: Joi.number().positive().optional(),
    status: Joi.string().valid('draft', 'sent', 'paid', 'overdue', 'cancelled').optional(),
    issue_date: Joi.date().iso().optional(),
    due_date: Joi.date().iso().optional(),
    notes: Joi.string().allow('').max(1000).optional(),
    items: Joi.array().items(invoiceItemSchema).optional()
});

const validateInvoice = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });
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

module.exports = {
    createInvoiceSchema,
    updateInvoiceStatusSchema,
    validateInvoice,
    updateInvoiceSchema
};