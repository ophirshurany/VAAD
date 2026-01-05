require('dotenv').config();
const { createScraper } = require('israeli-bank-scrapers');
const moment = require('moment');

(async () => {
    console.log('--- DEBUG SCRAPER START ---');

    if (!process.env.BANK_USER_CODE || !process.env.BANK_PASSWORD) {
        console.error('Missing credentials in .env');
        return;
    }

    const options = {
        companyId: 'hapoalim',
        startDate: moment().startOf('month').toDate(),
        combineInstallments: false,
        showBrowser: true,
        verbose: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized']
    };

    try {
        console.log('Launching Scraper...');
        const scraper = createScraper(options);
        const result = await scraper.scrape({
            username: process.env.BANK_USER_CODE,
            password: process.env.BANK_PASSWORD
        });

        console.log('Scrape Result:', result);

        if (!result.success) {
            console.error('ERROR TYPE:', result.errorType);
            console.error('ERROR MSG:', result.errorMessage);
        }

    } catch (err) {
        console.error('CRITICAL ERROR CAUGHT:', err);
    }

    console.log('\n--- WAITING 60 SECONDS ---');
    console.log('Please inspect the browser window (if open) for any visual errors (Captcha, Login block, etc).');

    // Wait 1 minute before exiting to let user see
    await new Promise(r => setTimeout(r, 60000));

    console.log('Exiting debug script.');
})();
