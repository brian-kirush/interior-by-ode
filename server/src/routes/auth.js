const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');

// Login
router.post('/login', AuthController.login);

// Logout
router.post('/logout', AuthController.logout);

// Check session
router.get('/check-session', AuthController.checkSession);

module.exports = router;
