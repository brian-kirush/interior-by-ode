// server/src/controllers/invoiceController.js
const pool = require('../config/database');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { generateInvoicePdf } = require('./generateInvoicePDF.js');

/**
 * Fetches a single invoice and its items by ID.
 * @param {string} id - The ID of the invoice to fetch.
 * @returns {Promise<object|null>} The full invoice object or null if not found.
 */
const getFullInvoiceById = async (id) => {
    const invoiceResult = await pool.query(`
        SELECT i.*, c.name as client_name, c.email as client_email, 
               c.phone as client_phone, c.address as client_address
        FROM invoices i
        LEFT JOIN clients c ON i.client_id = c.id
        WHERE i.id = $1
    `, [id]);

    if (invoiceResult.rows.length === 0) {
        return null;
    }

    const invoice = invoiceResult.rows[0];
    const itemsResult = await pool.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [id]);
    invoice.items = itemsResult.rows;
    return invoice;
};

const InvoiceController = {
    // Get all invoices
    getAll: catchAsync(async (req, res, next) => {
        const result = await pool.query(`
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
    }),

    // Get single invoice by ID
    getById: catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const invoice = await getFullInvoiceById(id);

        if (!invoice) {
            return next(new AppError('Invoice not found', 404));
        }

        res.json({ success: true, message: `Invoice ${id} retrieved`, data: invoice });
    }),

    create: catchAsync(async (req, res, next) => {
        const { client_id, quotation_id, project_id, items, ...invoiceData } = req.body;
        const dbClient = await pool.connect(); // Use a client from the pool for transactions
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
            // Pass the error to the global error handler
            return next(new AppError('Failed to create invoice.', 500, error));
        } finally {
            dbClient.release(); // Release the client back to the pool
        }
    }),

    updateStatus: catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const { status } = req.body;
        const validStatuses = ['draft', 'sent', 'paid', 'overdue', 'cancelled'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status provided.' });
        }

        const result = await pool.query(
            'UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [status, id]
        );

        if (result.rows.length === 0) {
            return next(new AppError('Invoice not found', 404));
        }

        res.json({
            success: true,
            message: `Invoice ${id} status updated to ${status}`,
            data: result.rows[0]
        });
    }),

    delete: catchAsync(async (req, res, next) => {
        const { id } = req.params;
        // The 'invoice_items' table should have ON DELETE CASCADE for this to work cleanly
        const result = await pool.query('DELETE FROM invoices WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return next(new AppError('Invoice not found', 404));
        }

        res.status(200).json({ success: true, message: `Invoice ${id} deleted successfully` });
    }),

    // Download an invoice as a PDF
    download: catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const invoice = await getFullInvoiceById(id);

        if (!invoice) {
            return next(new AppError('Invoice not found', 404));
        }

        const filename = `Invoice-${invoice.invoice_number}.pdf`;
        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');

        generateInvoicePdf(invoice, res);
    }),

    // Update invoice (fields and optionally replace items)
    update: catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const { items, ...fields } = req.body;
        const dbClient = await pool.connect();
        try {
            await dbClient.query('BEGIN');

            // Build dynamic update clause
            const setParts = [];
            const values = [];
            let idx = 1;
            for (const [key, value] of Object.entries(fields)) {
                if ([ 'client_id', 'quotation_id', 'project_id', 'subtotal', 'tax_rate', 'tax_amount', 'discount_amount', 'total', 'status', 'issue_date', 'due_date', 'notes' ].includes(key)) {
                    setParts.push(`${key} = $${idx}`);
                    values.push(value);
                    idx++;
                }
            }

            if (setParts.length > 0) {
                values.push(id);
                const q = `UPDATE invoices SET ${setParts.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;
                const result = await dbClient.query(q, values);
                if (result.rows.length === 0) {
                    await dbClient.query('ROLLBACK');
                    return next(new AppError('Invoice not found', 404));
                }
            }

            if (Array.isArray(items)) {
                await dbClient.query('DELETE FROM invoice_items WHERE invoice_id = $1', [id]);
                for (const item of items) {
                    await dbClient.query(
                        `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [id, item.description || '', item.quantity || 1, item.unit_price || 0, item.total || ((item.quantity || 1) * (item.unit_price || 0))]
                    );
                }
            }

            await dbClient.query('COMMIT');
            const updated = await getFullInvoiceById(id);
            res.json({ success: true, message: 'Invoice updated successfully', data: updated });
        } catch (error) {
            await dbClient.query('ROLLBACK');
            return next(new AppError('Failed to update invoice', 500, error));
        } finally {
            dbClient.release();
        }
    }),
};

module.exports = InvoiceController;