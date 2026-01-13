require('dotenv').config();
const cron = require('node-cron');
const path = require('path');
const fs = require('fs');
const scheduleConfig = require('../config/schedule');

// Import the main processing function
// We'll call the main index.js logic
const { main: runCollection } = require('./index');

// Log file path
const LOG_FILE = path.join(__dirname, scheduleConfig.logFile);

/**
 * Logs a message with timestamp to both console and file.
 * @param {string} message - The message to log.
 */
function log(message) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}`;

    console.log(logLine);

    // Append to log file
    try {
        fs.appendFileSync(LOG_FILE, logLine + '\n');
    } catch (err) {
        console.error('Failed to write to log file:', err.message);
    }
}

/**
 * Checks if today is the last day of the month.
 * @returns {boolean}
 */
function isLastDayOfMonth() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // If tomorrow is a different month, today is the last day
    return tomorrow.getMonth() !== today.getMonth();
}

/**
 * Runs the collection process with retry logic.
 * @param {string} scheduleName - Name of the schedule that triggered this run.
 */
async function runWithRetry(scheduleName) {
    const { maxAttempts, delayMs } = scheduleConfig.retry;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            log(`Starting scheduled run: ${scheduleName} (attempt ${attempt}/${maxAttempts})`);

            await runCollection();

            log(`Scheduled run completed successfully: ${scheduleName}`);
            return;

        } catch (err) {
            log(`Error in scheduled run (attempt ${attempt}): ${err.message}`);

            if (attempt < maxAttempts) {
                log(`Retrying in ${delayMs / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delayMs));
            } else {
                log(`All ${maxAttempts} attempts failed for: ${scheduleName}`);
            }
        }
    }
}

/**
 * Initializes and starts the scheduler.
 */
function startScheduler() {
    log('='.repeat(50));
    log('MoneyCollection Scheduler Starting...');
    log(`Timezone: ${scheduleConfig.timezone}`);
    log('='.repeat(50));

    // Schedule mid-month run (15th)
    const midMonthSchedule = scheduleConfig.schedules.find(s => s.name === 'mid-month');
    if (midMonthSchedule) {
        // node-cron doesn't support 'L' for last day, so we use a different approach
        // For 15th: '0 9 15 * *' (minute hour dayOfMonth month dayOfWeek)
        cron.schedule('0 9 15 * *', () => {
            runWithRetry('mid-month');
        }, {
            timezone: scheduleConfig.timezone
        });

        log(`Scheduled: ${midMonthSchedule.description} (15th at 9:00 AM)`);
    }

    // Schedule end-of-month run
    // Since node-cron doesn't support 'L', we run on 28-31 and check if it's actually the last day
    const endOfMonthSchedule = scheduleConfig.schedules.find(s => s.name === 'end-of-month');
    if (endOfMonthSchedule) {
        cron.schedule('0 9 28-31 * *', () => {
            if (isLastDayOfMonth()) {
                runWithRetry('end-of-month');
            } else {
                log(`Skipping end-of-month run - not the last day of the month`);
            }
        }, {
            timezone: scheduleConfig.timezone
        });

        log(`Scheduled: ${endOfMonthSchedule.description} (Last day at 9:00 AM)`);
    }

    log('');
    log('Scheduler is running. Press Ctrl+C to stop.');
    log('');

    // Keep the process alive
    process.on('SIGINT', () => {
        log('Scheduler stopped by user.');
        process.exit(0);
    });

    process.on('SIGTERM', () => {
        log('Scheduler terminated.');
        process.exit(0);
    });
}

// Run if executed directly
if (require.main === module) {
    startScheduler();
}

module.exports = { startScheduler, runWithRetry };
