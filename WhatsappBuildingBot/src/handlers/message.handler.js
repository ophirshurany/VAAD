const geminiService = require('../services/gemini.service');
const sheetsService = require('../services/sheets.service');
const notificationsService = require('../services/notifications.service');
const callbackHandler = require('./callback.handler');
const { STATUS } = require('../config/constants');
const twilioService = require('../services/twilio.service');
const config = require('../config/environment');

const handleIncomingMessage = async (req, res) => {
    const { From, Body, NumMedia, MediaUrl0 } = req.body;
    const userPhone = From.replace('whatsapp:', '');

    console.log(`Received message from ${userPhone}: ${Body}`);

    // Basic check for interaction type (Button response, etc.)
    // Twilio sends 'ButtonPayload' or 'ListResponse' if it's an interactive reply
    // For now, we assume simple text flows for residents.

    // 0. Check if Professional
    const professionalSender = notificationsService.getProfessionalByPhone(userPhone);
    if (professionalSender) {
        console.log(`Professional ${professionalSender.name} detected.`);
        return await callbackHandler.handleProfessionalResponse(req, res);
    }

    try {
        // 1. Classify
        // If image is present, we might want to pass it to Gemini too (Multimodal), 
        // but for now the prompt says "optional image" and "Extract... from free-text".
        // We'll just classify the text.
        const classification = await geminiService.classifyComplaint(Body || "Attached Image");

        // 2. Assign Professional
        const professional = notificationsService.getProfessionalForType(classification.complaint_type);

        // 3. Prepare Data
        const complaintData = {
            timestamp: new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }),
            residentName: "Resident", // In a real app, look up name from whitelist/sheet using userPhone
            phone: userPhone,
            complaintType: classification.complaint_type,
            location: classification.location,
            description: Body,
            summary: classification.refined_summary,
            professional: professional.name,
            status: STATUS.OPEN,
            image: NumMedia > 0 ? MediaUrl0 : '',
            notes: ''
        };

        // 4. Save to Sheets
        await sheetsService.addComplaint(complaintData);

        // 5. Notify Resident
        await notificationsService.notifyResidentReceived(userPhone, classification);

        // 6. Notify Professional
        await notificationsService.notifyProfessionalNewTask(professional, complaintData);

        // 7. Reply to Twilio (Empty 200 OK to stop retries)
        res.status(200).send('<Response></Response>');

    } catch (error) {
        console.error('Message Handler Error:', error);
        // Notify user of error?
        await twilioService.sendMessage(From, "סליחה, אירעה שגיאה בעיבוד פנייתך. אנא נסה שנית או צור קשר עם הוועד.");
        res.status(200).send('<Response></Response>');
    }
};

module.exports = {
    handleIncomingMessage
};
