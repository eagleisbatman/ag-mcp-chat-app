# n8n Deployment on Railway

## 🚀 Quick Deploy (Using Official Docker Image)

**We use the official n8n Docker image** from [n8n-io/n8n](https://github.com/n8n-io/n8n) - `docker.n8n.io/n8nio/n8n:latest`

### Option 1: Docker (Recommended)

1. **Create Railway Project:**
   ```bash
   cd ag-mcp-chat-app/n8n
   railway init
   ```

2. **Set Environment Variables:**
   ```bash
   # Generate encryption key
   openssl rand -base64 32
   
   # Set in Railway dashboard or CLI:
   railway variables set N8N_ENCRYPTION_KEY=<generated-key>
   railway variables set WEBHOOK_URL=https://your-n8n-app.railway.app
   railway variables set GEMINI_API_KEY=your_gemini_api_key
   ```

3. **Deploy:**
   ```bash
   railway up
   ```

4. **Access n8n:**
   - Railway will show public URL
   - Open in browser
   - Create admin account

5. **Import Workflows:**
   - Go to Workflows → Import
   - Import `workflows/main-chat-workflow.json`
   - Configure Gemini credential
   - Activate workflow

### Option 2: Direct Docker (Local Testing)

```bash
docker volume create n8n_data
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v n8n_data:/home/node/.n8n \
  -e N8N_ENCRYPTION_KEY=your-key \
  docker.n8n.io/n8nio/n8n
```

## 📖 Deployment Guides

- **[WEB_DEPLOYMENT_GUIDE.md](WEB_DEPLOYMENT_GUIDE.md)** - Complete web dashboard guide (no CLI)
- **[DEPLOYMENT_OPTIONS.md](DEPLOYMENT_OPTIONS.md)** - All deployment options
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Detailed deployment guide

## 📋 Environment Variables

Per [official n8n Docker documentation](https://docs.n8n.io/hosting/installation/docker/):

| Variable | Required | Description |
|----------|----------|-------------|
| `N8N_ENCRYPTION_KEY` | ✅ | Random 32+ char key (generate with `openssl rand -base64 32`) |
| `WEBHOOK_URL` | ✅ | Your Railway n8n URL |
| `GENERIC_TIMEZONE` | ✅ | Timezone for schedule nodes (e.g., `America/New_York`) |
| `TZ` | ✅ | System timezone (same as `GENERIC_TIMEZONE`) |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key (for our workflows) |
| `N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS` | Recommended | `true` (already in Dockerfile) |
| `N8N_RUNNERS_ENABLED` | Recommended | `true` (already in Dockerfile) |
| `DB_TYPE` | Optional | `postgresdb` for PostgreSQL |
| `DB_POSTGRESDB_*` | Optional | PostgreSQL connection (see official docs) |
| `N8N_BASIC_AUTH_USER` | Optional | Basic auth username |
| `N8N_BASIC_AUTH_PASSWORD` | Optional | Basic auth password |

## 🔐 Generate Encryption Key

```bash
openssl rand -base64 32
```

## 📁 Workflow Files

- `workflows/main-chat-workflow.json` - Main chat endpoint with Gemini + MCP
- `workflows/intent-classification-workflow.json` - Intent routing workflow
- `workflows/profile-memory-workflow.json` - User profile management
- `workflows/content-generation-workflow.json` - Content generation workflow

## 🔗 MCP Server URLs

Update these in workflow nodes:
- Intent Classification: `https://intent-classification-mcp.up.railway.app/mcp`
- Tips: `https://tips-mcp.up.railway.app/mcp`
- Content: `https://content-mcp.up.railway.app/mcp`
- Profile Memory: `https://profile-memory-mcp.up.railway.app/mcp`
- Guardrails: `https://guardrails-mcp.up.railway.app/mcp`
- Traduora: `https://traduora-mcp.up.railway.app/mcp`
- AgriVision: `https://agrivision-mcp.up.railway.app/mcp`
- Weather API: `https://weatherapi-mcp.up.railway.app/mcp`

