/**
 * Notification service for sending messages to residents and professionals.
 */

const twilioService = require('./twilio.service');
const { getProfessionalForTicketType } = require('../config/buildings.config');

/**
 * Get professional for a ticket type (legacy compatibility)
 * @deprecated Use buildings.config.getProfessionalForTicketType instead
 */
const getProfessionalForType = (ticketType) => {
    const buildingId = process.env.DEFAULT_BUILDING_ID || 'alonim-8';
    return getProfessionalForTicketType(buildingId, ticketType);
};

/**
 * Check if phone belongs to a professional
 * @param {string} phone - Phone number to check
 * @param {string} buildingId - Building identifier
 * @returns {Object|null} Professional info or null
 */
const getProfessionalByPhone = (phone, buildingId = 'alonim-8') => {
    const { getBuildingConfig } = require('../config/buildings.config');
    const building = getBuildingConfig(buildingId);

    if (!building) return null;

    for (const [ticketType, professional] of Object.entries(building.professionals)) {
        const normalizedProPhone = professional.phone.replace(/\s+/g, '');
        const normalizedInputPhone = phone.replace(/\s+/g, '').replace(/^0/, '+972');

        if (normalizedProPhone === normalizedInputPhone ||
            normalizedProPhone === phone ||
            `whatsapp:${normalizedProPhone}` === phone) {
            return { ...professional, ticketType };
        }
    }

    return null;
};

/**
 * Notify resident that their ticket was received
 * @param {string} residentPhone - Resident phone number
 * @param {Object} classification - AI classification result
 */
const notifyResidentReceived = async (residentPhone, classification) => {
    const message = `
שלום,
פנייתך התקבלה בהצלחה!

📋 סיווג: ${classification.ticket_type}
📍 מיקום: ${classification.location}
📝 סיכום: ${classification.normalized_summary}

הפנייה הועברה לטיפול הגורם המקצועי.
נעדכן אותך כשתטופל.
    `.trim();

    await twilioService.sendMessage(residentPhone, message);
};

/**
 * Notify professional about new task
 * @param {Object} professional - Professional info (name, phone)
 * @param {Object} complaintData - Complaint details
 */
const notifyProfessionalNewTask = async (professional, complaintData) => {
    const message = `
🔔 קריאה חדשה!

📋 סוג: ${complaintData.ticketType}
📍 מיקום: ${complaintData.location}
📝 תיאור: ${complaintData.summary}
👤 דייר: ${complaintData.residentName} (${complaintData.phone})
🏢 בניין: ${complaintData.buildingId || 'לא צוין'}
${complaintData.image ? `📷 תמונה: ${complaintData.image}` : ''}

להשיב "בטיפול" או "טופל" עם מספר הקריאה.
    `.trim();

    if (professional && professional.phone) {
        await twilioService.sendMessage(professional.phone, message);
    } else {
        console.warn('No professional phone number found for notification');
    }
};

module.exports = {
    getProfessionalForType,
    getProfessionalByPhone,
    notifyResidentReceived,
    notifyProfessionalNewTask
};
