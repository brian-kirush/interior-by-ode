const Joi = require('joi');

const project = Joi.object({
    name: Joi.string().min(3).max(200).required(),
    description: Joi.string().allow('').optional(),
    client_id: Joi.number().integer().required(),
    budget: Joi.number().min(0).optional(),
    status: Joi.string().valid('planning', 'in_progress', 'completed', 'on_hold', 'cancelled').optional(),
    progress: Joi.number().min(0).max(100).optional(),
    start_date: Joi.date().allow(null).optional(),
    deadline: Joi.date().allow(null).optional(),
    notes: Joi.string().allow('').optional()
});

module.exports = {
    project
};