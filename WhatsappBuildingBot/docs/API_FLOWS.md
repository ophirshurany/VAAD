# API Flows

## Incoming Message (Resident)
1. User sends WhatsApp message.
2. Twilio POSTs to `/webhooks/twilio`.
3. `auth.middleware` checks if number is whitelisted.
4. `message.handler` receives payload.
5. Message text is sent to `gemini.service` for classification.
6. `sheets.service` appends row to Google Sheet.
7. `notifications.service` replies to Resident (Confirmation).
8. `notifications.service` notifies Professional (New Task).

## Professional Update (Callback)
1. Professional relies to bot with "Fixed" or "Close".
2. `message.handler` detects professional sender.
3. Dispatches to `callback.handler`.
4. `callback.handler` logs generic "Update" (Simulated for POC).
5. Bot replies "Status Updated".

## Daily Report (Scheduler)
1. `node-cron` triggers at 08:00.
2. `scheduler.handler` fetches open complaints (Mocked).
3. Sends aggregation message to Admin/Professionals.
