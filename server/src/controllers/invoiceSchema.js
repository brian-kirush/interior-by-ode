// server/src/schemas/invoiceSchema.js

/**
 * Middleware to validate the request body for creating an invoice.
 * In a production application, consider using a robust validation library like Joi or Zod.
 */
const createInvoice = (req, res, next) => {
    const { client_id, items, total, due_date } = req.body;

    if (!client_id) {
        return res.status(400).json({ success: false, message: 'Client ID is required.' });
    }

    if (!due_date) {
        return res.status(400).json({ success: false, message: 'Due date is required.' });
    }

    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ success: false, message: 'Invoice must have at least one item.' });
    }

    if (typeof total !== 'number' || total < 0) {
        return res.status(400).json({ success: false, message: 'A valid total amount is required.' });
    }

    next();
};

/**
 * Middleware to validate the request body for updating an invoice status.
 */
const updateStatus = (req, res, next) => {
    const { status } = req.body;
    if (!status || typeof status !== 'string') {
        return res.status(400).json({ success: false, message: 'A valid status is required.' });
    }
    next();
};

module.exports = { createInvoice, updateStatus };