const pool = require('../config/database');

/**
 * Gets all projects, joining with client names.
 */
exports.getAll = async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT p.*, c.name as client_name 
            FROM projects p 
            LEFT JOIN clients c ON p.client_id = c.id 
            ORDER BY p.created_at DESC
        `);
        res.json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error getting all projects:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve projects.' });
    }
};

/**
 * Gets a single project by its ID.
 */
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM projects WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error(`Error getting project by ID:`, error);
        res.status(500).json({ success: false, message: 'Failed to retrieve project.' });
    }
};

/**
 * Creates a new project.
 */
exports.create = async (req, res) => {
    try {
        const { name, description, client_id, budget, status, start_date, deadline } = req.body;
        const result = await pool.query(
            'INSERT INTO projects (name, description, client_id, budget, status, start_date, deadline) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
            [name, description, client_id, budget, status, start_date, deadline]
        );
        res.status(201).json({ success: true, message: 'Project created successfully.', data: result.rows[0] });
    } catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ success: false, message: 'Failed to create project.' });
    }
};

/**
 * Updates an existing project.
 */
exports.update = async (req, res) => {
    try {
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
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        res.json({ success: true, message: 'Project updated successfully.', data: result.rows[0] });
    } catch (error) {
        console.error('Error updating project:', error);
        res.status(500).json({ success: false, message: 'Failed to update project.' });
    }
};

/**
 * Deletes a project.
 */
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM projects WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ success: false, message: 'Failed to delete project.' });
    }
};