const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const fs = require('fs');
const moment = require('moment');
const { uploadReceiptToDrive, updateSheet, fetchTenantsFromSheet } = require('./googleHandler');
const { classifyTransaction } = require('./transactionClassifier');
const { generateReceipt } = require('./receiptGenerator');
const { isProcessed, markProcessed } = require('./stateManager');

const DATA_FILE = path.join(__dirname, '../data/excel_output.json');

async function main() {
    console.log('Starting Local Data Processor...');

    if (!fs.existsSync(DATA_FILE)) {
        console.error(`Data file not found: ${DATA_FILE}`);
        return;
    }

    // 1. Load Data
    const rawData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    console.log(`Loaded ${rawData.length} transactions from ${DATA_FILE}`);

    // 2. Load Config
    console.log('Fetching tenant configuration...');
    let tenantsConfig = { apartments: {} };
    try {
        const localConfigPath = path.join(__dirname, '../config/tenants.json');
        if (fs.existsSync(localConfigPath)) {
            const localData = fs.readFileSync(localConfigPath, 'utf8');
            tenantsConfig = JSON.parse(localData);
        }
    } catch (e) {
        console.warn('Could not load local tenants.json');
    }

    // Merge with Sheet Config
    try {
        const sheetConfig = await fetchTenantsFromSheet();
        tenantsConfig.apartments = { ...tenantsConfig.apartments, ...sheetConfig.apartments };
    } catch (e) {
        console.warn('Could not fetch tenants from sheet, using local config only.', e.message);
    }

    // 3. Process
    let processedCount = 0;
    for (const item of rawData) {
        const txnId = item._id; // The internal unique ID

        if (isProcessed(txnId)) {
            console.log(`Skipping already processed: ${txnId}`);
            continue;
        }

        console.log(`\n--- Processing: ${item['לטובת']} - ${item['זכות']} ILS ---`);

        // Prepare context for classification
        // Combine 'לטובת' (Payer Name) and 'קבלה' (Receipt/Note) and 'הפעולה'
        const descForClassify = `${item['לטובת']} ${item['קבלה'] || ''} ${item['הפעולה'] || ''}`;

        const classification = classifyTransaction(descForClassify, tenantsConfig);

        if (!classification.apartment) {
            console.warn(`Could not identify tenant for: "${descForClassify}". Skipping.`);
            continue;
        }

        console.log(`Identified: Apt ${classification.apartment} (${classification.tenantName})`);

        // Determine ID to display on receipt
        // User extracted 'קבלה', so let's use it as the Reference if available.
        const displayId = item['קבלה'] ? String(item['קבלה']) : String(item['אסמכתא'] || txnId);

        try {
            // Generate Receipt
            console.log('Generating receipt...');
            const receiptPath = await generateReceipt({
                id: displayId,
                date: new Date(item['תאריך']),
                amount: parseFloat(item['זכות']),
                description: `Payment from ${classification.tenantName} - ${item['הפעולה']}`
            }, {
                apartment: classification.apartment,
                tenantName: classification.tenantName
            });
            console.log(`Generated Receipt: ${receiptPath}`);

            // Upload
            console.log('Uploading to Drive...');
            const fileName = path.basename(receiptPath);
            const webViewLink = await uploadReceiptToDrive(receiptPath, fileName);
            console.log(`Uploaded to Drive: ${webViewLink}`);

            // Update Sheet
            console.log('Updating Sheet...');
            // [Date, Amount, Payer, Apt, Ref, Link]
            const rowData = [
                item['תאריך'], // YYYY-MM-DD
                parseFloat(item['זכות']),
                classification.tenantName,
                classification.apartment,
                displayId,
                webViewLink
            ];

            await updateSheet(rowData);
            console.log('Sheet Updated.');

            markProcessed(txnId); // Mark the internal ID as processed
            processedCount++;

        } catch (err) {
            console.error(`Error processing transaction ${txnId} at step:`);
            if (err.response && err.response.data) {
                console.error(JSON.stringify(err.response.data, null, 2));
            } else {
                console.error(err);
            }
        }
    }

    console.log(`\nDone. Processed ${processedCount} new transactions.`);
}

if (require.main === module) {
    main();
}
