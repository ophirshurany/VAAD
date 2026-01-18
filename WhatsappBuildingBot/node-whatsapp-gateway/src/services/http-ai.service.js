/**
 * HTTP client service for communicating with the Python AI Agent.
 */

const config = require('../config/environment');

// AI Service URL from environment
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://python-ai-agent:8000';

/**
 * Send a message to the AI service for analysis
 * @param {Object} params - Analysis parameters
 * @param {string} params.buildingId - Building identifier
 * @param {Object} params.resident - Resident info (name, phone)
 * @param {string} params.messageText - Raw message text
 * @param {string[]} params.mediaUrls - Array of media URLs
 * @returns {Promise<Object>} - AI classification response
 */
const analyzeMessage = async ({ buildingId, resident, messageText, mediaUrls = [] }) => {
    const requestBody = {
        building_id: buildingId,
        resident: {
            name: resident.name,
            phone: resident.phone
        },
        message_text: messageText,
        media_urls: mediaUrls
    };

    try {
        console.log(`Calling AI service at ${AI_SERVICE_URL}/analyze`);

        const response = await fetch(`${AI_SERVICE_URL}/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI service returned ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        console.log(`AI classification: type=${result.ticket_type}, location=${result.location}, confidence=${result.confidence}`);

        return result;
    } catch (error) {
        console.error('AI Service Error:', error);

        // Fallback response if AI service is unavailable
        return {
            ticket_type: 'אחר',
            location: 'אחר',
            normalized_summary: messageText.substring(0, 50) + (messageText.length > 50 ? '...' : ''),
            original_text: messageText,
            language: 'he',
            confidence: 0,
            model_metadata: {
                model: 'fallback',
                latency_ms: 0
            }
        };
    }
};

/**
 * Check if the AI service is healthy
 * @returns {Promise<boolean>} - True if healthy
 */
const checkHealth = async () => {
    try {
        const response = await fetch(`${AI_SERVICE_URL}/health`, {
            method: 'GET'
        });

        return response.ok;
    } catch (error) {
        console.error('AI Service Health Check Failed:', error);
        return false;
    }
};

module.exports = {
    analyzeMessage,
    checkHealth,
    AI_SERVICE_URL
};
