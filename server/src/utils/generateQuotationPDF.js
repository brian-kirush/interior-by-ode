const PDFDocument = require('pdfkit');

function generateQuotationPdf(quotation, stream) {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    doc.pipe(stream);

    // Helper function for text formatting
    const FONT_REGULAR = 'Helvetica';
    const FONT_BOLD = 'Helvetica-Bold';

    // Header
    doc.font(FONT_BOLD).fontSize(20).text('QUOTATION', 50, 50);
    doc.fontSize(10).text(`Quotation Number: ${quotation.quotation_number}`, 50, 80);
    doc.text(`Issue Date: ${new Date(quotation.created_at).toLocaleDateString()}`, 50, 95);
    if (quotation.valid_until) {
        doc.text(`Valid Until: ${new Date(quotation.valid_until).toLocaleDateString()}`, 50, 110);
    }

    // Company and Client Details
    doc.font(FONT_BOLD).text('From:', 350, 80);
    doc.font(FONT_REGULAR).text('Interior by ODE', 350, 95);
    doc.text('123 Design Lane', 350, 110);
    doc.text('New York, NY 10001', 350, 125);

    doc.font(FONT_BOLD).text('To:', 50, 150);
    doc.font(FONT_REGULAR).text(quotation.client_name, 50, 165);
    doc.text(quotation.client_address || 'N/A', 50, 180);
    doc.text(quotation.client_email, 50, 195);

    // Table for quotation items
    const tableTop = 250;
    const itemDescX = 50;
    const quantityX = 250;
    const unitPriceX = 320;
    const totalX = 450;

    // Table Header
    doc.font(FONT_BOLD);
    doc.text('Description', itemDescX, tableTop);
    doc.text('Quantity', quantityX, tableTop);
    doc.text('Unit Price', unitPriceX, tableTop, { width: 90, align: 'right' });
    doc.text('Total', totalX, tableTop, { width: 100, align: 'right' });
    doc.font(FONT_REGULAR);

    // Draw a line under the header
    doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();

    let currentY = tableTop + 25;
    quotation.items.forEach(item => {
        doc.text(item.description, itemDescX, currentY);
        doc.text(item.quantity.toString(), quantityX, currentY);
        doc.text(`$${item.unit_price.toFixed(2)}`, unitPriceX, currentY, { width: 90, align: 'right' });
        doc.text(`$${item.total.toFixed(2)}`, totalX, currentY, { width: 100, align: 'right' });
        currentY += 20;
    });

    // Draw a line above the totals
    doc.moveTo(50, currentY).lineTo(550, currentY).stroke();

    // Totals Section
    currentY += 15;
    const totalsX = 400;

    doc.font(FONT_BOLD).text('Subtotal:', totalsX, currentY, { align: 'left' });
    doc.font(FONT_REGULAR).text(`$${quotation.subtotal.toFixed(2)}`, 0, currentY, { align: 'right' });
    currentY += 20;

    doc.font(FONT_BOLD).text('Tax:', totalsX, currentY, { align: 'left' });
    doc.font(FONT_REGULAR).text(`$${quotation.tax_amount.toFixed(2)}`, 0, currentY, { align: 'right' });
    currentY += 20;

    if (quotation.discount_amount > 0) {
        doc.font(FONT_BOLD).text('Discount:', totalsX, currentY, { align: 'left' });
        doc.font(FONT_REGULAR).text(`-$${quotation.discount_amount.toFixed(2)}`, 0, currentY, { align: 'right' });
        currentY += 20;
    }

    doc.moveTo(totalsX - 10, currentY).lineTo(550, currentY).stroke();
    currentY += 10;

    doc.font(FONT_BOLD).fontSize(12).text('Total:', totalsX, currentY, { align: 'left' });
    doc.font(FONT_BOLD).text(`$${quotation.total.toFixed(2)}`, 0, currentY, { align: 'right' });
    currentY += 40;

    // Notes
    if (quotation.notes) {
        doc.font(FONT_BOLD).fontSize(10).text('Notes:', 50, currentY);
        doc.font(FONT_REGULAR).text(quotation.notes, 50, currentY + 15, {
            align: 'left',
            width: 500,
        });
    }

    // Footer
    doc.fontSize(8).text('This quotation is valid until the date specified above.', 50, 750, {
        align: 'center',
        width: 500,
    });

    doc.end();
}

module.exports = { generateQuotationPdf };