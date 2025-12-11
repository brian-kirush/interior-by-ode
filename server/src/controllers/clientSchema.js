// Validation schemas for clients
// Using Joi for validation (make sure Joi is installed)

const Joi = require('joi');

const clientSchemas = {
  createClient: Joi.object({
    name: Joi.string().min(2).max(100).required(),
    email: Joi.string().email().required(),
    phone: Joi.string().allow('').optional(),
    address: Joi.string().allow('').optional(),
    company: Joi.string().allow('').optional(),
    notes: Joi.string().allow('').optional()
  }),

  updateClient: Joi.object({
    name: Joi.string().min(2).max(100),
    email: Joi.string().email(),
    phone: Joi.string().optional().allow(''),
    address: Joi.string().optional().allow(''),
    company: Joi.string().optional().allow(''),
    notes: Joi.string().optional().allow('')
  })
};

module.exports = clientSchemas;