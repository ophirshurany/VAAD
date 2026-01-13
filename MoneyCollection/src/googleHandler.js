const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
require('dotenv').config();

// Load credentials and token
const CREDENTIALS_PATH = path.join(__dirname, '../credentials.json');
const TOKEN_PATH = path.join(__dirname, '../token.json');

// Initialize Auth
function getAuthClient() {
    // Check if token exists
    if (!fs.existsSync(TOKEN_PATH)) {
        throw new Error('token.json not found. Please run "node src/setupAuth.js" first to authenticate.');
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH));

    // Support both 'installed' and 'web' formats
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
}

// Lazy load auth to avoid crashing on import if token missing (though global scope here runs immediately)
// For robustness, we might want to wrap these, but let's stick to user provided structure
// which initializes them at top level.
let drive, sheets;
try {
    const auth = getAuthClient();
    drive = google.drive({ version: 'v3', auth });
    sheets = google.sheets({ version: 'v4', auth });
} catch (e) {
    console.error("Google Auth Initialization Error:", e.message);
    // Allow module load, but methods will fail
}

/**
 * Ensures a folder for the current year exists inside the root folder.
 * @returns {Promise<string>} - The ID of the year folder.
 */
async function getYearFolderId() {
    if (!drive) throw new Error('Google Drive client not initialized');

    const currentYear = moment().format('YYYY');
    const rootFolderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!rootFolderId) {
        throw new Error('GOOGLE_DRIVE_FOLDER_ID is missing from .env');
    }

    // Check if year folder exists
    const query = `mimeType='application/vnd.google-apps.folder' and '${rootFolderId}' in parents and name='${currentYear}' and trashed=false`;

    try {
        const res = await drive.files.list({
            q: query,
            fields: 'files(id, name)',
            spaces: 'drive',
        });

        if (res.data.files.length > 0) {
            console.log(`Found existing folder for year ${currentYear}`);
            return res.data.files[0].id;
        }

        // Create if not exists
        console.log(`Creating folder for year ${currentYear}...`);
        const fileMetadata = {
            name: currentYear,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [rootFolderId],
        };

        const file = await drive.files.create({
            resource: fileMetadata,
            fields: 'id',
        });

        return file.data.id;
    } catch (err) {
        console.error('Error finding/creating year folder:', err);
        throw err;
    }
}

/**
 * Uploads a PDF receipt to Google Drive.
 * @param {string} filePath - Absolute path to local file.
 * @param {string} fileName - Name to save as in Drive.
 * @returns {Promise<string>} - WebViewLink of the uploaded file.
 */
async function uploadReceiptToDrive(filePath, fileName) {
    if (!drive) throw new Error('Google Drive client not initialized');

    try {
        const folderId = await getYearFolderId();

        const fileMetadata = {
            name: fileName,
            parents: [folderId],
        };

        const media = {
            mimeType: 'application/pdf',
            body: fs.createReadStream(filePath),
        };

        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink',
        });

        console.log(`Uploaded receipt ID: ${file.data.id}`);
        return file.data.webViewLink;
    } catch (err) {
        console.error('Error uploading receipt:', err);
        throw err;
    }
}

/**
 * Appends details to the Income Tracking Google Sheet.
 * @param {Array} rowData - Array of values: [Date, Amount, Payer, Apt, Ref, Link]
 */
/**
 * Gets the title of the first sheet in the spreadsheet.
 */
async function getFirstSheetName(spreadsheetId) {
    const res = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties.title'
    });
    if (res.data.sheets && res.data.sheets.length > 0) {
        return res.data.sheets[0].properties.title;
    }
    return 'Sheet1'; // Fallback
}

/**
 * Appends details to the Income Tracking Google Sheet.
 * @param {Array} rowData - Array of values: [Date, Amount, Payer, Apt, Ref, Link]
 */
async function updateSheet(rowData) {
    if (!sheets) throw new Error('Google Sheets client not initialized');

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
        throw new Error('GOOGLE_SHEET_ID is missing from .env');
    }

    try {
        const sheetName = await getFirstSheetName(spreadsheetId);
        // If name has spaces/special chars, it typically needs single quotes: "'My Sheet'!A:F"
        const range = `'${sheetName}'!A:F`;

        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: range,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [rowData],
            },
        });
        console.log(`Sheet '${sheetName}' updated successfully.`);
    } catch (err) {
        console.error('Error updating sheet:', err);
        throw err;
    }
}

/**
 * Fetches tenant configuration from a "Tenants" sheet/tab.
 * Assumes columns: [Apartment, Landlord 1, Landlord 2, Tenant 1, Tenant 2]
 * @returns {Promise<Object>} - Format matching tenants.json with extended info
 */
async function fetchTenantsFromSheet() {
    if (!sheets) throw new Error('Google Sheets client not initialized');

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) throw new Error('GOOGLE_SHEET_ID missing');

    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Tenants!A:E',
        });

        const rows = res.data.values;
        if (!rows || rows.length === 0) {
            console.warn('No data found in Tenants sheet.');
            return { apartments: {} };
        }

        const tenantsConfig = { apartments: {} };

        // Skip header if first row is text
        if (rows[0] && isNaN(parseInt(rows[0][0]))) {
            rows.shift();
        }

        rows.forEach(row => {
            const apt = row[0]?.toString().trim();
            if (!apt) return;

            // Extract all potential names
            const landlord1 = row[1]?.trim();
            const landlord2 = row[2]?.trim();
            const tenant1 = row[3]?.trim();
            const tenant2 = row[4]?.trim();

            const currentNames = [landlord1, landlord2, tenant1, tenant2].filter(Boolean);
            const primaryName = tenant1 || landlord1 || 'Unknown';

            if (!tenantsConfig.apartments[apt]) {
                tenantsConfig.apartments[apt] = {
                    familyName: primaryName,
                    altNames: currentNames
                };
            } else {
                // Merge logic: Update familyName to latest, append unique new names
                tenantsConfig.apartments[apt].familyName = primaryName;
                currentNames.forEach(name => {
                    if (!tenantsConfig.apartments[apt].altNames.includes(name)) {
                        tenantsConfig.apartments[apt].altNames.push(name);
                    }
                });
            }
        });

        console.log(`Fetched configuration for ${Object.keys(tenantsConfig.apartments).length} apartments from Sheet.`);
        return tenantsConfig;

    } catch (err) {
        console.warn('Error fetching tenants from sheet (using local only):', err.message);
        return { apartments: {} };
    }
}

// ============================================================================
// PAYMENTS GRID SYSTEM
// ============================================================================

const PAYMENTS_SHEET_NAME = 'Payments';
const LOG_SHEET_NAME = 'Log';

/**
 * Hebrew month names for column headers.
 */
const HEBREW_MONTHS = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

/**
 * Gets the Hebrew month label for a date.
 * @param {Date|string} date - The date.
 * @returns {string} - e.g., 'ינואר 2026'
 */
function getHebrewMonthLabel(date) {
    const d = new Date(date);
    return `${HEBREW_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Gets or creates the Payments sheet and returns its sheetId.
 * @returns {Promise<{sheetId: number, title: string}>}
 */
async function getOrCreatePaymentsSheet() {
    if (!sheets) throw new Error('Google Sheets client not initialized');

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Get all sheets
    const res = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties'
    });

    const existingSheet = res.data.sheets.find(
        s => s.properties.title === PAYMENTS_SHEET_NAME
    );

    if (existingSheet) {
        return {
            sheetId: existingSheet.properties.sheetId,
            title: PAYMENTS_SHEET_NAME
        };
    }

    // Create Payments sheet
    console.log(`Creating "${PAYMENTS_SHEET_NAME}" sheet...`);

    const addSheetRes = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
            requests: [{
                addSheet: {
                    properties: {
                        title: PAYMENTS_SHEET_NAME
                    }
                }
            }]
        }
    });

    const newSheetId = addSheetRes.data.replies[0].addSheet.properties.sheetId;

    // Initialize with header row (דירה in first column)
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${PAYMENTS_SHEET_NAME}'!A1`,
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: [['דירה']]
        }
    });

    return { sheetId: newSheetId, title: PAYMENTS_SHEET_NAME };
}

/**
 * Gets or creates the Log sheet for audit trail.
 * @returns {Promise<{sheetId: number, title: string}>}
 */
async function getOrCreateLogSheet() {
    if (!sheets) throw new Error('Google Sheets client not initialized');

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    const res = await sheets.spreadsheets.get({
        spreadsheetId,
        fields: 'sheets.properties'
    });

    const existingSheet = res.data.sheets.find(
        s => s.properties.title === LOG_SHEET_NAME
    );

    if (existingSheet) {
        return {
            sheetId: existingSheet.properties.sheetId,
            title: LOG_SHEET_NAME
        };
    }

    // Create Log sheet
    console.log(`Creating "${LOG_SHEET_NAME}" sheet...`);

    const addSheetRes = await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
            requests: [{
                addSheet: {
                    properties: {
                        title: LOG_SHEET_NAME
                    }
                }
            }]
        }
    });

    const newSheetId = addSheetRes.data.replies[0].addSheet.properties.sheetId;

    // Initialize with headers
    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${LOG_SHEET_NAME}'!A1:G1`,
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: [['תאריך', 'סכום', 'משלם', 'דירה', 'אסמכתא', 'קישור', 'חודשים מכוסים']]
        }
    });

    return { sheetId: newSheetId, title: LOG_SHEET_NAME };
}

/**
 * Gets the current grid data from Payments sheet.
 * @returns {Promise<{headers: string[], apartmentRows: Object, data: Array[]}>}
 */
async function getPaymentsGridData() {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `'${PAYMENTS_SHEET_NAME}'!A:ZZ`
        });

        const data = res.data.values || [];
        const headers = data[0] || ['דירה'];

        // Build apartment row index
        const apartmentRows = {};
        for (let i = 1; i < data.length; i++) {
            const apt = data[i][0]?.toString().trim();
            if (apt) {
                apartmentRows[apt] = i; // 0-indexed row in data array (1-indexed in sheet = i+1)
            }
        }

        return { headers, apartmentRows, data };

    } catch (err) {
        // Sheet might be empty or not exist yet
        console.warn('Could not read Payments grid:', err.message);
        return { headers: ['דירה'], apartmentRows: {}, data: [['דירה']] };
    }
}

/**
 * Finds the column index for a given month header, or creates it.
 * @param {string} monthLabel - e.g., 'ינואר 2026'
 * @param {string[]} headers - Current header row.
 * @returns {Promise<number>} - Column index (0-indexed).
 */
async function getOrCreateMonthColumn(monthLabel, headers) {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    let colIndex = headers.indexOf(monthLabel);

    if (colIndex === -1) {
        // Add new column at the end
        colIndex = headers.length;
        headers.push(monthLabel);

        // Update header row
        const colLetter = columnIndexToLetter(colIndex);
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `'${PAYMENTS_SHEET_NAME}'!${colLetter}1`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[monthLabel]]
            }
        });

        console.log(`Added new month column: ${monthLabel} (column ${colLetter})`);
    }

    return colIndex;
}

/**
 * Finds the row for an apartment, or creates it.
 * @param {string} apartment - Apartment number.
 * @param {Object} apartmentRows - Current apartment row mapping.
 * @param {Array[]} data - Current grid data.
 * @returns {Promise<number>} - Row index (0-indexed in data, corresponds to row number + 1 in sheet).
 */
async function getOrCreateApartmentRow(apartment, apartmentRows, data) {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    if (apartmentRows[apartment] !== undefined) {
        return apartmentRows[apartment];
    }

    // Add new row
    const newRowIndex = data.length; // 0-indexed in data
    const sheetRowNumber = newRowIndex + 1; // 1-indexed in sheet

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `'${PAYMENTS_SHEET_NAME}'!A${sheetRowNumber}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: [[apartment]]
        }
    });

    apartmentRows[apartment] = newRowIndex;
    data.push([apartment]);

    console.log(`Added new apartment row: ${apartment} (row ${sheetRowNumber})`);

    return newRowIndex;
}

/**
 * Converts a 0-indexed column number to letter (A, B, ..., Z, AA, AB, ...).
 * @param {number} col - 0-indexed column number.
 * @returns {string} - Column letter.
 */
function columnIndexToLetter(col) {
    let letter = '';
    while (col >= 0) {
        letter = String.fromCharCode((col % 26) + 65) + letter;
        col = Math.floor(col / 26) - 1;
    }
    return letter;
}

/**
 * Sets the background color of a cell to red (for underpayments).
 * @param {number} sheetId - The sheet ID.
 * @param {number} rowIndex - 0-indexed row.
 * @param {number} colIndex - 0-indexed column.
 */
async function highlightCellRed(sheetId, rowIndex, colIndex) {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
            requests: [{
                updateCells: {
                    rows: [{
                        values: [{
                            userEnteredFormat: {
                                backgroundColor: {
                                    red: 1.0,
                                    green: 0.42,
                                    blue: 0.42
                                }
                            }
                        }]
                    }],
                    fields: 'userEnteredFormat.backgroundColor',
                    start: {
                        sheetId,
                        rowIndex,
                        columnIndex: colIndex
                    }
                }
            }]
        }
    });
}

/**
 * Gets unpaid months for an apartment (cells that are empty in the Payments grid).
 * @param {string} apartment - Apartment number.
 * @param {string} currentMonthLabel - Current month to exclude from "unpaid" list.
 * @returns {Promise<string[]>} - List of unpaid month labels (most recent first).
 */
async function getUnpaidMonths(apartment, currentMonthLabel) {
    const { headers, apartmentRows, data } = await getPaymentsGridData();

    const rowIndex = apartmentRows[apartment];
    if (rowIndex === undefined) {
        return []; // Apartment not in grid yet, no unpaid history
    }

    const row = data[rowIndex] || [];
    const unpaidMonths = [];

    // Skip first column (דירה), check each month column
    for (let i = headers.length - 1; i >= 1; i--) {
        const monthLabel = headers[i];
        if (monthLabel === currentMonthLabel) continue; // Skip current month

        const cellValue = row[i];
        if (!cellValue || cellValue.toString().trim() === '') {
            unpaidMonths.push(monthLabel);
        }
    }

    return unpaidMonths;
}

/**
 * Records a payment in the Payments grid.
 * Handles underpayment highlighting and overpayment coverage.
 * 
 * @param {Object} paymentInfo - Payment details.
 * @param {string} paymentInfo.apartment - Apartment number.
 * @param {string} paymentInfo.payerName - Payer's name.
 * @param {number} paymentInfo.amount - Payment amount.
 * @param {Date|string} paymentInfo.date - Payment date.
 * @param {string} paymentInfo.reference - Transaction reference.
 * @param {string} paymentInfo.receiptLink - Link to receipt.
 * @param {number} fixedAmount - Expected monthly payment.
 * @returns {Promise<string[]>} - List of months covered by this payment.
 */
async function recordPaymentToGrid(paymentInfo, fixedAmount) {
    const { apartment, payerName, amount, date, reference, receiptLink } = paymentInfo;

    await getOrCreatePaymentsSheet();
    await getOrCreateLogSheet();

    const currentMonthLabel = getHebrewMonthLabel(date);
    const monthsCovered = Math.floor(amount / fixedAmount);
    const isUnderpayment = amount < fixedAmount;

    // Get current grid state
    let { headers, apartmentRows, data } = await getPaymentsGridData();

    // Ensure apartment row exists
    const rowIndex = await getOrCreateApartmentRow(apartment, apartmentRows, data);
    const sheetRowNumber = rowIndex + 1;

    // Determine which months to cover
    const monthsToCover = [];

    if (monthsCovered >= 1) {
        // Cover current month first
        monthsToCover.push(currentMonthLabel);

        // If overpayment, cover previous unpaid months
        if (monthsCovered > 1) {
            const unpaidMonths = await getUnpaidMonths(apartment, currentMonthLabel);
            for (const unpaidMonth of unpaidMonths) {
                if (monthsToCover.length >= monthsCovered) break;
                monthsToCover.push(unpaidMonth);
            }
        }
    }

    // Get sheet ID for formatting
    const { sheetId } = await getOrCreatePaymentsSheet();
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;

    // Update each covered month cell
    for (const monthLabel of monthsToCover) {
        // Refresh headers after potential additions
        const gridData = await getPaymentsGridData();
        headers = gridData.headers;

        const colIndex = await getOrCreateMonthColumn(monthLabel, headers);
        const colLetter = columnIndexToLetter(colIndex);

        // Write the fixed amount to the cell
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `'${PAYMENTS_SHEET_NAME}'!${colLetter}${sheetRowNumber}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[fixedAmount]]
            }
        });

        console.log(`Recorded payment for Apt ${apartment}, ${monthLabel}: ${fixedAmount} ₪`);
    }

    // Handle underpayment - highlight cell in red
    if (isUnderpayment) {
        // Refresh grid state
        const gridData = await getPaymentsGridData();
        const colIndex = await getOrCreateMonthColumn(currentMonthLabel, gridData.headers);
        const colLetter = columnIndexToLetter(colIndex);

        // Write the actual amount (not fixed)
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `'${PAYMENTS_SHEET_NAME}'!${colLetter}${sheetRowNumber}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [[amount]]
            }
        });

        // Highlight red
        await highlightCellRed(sheetId, rowIndex, colIndex);
        console.log(`Underpayment detected for Apt ${apartment}: ${amount} ₪ (expected ${fixedAmount} ₪) - highlighted in red`);

        monthsToCover.push(currentMonthLabel + ' (חלקי)');
    }

    // Append to Log sheet for audit trail
    const logData = [
        moment(date).format('YYYY-MM-DD'),
        amount,
        payerName,
        apartment,
        reference,
        receiptLink || '',
        monthsToCover.join(', ')
    ];

    await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `'${LOG_SHEET_NAME}'!A:G`,
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: [logData]
        }
    });

    console.log(`Logged payment to audit trail.`);

    return monthsToCover;
}

module.exports = {
    uploadReceiptToDrive,
    updateSheet,
    fetchTenantsFromSheet,
    // New Payments Grid functions
    recordPaymentToGrid,
    getOrCreatePaymentsSheet,
    getOrCreateLogSheet,
    getPaymentsGridData,
    getUnpaidMonths,
    getHebrewMonthLabel,
    highlightCellRed
};
