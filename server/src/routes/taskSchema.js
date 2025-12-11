const Joi = require('joi');

const createTask = Joi.object({
    project_id: Joi.number().integer().required(),
    title: Joi.string().min(3).max(255).required(),
    description: Joi.string().allow('').optional(),
    priority: Joi.string().valid('low', 'medium', 'high').optional(),
    assigned_to: Joi.number().integer().allow(null).optional(),
    due_date: Joi.date().allow(null).optional()
});

const updateTask = Joi.object({
    title: Joi.string().min(3).max(255).optional(),
    description: Joi.string().allow('').optional(),
    status: Joi.string().valid('pending', 'in_progress', 'completed').optional(),
    priority: Joi.string().valid('low', 'medium', 'high').optional(),
    assigned_to: Joi.number().integer().allow(null).optional(),
    due_date: Joi.date().allow(null).optional(),
    project_id: Joi.number().integer().optional() // Allow moving task between projects
});

const updateStatus = Joi.object({
    status: Joi.string().valid('pending', 'in_progress', 'completed').required()
});

module.exports = {
    createTask,
    updateTask,
    updateStatus
};