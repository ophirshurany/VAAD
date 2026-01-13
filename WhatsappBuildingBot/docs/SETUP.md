# Setup Guide

## Prerequisites
- Node.js > 18
- Google Cloud Account
- Twilio Account

## Service Configuration

### 1. Google Cloud Project
1. Create a new Project in Google Cloud Console.
2. Enable **Google Sheets API**.
3. Create a **Service Account**.
4. Create a JSON Key for the Service Account and download it.
5. Share your target Google Sheet with the Service Account email (Editor Role).
6. Copy the Sheet ID from the URL and set `GOOGLE_SHEET_ID`.

### 2. Google Gemini
1. Get an API Key from Google AI Studio.
2. Set `GEMINI_API_KEY`.

### 3. Twilio
1. Create a WhatsApp Sandbox or use a Business Number.
2. Get `ACCOUNT_SID` and `AUTH_TOKEN`.
3. Configure the "When a message comes in" Webhook to your server URL (e.g., `https://your-domain.com/webhooks/twilio`).

### 4. Environment Variables
Copy `.env.example` to `.env` and fill in the values calling the keys created above.
