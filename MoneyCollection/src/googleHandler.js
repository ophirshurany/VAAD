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
 * Assumes columns: [Apartment, Landlord, Tenant]
 * @returns {Promise<Object>} - Format matching tenants.json: { apartments: { "53": { familyName: ... } } }
 */
async function fetchTenantsFromSheet() {
    if (!sheets) throw new Error('Google Sheets client not initialized');

    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) throw new Error('GOOGLE_SHEET_ID missing');

    try {
        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: 'Tenants!A:C',
        });

        const rows = res.data.values;
        if (!rows || rows.length === 0) {
            console.warn('No data found in Tenants sheet.');
            return { apartments: {} };
        }

        const tenantsConfig = { apartments: {} };

        if (rows[0] && isNaN(parseInt(rows[0][0]))) {
            rows.shift();
        }

        rows.forEach(row => {
            const apt = row[0]?.toString().trim();
            const landlord = row[1]?.trim();
            const tenant = row[2]?.trim();

            if (!apt) return;

            const primaryName = tenant || landlord || 'Unknown';

            tenantsConfig.apartments[apt] = {
                familyName: primaryName,
                altNames: [landlord, tenant].filter(Boolean)
            };
        });

        console.log(`Fetched configuration for ${Object.keys(tenantsConfig.apartments).length} apartments from Sheet.`);
        return tenantsConfig;

    } catch (err) {
        console.warn('Error fetching tenants from sheet (using local only):', err.message);
        return { apartments: {} };
    }
}

module.exports = {
    uploadReceiptToDrive,
    updateSheet,
    fetchTenantsFromSheet
};
