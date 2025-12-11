const express = require('express');
const router = express.Router();
const ClientController = require('../controllers/clientController');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const schemas = require('../schemas/clientSchema');

// Apply auth middleware to all routes
router.use(requireAuth);

// Get all clients
router.get('/', ClientController.getAll);

// Get single client
router.get('/:id', ClientController.getById);

// Create client
router.post('/', validateRequest(schemas.client), ClientController.create);

// Update client
router.put('/:id', validateRequest(schemas.client), ClientController.update);

// Delete client
router.delete('/:id', ClientController.delete);

module.exports = router;
