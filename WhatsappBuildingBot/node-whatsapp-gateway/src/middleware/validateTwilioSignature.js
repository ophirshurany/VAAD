/**
 * Middleware to validate Twilio webhook signature.
 */

const twilio = require('twilio');
const config = require('../config/environment');

/**
 * Validate that the request is from Twilio
 */
const validateTwilioSignature = (req, res, next) => {
    // Skip validation in development/test mode
    if (config.server.env === 'development' || config.server.env === 'test') {
        console.log('Skipping Twilio signature validation in development/test mode');
        return next();
    }

    const twilioSignature = req.headers['x-twilio-signature'];
    const url = config.twilio.webhookUrl || `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    if (!twilioSignature) {
        console.warn('Missing X-Twilio-Signature header');
        return res.status(403).send('Forbidden: Missing signature');
    }

    const isValid = twilio.validateRequest(
        config.twilio.authToken,
        twilioSignature,
        url,
        req.body
    );

    if (!isValid) {
        console.warn('Invalid Twilio signature');
        return res.status(403).send('Forbidden: Invalid signature');
    }

    next();
};

module.exports = validateTwilioSignature;
