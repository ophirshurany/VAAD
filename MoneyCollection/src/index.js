require('dotenv').config();
const { getBankTransactions } = require('./bankCheckingAccount');
const { uploadReceiptToDrive, fetchTenantsFromSheet, recordPaymentToGrid } = require('./googleHandler');
const { isProcessed, markProcessed } = require('./stateManager');
const { classifyTransaction } = require('./transactionClassifier');
const { generateReceipt } = require('./receiptGenerator');
const { validatePayment, getFixedAmount } = require('./paymentValidator');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

// Get fixed payment amount from config
const FIXED_PAYMENT_AMOUNT = getFixedAmount();

async function main() {
    console.log('Starting Building Committee Collection System...');
    console.log(`Fixed payment amount: ${FIXED_PAYMENT_AMOUNT} ₪`);

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

        // Load from Sheet and merge (Sheet takes precedence if collision)
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
        const startOfMonth = moment().startOf('month').format('YYYY-MM-DD');
        const transactions = await getBankTransactions(startOfMonth);

        if (transactions.length === 0) {
            console.log('No incoming transactions found.');
            return;
        }

        console.log(`Processing ${transactions.length} transactions...`);

        let processedCount = 0;

        for (const txn of transactions) {
            // Use a unique ID combination if bank doesn't provide a global unique ID
            const txnId = txn.identifier || txn.id;

            if (isProcessed(txnId)) {
                console.log(`Skipping already processed transaction: ${txnId}`);
                continue;
            }

            console.log(`\n--- Processing Transaction: ${txn.description} (${txn.chargedAmount} ₪) ---`);

            // 2. Classify
            const classification = classifyTransaction(txn.description, tenantsConfig);

            if (!classification.apartment) {
                console.warn(`Could not identify tenant for transaction: ${txn.description}. Handle manually.`);
                continue;
            }

            console.log(`Identified: Apt ${classification.apartment} (${classification.tenantName}) - Confidence: ${classification.confidence}`);

            // 2.5. Validate Payment
            const paymentValidation = validatePayment(txn.chargedAmount);

            if (paymentValidation.isUnderpayment) {
                console.warn(`⚠️  Underpayment detected: ${txn.chargedAmount} ₪ (expected ${FIXED_PAYMENT_AMOUNT} ₪, short by ${paymentValidation.shortfall} ₪)`);
            } else if (paymentValidation.isOverpayment) {
                console.log(`💰 Overpayment detected: ${txn.chargedAmount} ₪ covers ${paymentValidation.monthsCovered} months`);
            }

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

            // 5. Record Payment to Grid (replaces old updateSheet append)
            // This handles:
            // - Recording payment in correct apartment row × month column
            // - Highlighting underpayments in red
            // - Covering previous unpaid months with overpayments
            const coveredMonths = await recordPaymentToGrid({
                apartment: classification.apartment,
                payerName: classification.tenantName,
                amount: txn.chargedAmount,
                date: txn.date,
                reference: txnId,
                receiptLink: webViewLink
            }, FIXED_PAYMENT_AMOUNT);

            console.log(`Recorded to Payments grid. Months covered: ${coveredMonths.join(', ')}`);

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

// Export for scheduler
module.exports = { main };

// Run if executed directly
if (require.main === module) {
    main();
}
