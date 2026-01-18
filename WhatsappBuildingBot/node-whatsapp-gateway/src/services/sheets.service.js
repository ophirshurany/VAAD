const { google } = require('googleapis');
const config = require('../config/environment');
const { STATUS } = require('../config/constants');

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
                data.buildingId || '',
                data.ticketType,
                data.location,
                data.description,
                data.summary,
                data.professional,
                data.status,
                data.image || '',
                data.confidence || '',
                '' // Notes
            ]
        ];

        const resource = { values };

        const result = await sheets.spreadsheets.values.append({
            spreadsheetId: config.google.sheetId,
            range: 'Tickets!A:M', // Updated sheet name and range
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
 * @param {number} rowIndex - Row number (1-based, excluding header)
 * @param {string} newStatus - New status value
 */
const updateComplaintStatus = async (rowIndex, newStatus) => {
    try {
        const range = `Tickets!J${rowIndex}`; // Status is column J (10th column)
        const valueInputOption = 'USER_ENTERED';
        const resource = { values: [[newStatus]] };

        const result = await sheets.spreadsheets.values.update({
            spreadsheetId: config.google.sheetId,
            range,
            valueInputOption,
            resource
        });

        console.log(`Updated row ${rowIndex} status to: ${newStatus}`);
        return result;
    } catch (error) {
        console.error('Google Sheets Update Error:', error);
        throw error;
    }
};

/**
 * Get all open tickets from the sheet
 * @returns {Promise<Array>} Array of open ticket objects
 */
const getOpenTickets = async () => {
    try {
        const result = await sheets.spreadsheets.values.get({
            spreadsheetId: config.google.sheetId,
            range: 'Tickets!A:M'
        });

        const rows = result.data.values || [];
        if (rows.length <= 1) return []; // Just header

        const headers = rows[0];
        const statusIndex = headers.indexOf('status') >= 0 ? headers.indexOf('status') : 9;

        const openTickets = [];
        for (let i = 1; i < rows.length; i++) {
            const row = rows[i];
            const status = row[statusIndex] || '';

            if (status === STATUS.OPEN || status === STATUS.IN_PROGRESS) {
                openTickets.push({
                    rowIndex: i + 1, // 1-based for Sheet API
                    timestamp: row[0],
                    residentName: row[1],
                    phone: row[2],
                    buildingId: row[3],
                    ticketType: row[4],
                    location: row[5],
                    description: row[6],
                    summary: row[7],
                    professional: row[8],
                    status: row[9],
                    image: row[10],
                    confidence: row[11]
                });
            }
        }

        return openTickets;
    } catch (error) {
        console.error('Google Sheets Read Error:', error);
        return [];
    }
};

module.exports = {
    addComplaint,
    updateComplaintStatus,
    getOpenTickets
};
