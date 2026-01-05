const puppeteer = require('puppeteer');

(async () => {
    console.log('--- PUPPETEER RAW TEST ---');
    try {
        const browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.goto('https://login.bankhapoalim.co.il', { waitUntil: 'networkidle2' });

        console.log('Page loaded successfully');
        console.log('Title:', await page.title());

        await new Promise(r => setTimeout(r, 10000)); // Keep open for 10s
        await browser.close();
        console.log('Browser closed');
    } catch (error) {
        console.error('Puppeteer Error:', error);
    }
})();
