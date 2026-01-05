const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '../data/processed_state.json');

// Initialize state if not exists
if (!fs.existsSync(STATE_FILE)) {
    fs.writeFileSync(STATE_FILE, JSON.stringify([], null, 2));
}

let processedIds = new Set();

function loadState() {
    try {
        const data = fs.readFileSync(STATE_FILE, 'utf8');
        const ids = JSON.parse(data);
        processedIds = new Set(ids);
        console.log(`Loaded ${processedIds.size} processed transactions from state.`);
    } catch (err) {
        console.error('Error loading state:', err);
        processedIds = new Set();
    }
}

function saveState() {
    try {
        const ids = Array.from(processedIds);
        fs.writeFileSync(STATE_FILE, JSON.stringify(ids, null, 2));
        console.log('State saved.');
    } catch (err) {
        console.error('Error saving state:', err);
    }
}

function isProcessed(txnId) {
    return processedIds.has(txnId);
}

function markProcessed(txnId) {
    processedIds.add(txnId);
    // Auto-save on every update to be safe, or could defer
    saveState();
}

// Initial load
loadState();

module.exports = {
    isProcessed,
    markProcessed
};
