const Joi = require('joi');

const createTaskSchema = Joi.object({
  project_id: Joi.string().uuid().required(),
  title: Joi.string().min(3).max(255).required(),
  description: Joi.string().optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  assigned_to: Joi.string().optional(),
  due_date: Joi.date().iso().optional(),
});

const updateTaskSchema = Joi.object({
  title: Joi.string().min(3).max(255).optional(),
  description: Joi.string().optional(),
  status: Joi.string().valid('pending', 'in_progress', 'completed').optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional(),
  assigned_to: Joi.string().optional(),
  due_date: Joi.date().iso().optional(),
}).min(1);

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('pending', 'in_progress', 'completed').required(),
});

module.exports = {
  createTaskSchema,
  updateTaskSchema,
  updateStatusSchema,
};
