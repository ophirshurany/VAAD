const app = require('./app');
const config = require('./src/config/environment');
const { initScheduledJobs } = require('./src/handlers/scheduler.handler');

const PORT = config.server.port || 3000;

// Start server
app.listen(PORT, () => {
    console.log(`Node.js WhatsApp Gateway running on port ${PORT}`);
    console.log(`Environment: ${config.server.env}`);
    console.log(`AI Service URL: ${config.ai.serviceUrl}`);

    // Initialize scheduled jobs
    initScheduledJobs();
});
