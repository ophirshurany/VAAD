const express = require('express');
const app = express();
const config = require('./src/config/environment');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
const healthRoutes = require('./src/routes/health.routes');
app.use('/health', healthRoutes);

const webhookRoutes = require('./src/routes/webhooks.routes');
app.use('/webhooks', webhookRoutes);

module.exports = app;
