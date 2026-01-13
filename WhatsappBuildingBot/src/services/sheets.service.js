const { google } = require('googleapis');
const config = require('../config/environment');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Initialize Auth
const auth = new google.auth.GoogleAuth({
    credentials: {
        client_email: config.google.clientEmail,
        private_key: config.google.privateKey,
    },
    scopes: SCOPES,
});

const sheets = google.sheets({ version: 'v4', auth });

/**
 * Append a new complaint to the sheet
 * @param {Object} data - Complaint data
 */
const addComplaint = async (data) => {
    try {
        const values = [
            [
                data.timestamp,
                data.residentName,
                data.phone,
                data.complaintType,
                data.location,
                data.description, // Original description
                data.summary,     // Refined summary
                data.professional,
                data.status,
                data.image || '',
                data.notes || ''
            ]
        ];

        const resource = {
            values,
        };

        const result = await sheets.spreadsheets.values.append({
            spreadsheetId: config.google.sheetId,
            range: 'Sheet1!A:K', // Adjust range/sheet name as needed
            valueInputOption: 'USER_ENTERED',
            resource,
        });

        console.log(`Complaint added to sheet. Cells updated: ${result.data.updates.updatedCells}`);
        return result;
    } catch (error) {
        console.error('Google Sheets Append Error:', error);
        throw error;
    }
};

/**
 * Update the status of a complaint
 * This is effectively a search-and-replace, which is tricky in Sheets API without Row ID.
 * Ideally, we should store the Row Number or generate a UUID for each complaint.
 * For this POC, we'll assume we pass a Row Number or we search by some unique ID.
 * Let's assume we implement a unique ID in the future. For now, we might not implementation full update logic
 * without a robust ID system, but I'll provide a placeholder or 'update by generic search' if needed.
 * 
 * Better approach: We'll read the sheet to find the row.
 */
const updateComplaintStatus = async (rowIndex, newStatus) => {
    // rowIndex is 1-based or 0-based? API uses 1-based A1 notation usually.
    // Let's assume passed index is the exact row number in the sheet.
    try {
        const range = `Sheet1!I${rowIndex}`; // Assuming 'Status' is column I (9th column)
        const valueInputOption = 'USER_ENTERED';
        const resource = { values: [[newStatus]] };

        const result = await sheets.spreadsheets.values.update({
            spreadsheetId: config.google.sheetId,
            range,
            valueInputOption,
            resource
        });
        return result;
    } catch (error) {
        console.error('Google Sheets Update Error:', error);
        throw error;
    }
}

module.exports = {
    addComplaint,
    updateComplaintStatus
};
