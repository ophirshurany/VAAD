const express = require('express');
const app = express();
const config = require('./src/config/environment');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
    next();
});

// Routes
const healthRoutes = require('./src/routes/health.routes');
const webhookRoutes = require('./src/routes/webhooks.routes');

app.use('/health', healthRoutes);
app.use('/webhooks', webhookRoutes);

// Error handler
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: config.server.env === 'development' ? err.message : undefined
    });
});

module.exports = app;
