const COMPLAINT_TYPES = [
    'Elevator',
    'Garden',
    'Construction',
    'Lighting',
    'Pest Control',
    'Fire Suppression',
    'Intercom',
    'Electricity',
    'Parking',
    'Plumbing',
    'Cleaning',
    'Other'
];

const LOCATIONS = [
    'Lobby',
    'Parking Lot',
    'Garden',
    'Elevator',
    'Trash Room',
    'Roof',
    'Cart Room',
    'Storage Room',
    'Ground Floor',
    'Floors 1-14'
];

const STATUS = {
    OPEN: 'Open',
    IN_PROGRESS: 'In Progress',
    RESOLVED: 'Resolved'
};

module.exports = {
    COMPLAINT_TYPES,
    LOCATIONS,
    STATUS
};
