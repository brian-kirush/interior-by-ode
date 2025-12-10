const pool = require('../config/database');

/**
 * Gets all clients from the database.
 */
exports.getAll = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM clients ORDER BY name ASC');
        res.json({
            success: true,
            message: 'Clients retrieved successfully',
            data: result.rows
        });
    } catch (error) {
        console.error('Error getting all clients:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve clients'
        });
    }
};

/**
 * Gets a single client by their ID.
 */
exports.getById = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM clients WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        res.json({
            success: true,
            message: 'Client retrieved successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error(`Error getting client by ID:`, error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve client'
        });
    }
};

/**
 * Creates a new client.
 */
exports.create = async (req, res) => {
    try {
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
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create client'
        });
    }
};

/**
 * Updates an existing client.
 */
exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, phone, address, company } = req.body;

        const result = await pool.query(
            'UPDATE clients SET name = $1, email = $2, phone = $3, address = $4, company = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
            [name, email, phone, address, company, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        res.json({
            success: true,
            message: 'Client updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update client'
        });
    }
};

/**
 * Deletes a client.
 */
exports.delete = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM clients WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Client not found' });
        }

        res.status(204).send(); // 204 No Content is standard for a successful delete
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ success: false, message: 'Failed to delete client' });
    }
};