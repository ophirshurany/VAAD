const config = require('../config/environment');

// In-memory whitelist for POC/fallback. 
// Ideally, this should be synced with Google Sheets or a database.
const WHITELIST = new Set([
    config.building.adminPhone,
    // Add other test numbers here or load from external source
]);

/**
 * Middleware to check if the sender is authorized (whitelisted)
 */
const isAuthorized = async (req, res, next) => {
    try {
        const from = req.body.From; // Twilio format: 'whatsapp:+97250...'

        if (!from) {
            // Not a Twilio request or missing From field, let it pass if we want to allow validation elsewhere 
            // or block it. For safety, block if we expect only Twilio requests on this endpoint.
            // But better to check signature first. This is just for business logic auth.
            console.warn('Received request without "From" field');
            return res.status(400).send('Missing "From" field');
        }

        const phoneNumber = from.replace('whatsapp:', '');

        // Allow Admin always
        if (phoneNumber === config.building.adminPhone) {
            return next();
        }

        if (WHITELIST.has(phoneNumber)) {
            return next();
        }

        console.warn(`Unauthorized access attempt from: ${phoneNumber}`);

        // Optionally comply with "Reject messages from unauthorized numbers with polite response"
        // We can either send a response here or just 403.
        // To send a response, we'd need the twilio service, but circular deps might be an issue if not careful.
        // For middleware, it's often cleaner to just attach an 'authorized' flag or error out.
        // If we want to send a polite reply, we should probably do it in the handler or here.

        // Let's rely on the handler to detect unauthorized if we want to send a reply, 
        // OR we can send TwiML here.

        const twiml = new require('twilio').twiml.MessagingResponse();
        twiml.message('שלום, מספר זה אינו מורשה לשלוח הודעות למערכת זו. אנא פנה לוועד הבית.');
        res.type('text/xml').send(twiml.toString());

    } catch (error) {
        console.error('Auth Middleware Error:', error);
        res.status(500).send('Internal Server Error');
    }
};

module.exports = {
    isAuthorized,
    WHITELIST
};
