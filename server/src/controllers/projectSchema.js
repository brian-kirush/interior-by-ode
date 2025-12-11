const Joi = require('joi');
const AppError = require('../utils/appError');

const projectItemSchema = Joi.object({
  description: Joi.string().required(),
  cost: Joi.number().min(0).required(),
  quantity: Joi.number().integer().min(1).required(),
});

const createProjectSchema = Joi.object({
  name: Joi.string().min(3).max(255).required(),
  client_id: Joi.string().uuid().required(),
  description: Joi.string().allow('', null),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')),
  budget: Joi.number().min(0),
  items: Joi.array().items(projectItemSchema).optional(),
});

const updateProjectSchema = Joi.object({
  name: Joi.string().min(3).max(255),
  client_id: Joi.string().uuid(),
  description: Joi.string().allow('', null),
  start_date: Joi.date().iso(),
  end_date: Joi.date().iso().min(Joi.ref('start_date')),
  budget: Joi.number().min(0),
  status: Joi.string().valid('not_started', 'in_progress', 'completed', 'on_hold', 'cancelled'),
  items: Joi.array().items(projectItemSchema).optional(),
}).min(1); // Require at least one field to be updated

const validateProject = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body);
  if (error) {
    const errorDetails = error.details.map((detail) => detail.message).join(', ');
    return next(new AppError(`Invalid input: ${errorDetails}`, 400));
  }
  return next();
};

module.exports = { createProjectSchema, updateProjectSchema, validateProject };