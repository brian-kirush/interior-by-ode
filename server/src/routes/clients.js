const express = require('express');
const router = express.Router();
const ClientController = require('../controllers/clientController');
const { requireAuth } = require('../middleware/auth');
const { validateClient } = require('../middleware/validation');

// Apply auth middleware to all routes
router.use(requireAuth);

// Get all clients
router.get('/', ClientController.getAll);

// Get single client
router.get('/:id', ClientController.getById);

// Create client
router.post('/', validateClient, ClientController.create);

// Update client
router.put('/:id', validateClient, ClientController.update);

// Delete client
router.delete('/:id', ClientController.delete);

module.exports = router;
