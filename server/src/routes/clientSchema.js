const Joi = require('joi');

const client = Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().allow('').optional(),
    address: Joi.string().allow('').optional(),
    company: Joi.string().allow('').optional()
});

module.exports = {
    client
};