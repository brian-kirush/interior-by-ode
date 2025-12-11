const pool = require('../config/database');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

/**
 * Gets all clients from the database.
 */
exports.getAll = catchAsync(async (req, res, next) => {
    const { sort = 'name', direction = 'asc', filter = '' } = req.query;

    // Validate sort column to prevent SQL injection
    const allowedSortColumns = ['id', 'name', 'email', 'phone', 'company'];
    if (!allowedSortColumns.includes(sort)) {
        return next(new AppError('Invalid sort column.', 400));
    }
    const sortDirection = direction.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    let query = `SELECT * FROM clients`;
    const queryParams = [];

    if (filter) {
        query += ` WHERE name ILIKE $1 OR email ILIKE $1 OR company ILIKE $1`;
        queryParams.push(`%${filter}%`);
    }

    query += ` ORDER BY ${sort} ${sortDirection}`;

    const result = await pool.query(query, queryParams);

    res.json({
        success: true,
        message: 'Clients retrieved successfully',
        data: result.rows
    });
});

/**
 * Gets a single client by their ID.
 */
exports.getById = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);

    if (result.rows.length === 0) {
        return next(new AppError('Client not found.', 404));
    }

    res.json({
        success: true,
        message: 'Client retrieved successfully',
        data: result.rows[0]
    });
});

/**
 * Creates a new client.
 */
exports.create = catchAsync(async (req, res) => {
    const { name, email, phone, address, company } = req.body;
    const result = await pool.query(
        'INSERT INTO clients (name, email, phone, address, company) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, email, phone, address, company]
    );

    res.status(201).json({
        success: true,
        message: 'Client created successfully',
        data: result.rows[0]
    });
});

/**
 * Updates an existing client.
 */
exports.update = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { name, email, phone, address, company } = req.body;
    const result = await pool.query(
        'UPDATE clients SET name = $1, email = $2, phone = $3, address = $4, company = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
        [name, email, phone, address, company, id]
    );
    if (result.rows.length === 0) {
        return next(new AppError('Client not found.', 404));
    }
    res.json({
        success: true,
        message: 'Client updated successfully',
        data: result.rows[0]
    });
});

/**
 * Deletes a client.
 */
exports.delete = catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
        return next(new AppError('Client not found.', 404));
    }
    res.status(204).send(); // 204 No Content is standard for a successful delete
});