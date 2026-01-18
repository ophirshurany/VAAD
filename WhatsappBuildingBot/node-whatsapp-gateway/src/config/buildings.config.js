/**
 * Multi-tenant building configuration.
 * Each building has its own configuration for residents, professionals, and Google Sheet.
 */

// Building configurations
const BUILDINGS = {
    'alonim-8': {
        name: 'אלונים 8',
        sheetId: process.env.GOOGLE_SHEET_ID || '',

        // Resident phone whitelist (allowed to open tickets)
        whitelist: [
            '+972501234567',
            '+972502345678',
            '+972503456789',
            // Add more resident phones here
        ],

        // Professional roster with Hebrew ticket type mapping
        professionals: {
            'מעלית': { name: 'משה מעלית', phone: '+972500000001' },
            'גינה': { name: 'דני גנן', phone: '+972500000002' },
            'ניקיון': { name: 'שרה ניקיון', phone: '+972500000003' },
            'אינסטלציה': { name: 'יוסי אינסטלטור', phone: '+972500000004' },
            'חשמל': { name: 'אבי חשמלאי', phone: '+972500000005' },
            'בינוי': { name: 'חברת בינוי', phone: '+972500000006' },
            'תאורה': { name: 'אבי חשמלאי', phone: '+972500000005' },
            'הדברה': { name: 'חברת הדברה', phone: '+972500000007' },
            'כיבוי אש': { name: 'מיכאל בטיחות', phone: '+972500000008' },
            'אינטרקום': { name: 'טכנאי אינטרקום', phone: '+972500000009' },
            'חניה': { name: 'ועד הבית', phone: '+972524244788' },
            'אחר': { name: 'ועד הבית', phone: '+972524244788' }
        },

        // Admin contact
        admin: {
            email: 'ophirshurany@gmail.com',
            phone: '+972524244788'
        }
    }
    // Add more buildings here as needed
};

/**
 * Get building configuration by ID
 * @param {string} buildingId - The building identifier
 * @returns {Object|null} Building configuration or null if not found
 */
const getBuildingConfig = (buildingId) => {
    return BUILDINGS[buildingId] || null;
};

/**
 * Check if a phone number is whitelisted for a building
 * @param {string} buildingId - The building identifier
 * @param {string} phone - Phone number to check
 * @returns {boolean} True if whitelisted
 */
const isPhoneWhitelisted = (buildingId, phone) => {
    const building = BUILDINGS[buildingId];
    if (!building) return false;

    // Normalize phone number for comparison
    const normalizedPhone = phone.replace(/\s+/g, '').replace(/^0/, '+972');

    return building.whitelist.some(whitelistedPhone => {
        const normalizedWhitelisted = whitelistedPhone.replace(/\s+/g, '');
        return normalizedWhitelisted === normalizedPhone ||
            normalizedWhitelisted === phone;
    });
};

/**
 * Get professional for a ticket type in a building
 * @param {string} buildingId - The building identifier
 * @param {string} ticketType - Hebrew ticket type
 * @returns {Object} Professional info with name and phone
 */
const getProfessionalForTicketType = (buildingId, ticketType) => {
    const building = BUILDINGS[buildingId];
    if (!building) {
        return { name: 'ועד הבית', phone: process.env.ADMIN_PHONE || '' };
    }

    return building.professionals[ticketType] || building.professionals['אחר'];
};

/**
 * Get all building IDs
 * @returns {string[]} Array of building IDs
 */
const getAllBuildingIds = () => {
    return Object.keys(BUILDINGS);
};

module.exports = {
    BUILDINGS,
    getBuildingConfig,
    isPhoneWhitelisted,
    getProfessionalForTicketType,
    getAllBuildingIds
};
