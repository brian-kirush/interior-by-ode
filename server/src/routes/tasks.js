const express = require('express');
const router = express.Router();
const pool = require('../config/database'); // Import the pool directly
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// Get tasks for a project
router.get('/project/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const result = await pool.query(
            'SELECT * FROM tasks WHERE project_id = $1 ORDER BY due_date ASC',
            [projectId]
        );
        
        res.json({
            success: true,
            message: 'Tasks retrieved',
            data: result.rows
        });
    } catch (error) {
        console.error('Get tasks error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get tasks'
        });
    }
});

// Create task
router.post('/', async (req, res) => {
    try {
        const { project_id, title, description, priority, assigned_to, due_date } = req.body;
        
        if (!project_id || !title) {
            return res.status(400).json({
                success: false,
                message: 'Project ID and title are required'
            });
        }

        const result = await pool.query(
            `INSERT INTO tasks (project_id, title, description, priority, assigned_to, due_date) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [project_id, title, description || '', priority || 'medium', assigned_to || null, due_date || null]
        );
        
        res.status(201).json({
            success: true,
            message: 'Task created',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Create task error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create task'
        });
    }
});

// Update task status
router.put('/:id/status', async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        
        const allowedStatuses = ['pending', 'in_progress', 'completed'];
        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Valid status is required'
            });
        }

        const updateData = { status };
        if (status === 'completed') {
            updateData.completed_at = new Date().toISOString();
        }

        const result = await pool.query(
            `UPDATE tasks 
             SET status = $1, completed_at = $2 
             WHERE id = $3 
             RETURNING *`,
            [status, updateData.completed_at || null, id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        res.json({
            success: true,
            message: 'Task updated',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update task error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update task'
        });
    }
});

// Delete task
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
            const result = await pool.query(
            'DELETE FROM tasks WHERE id = $1 RETURNING id',
            [id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Task not found'
            });
        }

        res.json({
            success: true,
            message: 'Task deleted'
        });
    } catch (error) {
        console.error('Delete task error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete task'
        });
    }
});

module.exports = router;
