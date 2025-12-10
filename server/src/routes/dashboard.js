const express = require('express');
const router = express.Router();
const pool = require('../config/database'); // Import the pool directly
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// Get dashboard stats
router.get('/stats', async (req, res) => {
    try {
        let pendingTasks = 0;
        let clientSatisfaction = 95; // Default placeholder

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
        
        // Pending tasks (now that the table exists)
        try {
            const pendingTasksResult = await pool.query(
                "SELECT COUNT(*) as count FROM tasks WHERE status != 'completed'"
            );
            pendingTasks = parseInt(pendingTasksResult.rows[0].count) || 0;
        } catch (e) {
            if (e.code !== '42P01') { // '42P01' is undefined_table in PostgreSQL
                throw e; // Re-throw unexpected errors
            }
            console.warn('Warning: "tasks" table not found. Defaulting pending tasks to 0.');
        }

        // Client Satisfaction (now that the table exists)
        try {
            const satisfactionResult = await pool.query("SELECT AVG(rating) as avg_rating FROM reviews WHERE rating IS NOT NULL");
            clientSatisfaction = Math.round(satisfactionResult.rows[0].avg_rating * 20) || 95; // Convert 1-5 scale to 0-100
        } catch (e) {
            if (e.code !== '42P01') { throw e; }
            console.warn('Warning: "reviews" table not found. Using default satisfaction value.');
        }

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
                pendingTasks: pendingTasks,
                totalClients: parseInt(totalClientsResult.rows[0].count) || 0,
                clientSatisfaction: clientSatisfaction,
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
