const pool = require('../config/database');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

/**
 * Gets all projects, joining with client names.
 */
exports.getAll = catchAsync(async (req, res) => {
    const result = await pool.query(`
        SELECT p.*, c.name as client_name 
        FROM projects p 
        LEFT JOIN clients c ON p.client_id = c.id 
        ORDER BY p.created_at DESC
    `);
    res.json({ success: true, data: result.rows });
});

/**
 * Gets a single project by its ID.
 */
exports.getById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
    if (result.rows.length === 0) {
        return next(new AppError('Project not found.', 404));
    }
    res.json({ success: true, data: result.rows[0] });
});

/**
 * Creates a new project.
 */
exports.create = catchAsync(async (req, res, next) => {
    const { name, description, client_id, budget, status, start_date, deadline } = req.body;
    const result = await pool.query(
        'INSERT INTO projects (name, description, client_id, budget, status, start_date, deadline) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [name, description, client_id, budget, status, start_date, deadline]
    );
    res.status(201).json({ success: true, message: 'Project created successfully.', data: result.rows[0] });
});

/**
 * Updates an existing project.
 */
exports.update = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { name, description, client_id, budget, status, progress, start_date, deadline, notes } = req.body;
    const result = await pool.query(
        `UPDATE projects SET 
                name = $1, 
                description = $2, 
                client_id = $3, 
                budget = $4, 
                status = $5, 
                progress = $6,
                start_date = $7,
                deadline = $8,
                notes = $9
             WHERE id = $10 RETURNING *`,
        [name, description, client_id, budget, status, progress, start_date, deadline, notes, id]
    );
    if (result.rows.length === 0) {
        return next(new AppError('Project not found.', 404));
    }
    res.json({ success: true, message: 'Project updated successfully.', data: result.rows[0] });
});

/**
 * Deletes a project.
 */
exports.delete = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
        return next(new AppError('Project not found.', 404));
    }
    res.status(204).send();
});