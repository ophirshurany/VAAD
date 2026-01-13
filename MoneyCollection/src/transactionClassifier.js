const fs = require('fs');
const path = require('path');
const fuzzball = require('fuzzball');

/**
 * Classifies a transaction to find the corresponding tenant/apartment.
 * Uses Regex for apartment numbers and Fuzzy Token Set Ratio for name matching.
 * 
 * @param {string} description - The transaction description string.
 * @param {Object} tenantsConfig - The tenant configuration object.
 * @returns {Object} - { apartment, tenantName, confidence, method }
 */
function classifyTransaction(description, tenantsConfig) {
    if (!description) {
        return { apartment: null, tenantName: null, confidence: 0, method: 'none' };
    }

    // Default empty config if missing
    if (!tenantsConfig || !tenantsConfig.apartments) {
        tenantsConfig = { apartments: {} };
    }

    let cleanDesc = description.trim();

    // Normalize Hebrew: Remove "Prefix Vav" when attached to words (e.g., "ומרדכי" -> " מרדכי")
    // Replace "Space + Vav + Hebrew Letter" with " Space + Hebrew Letter"
    cleanDesc = cleanDesc.replace(/\sו(?=[א-ת])/g, ' ');

    // Remove common prefixes/labels in description to reduce noise
    cleanDesc = cleanDesc.replace(/המבצע:|עבור:|מח-ן:/g, ' ');

    // Normalize to lower case (for English parts)
    cleanDesc = cleanDesc.toLowerCase();

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

    // Threshold for accepting a match
    const THRESHOLD = 75; // Slightly lower for partial matches, but token_set_ratio is robust

    Object.entries(tenantsConfig.apartments).forEach(([aptNum, info]) => {
        const namesToCheck = info.altNames || [];
        if (namesToCheck.length === 0) return;

        // 2a. Create a "Combined Candidate" string from all known names for this apartment
        // This helps match "Niqana and Mordechai" against "Niqana Gaz" and "Mordechai Gaz"
        // by creating a bag of words: "Niqana Gaz Mordechai Gaz"
        const combinedCandidate = namesToCheck.join(' ').toLowerCase();

        // Check token_set_ratio against combined string
        // This handles "Couple Names" where order/intersection matters
        const setScore = fuzzball.token_set_ratio(combinedCandidate, cleanDesc, { use_collator: true });

        // 2b. Check partial_ratio against individual names (Legacy / Specific match)
        let maxIndividualScore = 0;
        namesToCheck.forEach(name => {
            const score = fuzzball.partial_ratio(name.toLowerCase(), cleanDesc, { use_collator: true });
            if (score > maxIndividualScore) maxIndividualScore = score;
        });

        // Take the best of Set Score vs Individual Score
        const finalScore = Math.max(setScore, maxIndividualScore);

        if (finalScore > bestMatch.score) {
            bestMatch = {
                apartment: aptNum,
                score: finalScore,
                tenantName: info.familyName
            };
        }
    });

    if (bestMatch.score >= THRESHOLD) {
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
    // Mock Config based on User Examples
    const mockConfig = {
        apartments: {
            "87": {
                familyName: "גנון",
                altNames: ["לישי יעקב גנון"]
            },
            "76": {
                familyName: "גז",
                altNames: ["ניצנה גז", "מרדכי גז", "מיטל שניר", "אורן שניר"] // Merged scenario
            }
        }
    };

    const testCases = [
        "המבצע: לישי יעקב גנון עבור: ועד בית             מח-ן:000572518",
        "המבצע: ניצנה ומרדכי גז עבור: ועד הבית            מח-ן:000195189",
        "המבצע: שניר אורן ומיטל עבור: וועד ינואר - משפחת  מח-ן:000290473",
        "סתם העברה לא קשורה",
        "תשלום מדירה 87"
    ];

    console.log("Running Classifier Tests with Mock Data...\n");
    testCases.forEach(desc => {
        const result = classifyTransaction(desc, mockConfig);
        console.log(`Description: "${desc}"`);
        console.log(`Result: Apt ${result.apartment} (${result.confidence * 100}%) - Method: ${result.method}\n`);
    });
}
