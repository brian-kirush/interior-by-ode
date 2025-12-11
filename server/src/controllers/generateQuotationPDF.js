const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generates a quotation PDF and pipes it to response
 * @param {Object} quotation - Quotation data with items
 * @param {Object} res - Express response object
 */
const generateQuotationPdf = (quotation, res) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    // Pipe the PDF to response
    doc.pipe(res);
    
    // Header
    doc.fontSize(20).font('Helvetica-Bold').text('QUOTATION', { align: 'center' });
    doc.moveDown();
    
    // Quotation details
    doc.fontSize(10).font('Helvetica');
    doc.text(`Quotation Number: ${quotation.quotation_number || 'N/A'}`);
    doc.text(`Date: ${new Date(quotation.created_at).toLocaleDateString()}`);
    doc.text(`Valid Until: ${new Date(quotation.valid_until).toLocaleDateString()}`);
    doc.text(`Status: ${quotation.status.toUpperCase()}`);
    doc.moveDown();
    
    // Client info
    doc.font('Helvetica-Bold').text('QUOTATION FOR:').font('Helvetica');
    doc.text(quotation.client_name || 'N/A');
    if (quotation.client_company) doc.text(quotation.client_company);
    if (quotation.client_address) doc.text(quotation.client_address);
    if (quotation.client_email) doc.text(`Email: ${quotation.client_email}`);
    if (quotation.client_phone) doc.text(`Phone: ${quotation.client_phone}`);
    doc.moveDown();
    
    // Table header
    const tableTop = doc.y;
    doc.font('Helvetica-Bold');
    doc.text('Description', 50, tableTop);
    doc.text('Unit', 250, tableTop);
    doc.text('Qty', 300, tableTop);
    doc.text('Unit Price', 350, tableTop);
    doc.text('Total', 450, tableTop);
    
    // Draw line
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
    
    // Table rows
    let yPos = tableTop + 25;
    doc.font('Helvetica');
    
    if (quotation.items && quotation.items.length > 0) {
        quotation.items.forEach((item, index) => {
            if (yPos > 700) { // Page break check
                doc.addPage();
                yPos = 50;
            }
            
            doc.text(item.description || 'Item', 50, yPos);
            doc.text(item.unit || '-', 250, yPos);
            doc.text(item.quantity?.toString() || '1', 300, yPos);
            doc.text(`$${parseFloat(item.unit_price || 0).toFixed(2)}`, 350, yPos);
            doc.text(`$${parseFloat(item.total || 0).toFixed(2)}`, 450, yPos);
            yPos += 20;
        });
    }
    
    // Summary
    yPos = Math.max(yPos, 500);
    doc.moveDown(2);
    doc.text(`Subtotal: $${parseFloat(quotation.subtotal || 0).toFixed(2)}`, { align: 'right' });
    doc.text(`Tax (${quotation.tax_rate || 0}%): $${parseFloat(quotation.tax_amount || 0).toFixed(2)}`, { align: 'right' });
    doc.text(`Discount: $${parseFloat(quotation.discount_amount || 0).toFixed(2)}`, { align: 'right' });
    
    // Total
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold').text(`TOTAL: $${parseFloat(quotation.total || 0).toFixed(2)}`, { align: 'right' });
    
    // Notes
    if (quotation.notes) {
        doc.moveDown(2);
        doc.font('Helvetica').text('Terms & Conditions:', 50);
        doc.text(quotation.notes, 50, doc.y, { width: 500 });
    }
    
    // Footer
    doc.fontSize(8).font('Helvetica').text(
        'This quotation is valid until the date specified above.',
        { align: 'center' }
    );
    
    doc.end();
};

module.exports = { generateQuotationPdf };