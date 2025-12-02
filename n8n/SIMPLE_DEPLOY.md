# Simple Railway Deployment - No Dockerfile Needed!

## 🎯 Simplest Method: Use Railway's Native Docker Support

Railway can deploy n8n directly without a custom Dockerfile. Here's the easiest way:

### Option 1: Deploy Entire Repo (Easiest)

1. **Go to Railway Dashboard:**
   - https://railway.app → New Project → Deploy from GitHub
   - Select: `eagleisbatman/ag-mcp-chat-app`

2. **Add Service:**
   - Click "Add Service" → "Dockerfile"
   - Set **Root Directory** to: `n8n`
   - Railway will find `n8n/Dockerfile` automatically

3. **Set Environment Variables:**
   - `N8N_ENCRYPTION_KEY` = (generate 32-char key)
   - `WEBHOOK_URL` = (get after deploy)
   - `GEMINI_API_KEY` = (your key)
   - `GENERIC_TIMEZONE` = `America/New_York`
   - `TZ` = `America/New_York`

4. **Deploy!**

---

## Option 2: Use Railway's One-Click Deploy (Even Easier!)

Railway can deploy n8n directly from the official Docker image:

1. **Create Empty Project:**
   - Railway Dashboard → New Project → Empty Project

2. **Add Service → Docker:**
   - Image: `n8nio/n8n:latest` (use Docker Hub - Railway can't access docker.n8n.io)
   - Port: `5678`

3. **Set Environment Variables** (same as above)

4. **Deploy!**

---

## Option 3: Remove Custom Dockerfile (Simplest!)

Since our Dockerfile only sets env vars (which Railway can do), we can:

1. **Delete the Dockerfile** (or ignore it)
2. **Use Railway's Docker Image deployment:**
   - Service → Settings → Docker
   - Image: `n8nio/n8n:latest` (use Docker Hub - Railway can't access docker.n8n.io)
   - All env vars set in Railway dashboard

This is the SIMPLEST way - no Dockerfile needed!

---

## Why This Works

Our Dockerfile only sets environment variables:
- `N8N_HOST=0.0.0.0` (Railway sets this automatically)
- `N8N_PORT=5678` (Railway sets this automatically)
- `N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true` (can be env var)
- `N8N_RUNNERS_ENABLED=true` (can be env var)

**All of these can be set as Railway environment variables instead!**

---

## Recommended: Option 3 (No Dockerfile)

1. Railway Dashboard → New Project → Empty Project
2. Add Service → Docker
3. Image: `n8nio/n8n:latest` (use Docker Hub - Railway can't access docker.n8n.io)
4. Set all environment variables in Railway
5. Deploy!

**No Dockerfile, no railway.json, no complexity - just works!**

