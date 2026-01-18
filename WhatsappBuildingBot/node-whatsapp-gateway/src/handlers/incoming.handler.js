/**
 * Handler for incoming WhatsApp messages.
 * Uses Python AI service for classification.
 */

const aiService = require('../services/http-ai.service');
const sheetsService = require('../services/sheets.service');
const notificationsService = require('../services/notifications.service');
const twilioService = require('../services/twilio.service');
const { getProfessionalForTicketType } = require('../config/buildings.config');
const { STATUS } = require('../config/constants');

/**
 * Handle incoming WhatsApp message from resident
 */
const handleIncomingMessage = async (req, res) => {
    const { From, Body, NumMedia, MediaUrl0 } = req.body;
    const userPhone = From.replace('whatsapp:', '');
    const buildingId = req.buildingId || process.env.DEFAULT_BUILDING_ID || 'alonim-8';

    console.log(`Received message from ${userPhone} for building ${buildingId}: ${Body}`);

    try {
        // 1. Call AI service for classification
        const classification = await aiService.analyzeMessage({
            buildingId,
            resident: {
                name: 'דייר', // TODO: Look up from whitelist
                phone: userPhone
            },
            messageText: Body || 'תמונה מצורפת',
            mediaUrls: NumMedia > 0 ? [MediaUrl0] : []
        });

        // 2. Get assigned professional
        const professional = getProfessionalForTicketType(buildingId, classification.ticket_type);

        // 3. Prepare complaint data for Sheets
        const complaintData = {
            timestamp: new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }),
            residentName: 'דייר', // TODO: Look up from whitelist
            phone: userPhone,
            buildingId,
            ticketType: classification.ticket_type,
            location: classification.location,
            description: Body,
            summary: classification.normalized_summary,
            professional: professional.name,
            status: STATUS.OPEN,
            image: NumMedia > 0 ? MediaUrl0 : '',
            confidence: classification.confidence
        };

        // 4. Save to Google Sheets
        await sheetsService.addComplaint(complaintData);

        // 5. Notify resident
        await notificationsService.notifyResidentReceived(userPhone, classification);

        // 6. Notify professional
        await notificationsService.notifyProfessionalNewTask(professional, complaintData);

        // 7. Send empty response to Twilio
        res.status(200).send('<Response></Response>');

    } catch (error) {
        console.error('Message Handler Error:', error);

        // Notify user of error
        await twilioService.sendMessage(
            From,
            'סליחה, אירעה שגיאה בעיבוד פנייתך. אנא נסה שנית או צור קשר עם הוועד.'
        );

        res.status(200).send('<Response></Response>');
    }
};

module.exports = {
    handleIncomingMessage
};
