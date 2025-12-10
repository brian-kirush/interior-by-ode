const { query } = require('../config/database');

class ClientController {
    static async getAll(req, res) {
        try {
            const result = await query('SELECT * FROM clients ORDER BY name ASC');
            res.json({
                success: true,
                message: 'Clients retrieved successfully',
                data: result.rows
            });
        } catch (error) {
            console.error('Get clients error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve clients'
            });
        }
    }

    static async getById(req, res) {
        try {
            const { id } = req.params;
            const result = await query('SELECT * FROM clients WHERE id = $1', [id]);
            const client = result.rows[0];

            if (!client) {
                return res.status(404).json({
                    success: false,
                    message: 'Client not found'
                });
            }

            res.json({
                success: true,
                message: 'Client retrieved successfully',
                data: client
            });
        } catch (error) {
            console.error('Get client error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve client'
            });
        }
    }

    static async create(req, res) {
        try {
            const { name, company, email, phone, address } = req.body;

            if (!name || !email || !phone || !address) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, email, phone, and address are required'
                });
            }

            // Check if email exists
            const existingResult = await query('SELECT id FROM clients WHERE email = $1', [email]);
            if (existingResult.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Client with this email already exists'
                });
            }

            const result = await query(
                `INSERT INTO clients (name, company, email, phone, address) 
                 VALUES ($1, $2, $3, $4, $5) 
                 RETURNING *`,
                [name, company || null, email, phone, address]
            );

            res.status(201).json({
                success: true,
                message: 'Client created successfully',
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Create client error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create client'
            });
        }
    }

    static async update(req, res) {
        try {
            const { id } = req.params;
            const { name, company, email, phone, address } = req.body;

            if (!name || !email || !phone || !address) {
                return res.status(400).json({
                    success: false,
                    message: 'Name, email, phone, and address are required'
                });
            }

            const existingResult = await query('SELECT id FROM clients WHERE email = $1 AND id != $2', [email, id]);
            if (existingResult.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Another client with this email already exists'
                });
            }

            const result = await query(
                `UPDATE clients 
                 SET name = $1, company = $2, email = $3, phone = $4, address = $5, updated_at = NOW()
                 WHERE id = $6
                 RETURNING *`,
                [name, company || null, email, phone, address, id]
            );

            const client = result.rows[0];
            if (!client) {
                return res.status(404).json({
                    success: false,
                    message: 'Client not found'
                });
            }

            res.json({
                success: true,
                message: 'Client updated successfully',
                data: client
            });
        } catch (error) {
            console.error('Update client error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update client'
            });
        }
    }

    static async delete(req, res) {
        try {
            const { id } = req.params;

            // Check if client has projects
            const projectCheck = await query('SELECT id FROM projects WHERE client_id = $1 LIMIT 1', [id]);
            if (projectCheck.rows.length > 0) {
                return res.status(409).json({
                    success: false,
                    message: 'Cannot delete client with active projects. Please reassign or delete projects first.'
                });
            }

            const result = await query('DELETE FROM clients WHERE id = $1 RETURNING id', [id]);
            const client = result.rows[0];

            if (!client) {
                return res.status(404).json({
                    success: false,
                    message: 'Client not found'
                });
            }

            res.json({
                success: true,
                message: 'Client deleted successfully'
            });
        } catch (error) {
            console.error('Delete client error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete client'
            });
        }
    }
}

module.exports = ClientController;
