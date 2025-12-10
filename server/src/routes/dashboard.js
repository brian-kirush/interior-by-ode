const express = require('express');
const router = express.Router();
const pool = require('../config/database'); // Import the pool directly
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

// Get dashboard stats
router.get('/stats', async (req, res) => {
    try {
        console.log('📊 Fetching dashboard stats...');
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
        
        // Pending tasks (with safe handling for missing table)
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

        // Client Satisfaction (with safe handling for missing table)
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
            message: 'Failed to get dashboard stats',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get recent projects for dashboard
router.get('/recent-projects', async (req, res) => {
    try {
        const { limit = 5 } = req.query;
        
        const result = await pool.query(
            `SELECT p.*, c.name as client_name, c.email as client_email
             FROM projects p
             LEFT JOIN clients c ON p.client_id = c.id
             ORDER BY p.created_at DESC
             LIMIT $1`,
            [parseInt(limit)]
        );

        res.json({
            success: true,
            message: 'Recent projects retrieved',
            data: result.rows
        });
    } catch (error) {
        console.error('Recent projects error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get recent projects'
        });
    }
});

// Get upcoming deadlines
router.get('/upcoming-deadlines', async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT t.*, p.name as project_name
             FROM tasks t
             JOIN projects p ON t.project_id = p.id
             WHERE t.deadline IS NOT NULL 
             AND t.status != 'completed'
             AND t.deadline >= CURRENT_DATE
             ORDER BY t.deadline ASC
             LIMIT 10`
        );

        res.json({
            success: true,
            message: 'Upcoming deadlines retrieved',
            data: result.rows
        });
    } catch (error) {
        if (error.code === '42P01') {
            // Table doesn't exist yet
            return res.json({
                success: true,
                message: 'No upcoming deadlines',
                data: []
            });
        }
        console.error('Upcoming deadlines error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get upcoming deadlines'
        });
    }
});

// Get revenue chart data
router.get('/revenue-data', async (req, res) => {
    try {
        const { months = 6 } = req.query;
        
        const result = await pool.query(
            `SELECT 
                EXTRACT(MONTH FROM updated_at) as month,
                EXTRACT(YEAR FROM updated_at) as year,
                SUM(budget) as revenue
             FROM projects
             WHERE status = 'completed'
             AND updated_at >= CURRENT_DATE - INTERVAL '${months} months'
             GROUP BY year, month
             ORDER BY year, month`
        );

        res.json({
            success: true,
            message: 'Revenue data retrieved',
            data: result.rows
        });
    } catch (error) {
        console.error('Revenue data error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get revenue data'
        });
    }
});

// Get quick overview
router.get('/overview', async (req, res) => {
    try {
        const [projects, tasks, clients, invoices] = await Promise.all([
            pool.query("SELECT COUNT(*) as count FROM projects"),
            pool.query("SELECT COUNT(*) as count FROM tasks").catch(() => ({ rows: [{ count: '0' }] })),
            pool.query("SELECT COUNT(*) as count FROM clients"),
            pool.query("SELECT COUNT(*) as count FROM invoices").catch(() => ({ rows: [{ count: '0' }] }))
        ]);

        res.json({
            success: true,
            data: {
                totalProjects: parseInt(projects.rows[0].count) || 0,
                totalTasks: parseInt(tasks.rows[0].count) || 0,
                totalClients: parseInt(clients.rows[0].count) || 0,
                totalInvoices: parseInt(invoices.rows[0].count) || 0
            }
        });
    } catch (error) {
        console.error('Overview error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get overview data'
        });
    }
});

// Helper function to check if table exists (for debugging)
router.get('/check-tables', async (req, res) => {
    try {
        const tables = ['projects', 'tasks', 'clients', 'reviews', 'invoices', 'quotations'];
        const results = {};
        
        for (const table of tables) {
            try {
                const result = await pool.query(
                    `SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = $1
                    )`,
                    [table]
                );
                results[table] = result.rows[0].exists;
            } catch (error) {
                results[table] = false;
            }
        }
        
        res.json({
            success: true,
            tables: results,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

module.exports = router;