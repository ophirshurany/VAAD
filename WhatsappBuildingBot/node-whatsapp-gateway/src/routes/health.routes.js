const express = require('express');
const router = express.Router();
const aiService = require('../services/http-ai.service');

/**
 * Health check endpoint
 * GET /health
 */
router.get('/', async (req, res) => {
    const aiHealthy = await aiService.checkHealth();

    res.json({
        status: 'healthy',
        service: 'node-whatsapp-gateway',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        dependencies: {
            'python-ai-agent': aiHealthy ? 'healthy' : 'unavailable'
        }
    });
});

module.exports = router;
