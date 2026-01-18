/**
 * Handler for professional status update responses.
 */

const sheetsService = require('../services/sheets.service');
const twilioService = require('../services/twilio.service');
const { STATUS } = require('../config/constants');

/**
 * Handle response from professionals about ticket status
 */
const handleProfessionalResponse = async (req, res) => {
    const { From, Body } = req.body;
    const professionalPhone = From.replace('whatsapp:', '');

    console.log(`Professional response from ${professionalPhone}: ${Body}`);

    // Parse response - looking for ticket numbers or status updates
    const normalizedBody = Body.trim().toLowerCase();

    // Simple parsing: if message contains "טופל" or "done" or a number
    // In production, this would be more sophisticated with button responses

    if (normalizedBody.includes('טופל') || normalizedBody.includes('done') || normalizedBody.includes('סיום')) {
        // Extract ticket numbers if any (e.g., "1,2,3 טופלו")
        const numbers = Body.match(/\d+/g);

        if (numbers && numbers.length > 0) {
            for (const ticketNum of numbers) {
                try {
                    // Row number in sheet (add 1 for header)
                    const rowIndex = parseInt(ticketNum) + 1;
                    await sheetsService.updateComplaintStatus(rowIndex, STATUS.RESOLVED);
                    console.log(`Updated ticket ${ticketNum} to RESOLVED`);
                } catch (error) {
                    console.error(`Failed to update ticket ${ticketNum}:`, error);
                }
            }

            await twilioService.sendMessage(
                From,
                `תודה! קריאות ${numbers.join(', ')} סומנו כטופלו.`
            );
        } else {
            await twilioService.sendMessage(
                From,
                'אנא ציין את מספרי הקריאות שטופלו. לדוגמה: "1,2,3 טופלו"'
            );
        }
    } else if (normalizedBody.includes('בטיפול') || normalizedBody.includes('התחלתי')) {
        const numbers = Body.match(/\d+/g);

        if (numbers && numbers.length > 0) {
            for (const ticketNum of numbers) {
                try {
                    const rowIndex = parseInt(ticketNum) + 1;
                    await sheetsService.updateComplaintStatus(rowIndex, STATUS.IN_PROGRESS);
                    console.log(`Updated ticket ${ticketNum} to IN_PROGRESS`);
                } catch (error) {
                    console.error(`Failed to update ticket ${ticketNum}:`, error);
                }
            }

            await twilioService.sendMessage(
                From,
                `תודה! קריאות ${numbers.join(', ')} סומנו כבטיפול.`
            );
        }
    } else {
        // Unrecognized response
        await twilioService.sendMessage(
            From,
            'לא הבנתי את התשובה. אנא השב "טופל" עם מספרי הקריאות או "בטיפול" לעדכון סטטוס.'
        );
    }

    res.status(200).send('<Response></Response>');
};

module.exports = {
    handleProfessionalResponse
};
