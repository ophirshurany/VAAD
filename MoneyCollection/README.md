# Automated Building Committee Collection System

This Node.js project automates the tracking of building committee payments for Shderot Ha'Alonim 8.

## Features
- **Bank Scraping**: Automatically fetches incoming transactions from Bank Hapoalim.
- **Tenant Identification**: Uses Regex and Fuzzy Matching to identify the payer's apartment.
- **Receipt Generation**: Generates professional PDF receipts (Hebrew support).
- **Cloud Sync**: Uploads receipts to Google Drive and updates a Google Sheet.
- **State Management**: Tracks processed transactions to prevent duplicates.

## Prerequisites
1. **Node.js**: Ensure Node.js is installed.
2. **Bank Credentials**: User code and password for Bank Hapoalim.
3. **Google Cloud Service Account**: A service account with access to Drive and Sheets (see `docs/google-setup-guide.md`).

## Installation

1. Clone or download this repository.
2. Install dependencies:
   ```bash
   npm install
   ```

## Configuration

1. **Environment Variables**:
   - Copy `.env.example` to `.env`.
   - Fill in your Bank credentials and Google Service Account details.
   - Set the `GOOGLE_DRIVE_FOLDER_ID` and `GOOGLE_SHEET_ID`.

2. **Tenants**:
   - Edit `config/tenants.json` to map apartment numbers to family names.

## Usage

Run the main automation script:
```bash
node src/index.js
```

This will:
1. Fetch transactions for the current month.
2. Filter for new incoming credits.
3. Generate receipts for identified tenants.
4. Upload receipts to the configured Drive folder.
5. Append a row to the configured Google Sheet.

## Project Structure
- `src/`: Source code modules.
- `config/`: Configuration files (tenants.json).
- `data/`: Local data storage (processed IDs state).
- `receipts/`: Local copy of generated PDFs.
- `docs/`: Documentation.

## Troubleshooting
- **Scraper Fails**: Check bank credentials and internet connection. Ensure no 2FA blocks (scraper handles standard login but complex 2FA might require manual intervention or specific config).
- **Google Auth Error**: Check if the service account email is shared with the Folder/Sheet and has 'Editor' permissions.
- **Hebrew Fonts**: If PDF text is garbled, ensure `C:\Windows\Fonts\arial.ttf` exists or configure a different font path in `src/receiptGenerator.js`.
