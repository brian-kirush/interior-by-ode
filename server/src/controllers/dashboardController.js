const pool = require('../config/database');
const catchAsync = require('../utils/catchAsync');

/**
 * Fetches all primary dashboard statistics in parallel.
 */
const getStats = catchAsync(async (req, res) => {
    // Using a single transaction for read-only queries can sometimes improve consistency,
    // but Promise.all is excellent for performance here.
        const [
            activeProjectsResult,
            revenueResult,
            pendingTasksResult,
            satisfactionResult,
            totalClientsResult,
        ] = await Promise.all([
            pool.query("SELECT COUNT(*) as count FROM projects WHERE status NOT IN ('completed', 'submitted')"),
            pool.query(`
                SELECT SUM(total) as total 
                FROM invoices
                WHERE status = 'paid'
                AND paid_at >= date_trunc('month', current_date)
            `),
            pool.query("SELECT COUNT(*) as count FROM tasks WHERE status != 'completed'"),
            pool.query("SELECT AVG(rating) as avg_rating FROM reviews WHERE rating IS NOT NULL"),
            pool.query("SELECT COUNT(*) as count FROM clients")
        ]);

        const avgRating = satisfactionResult.rows[0]?.avg_rating;
        const clientSatisfaction = avgRating ? Math.round(avgRating * 20) : 0; // Convert 1-5 scale to 0-100, default to 0

        res.json({
            success: true,
            message: 'Dashboard stats retrieved',
            data: {
                activeProjects: parseInt(activeProjectsResult.rows[0].count) || 0,
                monthlyRevenue: parseFloat(revenueResult.rows[0].total) || 0,
                pendingTasks: parseInt(pendingTasksResult.rows[0].count) || 0,
                totalClients: parseInt(totalClientsResult.rows[0].count) || 0,
                clientSatisfaction: clientSatisfaction,
                // Note: Trend calculation is complex and might require more historical data queries.
                // These are placeholders.
                trends: {
                    projects: 15,
                    revenue: 12,
                    tasks: -3
                }
            }
        });
});

/**
 * Fetches recent projects.
 */
const getRecentProjects = catchAsync(async (req, res) => {
        const limit = parseInt(req.query.limit) || 5;
        const result = await pool.query(
            `SELECT p.*, c.name as client_name, c.email as client_email
             FROM projects p
             LEFT JOIN clients c ON p.client_id = c.id
             ORDER BY p.created_at DESC
             LIMIT $1`,
            [limit]
        );
    res.json({ success: true, message: 'Recent projects retrieved', data: result.rows });
});

/**
 * Fetches tasks with upcoming deadlines.
 */
const getUpcomingDeadlines = catchAsync(async (req, res) => {
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
    res.json({ success: true, message: 'Upcoming deadlines retrieved', data: result.rows });
});

/**
 * Fetches revenue data for charts, correctly using the 'invoices' table.
 */
const getRevenueData = catchAsync(async (req, res) => {
        const months = parseInt(req.query.months) || 6;
        const result = await pool.query(
            `SELECT 
                to_char(date_trunc('month', paid_at), 'YYYY-MM') as month,
                SUM(total) as revenue
             FROM invoices
             WHERE status = 'paid'
             AND paid_at >= date_trunc('month', CURRENT_DATE - ($1 || ' months')::interval)
             GROUP BY 1
             ORDER BY 1`,
            [months]
        );
    res.json({ success: true, message: 'Revenue data retrieved', data: result.rows });
});

/**
 * Fetches a quick overview of total counts for major entities.
 */
const getOverview = catchAsync(async (req, res) => {
        const [projects, tasks, clients, invoices] = await Promise.all([
            pool.query("SELECT COUNT(*) as count FROM projects"),
            pool.query("SELECT COUNT(*) as count FROM tasks"),
            pool.query("SELECT COUNT(*) as count FROM clients"),
            pool.query("SELECT COUNT(*) as count FROM invoices")
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
});

module.exports = {
    getStats,
    getRecentProjects,
    getUpcomingDeadlines,
    getRevenueData,
    getOverview
};