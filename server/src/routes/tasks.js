const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const schemas = require('../schemas/taskSchema');

router.use(requireAuth);

// Get tasks for a project
router.get('/project/:projectId', taskController.getTasksByProject);

// Create task
router.post('/', validateRequest(schemas.createTask), taskController.createTask);

// Update a task
router.put('/:id', validateRequest(schemas.updateTask), taskController.updateTask);

// Update task status
router.put('/:id/status', validateRequest(schemas.updateStatus), taskController.updateTaskStatus);

// Delete task
router.delete('/:id', taskController.deleteTask);

module.exports = router;
