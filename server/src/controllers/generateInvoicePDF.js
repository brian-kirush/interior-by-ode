const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generates an invoice PDF and pipes it to response
 * @param {Object} invoice - Invoice data with items
 * @param {Object} res - Express response object
 */
const generateInvoicePdf = (invoice, res) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // Pipe the PDF to response
    doc.pipe(res);
    
    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
    doc.moveDown();
    
    // Invoice details
    doc.fontSize(10).font('Helvetica');
    doc.text(`Invoice Number: ${invoice.invoice_number || 'N/A'}`);
    doc.text(`Issue Date: ${new Date(invoice.issue_date).toLocaleDateString()}`);
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`);
    doc.text(`Status: ${invoice.status.toUpperCase()}`);
    doc.moveDown();
    
    // Client info
    doc.font('Helvetica-Bold').text('BILL TO:').font('Helvetica');
    doc.text(invoice.client_name || 'N/A');
    if (invoice.client_company) doc.text(invoice.client_company);
    if (invoice.client_address) doc.text(invoice.client_address);
    if (invoice.client_email) doc.text(`Email: ${invoice.client_email}`);
    if (invoice.client_phone) doc.text(`Phone: ${invoice.client_phone}`);
    doc.moveDown();
    
    // Table header
    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Description', 50, tableTop);
    doc.text('Qty', 300, tableTop);
    doc.text('Unit Price', 350, tableTop);
    doc.text('Total', 450, tableTop);
    
    // Draw line
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    // Table rows
    let yPos = tableTop + 25;
    doc.font('Helvetica');
    
    if (invoice.items && invoice.items.length > 0) {
        invoice.items.forEach((item, index) => {
            if (yPos > 700) { // Page break check
                doc.addPage();
                yPos = 50;
            }
            
            doc.text(item.description || 'Item', 50, yPos);
            doc.text(item.quantity?.toString() || '1', 300, yPos);
            doc.text(`$${parseFloat(item.unit_price || 0).toFixed(2)}`, 350, yPos);
            doc.text(`$${parseFloat(item.total || 0).toFixed(2)}`, 450, yPos);
            yPos += 20;
        });
    }
    
    // Summary
    yPos = Math.max(yPos, 500);
    doc.moveDown(2);
    doc.text(`Subtotal: $${parseFloat(invoice.subtotal || 0).toFixed(2)}`, { align: 'right' });
    doc.text(`Tax (${invoice.tax_rate || 0}%): $${parseFloat(invoice.tax_amount || 0).toFixed(2)}`, { align: 'right' });
    doc.text(`Discount: $${parseFloat(invoice.discount_amount || 0).toFixed(2)}`, { align: 'right' });
    
    // Total
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text(`TOTAL: $${parseFloat(invoice.total || 0).toFixed(2)}`, { align: 'right' });
    
    // Notes
    if (invoice.notes) {
        doc.moveDown(2);
        doc.font('Helvetica').text('Notes:', 50);
        doc.text(invoice.notes, 50, doc.y, { width: 500 });
    }
    
    // Footer
    doc.fontSize(8).font('Helvetica').text(
        'Thank you for your business!',
        { align: 'center' }
    );
    
    doc.end();
};

module.exports = { generateInvoicePdf };