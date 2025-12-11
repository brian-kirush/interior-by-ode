const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const schemas = require('./quotationSchema');

router.use(requireAuth);

// Get all quotations
router.get('/', quotationController.getAllQuotations);

// Get single quotation with items
router.get('/:id', quotationController.getQuotationById);

// Create quotation
router.post('/', validateRequest(schemas.createQuotation), quotationController.createQuotation);

// Update quotation status
router.put('/:id/status', validateRequest(schemas.updateStatus), quotationController.updateQuotationStatus);

// Download quotation PDF
router.get('/:id/download', quotationController.downloadQuotation);

// Delete quotation
router.delete('/:id', quotationController.deleteQuotation);

module.exports = router;
