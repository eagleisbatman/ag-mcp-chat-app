# n8n - AG-MCP Chat Backend

## 🚀 Live Deployment

**URL:** https://ag-mcp-app.up.railway.app

**Webhook Endpoint:**
```
POST https://ag-mcp-app.up.railway.app/webhook/api/chat
```

## 📡 API Usage

**Request:**
```json
{
  "message": "What crops should I plant?",
  "latitude": -1.2864,
  "longitude": 36.8172
}
```

**Response:**
```json
{
  "response": "AI response here",
  "region": "east-africa",
  "language": "en",
  "success": true
}
```

## 📁 Files

```
n8n/
├── Dockerfile           # Railway deployment
├── docker-compose.yml   # Local development
├── README.md            # This file
└── workflows/
    ├── chat-workflow.json      # Main workflow (import this!)
    └── MCP_SERVERS_CONFIG.md   # MCP server reference
```

## 🔧 Deploy to Railway

1. **Railway Dashboard** → **New Project** → **Docker**
2. **Image:** `n8nio/n8n:latest`
3. **Port:** `5678`
4. **Environment Variables:**
   - `N8N_ENCRYPTION_KEY` - Generate: `openssl rand -hex 16`
   - `WEBHOOK_URL` - Your Railway URL
   - `GENERIC_TIMEZONE` - `UTC`

## 📥 Import Workflow

1. Open n8n UI
2. **Workflows** → **Import from File**
3. Select `workflows/chat-workflow.json`
4. Configure Gemini credential
5. Activate workflow

## 🏠 Local Development

```bash
cd n8n
docker-compose up -d
# Open http://localhost:5678
```
