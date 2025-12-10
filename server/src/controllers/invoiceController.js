const { query } = require('../config/database');

const getAll = async (req, res) => {
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
        console.error('Get invoices error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve invoices'
        });
    }
};

const getById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const invoiceResult = await query(`
            SELECT i.*, c.name as client_name, c.email as client_email, 
                   c.phone as client_phone, c.address as client_address
            FROM invoices i
            LEFT JOIN clients c ON i.client_id = c.id
            WHERE i.id = $1
        `, [id]);

        if (invoiceResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        const invoice = invoiceResult.rows[0];

        const itemsResult = await query(
            'SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id ASC',
            [id]
        );

        invoice.items = itemsResult.rows;

        res.json({
            success: true,
            message: 'Invoice retrieved successfully',
            data: invoice
        });
    } catch (error) {
        console.error('Get invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve invoice'
        });
    }
};

const create = async (req, res) => {
    const client = await query('BEGIN');
    
    try {
        const {
            client_id,
            project_id,
            quotation_id,
            invoice_number,
            subtotal,
            tax_amount,
            total,
            items,
            notes,
            issue_date,
            due_date
        } = req.body;

        if (!client_id || !items || !Array.isArray(items) || items.length === 0) {
            await query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Client ID and at least one item are required'
            });
        }

        const finalInvoiceNumber = invoice_number || 
            `INV-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

        const invoiceResult = await query(
            `INSERT INTO invoices (
                invoice_number, client_id, project_id, quotation_id, subtotal, 
                tax_amount, total, notes, issue_date, due_date, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'draft')
            RETURNING id, invoice_number, total, created_at`,
            [
                finalInvoiceNumber,
                client_id,
                project_id || null,
                quotation_id || null,
                subtotal || 0,
                tax_amount || 0,
                total || 0,
                notes || '',
                issue_date || new Date().toISOString().split('T')[0],
                due_date
            ]
        );

        const invoiceId = invoiceResult.rows[0].id;

        for (const item of items) {
            await query(
                `INSERT INTO invoice_items (
                    invoice_id, description, quantity, unit_price, total
                ) VALUES ($1, $2, $3, $4, $5)`,
                [
                    invoiceId,
                    item.description,
                    item.quantity,
                    item.unit_price,
                    item.total
                ]
            );
        }

        await query('COMMIT');

        res.status(201).json({
            success: true,
            message: 'Invoice created successfully',
            data: invoiceResult.rows[0]
        });
    } catch (error) {
        await query('ROLLBACK');
        console.error('Create invoice error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create invoice'
        });
    }
};

const updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const allowedStatuses = ['draft', 'sent', 'paid', 'void'];
        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Valid status is required: draft, sent, paid, or void'
            });
        }

        const result = await query(
            `UPDATE invoices 
             SET status = $1, paid_date = CASE WHEN $1 = 'paid' THEN CURRENT_DATE ELSE paid_date END
             WHERE id = $2 
             RETURNING id, invoice_number, status`,
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Invoice not found'
            });
        }

        res.json({
            success: true,
            message: 'Invoice status updated successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Update invoice status error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update invoice status'
        });
    }
};

const deleteInvoice = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await query('DELETE FROM invoices WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Invoice not found' });
        }

        res.json({ success: true, message: 'Invoice deleted successfully' });
    } catch (error) {
        console.error('Delete invoice error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete invoice' });
    }
};

module.exports = {
    getAll,
    getById,
    create,
    updateStatus,
    delete: deleteInvoice
};