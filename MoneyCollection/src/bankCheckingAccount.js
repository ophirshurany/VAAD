require('dotenv').config();
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const moment = require('moment');
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

puppeteer.use(StealthPlugin());

const DOWNLOAD_PATH = path.resolve(__dirname, '../data/downloads');

// Ensure download directory exists
if (!fs.existsSync(DOWNLOAD_PATH)) {
  fs.mkdirSync(DOWNLOAD_PATH, { recursive: true });
}

/**
 * Scrapes Bank Hapoalim for transactions by downloading the Excel report.
 * @param {string} dateString - Start date in YYYY-MM-DD format.
 * @returns {Promise<Array>} - List of credit transactions.
 */
async function getBankTransactions(dateString) {
  console.log('Starting Excel download scraper for Hapoalim...');

  const startDate = moment(dateString);
  const endDate = moment(); // Today

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized']
  });

  const page = await browser.newPage();

  try {
    // Determine download path logic
    const client = await page.target().createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: DOWNLOAD_PATH
    });

    // 1. Login
    console.log('Navigating to login...');
    await page.goto('https://login.bankhapoalim.co.il', { waitUntil: 'networkidle2', timeout: 60000 });

    const userCodeSelector = '#userCode';
    await page.waitForSelector(userCodeSelector, { timeout: 30000 });

    console.log('Typing credentials...');
    await page.type(userCodeSelector, process.env.BANK_USER_CODE, { delay: 100 });
    await page.type('#password', process.env.BANK_PASSWORD, { delay: 100 });
    await page.click('button[type="submit"]');

    console.log('Waiting for login to complete...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });

    // 2. Identify Account ID
    // We need 'Branch-Account' format (e.g. 12-637-388838)
    // Try to find it in the UI or use default from env if available
    let accountId = process.env.BANK_ACCOUNT_ID;

    if (!accountId) {
      console.log('Attempting to extract Account ID from page...');
      try {
        // Try specific selectors common in Hapoalim dashboard
        // Often looks like "12-637-388838" or separate spans
        // Strategy: Look for the text that looks like an account number
        const extracted = await page.evaluate(() => {
          // Look for span with account pattern
          const spans = Array.from(document.querySelectorAll('span'));
          const accPattern = /\d{2,3}-\d{3}-\d{6}/; // 12-637-388838
          const match = spans.find(s => accPattern.test(s.innerText));
          return match ? match.innerText.trim() : null;
        });

        if (extracted) {
          // Should clean it? 
          const cleanAcc = extracted.match(/\d{2,3}-\d{3}-\d{6}/)[0];
          console.log(`Found Account ID: ${cleanAcc}`);
          accountId = cleanAcc;
        } else {
          // Fallback: try to grab just the 6 digit acc and prepend branch if we assume... 
          // But wait, user provided '12-637-388838'. Let's default to that if parsing fails?
          // Or better yet, ask user to provide it.
          // For now, let's try the user's specific ID if extraction fails, or error.
          // Let's assume the user provided one:
          accountId = '12-637-388838'; // HARDCODED FALLBACK based on user request prompt
          console.warn('Could not extract Account ID, using default fallback: 12-637-388838');
        }
      } catch (e) {
        console.warn('Error extracting Account ID:', e);
        accountId = '12-637-388838';
      }
    }

    // 3. Navigate to Download URL
    // Format dates: YYYYMMDD
    const startFmt = startDate.format('YYYYMMDD');
    const endFmt = endDate.format('YYYYMMDD');

    // Using user provided URL structure
    const downloadUrl = `https://login.bankhapoalim.co.il/ServerServices/current-account/transactionsExcel?contentType=excel&sortCode=1&retrievalEndDate=${endFmt}&retrievalStartDate=${startFmt}&accountId=${accountId}&activityTypeCodeAscendingFlag=-1&dateAscendingFlag=1&numOfRows=100&lang=he`;

    console.log(`Navigating to download URL (Start: ${startFmt}, End: ${endFmt})...`);

    // Clear old downloads first
    const cleanDownloads = () => {
      fs.readdirSync(DOWNLOAD_PATH).forEach(f => fs.unlinkSync(path.join(DOWNLOAD_PATH, f)));
    };
    cleanDownloads();

    // Trigger download
    // Sometimes goto is enough, sometimes need to handle content-disposition
    try {
      await page.goto(downloadUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    } catch (e) {
      // Goto might timeout if it's a download stream, that's fine.
    }

    // 4. Wait for file
    console.log('Waiting for file download...');
    let downloadedFile = null;
    for (let i = 0; i < 30; i++) {
      const files = fs.readdirSync(DOWNLOAD_PATH);
      // Look for .xls or .xlsx
      const match = files.find(f => f.endsWith('.xls') || f.endsWith('.xlsx'));
      if (match) {
        downloadedFile = path.join(DOWNLOAD_PATH, match);
        // Wait for file to be fully written (size stable)
        await new Promise(r => setTimeout(r, 1000));
        break;
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    if (!downloadedFile) {
      throw new Error('Download timed out or file not found.');
    }

    console.log(`File downloaded: ${downloadedFile}`);

    // 5. Parse Excel
    const workbook = XLSX.readFile(downloadedFile);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Parse as array of arrays first to find headers
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    // Find header row by looking for key Hebrew headers
    // Key columns: "תאריך", "פרטים", "אסמכתא", "זכות", "חובה", "יתרה", "עבור"/"לטובת"
    // Note: "עבור" might be what the user means, or "הפעולה" or "פרטים".
    // User asked to filter by "עבור" (For) column text value "ועד".

    let headerRowIndex = -1;
    let colMap = {};

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      if (!Array.isArray(row)) continue;

      // Check for presence of key headers
      const dateIdx = row.findIndex(c => typeof c === 'string' && c.includes('תאריך'));
      const creditIdx = row.findIndex(c => typeof c === 'string' && c.includes('זכות'));

      if (dateIdx !== -1 && creditIdx !== -1) {
        headerRowIndex = i;
        // Map columns
        colMap.date = dateIdx;
        colMap.credit = creditIdx;
        colMap.details = row.findIndex(c => typeof c === 'string' && c.includes('פרטים'));
        colMap.ref = row.findIndex(c => typeof c === 'string' && c.includes('אסמכתא'));
        colMap.for = row.findIndex(c => typeof c === 'string' && (c.includes('עבור') || c.includes('לטובת')));
        // note: if 'עבור' column doesn't exist explicitly, check 'פרטים' or maybe it's merged.
        // User said: "filter by עבור (for) column". So let's look for it specifically.
        break;
      }
    }

    if (headerRowIndex === -1) {
      throw new Error('Could not find table headers (תאריך, זכות) in Excel.');
    }

    console.log('Found headers at row:', headerRowIndex, 'Map:', colMap);

    const dataRows = rawData.slice(headerRowIndex + 1);
    const finalTransactions = [];

    dataRows.forEach(row => {
      // Extract raw values
      const dateRaw = row[colMap.date];
      const creditRaw = row[colMap.credit];
      const detailsRaw = colMap.details !== -1 ? row[colMap.details] : '';
      const refRaw = colMap.ref !== -1 ? row[colMap.ref] : '';
      const forRaw = colMap.for !== -1 ? row[colMap.for] : ''; // The "עבור" column

      // 1. Filter: "עבור" column must contain "ועד"
      // If "עבור" column doesn't exist, check details? User was specific about 'column'.
      // Let's assume strict check on the mapped column first.
      const forText = forRaw ? forRaw.toString().trim() : '';
      const hasVaad = forText.includes('ועד');

      if (!hasVaad) {
        // Optional: Log skipped?
        return;
      }

      // 2. Must be a credit (income)
      let amount = 0;
      if (typeof creditRaw === 'number') {
        amount = creditRaw;
      } else if (typeof creditRaw === 'string') {
        amount = parseFloat(creditRaw.replace(/[^\d.-]/g, ''));
      }

      if (!amount || amount <= 0) return;

      // 3. Parse Date
      let dateObj = new Date();
      if (typeof dateRaw === 'number') {
        // Excel date
        // (Serial - 25569) * 86400 * 1000 ? No, XLSX utils logic.
        // Simple approx or use XLSX util.
        // Better way: use read options cellDates: true via parsing?
        // Since we have raw array, we can use XLSX.SSF if needed.
        // Manual serial conversion:
        const excelEpoch = new Date(1899, 11, 30);
        dateObj = new Date(excelEpoch.getTime() + dateRaw * 86400000);
        // Verify timezone offset? ignoring for now.

        // Adjust for JS date parsing often being 1 day off due to leap year bug in Excel 1900
        // But let's verify with string parsing if available.
      } else if (typeof dateRaw === 'string') {
        const parts = dateRaw.split('/');
        if (parts.length === 3) {
          dateObj = new Date(parseInt(parts[2]) + (parseInt(parts[2]) < 100 ? 2000 : 0), parseInt(parts[1]) - 1, parseInt(parts[0]));
        }
      }

      // 4. Construct Object
      // User wants: תאריך, פרטים, אסמכתא, זכות, לטובת (mapped to our internal structure)
      const dateStr = moment(dateObj).format('YYYY-MM-DD');
      const description = `${detailsRaw} ${forText}`; // Combine details + for as description?
      // User asked to add "row ... to processed.json".
      // Our system uses 'description' for classification.
      // We should format the description to include the 'for' text if that's where the tenant name is.
      // "עבור" likely contains "דירה X" or name.

      // Create a unique identifier from available fields
      const uniqueId = refRaw ? String(refRaw) : `${dateStr}-${amount}-${description.slice(0, 15)}`;

      finalTransactions.push({
        date: dateObj, // Date object
        formattedDate: dateStr,
        chargedAmount: amount, // 'זכות'
        description: description.trim(), // 'פרטים' + ' ' + 'עבור'
        ref: refRaw, // 'אסמכתא'
        identifier: uniqueId,
        id: uniqueId,
        details: detailsRaw,
        beneficiary: forText // 'לטובת'/'עבור'
      });
    });

    console.log(`Parsed ${finalTransactions.length} credit transactions from Excel.`);
    return finalTransactions;

  } catch (err) {
    console.error('Excel Scraper failed:', err);
    throw err;
  } finally {
    // await browser.close(); // Keep open for debugging? User wants it closed?
    // Usually close.
    await browser.close();
  }
}

module.exports = { getBankTransactions };
