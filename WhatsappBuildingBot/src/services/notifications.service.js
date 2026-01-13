const twilioService = require('./twilio.service');
const { COMPLAINT_TYPES } = require('../config/constants');

// Hardcoded roster for POC. In a real app, load from Sheets or DB.
const PROFESSIONALS = {
    'Elevator': { name: 'Moshe Maalit', phone: '+972500000001' },
    'Garden': { name: 'Danny Ganan', phone: '+972500000002' },
    'Cleaning': { name: 'Sarah Cleaner', phone: '+972500000003' },
    // Default fallback
    'Other': { name: 'Building Manager', phone: '+972500000000' }
};

const getProfessionalForType = (type) => {
    return PROFESSIONALS[type] || PROFESSIONALS['Other'];
};

const getProfessionalByPhone = (phone) => {
    // Navigate values of PROFESSIONALS object
    for (const key in PROFESSIONALS) {
        if (PROFESSIONALS[key].phone === phone || PROFESSIONALS[key].phone === `whatsapp:${phone}`) {
            return PROFESSIONALS[key];
        }
    }
    return null;
};

const notifyResidentReceived = async (residentPhone, classification) => {
    const message = `
שלום,
פנייתך התקבלה.
סיווג: ${classification.complaint_type}
מיקום: ${classification.location}
סיכום: ${classification.refined_summary}
הנושא הועבר לטיפול הגורם המקצועי.
  `.trim();
    await twilioService.sendMessage(residentPhone, message);
};

const notifyProfessionalNewTask = async (professional, complaintData) => {
    const message = `
התקבלה קריאה חדשה:
סוג: ${complaintData.complaintType}
מיקום: ${complaintData.location}
תיאור: ${complaintData.summary}
דייר: ${complaintData.residentName} (${complaintData.phone})
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
