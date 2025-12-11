const express = require('express');
const router = express.Router();
const debugController = require('../controllers/debugController');
const { requireAdmin } = require('../middleware/auth');

// GET /api/debug/session-table  -> checks/creates session table
router.get('/session-table', requireAdmin, debugController.checkSessionTable);

// POST /api/debug/session-table/force -> force rename and recreate session table (admin only)
router.post('/session-table/force', requireAdmin, debugController.forceRecreateSessionTable);

module.exports = router;
