# Google Cloud Service Account Setup Guide

To automate file uploads to Google Drive and updates to Google Sheets, you need a **Service Account**. This is a special type of Google account intended to represent a non-human user that needs to authenticate and be authorized to access data in Google APIs.

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Click on the project dropdown at the top of the page.
3. Click **New Project**.
4. Enter a project name (e.g., "Building Committee Automation") and click **Create**.

## Step 2: Enable APIs

1. In the sidebar, go to **APIs & Services > Library**.
2. Search for **Google Drive API** and click on it.
3. Click **Enable**.
4. Go back to the Library.
5. Search for **Google Sheets API** and click on it.
6. Click **Enable**.

## Step 3: Create a Service Account

1. In the sidebar, go to **IAM & Admin > Service Accounts**.
2. Click **+ Create Service Account**.
3. Enter a name (e.g., "automation-bot") and description (e.g., "Automation bot for Vaad collection - Uploads receipts to Drive and updates Sheets"). Click **Create and Continue**.
4. (Optional) You can skip granting roles for now, just click **Continue** and then **Done**.

## Step 4: Create Keys

1. In the Service Accounts list, click on the email address of the service account you just created.
2. Go to the **Keys** tab.
3. Click **Add Key > Create new key**.
4. Select **JSON** and click **Create**.
5. A JSON file will automatically download to your computer. **Keep this file secure!** It contains the private key.

## Step 5: Share Resources

You need to give this service account access to your specific Drive folder and Spreadsheet.

1. Open the JSON key file you downloaded and find the `client_email` field (e.g., `automation-bot@your-project.iam.gserviceaccount.com`).
2. Go to your **Google Drive**.
3. Right-click the folder where you want receipts to be saved and select **Share**.
4. Paste the service account email and give it **Editor** access.
5. Open your **Income Tracking Google Sheet**.
6. Click the **Share** button.
7. Paste the service account email and give it **Editor** access.

## Step 6: Configure Environment Variables

Open your `.env` file (create one based on `.env.example` if needed) and fill in the details:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: Copy from the JSON key file (`client_email`).
- `GOOGLE_PRIVATE_KEY`: Copy from the JSON key file (`private_key`). Copy the entire string including `-----BEGIN PRIVATE KEY-----` and `\n` characters.
- `GOOGLE_DRIVE_FOLDER_ID`: Open your Drive folder in the browser. The ID is the last part of the URL.
- `GOOGLE_SHEET_ID`: Open your Sheet in the browser. The ID is the long string in the URL between `/d/` and `/edit`.
