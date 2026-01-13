const cron = require('node-cron');
const sheetsService = require('../services/sheets.service');
const notificationsService = require('../services/notifications.service');
const twilioService = require('../services/twilio.service');
const config = require('../config/environment');

// Schedule: Daily at 8:00 AM
const initScheduledJobs = () => {
    cron.schedule('0 8 * * *', async () => {
        console.log('Running daily report job...');
        try {
            // Mock logic to read from sheets
            // In real app: const openComplaints = await sheetsService.getOpenComplaints();

            // For POC, we'll just send a generic message or simulate
            console.log('Fetching open complaints...');

            // Notify Admin/Professionals
            // Iterate professionals...

            // Example:
            const message = `
בוקר טוב,
זהו דוח יומי.
אנא השב 'Fixed' על תקלות שטופלו.
            `.trim();

            await twilioService.sendMessage(config.building.adminPhone, message);

        } catch (error) {
            console.error('Error in daily report job:', error);
        }
    });

    console.log('Scheduler initialized: 0 8 * * *');
};

module.exports = {
    initScheduledJobs
};
