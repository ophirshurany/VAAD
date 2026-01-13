const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config/environment');
const { COMPLAINT_TYPES, LOCATIONS } = require('../config/constants');

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);

/**
 * Classify a user's message using Gemini
 * @param {string} userMessage - The raw message from the user
 * @returns {Promise<Object>} - The classification result
 */
const classifyComplaint = async (userMessage) => {
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            generationConfig: {
                responseMimeType: "application/json"
            }
        });

        const prompt = `
      You are a building complaint classifier. Analyze this Hebrew resident message and extract:
      1. complaint_type (Must be one of: ${COMPLAINT_TYPES.join(', ')})
      2. location (Must be one of: ${LOCATIONS.join(', ')}. If not specified, infer best guess or use 'Other')
      3. refined_summary (A polite, formal Hebrew summary of the complaint, max 15 words)
      
      Message: "${userMessage}"
      
      Return strictly valid JSON.
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Clean up markdown code blocks if present (Gemini sometimes adds them even with JSON mode, though less likely now)
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();

        return JSON.parse(cleanedText);
    } catch (error) {
        console.error('Gemini Classification Error:', error);
        // Fallback classification
        return {
            complaint_type: 'Other',
            location: 'Other',
            refined_summary: userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : '')
        };
    }
};

module.exports = {
    classifyComplaint
};
