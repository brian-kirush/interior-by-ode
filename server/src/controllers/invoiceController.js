// server/src/controllers/invoiceController.js
const { query } = require('../config/database');

const InvoiceController = {
    // Get all invoices
    getAll: async (req, res) => {
        try {
            const result = await query(`
                SELECT i.*, c.name as client_name
                FROM invoices i
                LEFT JOIN clients c ON i.client_id = c.id
                ORDER BY i.issue_date DESC, i.created_at DESC
            `);
            res.json({
                success: true,
                message: 'Invoices retrieved successfully',
                data: result.rows
            });
        } catch (error) {
            console.error('Error getting invoices:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to retrieve invoices',
            });
        }
    },

    // Get single invoice by ID
    getById: async (req, res) => {
        const { id } = req.params;
        try {
            const invoiceResult = await query(`
                SELECT i.*, c.name as client_name, c.email as client_email, 
                       c.phone as client_phone, c.address as client_address
                FROM invoices i
                LEFT JOIN clients c ON i.client_id = c.id
                WHERE i.id = $1
            `, [id]);

            if (invoiceResult.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Invoice not found' });
            }

            const invoice = invoiceResult.rows[0];

            // Assuming an `invoice_items` table exists
            const itemsResult = await query('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);
            invoice.items = itemsResult.rows;

            res.json({ success: true, message: `Invoice ${id} retrieved`, data: invoice });
        } catch (error) {
            console.error(`Error getting invoice ${id}:`, error);
            res.status(500).json({ success: false, message: 'Failed to retrieve invoice' });
        }
    },

    create: async (req, res) => {
        const { client_id, quotation_id, project_id, items, ...invoiceData } = req.body;
        const dbClient = await query.connect(); // Use a client from the pool for transactions
        try {
            await dbClient.query('BEGIN');
            const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

            const result = await dbClient.query(
                `INSERT INTO invoices (invoice_number, client_id, quotation_id, project_id, subtotal, tax_rate, tax_amount, discount_amount, total, status, issue_date, due_date, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                 RETURNING *`,
                [
                    invoiceNumber, client_id, quotation_id, project_id,
                    invoiceData.subtotal || 0, invoiceData.tax_rate || 16, invoiceData.tax_amount || 0,
                    invoiceData.discount_amount || 0, invoiceData.total || 0, 'draft',
                    invoiceData.issue_date || new Date(), invoiceData.due_date, invoiceData.notes
                ]
            );
            const newInvoice = result.rows[0];

            if (items && items.length > 0) {
                for (const item of items) {
                    await dbClient.query(
                        `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [newInvoice.id, item.description, item.quantity, item.unit_price, item.total]
                    );
                }
            }

            await dbClient.query('COMMIT');
            res.status(201).json({ success: true, message: 'Invoice created successfully', data: newInvoice });
        } catch (error) {
            await dbClient.query('ROLLBACK');
            console.error('Error creating invoice:', error);
            res.status(500).json({ success: false, message: 'Failed to create invoice' });
        } finally {
            dbClient.release(); // Release the client back to the pool
        }
    },

    updateStatus: async (req, res) => {
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status provided.' });
        }

        try {
            const result = await query(
                'UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
                [status, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Invoice not found' });
            }

            res.json({
                success: true,
                message: `Invoice ${id} status updated to ${status}`,
                data: result.rows[0]
            });
        } catch (error) {
            console.error(`Error updating invoice ${id} status:`, error);
            res.status(500).json({ success: false, message: 'Failed to update invoice status' });
        }
    },

    delete: async (req, res) => {
        const { id } = req.params;
        try {
            // The 'invoice_items' table should have ON DELETE CASCADE for this to work cleanly
            const result = await query('DELETE FROM invoices WHERE id = $1 RETURNING id', [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ success: false, message: 'Invoice not found' });
            }

            res.status(200).json({ success: true, message: `Invoice ${id} deleted successfully` });
        } catch (error) {
            console.error(`Error deleting invoice ${id}:`, error);
            res.status(500).json({ success: false, message: 'Failed to delete invoice' });
        }
    },
};

module.exports = InvoiceController;