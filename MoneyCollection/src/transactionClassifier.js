const fs = require('fs');
const path = require('path');
const fuzzball = require('fuzzball');

/**
 * Classifies a transaction to find the corresponding tenant/apartment.
 * @param {string} description - The transaction description string.
 * @param {Object} tenantsConfig - The tenant configuration object.
 * @returns {Object} - { apartment, tenantName, confidence, method }
 */
function classifyTransaction(description, tenantsConfig) {
    if (!description) {
        return { apartment: null, tenantName: null, confidence: 0, method: 'none' };
    }

    // Default empty config if missing or for testing
    if (!tenantsConfig || !tenantsConfig.apartments) {
        tenantsConfig = { apartments: {} };
    }

    const cleanDesc = description.toLowerCase().trim();

    // 1. Try Regex for Apartment Number
    // Matches: "דירה 5", "דירה מס 53", "מספר 5" (Hebrew only)
    const aptRegex = /(?:דירה|דירה מס'|מספר|מס)\s*[:.-]?\s*(\d+)/i;
    const match = cleanDesc.match(aptRegex);

    if (match && match[1]) {
        const aptNum = match[1];
        if (tenantsConfig.apartments[aptNum]) {
            return {
                apartment: aptNum,
                tenantName: tenantsConfig.apartments[aptNum].familyName,
                confidence: 0.95,
                method: 'regex_apt_number'
            };
        }
    }

    // 2. Fuzzy Matching for Tenant Names
    let bestMatch = { apartment: null, score: 0, tenantName: null };

    Object.entries(tenantsConfig.apartments).forEach(([aptNum, info]) => {
        const namesToCheck = [info.familyName, ...(info.altNames || [])];

        namesToCheck.forEach(name => {
            // Use partial_ratio to find the name inside the description string
            const score = fuzzball.partial_ratio(name, cleanDesc);

            if (score > bestMatch.score) {
                bestMatch = {
                    apartment: aptNum,
                    score: score,
                    tenantName: info.familyName
                };
            }
        }); // end names loop
    }); // end apartments loop

    // Threshold for fuzzy matching
    if (bestMatch.score > 80) {
        return {
            apartment: bestMatch.apartment,
            tenantName: bestMatch.tenantName,
            confidence: bestMatch.score / 100,
            method: 'fuzzy_name_match'
        };
    }

    return { apartment: null, tenantName: null, confidence: 0, method: 'failed' };
}

module.exports = { classifyTransaction };

// Test if run directly
if (require.main === module) {
    // Load local config for testing
    let localConfig = { apartments: {} };
    try {
        const data = fs.readFileSync(path.join(__dirname, '../config/tenants.json'), 'utf8');
        localConfig = JSON.parse(data);
    } catch (e) {
        console.warn("Could not load local config for testing.");
    }

    const testCases = [
        "העברה עבור ועד בית דירה 53",
        "תשלום ממשפחת כהן",
        "עבור דירה מספר 54",
        "סתם העברה לא קשורה",
        "תשלום מ לוי עבור הועד"
    ];

    console.log("Running Classifier Tests...\n");
    testCases.forEach(desc => {
        const result = classifyTransaction(desc, localConfig);
        console.log(`Description: "${desc}"`);
        console.log(`Result: ${JSON.stringify(result)}\n`);
    });
}
