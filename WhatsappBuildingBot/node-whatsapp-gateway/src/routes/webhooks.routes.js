const express = require('express');
const router = express.Router();

const incomingHandler = require('../handlers/incoming.handler');
const statusUpdateHandler = require('../handlers/status-update.handler');
const { getProfessionalByPhone } = require('../services/notifications.service');
const validateTwilioSignature = require('../middleware/validateTwilioSignature');
// const authResident = require('../middleware/authResident.middleware');

/**
 * Twilio WhatsApp webhook
 * POST /webhooks/twilio
 */
router.post('/twilio',
    validateTwilioSignature,
    // authResident, // Uncomment to enable whitelist checking
    async (req, res) => {
        const { From } = req.body;
        const userPhone = From ? From.replace('whatsapp:', '') : '';
        const buildingId = req.buildingId || process.env.DEFAULT_BUILDING_ID || 'alonim-8';

        // Check if sender is a professional
        const professional = getProfessionalByPhone(userPhone, buildingId);

        if (professional) {
            console.log(`Professional ${professional.name} detected`);
            return await statusUpdateHandler.handleProfessionalResponse(req, res);
        }

        // Handle as resident message
        return await incomingHandler.handleIncomingMessage(req, res);
    }
);

/**
 * Twilio status callback
 * POST /webhooks/twilio/status
 */
router.post('/twilio/status', (req, res) => {
    const { MessageSid, MessageStatus } = req.body;
    console.log(`Message ${MessageSid} status: ${MessageStatus}`);
    res.status(200).send('<Response></Response>');
});

module.exports = router;
