const pool = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { generateQuotationPdf } = require('./generateQuotationPDF');

class QuotationController {
    getAllQuotations = catchAsync(async (req, res, next) => {
        const result = await pool.query(`
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
    }); // Added closing parenthesis for catchAsync

    async getFullQuotationById(id) {
        const quotationResult = await pool.query(
            `SELECT q.*, c.name as client_name, c.email as client_email, 
                    c.phone as client_phone, c.address as client_address,
                    c.company as client_company
             FROM quotations q
             LEFT JOIN clients c ON q.client_id = c.id
             WHERE q.id = $1`,
            [id]
        );

        if (quotationResult.rows.length === 0) return null;

        const quotation = quotationResult.rows[0];

        const itemsResult = await pool.query(
            'SELECT * FROM quotation_items WHERE quotation_id = $1 ORDER BY id ASC',
            [id]
        );

        quotation.items = itemsResult.rows;
        return quotation;
    }

    getQuotationById = catchAsync(async (req, res, next) => {
        const quotation = await this.getFullQuotationById(req.params.id);

        res.json({
            success: true,
            message: 'Quotation retrieved successfully',
            data: quotation
        });
    });

    createQuotation = catchAsync(async (req, res, next) => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
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

            const finalQuotationNumber = quotation_number || 
                `QB-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(4, '0')}`;

            const quotationResult = await client.query(
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

            // Check if items array is provided and not empty
            if (!items || !Array.isArray(items) || items.length === 0) {
                // If no items, commit the transaction and return the quotation
                await client.query('COMMIT');
                res.status(201).json({ success: true, message: 'Quotation created successfully', data: quotationResult.rows[0] });
                return;
            }

            for (const item of items) {
                await client.query(
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

            await client.query('COMMIT');

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
            if (client) await client.query('ROLLBACK');
            // Pass the error to the global error handler
            return next(new AppError('Failed to create quotation.', 500, error));
        } finally {
            if (client) client.release();
        }
    });

    updateQuotationStatus = catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const { status } = req.body;

        const result = await pool.query(
                `UPDATE quotations 
                 SET status = $1 
                 WHERE id = $2 
                 RETURNING id, quotation_number, status`,
                [status, id]
            );

        if (result.rows.length === 0) {
            return next(new AppError('Quotation not found', 404));
        }

        res.json({
            success: true,
            message: 'Quotation status updated successfully',
            data: result.rows[0]
        });
    });

    deleteQuotation = catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const result = await pool.query(
            'DELETE FROM quotations WHERE id = $1 RETURNING id',
            [id]
        );
        if (result.rows.length === 0) {
            return next(new AppError('Quotation not found', 404));
        }

        res.json({
            success: true,
            message: 'Quotation deleted successfully'
        });
    });

    downloadQuotation = catchAsync(async (req, res, next) => {
        const { id } = req.params;
        const quotation = await this.getFullQuotationById(id);

        if (!quotation) {
            return next(new AppError('Quotation not found', 404));
        }

        const filename = `Quotation-${quotation.quotation_number}.pdf`;
        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');

        generateQuotationPdf(quotation, res);
    });
}

module.exports = new QuotationController();
