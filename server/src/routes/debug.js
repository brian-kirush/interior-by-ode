const express = require('express');
const router = express.Router();
const debugController = require('../controllers/debugController');
const { requireAdmin } = require('../middleware/auth');

// GET /api/debug/session-table  -> checks/creates session table
router.get('/session-table', requireAdmin, debugController.checkSessionTable);

// POST /api/debug/session-table/force -> force rename and recreate session table (admin only)
router.post('/session-table/force', requireAdmin, debugController.forceRecreateSessionTable);

// POST /api/debug/session-table/force-token -> force recreate using a session token
// Accepts JSON { session: "<session-id>" } returned by the login JSON response.
// This route validates the provided session id against the sessions table and
// proceeds only if it belongs to an admin session. Useful when calling from curl
// using the login JSON's `session` value.
router.post('/session-table/force-token', debugController.forceRecreateSessionTableWithToken);

module.exports = router;
