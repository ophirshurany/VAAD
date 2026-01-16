const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

puppeteer.use(StealthPlugin());

/**
 * Generates a PDF receipt for a transaction using Puppeteer and an HTML template.
 * @param {Object} transaction - { date, amount, description, id }
 * @param {Object} tenantInfo - { apartment, tenantName }
 * @returns {Promise<string>} - The absolute path to the generated PDF.
 */
function generateReceipt(transaction, tenantInfo) {
    return new Promise(async (resolve, reject) => {
        let browser = null;
        try {
            // Ensure receipts directory exists
            const receiptsDir = path.join(__dirname, '../receipts');
            if (!fs.existsSync(receiptsDir)) {
                fs.mkdirSync(receiptsDir, { recursive: true });
            }

            const dateStr = moment(transaction.date).format('YYYY-MM-DD');
            // Clean filename
            const cleanName = (tenantInfo.tenantName || 'Unknown').replace(/[^a-z0-9\u0590-\u05ff]/gi, '_');
            const filename = `Receipt_Apt_${tenantInfo.apartment}_${cleanName}_${dateStr}.pdf`;
            const filePath = path.join(receiptsDir, filename);

            // Read template
            const templatePath = path.join(__dirname, 'templates', 'receipt.html');
            if (!fs.existsSync(templatePath)) {
                throw new Error(`Template not found at ${templatePath}`);
            }
            let htmlContent = fs.readFileSync(templatePath, 'utf8');

            // Read Logo
            const logoPath = path.join(__dirname, 'assets', 'logo.jpg');
            let logoBase64 = '';
            if (fs.existsSync(logoPath)) {
                const logoData = fs.readFileSync(logoPath);
                logoBase64 = `data:image/jpeg;base64,${logoData.toString('base64')}`;
            }

            // Prepare Data
            const buildingName = 'אלונים 8, באר יעקב';
            const receiptData = {
                logoSrc: logoBase64,
                buildingName: buildingName,
                receiptNum: `AL-${(transaction.id || '0000').slice(-6)}`, // Use last 6 chars of ID
                date: moment(transaction.date).format('DD/MM/YYYY'),
                tenantName: tenantInfo.tenantName || 'דייר לא ידוע',
                apartment: tenantInfo.apartment || '?',
                paymentType: 'ועד בית חודשי', // Default
                paymentMonth: formatHebrewMonth(transaction.date), // Helper
                paymentMethod: 'העברה בנקאית', // Default for bank scraping
                amount: new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(transaction.amount),
                notes: transaction.description || '',
                footerBuilding: buildingName
            };

            // Launch Puppeteer
            browser = await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'] // Font hinting off for better Hebrew?
            });
            const page = await browser.newPage();

            // Set content
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

            // Inject Data
            await page.evaluate((data) => {
                if (data.logoSrc) {
                    const img = document.getElementById('logoImg');
                    img.src = data.logoSrc;
                    img.style.display = 'block';
                }

                const setText = (id, text) => {
                    const el = document.getElementById(id);
                    if (el) el.innerText = text;
                };

                setText('buildingName', data.buildingName);
                setText('receiptNum', data.receiptNum);
                setText('date', data.date);
                setText('tenantName', data.tenantName);
                setText('apartment', data.apartment);
                setText('paymentType', data.paymentType);
                setText('paymentMonth', data.paymentMonth);
                setText('paymentMethod', data.paymentMethod);
                setText('amount', data.amount);
                setText('footerBuilding', data.footerBuilding);

                if (data.notes) {
                    document.getElementById('notesContainer').style.display = 'block';
                    setText('notes', data.notes);
                }

            }, receiptData);

            // Generate PDF
            await page.pdf({
                path: filePath,
                format: 'A4',
                printBackground: true,
                margin: {
                    top: '20px',
                    bottom: '20px',
                    left: '20px',
                    right: '20px'
                }
            });

            console.log(`Receipt generated: ${filePath}`);
            resolve(filePath);

        } catch (err) {
            console.error('Error generating receipt:', err);
            reject(err);
        } finally {
            if (browser) await browser.close();
        }
    });
}

function formatHebrewMonth(dateInput) {
    const d = moment(dateInput).toDate();
    const months = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
    return months[d.getMonth()] + ' ' + d.getFullYear();
}

module.exports = { generateReceipt };
