// server/src/routes/projects.js
const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { createProjectSchema, updateProjectSchema, validateProject } = require('../controllers/projectSchema');

// Apply auth middleware to all routes
router.use(requireAuth);

// Get all projects
router.get('/', projectController.getAll);

// Get single project
router.get('/:id', projectController.getById);

// Create project
router.post('/', validateProject(createProjectSchema), projectController.create);

// Update project
router.put('/:id', validateProject(updateProjectSchema), projectController.update);

// Delete project
router.delete('/:id', projectController.delete);

module.exports = router;