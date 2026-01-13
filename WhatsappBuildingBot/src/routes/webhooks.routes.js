const express = require('express');
const router = express.Router();
const messageHandler = require('../handlers/message.handler');
const authMiddleware = require('../middleware/auth.middleware');
const twilioService = require('../services/twilio.service');

// Main webhook for incoming messages
// Apply auth middleware to filter non-residents
// In production, also use twilioService.webhookMiddleware to verify usage
router.post('/twilio', authMiddleware.isAuthorized, messageHandler.handleIncomingMessage);

module.exports = router;
