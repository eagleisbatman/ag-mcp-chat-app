# Post-Deployment Setup Guide

## ✅ Your Deployment is Live!

**Domain:** `ag-mcp-app.up.railway.app`  
**Port:** `5678`  
**Edge:** Metal Edge ✅

---

## 🔧 Next Steps

### 1. Access n8n UI

Your n8n instance should be accessible at:
- **URL:** `https://ag-mcp-app.up.railway.app`

If you see the n8n login/setup page, you're good to go! 🎉

---

### 2. Set Environment Variables (If Not Done)

Go to Railway Dashboard → Your Service → **Variables** tab:

**Required:**
```
N8N_ENCRYPTION_KEY=<32-character-random-string>
WEBHOOK_URL=https://ag-mcp-app.up.railway.app
GEMINI_API_KEY=your_gemini_api_key_here
```

**Recommended:**
```
GENERIC_TIMEZONE=America/New_York
TZ=America/New_York
N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true
N8N_RUNNERS_ENABLED=true
```

**Generate Encryption Key:**
```bash
# Generate 32-character random string
openssl rand -hex 16
# Or use online generator: https://randomkeygen.com/
```

---

### 3. Import Workflows

1. **Access n8n:** `https://ag-mcp-app.up.railway.app`
2. **Login/Setup:** Create admin account (first time only)
3. **Import Workflows:**
   - Go to **Workflows** → **Import from File**
   - Import: `n8n/workflows/main-chat-workflow.json`
   - Or download from: https://github.com/eagleisbatman/ag-mcp-chat-app/tree/main/n8n/workflows

---

### 4. Configure Webhook URL

After importing workflows:

1. Open the **main-chat-workflow**
2. Find the **Webhook** node
3. Update the webhook URL to: `https://ag-mcp-app.up.railway.app/webhook/chat`
4. **Activate** the workflow

---

### 5. Test the Deployment

**Test Webhook:**
```bash
curl -X POST https://ag-mcp-app.up.railway.app/webhook/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, test message",
    "userId": "test-user-123"
  }'
```

**Expected Response:**
- Should return a response from Gemini AI
- Should route to appropriate MCP servers based on region/intent

---

### 6. Connect Frontend (When Ready)

Update your frontend `.env`:
```
VITE_API_URL=https://ag-mcp-app.up.railway.app
```

---

## 🔍 Troubleshooting

### n8n Not Accessible?

1. **Check Railway Logs:**
   - Railway Dashboard → Service → **Deployments** → Click latest deployment → **View Logs**

2. **Check Environment Variables:**
   - Ensure `N8N_ENCRYPTION_KEY` is set (32 characters)
   - Ensure `WEBHOOK_URL` matches your domain

3. **Check Port:**
   - Railway should auto-detect port `5678`
   - If not, set `PORT=5678` in environment variables

### Workflow Not Activating?

1. **Check Webhook URL:**
   - Should be: `https://ag-mcp-app.up.railway.app/webhook/chat`
   - Must match your Railway domain exactly

2. **Check GEMINI_API_KEY:**
   - Ensure it's set correctly
   - Test with: https://aistudio.google.com/app/apikey

---

## 📚 Useful Links

- **n8n UI:** https://ag-mcp-app.up.railway.app
- **Railway Dashboard:** https://railway.app
- **Workflows:** https://github.com/eagleisbatman/ag-mcp-chat-app/tree/main/n8n/workflows
- **MCP Servers Config:** `n8n/workflows/MCP_SERVERS_CONFIG.md`

---

## ✅ Deployment Checklist

- [ ] n8n accessible at `https://ag-mcp-app.up.railway.app`
- [ ] Environment variables set (especially `N8N_ENCRYPTION_KEY`)
- [ ] Admin account created in n8n
- [ ] Main chat workflow imported
- [ ] Webhook URL configured correctly
- [ ] Workflow activated
- [ ] Test webhook call successful
- [ ] Frontend connected (when ready)

---

**Congratulations! Your n8n backend is deployed! 🚀**

