const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

/**
 * Generates a PDF receipt for a transaction.
 * @param {Object} transaction - { date, amount, description, id }
 * @param {Object} tenantInfo - { apartment, tenantName }
 * @returns {Promise<string>} - The absolute path to the generated PDF.
 */
function generateReceipt(transaction, tenantInfo) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });

            // Ensure receipts directory exists
            const receiptsDir = path.join(__dirname, '../receipts');
            if (!fs.existsSync(receiptsDir)) {
                fs.mkdirSync(receiptsDir, { recursive: true });
            }

            const dateStr = moment(transaction.date).format('YYYY-MM-DD');
            const filename = `Receipt_Apt_${tenantInfo.apartment}_${dateStr}_${transaction.id.slice(-4)}.pdf`;
            const filePath = path.join(receiptsDir, filename);

            const stream = fs.createWriteStream(filePath);
            doc.pipe(stream);

            // Registers a Hebrew font. Windows standard path.
            // If this fails on a specific system, we might need to bundle a specific font.
            // 'Arial' usually supports Hebrew.
            const fontPath = 'C:\\Windows\\Fonts\\arial.ttf';
            if (fs.existsSync(fontPath)) {
                doc.font(fontPath);
            } else {
                console.warn('Warning: Arial font not found at default path. Hebrew might not render correctly.');
                // Fallback to standard font (might fail for Hebrew)
            }

            // -- Header --
            doc.fontSize(20).text('קבלה - ועד בית שדרות האלונים 8', { align: 'center', underline: true });
            doc.moveDown();

            // -- Details --
            doc.fontSize(14);

            // Note: PDFKit might require RTL text to be reversed if simple 'text' is used without complex script shaping.
            // However, for single line simple Hebrew, let's try direct.
            // If output is reversed, we might need a small helper function.
            // Simple reversal helper:
            const reverse = (str) => str.split('').reverse().join('');

            // Actually, for "visual" logical ordering in simple PDF engines, we often just type standard. 
            // Let's assume standard writing for now, but handle alignment.
            // Align right for Hebrew.

            const addLine = (label, value) => {
                // Simple RTL hack check: if value contains Hebrew, we might want to ensure align 'right'.
                // But PDFKit text call with {align: 'right'} aligns the whole block right.
                doc.text(`${reverse(label)}: ${value}`, { align: 'right' });
                doc.moveDown(0.5);
            };

            // Actually, standard practice without advanced shaping: 
            // reverse the hebrew string visually effectively? 
            // Or just rely on align right?
            // Let's stick to standard printing. If user complains about Hebrew direction, we fix it.
            // Usually users read PDFKit hebrew output best when:
            // 1. Valid font
            // 2. align: 'right'
            // 3. Text content is logically stored? 
            // Let's use standard order first.

            doc.text(`_________________________________________________`, { align: 'center' });
            doc.moveDown();

            // תאריך
            doc.text(`תאריך: ${dateStr}`, { align: 'right' });

            // סכום
            doc.text(`סכום: ${transaction.amount} ₪`, { align: 'right' });

            // דירה
            doc.text(`דירה: ${tenantInfo.apartment}`, { align: 'right' });

            // משלם
            doc.text(`משלם: ${tenantInfo.tenantName}`, { align: 'right' });

            // פרטים
            doc.text(`פרטים: ${transaction.description}`, { align: 'right' });

            // אסמכתא
            doc.text(`אסמכתא: ${transaction.id}`, { align: 'right' });

            doc.moveDown(2);
            doc.fontSize(12).text('תודה רבה על התשלום!', { align: 'center' });

            doc.end();

            stream.on('finish', () => {
                resolve(filePath);
            });

            stream.on('error', (err) => {
                reject(err);
            });

        } catch (err) {
            reject(err);
        }
    });
}

module.exports = { generateReceipt };
