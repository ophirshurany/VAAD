const twilio = require('twilio');
const config = require('../config/environment');

const client = twilio(config.twilio.accountSid, config.twilio.authToken);

/**
 * Send a WhatsApp message to a specific number
 * @param {string} to - The recipient's phone number (e.g., 'whatsapp:+97250...')
 * @param {string} body - The message content
 */
const sendMessage = async (to, body) => {
    try {
        const message = await client.messages.create({
            body: body,
            from: `whatsapp:${config.twilio.phoneNumber}`,
            to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`
        });
        console.log(`Message sent to ${to}: ${message.sid}`);
        return message;
    } catch (error) {
        console.error(`Error sending message to ${to}:`, error);
        throw error;
    }
};

/**
 * Verify Twilio Webhook Signature (Middleware helper)
 * This acts as a wrapper for twilio.webhook()
 */
const webhookMiddleware = twilio.webhook({ protocol: 'https' }); // Adjust protocol if behind proxy handling SSL

module.exports = {
    sendMessage,
    webhookMiddleware
};
