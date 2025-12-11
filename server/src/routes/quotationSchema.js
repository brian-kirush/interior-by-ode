const Joi = require('joi');

const itemSchema = Joi.object({
    description: Joi.string().required(),
    unit: Joi.string().allow('').optional(),
    quantity: Joi.number().min(0).required(),
    unit_price: Joi.number().min(0).required(),
    total: Joi.number().min(0).required()
});

const createQuotation = Joi.object({
    client_id: Joi.number().integer().required(),
    project_id: Joi.number().integer().allow(null).optional(),
    quotation_number: Joi.string().optional(),
    subtotal: Joi.number().min(0).required(),
    tax_rate: Joi.number().min(0).optional(),
    tax_amount: Joi.number().min(0).required(),
    discount_amount: Joi.number().min(0).optional().default(0),
    total: Joi.number().min(0).required(),
    notes: Joi.string().allow('').optional(),
    valid_until: Joi.date().optional(),
    items: Joi.array().items(itemSchema).min(1).required()
});

const updateStatus = Joi.object({
    status: Joi.string().valid('draft', 'sent', 'approved', 'rejected').required()
});

module.exports = {
    createQuotation,
    updateStatus
};