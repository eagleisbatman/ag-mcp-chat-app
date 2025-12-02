# n8n Deployment on Railway

## 🚀 SIMPLEST DEPLOYMENT (No Dockerfile!)

**Railway keeps looking for Dockerfile? Use Railway's Docker service - NO Dockerfile needed!**

### Quick Deploy:

1. **Railway Dashboard** → **New Project** → **Empty Project**
2. **Add Service** → **"Docker"** (NOT "Dockerfile")
3. **Image:** `docker.n8n.io/n8nio/n8n:latest`
4. **Port:** `5678`
5. **Set Environment Variables:**
   - `N8N_ENCRYPTION_KEY` (generate 32-char key)
   - `WEBHOOK_URL` (get after deploy)
   - `GEMINI_API_KEY` (your Gemini key)
   - `GENERIC_TIMEZONE` = `America/New_York`
   - `TZ` = `America/New_York`
   - `N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS` = `true`
   - `N8N_RUNNERS_ENABLED` = `true`
6. **Deploy!**

**No Dockerfile, no railway.json, no complexity - just works!**

---

## 📖 Detailed Guides

- **[RAILWAY_DEPLOY_NO_DOCKERFILE.md](RAILWAY_DEPLOY_NO_DOCKERFILE.md)** - Step-by-step guide (no Dockerfile)
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Complete deployment guide
- **[WEB_DEPLOYMENT_GUIDE.md](WEB_DEPLOYMENT_GUIDE.md)** - Web dashboard guide
- **[SIMPLE_DEPLOY.md](SIMPLE_DEPLOY.md)** - Simple deployment options

---

## 🔗 Repository

- **GitHub:** https://github.com/eagleisbatman/ag-mcp-chat-app
- **Workflows:** `n8n/workflows/`

---

## ⚠️ Important

**DO NOT use:**
- ❌ "Dockerfile" builder (causes Dockerfile not found errors)
- ❌ railway.json files (they reference Dockerfile)
- ❌ GitHub repo deployment with Dockerfile

**DO use:**
- ✅ "Docker" service type
- ✅ Direct image: `docker.n8n.io/n8nio/n8n:latest`
- ✅ Environment variables only
