const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
require('dotenv').config();

// Initialize Auth
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Handle escaped newlines
    },
    scopes: [
        'https://www.googleapis.com/auth/drive', // Full drive access needed to creation/upload
        'https://www.googleapis.com/auth/spreadsheets'
    ],
});

const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });

/**
 * Ensures a folder for the current year exists inside the root folder.
 * @returns {Promise<string>} - The ID of the year folder.
 */
async function getYearFolderId() {
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

        // Set permissions so anyone with link can view (optional, or just restrict to committee)
        // For now, assume inherited permissions from parent folder are sufficient.

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
async function updateSheet(rowData) {
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
        throw new Error('GOOGLE_SHEET_ID is missing from .env');
    }

    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: 'Sheet1!A:F', // Assumes Sheet1, columns A-F
            valueInputOption: 'USER_ENTERED',
            resource: {
                values: [rowData],
            },
        });
        console.log('Sheet updated successfully.');
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
    const spreadsheetId = process.env.GOOGLE_SHEET_ID;
    if (!spreadsheetId) throw new Error('GOOGLE_SHEET_ID missing');

    try {
        // Read from "Tenants" sheet, columns A-C
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

        // Remove header if it looks like one (non-numeric first col)
        if (rows[0] && isNaN(parseInt(rows[0][0]))) {
            rows.shift();
        }

        rows.forEach(row => {
            const apt = row[0]?.toString().trim();
            const landlord = row[1]?.trim();
            const tenant = row[2]?.trim();

            if (!apt) return;

            // "if tenant cell is blank therefore the person who lives in this apartment is the landlord"
            const primaryName = tenant || landlord || 'Unknown';

            tenantsConfig.apartments[apt] = {
                familyName: primaryName,
                altNames: [landlord, tenant].filter(Boolean) // Add both for fuzzy search
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
