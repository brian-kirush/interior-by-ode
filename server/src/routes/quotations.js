const express = require('express');
const router = express.Router();
const quotationController = require('../controllers/quotationController');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const schemas = require('../schemas/quotationSchema');

router.use(requireAuth);

// Get all quotations
router.get('/', quotationController.getAllQuotations);

// Get single quotation with items
router.get('/:id', quotationController.getQuotationById);

// Create quotation
router.post('/', validateRequest(schemas.createQuotation), quotationController.createQuotation);

// Update quotation status
router.put('/:id/status', validateRequest(schemas.updateStatus), quotationController.updateQuotationStatus);

// Delete quotation
router.delete('/:id', quotationController.deleteQuotation);

module.exports = router;
