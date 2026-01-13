const app = require('./app');
const config = require('./src/config/environment');
const scheduler = require('./src/handlers/scheduler.handler');

const PORT = config.server.port;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT} in ${config.server.env} mode`);
    scheduler.initScheduledJobs();
});
