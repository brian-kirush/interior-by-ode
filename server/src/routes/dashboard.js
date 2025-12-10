const express = require('express');
const router = express.Router();
const pool = require('../config/database'); // Import the pool directly
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// Get dashboard stats
router.get('/stats', async (req, res) => {
    try {
        // Active projects
        const activeProjectsResult = await pool.query(
            "SELECT COUNT(*) as count FROM projects WHERE status NOT IN ('completed', 'submitted')"
        );
        
        // Monthly revenue
        const currentMonth = new Date().getMonth() + 1;
        const currentYear = new Date().getFullYear();
        const revenueResult = await pool.query(
            `SELECT SUM(budget) as total FROM projects
             WHERE status = 'completed' 
             AND EXTRACT(MONTH FROM updated_at) = $1 
             AND EXTRACT(YEAR FROM updated_at) = $2`,
            [currentMonth, currentYear]
        );
        
        // Pending tasks
        const pendingTasksResult = await pool.query(
            "SELECT COUNT(*) as count FROM tasks WHERE status != 'completed'"
        );
        
        // Total clients
        const totalClientsResult = await pool.query(
            "SELECT COUNT(*) as count FROM clients"
        );

        res.json({
            success: true,
            message: 'Dashboard stats retrieved',
            data: {
                activeProjects: parseInt(activeProjectsResult.rows[0].count) || 0,
                monthlyRevenue: parseFloat(revenueResult.rows[0].total) || 0,
                pendingTasks: parseInt(pendingTasksResult.rows[0].count) || 0,
                totalClients: parseInt(totalClientsResult.rows[0].count) || 0,
                clientSatisfaction: 95, // Placeholder
                trends: {
                    projects: 15,
                    revenue: 12,
                    tasks: -3
                }
            }
        });
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get dashboard stats'
        });
    }
});

module.exports = router;
