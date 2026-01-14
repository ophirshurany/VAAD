const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const twilioService = require('../src/services/twilio.service');

const run = async () => {
    try {
        console.log('Testing Twilio Template Message...');
        // User's number from the prompt +972524244788
        const to = '+972524244788';
        const contentSid = 'HXb5b62575e6e4ff6129ad7c8efe1f983e';
        const contentVariables = { "1": "12/1", "2": "3pm" };

        console.log(`Sending to: ${to}`);
        console.log('Using Account SID:', process.env.TWILIO_ACCOUNT_SID ? '***' + process.env.TWILIO_ACCOUNT_SID.slice(-4) : 'MISSING');

        await twilioService.sendTemplateMessage(to, contentSid, contentVariables);
        console.log('Successfully sent template message!');
    } catch (error) {
        console.error('Test failed:', error);
    }
};

run();
