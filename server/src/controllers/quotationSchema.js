const Joi = require('joi');
const AppError = require('../utils/appError');

const quotationItemSchema = Joi.object({
  description: Joi.string().required(),
  unit: Joi.string().optional(),
  quantity: Joi.number().min(1).required(),
  unit_price: Joi.number().min(0).required(),
});

const createQuotationSchema = Joi.object({
  client_id: Joi.string().uuid().required(),
  project_id: Joi.string().uuid().optional(),
  quotation_number: Joi.string().optional(),
  subtotal: Joi.number().min(0).optional(),
  tax_rate: Joi.number().min(0).max(100).optional(),
  tax_amount: Joi.number().min(0).optional(),
  discount_amount: Joi.number().min(0).optional(),
  total: Joi.number().min(0).optional(),
  items: Joi.array().items(quotationItemSchema).optional(),
  notes: Joi.string().optional(),
  valid_until: Joi.date().iso().optional(),
});

const updateStatusSchema = Joi.object({
  status: Joi.string().valid('draft', 'sent', 'accepted', 'rejected', 'expired').required(),
});

module.exports = {
  createQuotationSchema,
  updateStatusSchema,
};
