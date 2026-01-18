/**
 * Scheduled job handler for daily reports.
 */

const cron = require('node-cron');
const sheetsService = require('../services/sheets.service');
const twilioService = require('../services/twilio.service');
const { getBuildingConfig, getAllBuildingIds } = require('../config/buildings.config');
const { STATUS } = require('../config/constants');
const config = require('../config/environment');

/**
 * Initialize scheduled jobs
 */
const initScheduledJobs = () => {
    // Daily at 8:00 AM Israel time
    cron.schedule('0 8 * * *', async () => {
        console.log('Running daily ticket report job...');
        await sendDailyReports();
    }, {
        timezone: 'Asia/Jerusalem'
    });

    console.log('Scheduler initialized: Daily at 08:00 Israel time');
};

/**
 * Send daily reports to all professionals
 */
const sendDailyReports = async () => {
    try {
        const buildingIds = getAllBuildingIds();

        for (const buildingId of buildingIds) {
            await sendBuildingDailyReport(buildingId);
        }
    } catch (error) {
        console.error('Error in daily report job:', error);
    }
};

/**
 * Send daily report for a specific building
 */
const sendBuildingDailyReport = async (buildingId) => {
    const building = getBuildingConfig(buildingId);
    if (!building) return;

    console.log(`Generating daily report for building: ${buildingId}`);

    // Get open tickets from sheet (TODO: implement getOpenTickets in sheets.service)
    // For now, send a generic reminder

    // Group tickets by professional
    const professionalTickets = {};

    for (const [ticketType, professional] of Object.entries(building.professionals)) {
        if (!professionalTickets[professional.phone]) {
            professionalTickets[professional.phone] = {
                name: professional.name,
                types: []
            };
        }
        professionalTickets[professional.phone].types.push(ticketType);
    }

    // Send message to each professional
    for (const [phone, info] of Object.entries(professionalTickets)) {
        const message = `
בוקר טוב ${info.name}!

זהו תזכורת יומית ממערכת הקריאות של בניין ${building.name}.
אנא בדוק אם יש קריאות פתוחות בתחומך: ${info.types.join(', ')}

להשיב "טופל" עם מספרי הקריאות שטיפלת בהן.
        `.trim();

        try {
            await twilioService.sendMessage(phone, message);
            console.log(`Sent daily report to ${info.name} (${phone})`);
        } catch (error) {
            console.error(`Failed to send daily report to ${phone}:`, error);
        }
    }

    // Also notify admin
    if (building.admin && building.admin.phone) {
        const adminMessage = `
בוקר טוב!
דוח יומי לבניין ${building.name}.
המערכת שלחה תזכורות לכל בעלי המקצוע.
        `.trim();

        await twilioService.sendMessage(building.admin.phone, adminMessage);
    }
};

module.exports = {
    initScheduledJobs,
    sendDailyReports,
    sendBuildingDailyReport
};
