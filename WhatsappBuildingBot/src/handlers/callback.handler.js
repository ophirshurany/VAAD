const sheetsService = require('../services/sheets.service');
const notificationsService = require('../services/notifications.service');
const { STATUS } = require('../config/constants');
const twilioService = require('../services/twilio.service');

// Handle responses from professionals
// This assumes the user is replying with a Task ID or Number from a daily report
// For POC, we'll parse "Fixed <RowNumber>" or just specific keywords.
// Given requirement "Interactive poll", we simulate logic here.

const handleProfessionalResponse = async (req, res) => {
    // If this is called from message.handler (dispatch), req is the context
    // If it's a separate route, we extract from req.body

    // Let's assume this is dispatched from message.handler when user IS a professional
    // OR it's a separate webhook for "Interactive Message" response.

    // Implementation for "Reply with Number" logic:
    try {
        const { From, Body } = req.body;
        const responseText = Body.trim().toLowerCase();

        // Simple logic: If starts with "fixed" or "close"
        if (responseText.startsWith('fixed') || responseText.startsWith('close')) {
            // Extract ID?
            // Since we don't have IDs in the default sheet structure easily, 
            // we might just say "Please update the sheet manually" or 
            // we implementing a search.

            await twilioService.sendMessage(From, "תודה. הסטטוס יעודכן (סימולציה: אנא וודא עדכון בטבלה).");

            // Future: Parse ID, call updateComplaintStatus
            // await sheetsService.updateComplaintStatus(id, STATUS.RESOLVED);

        } else {
            // Unknown command
            await twilioService.sendMessage(From, "לא זוהתה פקודה. להשיב 'Fixed' לסגירת תקלה.");
        }

        if (res) res.status(200).send('<Response></Response>');

    } catch (error) {
        console.error('Callback Handler Error:', error);
        if (res) res.status(500).send('Error');
    }
};

module.exports = {
    handleProfessionalResponse
};
