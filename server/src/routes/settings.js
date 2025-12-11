const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// Get all settings
router.get('/', settingsController.getSettings);

// Update settings
router.put('/', settingsController.updateSettings);

module.exports = router;
