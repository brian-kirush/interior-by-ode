const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { requireAuth } = require('../middleware/auth');
const { createClientSchema, updateClientSchema, validateClient } = require('../controllers/clientSchema');

// Apply auth middleware to all routes
router.use(requireAuth);

// GET all clients
router.get('/', clientController.getAllClients);

// GET single client
router.get('/:id', clientController.getClient);

// POST create client
router.post('/',
  validateClient(createClientSchema),
  clientController.createClient
);

// PUT update client
router.put('/:id',
  validateClient(updateClientSchema),
  clientController.updateClient
);

// DELETE client
router.delete('/:id', clientController.deleteClient);

module.exports = router;
