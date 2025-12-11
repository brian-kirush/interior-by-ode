const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');

// Try to load clientSchemas, but provide fallback if Joi not available
let clientSchemas;
try {
  clientSchemas = require('../schemas/clientSchema');
} catch (err) {
  console.warn('Joi not available, using empty validation schemas');
  clientSchemas = {
    createClient: {},
    updateClient: {}
  };
}

// Apply auth middleware to all routes
router.use(requireAuth);

// GET all clients
router.get('/', clientController.getAllClients);

// GET single client
router.get('/:id', clientController.getClient);

// POST create client
router.post('/',
  validateRequest(clientSchemas.createClient),
  clientController.createClient
);

// PUT update client
router.put('/:id',
  validateRequest(clientSchemas.updateClient),
  clientController.updateClient
);

// DELETE client
router.delete('/:id', clientController.deleteClient);

module.exports = router;
