require('dotenv').config();

const required = [
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
    'GOOGLE_PROJECT_ID',
    'GOOGLE_PRIVATE_KEY',
    'GOOGLE_CLIENT_EMAIL',
    'GOOGLE_SHEET_ID',
    'GEMINI_API_KEY'
];

required.forEach(key => {
    if (!process.env[key]) {
        console.warn(`WARNING: Missing environment variable ${key}`);
    }
});

module.exports = {
    twilio: {
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        phoneNumber: process.env.TWILIO_PHONE_NUMBER,
        webhookUrl: process.env.TWILIO_WEBHOOK_URL
    },
    google: {
        projectId: process.env.GOOGLE_PROJECT_ID,
        privateKey: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
        clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
        sheetId: process.env.GOOGLE_SHEET_ID
    },
    gemini: {
        apiKey: process.env.GEMINI_API_KEY
    },
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development'
    },
    building: {
        name: process.env.BUILDING_NAME || 'Building',
        adminEmail: process.env.ADMIN_EMAIL,
        adminPhone: process.env.ADMIN_PHONE
    }
};
