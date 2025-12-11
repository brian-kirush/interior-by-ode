const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { requireAuth } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { createTaskSchema, updateTaskSchema, updateStatusSchema } = require('../controllers/taskSchema');

router.use(requireAuth);

// Get tasks for a project
router.get('/project/:projectId', taskController.getTasksByProject);

// Create task
router.post('/', validateRequest(createTaskSchema), taskController.createTask);

// Update a task
router.put('/:id', validateRequest(updateTaskSchema), taskController.updateTask);

// Update task status
router.put('/:id/status', validateRequest(updateStatusSchema), taskController.updateTaskStatus);

// Delete task
router.delete('/:id', taskController.deleteTask);

module.exports = router;
