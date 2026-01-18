/**
 * Hebrew constants for complaint types, locations, and statuses.
 */

const TICKET_TYPES = [
    'מעלית',
    'גינה',
    'בינוי',
    'תאורה',
    'הדברה',
    'כיבוי אש',
    'אינטרקום',
    'חשמל',
    'חניה',
    'אינסטלציה',
    'ניקיון',
    'אחר'
];

const LOCATIONS = [
    'לובי',
    'חניון',
    'גינה',
    'מעלית',
    'חדר אשפה',
    'גג',
    'חדר עגלות',
    'חדר מחסנים',
    'קרקע',
    'קומה 1',
    'קומה 2',
    'קומה 3',
    'קומה 4',
    'קומה 5',
    'קומה 6',
    'קומה 7',
    'קומה 8',
    'קומה 9',
    'קומה 10',
    'קומה 11',
    'קומה 12',
    'קומה 13',
    'קומה 14',
    'אחר'
];

const STATUS = {
    OPEN: 'פתוח',
    IN_PROGRESS: 'בטיפול',
    RESOLVED: 'טופל'
};

// English to Hebrew mapping for legacy support
const TICKET_TYPE_MAPPING = {
    'Elevator': 'מעלית',
    'Garden': 'גינה',
    'Construction': 'בינוי',
    'Lighting': 'תאורה',
    'Pest Control': 'הדברה',
    'Fire Suppression': 'כיבוי אש',
    'Intercom': 'אינטרקום',
    'Electricity': 'חשמל',
    'Parking': 'חניה',
    'Plumbing': 'אינסטלציה',
    'Cleaning': 'ניקיון',
    'Other': 'אחר'
};

module.exports = {
    TICKET_TYPES,
    LOCATIONS,
    STATUS,
    TICKET_TYPE_MAPPING
};
