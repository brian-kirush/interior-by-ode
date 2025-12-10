const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { requireAuth, validateRequest } = require('../middleware/auth');
const schemas = require('../middleware/validation');

// Apply auth middleware to all routes
router.use(requireAuth);

// Get all projects
router.get('/', projectController.getAllProjects);

// Get single project
router.get('/:id', projectController.getProjectById);

// Create project
router.post('/', validateRequest(schemas.project), projectController.createProject);

// Update project
router.put('/:id', projectController.updateProject);

// Delete project
router.delete('/:id', projectController.deleteProject);

module.exports = router;
