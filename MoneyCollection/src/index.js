require('dotenv').config();
const { getBankTransactions } = require('./bankCheckingAccount');
const { uploadReceiptToDrive, updateSheet, fetchTenantsFromSheet } = require('./googleHandler');
const { isProcessed, markProcessed } = require('./stateManager');
const { classifyTransaction } = require('./transactionClassifier');
const { generateReceipt } = require('./receiptGenerator');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

async function main() {
    console.log('Starting Building Committee Collection System...');

    try {
        // 0. Load Tenant Config
        console.log('Fetching tenant configuration...');

        // Load local config as base
        let tenantsConfig = { apartments: {} };
        try {
            const localData = fs.readFileSync(path.join(__dirname, '../config/tenants.json'), 'utf8');
            tenantsConfig = JSON.parse(localData);
            console.log(`Loaded ${Object.keys(tenantsConfig.apartments).length} apartments from local JSON.`);
        } catch (e) {
            console.warn('Could not load local tenants.json');
        }

        // Load from Sheet and merge (Sheet takes precedence if collision, or we can merge lists?)
        // User wants Sheet to "build" the json, implying Sheet is source of truth.
        // For now, let's overlay Sheet data on top of local data.
        const sheetConfig = await fetchTenantsFromSheet();
        if (Object.keys(sheetConfig.apartments).length > 0) {
            console.log(`Loaded ${Object.keys(sheetConfig.apartments).length} apartments from Google Sheet.`);
            // Simple merge: sheet overwrites local if key exists, adds if not
            tenantsConfig.apartments = { ...tenantsConfig.apartments, ...sheetConfig.apartments };
        } else {
            console.log('Using local tenant configuration only.');
        }

        // 1. Scrape Bank
        // For default, fetch current month. 
        // To fetch more history initially, change date here manually or via args.
        const startOfMonth = moment().startOf('month').format('YYYY-MM-DD');
        const transactions = await getBankTransactions(startOfMonth);

        if (transactions.length === 0) {
            console.log('No incoming transactions found.');
            return;
        }

        console.log(`Processing ${transactions.length} transactions...`);

        let processedCount = 0;

        for (const txn of transactions) {
            // Use a unique ID combination if bank doesn't provide a global unique ID consistent across scrapes.
            // israeli-bank-scrapers usually provides an 'identifier' or we can combine date-amount-desc.
            // Assuming 'identifier' or 'id' property exists and is stable.
            const txnId = txn.identifier || txn.id;

            if (isProcessed(txnId)) {
                console.log(`Skipping already processed transaction: ${txnId}`);
                continue;
            }

            console.log(`\n--- Processing Transaction: ${txn.description} (${txn.chargedAmount} ILS) ---`);

            // 2. Classify
            const classification = classifyTransaction(txn.description, tenantsConfig);

            if (!classification.apartment) {
                console.warn(`Could not identify tenant for transaction: ${txn.description}. Handle manually.`);
                // TODO: Maybe alert user or log to a "failed" list?
                continue;
            }

            console.log(`Identified: Apt ${classification.apartment} (${classification.tenantName}) - Confidence: ${classification.confidence}`);

            // 3. Generate Receipt
            const receiptPath = await generateReceipt({
                id: String(txnId),
                date: txn.date,
                amount: txn.chargedAmount,
                description: txn.description
            }, {
                apartment: classification.apartment,
                tenantName: classification.tenantName
            });

            console.log(`Generated Receipt: ${receiptPath}`);

            // 4. Upload to Drive
            const fileName = path.basename(receiptPath);
            const webViewLink = await uploadReceiptToDrive(receiptPath, fileName);
            console.log(`Uploaded to Drive: ${webViewLink}`);

            // 5. Update Sheet
            // [Date, Amount, Payer, Apt, Ref, Link]
            const rowData = [
                moment(txn.date).format('YYYY-MM-DD'),
                txn.chargedAmount,
                classification.tenantName,
                classification.apartment,
                txnId,
                webViewLink
            ];

            await updateSheet(rowData);
            console.log('Updated Google Sheet.');

            // 6. Mark Processed
            markProcessed(txnId);
            processedCount++;
        }

        console.log(`\nDone. Processed ${processedCount} new transactions.`);

    } catch (err) {
        console.error('Fatal Error in main loop:', err);
        process.exit(1);
    }
}

// Run
if (require.main === module) {
    main();
}
