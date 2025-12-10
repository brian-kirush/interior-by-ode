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
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const prevMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

        const revenueResult = await pool.query(
            `SELECT 
                (SELECT SUM(total) FROM invoices WHERE status = 'paid' AND EXTRACT(MONTH FROM paid_at) = $1 AND EXTRACT(YEAR FROM paid_at) = $2) as current_revenue,
                (SELECT SUM(total) FROM invoices WHERE status = 'paid' AND EXTRACT(MONTH FROM paid_at) = $3 AND EXTRACT(YEAR FROM paid_at) = $4) as previous_revenue
            `,
            [currentMonth, currentYear, prevMonth, prevMonthYear]
        );
        
        // Pending tasks (assuming table exists now)
        const pendingTasksResult = await pool.query(
            "SELECT COUNT(*) as count FROM tasks WHERE status != 'completed'"
        );
        pendingTasks = parseInt(pendingTasksResult.rows[0].count) || 0;

        // Previous month's pending tasks for trend
        const prevPendingTasksResult = await pool.query(
            `SELECT COUNT(*) as count FROM tasks 
             WHERE status != 'completed' 
             AND created_at < date_trunc('month', current_date)`
        );
        const prevPendingTasks = parseInt(prevPendingTasksResult.rows[0].count) || 0;

        // Client Satisfaction (assuming table exists now)
        const satisfactionResult = await pool.query("SELECT AVG(rating) as avg_rating FROM reviews WHERE rating IS NOT NULL");
        // Handle case where there are no reviews yet to avoid null issues
        const avgRating = satisfactionResult.rows[0]?.avg_rating;
        clientSatisfaction = avgRating ? Math.round(avgRating * 20) : 100; // Convert 1-5 scale to 0-100, default to 100 if no reviews

        // Total clients
        const totalClientsResult = await pool.query(
            "SELECT COUNT(*) as count FROM clients"
        );

        const currentRevenue = parseFloat(revenueResult.rows[0].current_revenue) || 0;
        const previousRevenue = parseFloat(revenueResult.rows[0].previous_revenue) || 0;
        const revenueTrend = previousRevenue > 0 ? Math.round(((currentRevenue - previousRevenue) / previousRevenue) * 100) : (currentRevenue > 0 ? 100 : 0);

        res.json({
            success: true,
            message: 'Dashboard stats retrieved',
            data: {
                activeProjects: parseInt(activeProjectsResult.rows[0].count) || 0,
                monthlyRevenue: currentRevenue,
                pendingTasks: pendingTasks,
                totalClients: parseInt(totalClientsResult.rows[0].count) || 0,
                clientSatisfaction: clientSatisfaction,
                trends: {
                    projects: 15, // Placeholder, as project trend is complex
                    revenue: revenueTrend,
                    tasks: pendingTasks - prevPendingTasks
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
             WHERE t.due_date IS NOT NULL 
             AND t.status != 'completed'
             AND t.due_date >= CURRENT_DATE
             ORDER BY t.due_date ASC
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