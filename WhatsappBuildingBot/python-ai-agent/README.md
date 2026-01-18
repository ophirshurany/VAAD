# Python AI Agent Service

A FastAPI-based AI service for Hebrew building ticket classification using LangChain and Google Gemini.

## Overview

This service receives WhatsApp messages in Hebrew from building residents and classifies them into structured service tickets with:

- **Ticket Type**: Category of the issue (elevator, cleaning, plumbing, etc.)
- **Location**: Where in the building the issue is located
- **Normalized Summary**: A polite, professional Hebrew summary

## API Endpoints

### POST /analyze

Classifies a Hebrew message into a structured ticket.

**Request:**

```json
{
  "building_id": "alonim-8",
  "resident": {
    "name": "אהרון אהרון",
    "phone": "0501234567"
  },
  "message_text": "גועל נפש בלובי!!! מסריח פה! מנקה דחוףףף!",
  "media_urls": []
}
```

**Response:**

```json
{
  "ticket_type": "ניקיון",
  "location": "לובי",
  "normalized_summary": "בלובי יש לכלוך וריח לא נעים, נדרש ניקוי בהקדם.",
  "original_text": "גועל נפש בלובי!!! מסריח פה! מנקה דחוףףף!",
  "language": "he",
  "confidence": 0.94,
  "model_metadata": {
    "model": "gemini-1.5-flash",
    "latency_ms": 350
  }
}
```

### GET /health

Health check endpoint.

## Setup

1. Copy `.env.example` to `.env` and fill in your Gemini API key:

   ```bash
   cp .env.example .env
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Run the service:

   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

## Docker

Build and run with Docker:

```bash
docker build -t python-ai-agent .
docker run -p 8000:8000 --env-file .env python-ai-agent
```

## Ticket Types (Hebrew)

- מעלית (Elevator)
- גינה (Garden)
- בינוי (Construction)
- תאורה (Lighting)
- הדברה (Pest Control)
- כיבוי אש (Fire Suppression)
- אינטרקום (Intercom)
- חשמל (Electricity)
- חניה (Parking)
- אינסטלציה (Plumbing)
- ניקיון (Cleaning)
- אחר (Other)

## Locations (Hebrew)

- לובי, חניון, גינה, מעלית, חדר אשפה, גג
- חדר עגלות, חדר מחסנים, קרקע
- קומה 1-14, אחר
