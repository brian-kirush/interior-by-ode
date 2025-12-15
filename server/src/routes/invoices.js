const express = require('express');
const router = express.Router();
const InvoiceController = require('../controllers/invoiceController');
const { requireAuth } = require('../middleware/auth');
const { createInvoiceSchema, updateInvoiceStatusSchema, validateInvoice } = require('../controllers/invoiceSchema');

// Apply auth middleware to all routes
router.use(requireAuth);

// Get all invoices
router.get('/', InvoiceController.getAll);

// Get single invoice
router.get('/:id', InvoiceController.getById);

// Download invoice PDF
router.get('/:id/download', InvoiceController.download);

// Create invoice
router.post('/', validateInvoice(createInvoiceSchema), InvoiceController.create);

// Update invoice status
router.put('/:id/status', validateInvoice(updateInvoiceStatusSchema), InvoiceController.updateStatus);

// Update full invoice (fields and items)
router.put('/:id', validateInvoice(require('../controllers/invoiceSchema').updateInvoiceSchema), InvoiceController.update);

// Delete invoice
router.delete('/:id', InvoiceController.delete);

module.exports = router;