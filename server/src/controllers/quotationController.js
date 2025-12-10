const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class QuotationController {
    async getAllQuotations(req, res) {
        try {
            const result = await query(`
                SELECT q.*, c.name as client_name
                FROM quotations q
                LEFT JOIN clients c ON q.client_id = c.id
                ORDER BY q.created_at DESC
            `);
            
            res.json({
                success: true,
                message: 'Quotations retrieved successfully',
                data: result.rows
            });
        } catch (error) {
            console.error('Get quotations error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve quotations'
            });
        }
    }

    async getQuotationById(req, res) {
        try {
            const { id } = req.params;
            
            const quotationResult = await query(`
                SELECT q.*, c.name as client_name, c.email as client_email, 
                       c.phone as client_phone, c.address as client_address,
                       c.company as client_company
                FROM quotations q
                LEFT JOIN clients c ON q.client_id = c.id
                WHERE q.id = $1
            `, [id]);

            if (quotationResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Quotation not found'
                });
            }

            const quotation = quotationResult.rows[0];

            const itemsResult = await query(
                'SELECT * FROM quotation_items WHERE quotation_id = $1 ORDER BY id ASC',
                [id]
            );

            quotation.items = itemsResult.rows;

            res.json({
                success: true,
                message: 'Quotation retrieved successfully',
                data: quotation
            });
        } catch (error) {
            console.error('Get quotation error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve quotation'
            });
        }
    }

    async createQuotation(req, res) {
        const client = await query('BEGIN');
        
        try {
            const {
                client_id,
                project_id,
                quotation_number,
                subtotal,
                tax_rate,
                tax_amount,
                discount_amount,
                total,
                items,
                notes,
                valid_until
            } = req.body;

            if (!client_id || !items || !Array.isArray(items) || items.length === 0) {
                await query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'Client ID and at least one item are required'
                });
            }

            const finalQuotationNumber = quotation_number || 
                `QB-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(4, '0')}`;

            const quotationResult = await query(
                `INSERT INTO quotations (
                    quotation_number, client_id, project_id, subtotal, tax_rate, 
                    tax_amount, discount_amount, total, notes, valid_until, status
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft')
                RETURNING id, quotation_number, subtotal, tax_amount, discount_amount, total, created_at`,
                [
                    finalQuotationNumber,
                    client_id,
                    project_id || null,
                    subtotal || 0,
                    tax_rate || 16,
                    tax_amount || 0,
                    discount_amount || 0,
                    total || 0,
                    notes || '',
                    valid_until || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                ]
            );

            const quotationId = quotationResult.rows[0].id;

            for (const item of items) {
                await query(
                    `INSERT INTO quotation_items (
                        quotation_id, description, unit, quantity, unit_price, total
                    ) VALUES ($1, $2, $3, $4, $5, $6)`,
                    [
                        quotationId,
                        item.description || 'Item',
                        item.unit || '',
                        item.quantity || 1,
                        item.unit_price || 0,
                        (item.quantity || 1) * (item.unit_price || 0)
                    ]
                );
            }

            await query('COMMIT');

            res.status(201).json({
                success: true,
                message: 'Quotation created successfully',
                data: {
                    id: quotationId,
                    quotation_number: finalQuotationNumber,
                    total: total || 0
                }
            });
        } catch (error) {
            await query('ROLLBACK');
            console.error('Create quotation error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create quotation'
            });
        }
    }

    async updateQuotationStatus(req, res) {
        try {
            const { id } = req.params;
            const { status } = req.body;

            const allowedStatuses = ['draft', 'sent', 'approved', 'rejected'];
            if (!status || !allowedStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Valid status is required: draft, sent, approved, or rejected'
                });
            }

            const result = await query(
                `UPDATE quotations 
                 SET status = $1 
                 WHERE id = $2 
                 RETURNING id, quotation_number, status`,
                [status, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Quotation not found'
                });
            }

            res.json({
                success: true,
                message: 'Quotation status updated successfully',
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Update quotation status error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update quotation status'
            });
        }
    }

    async deleteQuotation(req, res) {
        try {
            const { id } = req.params;

            const result = await query(
                'DELETE FROM quotations WHERE id = $1 RETURNING id',
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Quotation not found'
                });
            }

            res.json({
                success: true,
                message: 'Quotation deleted successfully'
            });
        } catch (error) {
            console.error('Delete quotation error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to delete quotation'
            });
        }
    }
}

module.exports = new QuotationController();
