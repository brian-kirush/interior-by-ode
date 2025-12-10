const express = require('express');
const router = express.Router();
const InvoiceController = require('../controllers/invoiceController');
const { requireAuth } = require('../middleware/auth');
// TODO: Add Joi validation for invoices
// const { validateRequest } = require('../middleware/validation');
// const schemas = require('../schemas/invoiceSchema');

// Apply auth middleware to all routes
router.use(requireAuth);

// Get all invoices
router.get('/', InvoiceController.getAll);

// Get single invoice
router.get('/:id', InvoiceController.getById);

// Create invoice
router.post('/', /* validateRequest(schemas.createInvoice), */ InvoiceController.create);

// Update invoice status
router.put('/:id/status', /* validateRequest(schemas.updateStatus), */ InvoiceController.updateStatus);

// Delete invoice
router.delete('/:id', InvoiceController.delete);

module.exports = router;