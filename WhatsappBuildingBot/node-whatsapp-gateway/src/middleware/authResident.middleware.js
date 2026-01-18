/**
 * Middleware to authenticate residents based on phone whitelist.
 */

const { isPhoneWhitelisted, getBuildingConfig } = require('../config/buildings.config');
const twilioService = require('../services/twilio.service');

/**
 * Check if the sender is a whitelisted resident
 */
const authResident = async (req, res, next) => {
    const { From } = req.body;

    if (!From) {
        console.warn('Missing From field in request');
        return res.status(400).send('<Response></Response>');
    }

    const userPhone = From.replace('whatsapp:', '');

    // For now, extract building_id from environment or default
    // In production, this could come from the Twilio phone number mapping
    const buildingId = process.env.DEFAULT_BUILDING_ID || 'alonim-8';

    // Store building ID in request for downstream handlers
    req.buildingId = buildingId;

    const building = getBuildingConfig(buildingId);

    if (!building) {
        console.error(`Building not found: ${buildingId}`);
        return res.status(500).send('<Response></Response>');
    }

    // Check whitelist
    if (!isPhoneWhitelisted(buildingId, userPhone)) {
        console.warn(`Phone ${userPhone} not whitelisted for building ${buildingId}`);

        // Send rejection message to user
        await twilioService.sendMessage(
            From,
            'מצטערים, מספר הטלפון שלך אינו רשום במערכת הבניין. אנא פנה לוועד הבית.'
        );

        return res.status(200).send('<Response></Response>');
    }

    // Phone is whitelisted, continue
    console.log(`Authenticated resident from building ${buildingId}: ${userPhone}`);
    next();
};

module.exports = authResident;
