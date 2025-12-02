# n8n Deployment Guide for Railway

## ⚡ SIMPLEST METHOD (Recommended)

**Skip Dockerfile complexity - Use Railway's Docker image directly:**

1. Railway Dashboard → New Project → **Empty Project**
2. Add Service → **Docker**
3. **Image:** `docker.n8n.io/n8nio/n8n:latest`
4. **Port:** `5678`
5. Set environment variables (see below)
6. **Deploy!**

**That's it!** No Dockerfile, no railway.json needed. Railway handles everything.

---

## 🚀 Step-by-Step Deployment (Web Dashboard)

### 1. Create Railway Project

**Option A: Deploy Docker Image Directly (SIMPLEST - No Dockerfile!)**
1. Go to [Railway Dashboard](https://railway.app)
2. Click **"New Project"** → **"Empty Project"**
3. Click **"Add Service"** → **"Docker"**
4. **Docker Image:** `docker.n8n.io/n8nio/n8n:latest`
5. **Port:** `5678`
6. Set environment variables (see Step 2)
7. **Deploy!**

**Option B: Deploy from GitHub (If you want to use Dockerfile)**
1. Go to [Railway Dashboard](https://railway.app)
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select repository: `eagleisbatman/ag-mcp-chat-app`
4. **IMPORTANT:** In service settings:
   - Go to **Settings** tab
   - Set **Root Directory** to: `n8n`
   - Railway will find `n8n/Dockerfile` automatically
5. Set environment variables
6. Deploy!

### 2. Set Environment Variables

In Railway dashboard, go to your service → **Variables** tab, and add:

**Required:**
```
N8N_ENCRYPTION_KEY=<generate-random-32-char-key>
WEBHOOK_URL=https://your-n8n-app.railway.app
GEMINI_API_KEY=your_gemini_api_key_here
```

**Recommended (per official n8n docs):**
```
GENERIC_TIMEZONE=America/New_York  # Your timezone
TZ=America/New_York                # System timezone (same as GENERIC_TIMEZONE)
N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true  # Already in Dockerfile
N8N_RUNNERS_ENABLED=true           # Already in Dockerfile
```

**Optional (for workflow persistence with PostgreSQL):**
```
DB_TYPE=postgresdb
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_HOST=your-postgres-host
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_USER=your-user
DB_POSTGRESDB_SCHEMA=public
DB_POSTGRESDB_PASSWORD=your-password
```

**Optional (for basic auth):**
```
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=your-secure-password
```

**Generate Encryption Key:**
- Use online tool: https://www.random.org/strings/ (32 characters)
- Or in terminal: `openssl rand -base64 32`
- Copy the generated key

**Add Variables in Railway Dashboard:**
1. Click on your service
2. Go to **"Variables"** tab
3. Click **"New Variable"**
4. Add each variable one by one:
   - `N8N_ENCRYPTION_KEY` = `<paste-generated-key>`
   - `WEBHOOK_URL` = `https://your-app.railway.app` (Railway will show this after deploy)
   - `GEMINI_API_KEY` = `your_gemini_api_key`
   - `GENERIC_TIMEZONE` = `America/New_York` (or your timezone)
   - `TZ` = `America/New_York` (same as GENERIC_TIMEZONE)

### 3. Deploy

Railway will automatically deploy when you:
- Push to GitHub (if using GitHub integration)
- Or click **"Deploy"** button in dashboard

### 4. Get Public URL

1. Railway will show a public URL after deployment
2. Copy the URL (e.g., `https://your-app.railway.app`)
3. Update `WEBHOOK_URL` variable with this URL

### 5. Access n8n

1. Go to Railway dashboard
2. Click on your service
3. Copy the public URL
4. Open in browser: `https://your-n8n-app.railway.app`

### 5. Initial Setup

1. **Create Account:**
   - First user becomes owner
   - Set username/password

2. **Configure Credentials:**
   - Go to Settings → Credentials
   - Add "Google Gemini API" credential
   - Enter your `GEMINI_API_KEY`

### 6. Import Workflows

1. **Go to Workflows** in n8n UI
2. **Click "Import from File"**
3. **Import these workflows from the repository:**
   - Download `n8n/workflows/main-chat-workflow.json` from https://github.com/eagleisbatman/ag-mcp-chat-app
   - Or clone repo and import locally:
     ```bash
     git clone https://github.com/eagleisbatman/ag-mcp-chat-app.git
     # Then import n8n/workflows/main-chat-workflow.json
     ```
   - Main workflow: `n8n/workflows/main-chat-workflow.json` - Main chat endpoint with Gemini + MCP

4. **Activate Workflows:**
   - Toggle "Active" switch on each workflow
   - Copy webhook URLs from webhook nodes

### 7. Get Webhook URL

1. In n8n UI, go to your workflow
2. Click on the **"Webhook"** node
3. Copy the **"Production URL"** (looks like: `https://your-app.railway.app/webhook/...`)
4. This is your webhook endpoint

### 8. Update Frontend

Update your frontend to use n8n webhook URL:

```javascript
const API_URL = 'https://your-n8n-app.railway.app/webhook/api/chat';
```

---

## 🔧 Configuration

### MCP Server URLs

Update MCP server URLs in workflow nodes if needed:

**Ethiopia:**
- SSFR MCP: `https://ssfr-mcp.up.railway.app/mcp`
- ISDA Soil: `https://isda-soil-mcp.up.railway.app/mcp`

**East Africa:**
- GAP Weather: `https://gap-mcp.up.railway.app/mcp`
- Decision Tree: `https://decision-tree-mcp.up.railway.app/mcp`

**Global:**
- AccuWeather: `https://accuweather-mcp.up.railway.app/mcp`
- AgriVision: `https://agrivision-mcp.up.railway.app/mcp`
- Feed Formulation: `https://feed-formulation-mcp.up.railway.app/mcp`

**nong_tri_workspace:**
- Intent Classification: `https://intent-classification-mcp.up.railway.app/mcp`
- Tips: `https://tips-mcp.up.railway.app/mcp`
- Content: `https://content-mcp.up.railway.app/mcp`
- Profile Memory: `https://profile-memory-mcp.up.railway.app/mcp`
- Guardrails: `https://guardrails-mcp.up.railway.app/mcp`
- Traduora: `https://traduora-mcp.up.railway.app/mcp`

---

## 📊 Monitoring

### View Executions

1. Go to "Executions" tab
2. See all workflow runs
3. Click to view details/logs

### Debug Workflows

1. Click workflow
2. Click "Execute Workflow"
3. Test with sample data
4. View node outputs

---

## 🔒 Security

### Enable Basic Auth

Set in Railway environment variables:
```
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=secure-password
```

### Restrict Webhook Access

1. Add authentication to webhook nodes
2. Use API keys in headers
3. Validate requests in workflow

---

## 🐛 Troubleshooting

### Workflow Not Activating

- Check all credentials are set
- Verify webhook path is correct
- Check execution logs for errors

### MCP Calls Failing

- Verify MCP server URLs are correct
- Check MCP servers are deployed
- Verify headers (X-Farm-Latitude, X-Farm-Longitude)

### Gemini Not Responding

- Check GEMINI_API_KEY is set
- Verify credential is configured in n8n
- Check API quota/limits

---

## 📚 Next Steps

1. ✅ Deploy n8n to Railway
2. ✅ Import workflows from GitHub repo
3. ✅ Configure credentials (Gemini API key)
4. ✅ Test workflows
5. ✅ Update frontend URLs
6. ✅ Monitor executions

---

## 🔗 Repository Links

- **GitHub Repository:** https://github.com/eagleisbatman/ag-mcp-chat-app
- **Workflows Location:** `n8n/workflows/`
- **Deployment Files:** `n8n/Dockerfile`, `n8n/railway.json`

---

## 📖 Additional Resources

**Need Help?**
- n8n Docs: https://docs.n8n.io
- Railway Docs: https://docs.railway.app
- Check workflow execution logs in n8n UI
- Repository Issues: https://github.com/eagleisbatman/ag-mcp-chat-app/issues

