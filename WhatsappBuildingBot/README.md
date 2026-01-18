# WhatsApp Building Management Bot

A microservice-based WhatsApp bot for managing building maintenance tickets. Residents send messages via WhatsApp, which are classified by AI and routed to the appropriate professionals.

## Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│   Twilio WhatsApp   │────────▶│  Node.js Gateway    │
│       Sandbox       │         │   (Port 3000)       │
└─────────────────────┘         │                     │
                                │  • Webhook handling │
                                │  • Sheets API       │
                                │  • Notifications    │
                                │  • Scheduling       │
                                └──────────┬──────────┘
                                           │ HTTP
                                           ▼
                                ┌─────────────────────┐
                                │  Python AI Agent    │
                                │   (Port 8000)       │
                                │                     │
                                │  • LangChain        │
                                │  • Gemini API       │
                                │  • Hebrew NLP       │
                                └─────────────────────┘
```

## Services

### 1. Node.js WhatsApp Gateway (`node-whatsapp-gateway/`)

- Handles Twilio WhatsApp webhooks
- Manages Google Sheets integration
- Sends notifications to residents and professionals
- Runs daily scheduled jobs

### 2. Python AI Agent (`python-ai-agent/`)

- FastAPI-based AI classification service
- Uses LangChain + Google Gemini
- Classifies Hebrew messages into structured tickets

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Twilio account with WhatsApp sandbox
- Google Cloud service account with Sheets API access
- Google Gemini API key

### Setup

1. **Clone and configure:**

   ```bash
   # Copy environment files
   cp python-ai-agent/.env.example python-ai-agent/.env
   cp node-whatsapp-gateway/.env.example node-whatsapp-gateway/.env
   
   # Edit .env files with your credentials
   ```

2. **Start services:**

   ```bash
   docker-compose up --build
   ```

3. **Configure Twilio webhook:**
   - Sandbox URL: `https://your-domain.com/webhooks/twilio`

4. **Verify health:**

   ```bash
   curl http://localhost:3000/health
   curl http://localhost:8000/health
   ```

## API Endpoints

### Node.js Gateway (Port 3000)

- `GET /health` – Health check
- `POST /webhooks/twilio` – Twilio WhatsApp webhook

### Python AI Agent (Port 8000)

- `GET /health` – Health check
- `POST /analyze` – Analyze message and classify ticket

## Development

### Run Python service locally

```bash
cd python-ai-agent
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Run Node.js service locally

```bash
cd node-whatsapp-gateway
npm install
npm run dev
```

## Ticket Types (Hebrew)

מעלית, גינה, בינוי, תאורה, הדברה, כיבוי אש, אינטרקום, חשמל, חניה, אינסטלציה, ניקיון, אחר

## License

ISC
