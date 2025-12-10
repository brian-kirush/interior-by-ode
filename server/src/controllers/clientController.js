const Client = require('../models/Client');

class ClientController {
    static async getAll(req, res) {
        try {
            const clients = await Client.findAll();
            res.json({
                success: true,
                message: 'Clients retrieved successfully',
                data: clients
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
            const client = await Client.findById(id);

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
            const existing = await Client.findByEmail(email);
            if (existing) {
                return res.status(409).json({
                    success: false,
                    message: 'Client with this email already exists'
                });
            }

            const client = await Client.create({ name, company, email, phone, address });
            
            res.status(201).json({
                success: true,
                message: 'Client created successfully',
                data: client
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

            const existing = await Client.findByEmail(email);
            if (existing && existing.id !== parseInt(id)) {
                return res.status(409).json({
                    success: false,
                    message: 'Another client with this email already exists'
                });
            }

            const client = await Client.update(id, { name, company, email, phone, address });
            
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
            const hasProjects = await Client.hasProjects(id);
            if (hasProjects) {
                return res.status(409).json({
                    success: false,
                    message: 'Cannot delete client with active projects'
                });
            }

            const client = await Client.delete(id);
            
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
