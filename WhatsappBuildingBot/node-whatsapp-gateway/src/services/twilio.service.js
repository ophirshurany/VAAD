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
 * Send a WhatsApp template message
 * @param {string} to - The recipient's phone number
 * @param {string} contentSid - The template Content SID
 * @param {object} contentVariables - Key-value pairs for template variables
 */
const sendTemplateMessage = async (to, contentSid, contentVariables) => {
    try {
        const message = await client.messages.create({
            from: `whatsapp:${config.twilio.phoneNumber}`,
            to: to.startsWith('whatsapp:') ? to : `whatsapp:${to}`,
            contentSid: contentSid,
            contentVariables: JSON.stringify(contentVariables)
        });
        console.log(`Template message sent to ${to}: ${message.sid}`);
        return message;
    } catch (error) {
        console.error(`Error sending template message to ${to}:`, error);
        throw error;
    }
};

/**
 * Verify Twilio Webhook Signature (Middleware helper)
 */
const webhookMiddleware = twilio.webhook({ protocol: 'https' });

module.exports = {
    sendMessage,
    sendTemplateMessage,
    webhookMiddleware
};
