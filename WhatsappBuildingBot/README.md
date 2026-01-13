# WhatsApp Building Management Bot

A comprehensive WhatsApp-based building complaint management system using Google Gemini AI and Google Sheets.

## Features
- **AI Classification**: Automatically categorizes complaints (Hebrew) into types (Elevator, Garden, etc.) using Gemini.
- **Google Sheets Integration**: all data is stored in a master spreadsheet.
- **Professional Assignment**: Auto-assigns handlers and notifies them via WhatsApp.
- **Status Tracking**: Professionals can close tasks via WhatsApp.
- **Daily Reports**: Morning summaries sent to professionals/admin.

## Setup
See [docs/SETUP.md](docs/SETUP.md) for detailed credentials setup.

## Running Locally
1. `npm install`
2. Configure `.env`
3. `npm start`
4. Expose local server via ngrok: `ngrok http 3000`
5. Configure Twilio Webhook to your ngrok URL (`/webhooks/twilio`).

## Deployment
See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
