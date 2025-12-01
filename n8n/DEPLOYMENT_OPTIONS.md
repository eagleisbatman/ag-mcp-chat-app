# n8n Deployment Options on Railway

## ✅ Option 1: Railway Web Dashboard (No CLI)

**Simplest approach** - Use Railway's web dashboard, no CLI needed.

**Official Documentation:** https://docs.n8n.io/hosting/installation/docker/

### Setup:

1. **Create Railway Project (Web Dashboard):**
   - Go to https://railway.app
   - Click **"New Project"**
   - Choose **"Deploy from GitHub repo"**
   - Connect GitHub → Select `GAP_PROTOTYPE` repo
   - Select folder: `ag-mcp-chat-app/n8n`
   - Railway auto-detects Dockerfile

2. **Set Environment Variables (Dashboard):**
   - Click your service → **"Variables"** tab
   - Click **"New Variable"** for each:
     ```
     N8N_ENCRYPTION_KEY = <generate-32-char-key>
     WEBHOOK_URL = https://your-app.railway.app (get after deploy)
     GEMINI_API_KEY = your_gemini_key
     GENERIC_TIMEZONE = America/New_York
     TZ = America/New_York
     ```
   - Generate key: https://www.random.org/strings/ (32 characters)

3. **Deploy:**
   - Railway auto-deploys on GitHub push
   - Or click **"Deploy"** button

4. **Get Public URL:**
   - Railway shows URL after deployment
   - Copy and update `WEBHOOK_URL` variable

**That's it!** Railway pulls the official image and runs it.

**Note:** Dockerfile includes official recommended settings:
- `N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true`
- `N8N_RUNNERS_ENABLED=true`

---

## ✅ Option 2: Nixpacks (No Dockerfile Needed)

**Even simpler** - Let Railway auto-detect and build n8n.

### Setup:

1. **Use `railway-nixpacks.json` instead:**
   ```bash
   cp railway-nixpacks.json railway.json
   ```

2. **Create `package.json` in n8n folder:**
   ```json
   {
     "name": "n8n-instance",
     "version": "1.0.0",
     "scripts": {
       "start": "npx n8n start"
     },
     "dependencies": {
       "n8n": "latest"
     }
   }
   ```

3. **Railway will:**
   - Auto-detect Node.js
   - Install n8n via npm
   - Run `npx n8n start`

---

## ✅ Option 3: Direct Docker Command (Local Testing)

**For local testing before Railway** - Per [official n8n Docker docs](https://docs.n8n.io/hosting/installation/docker/):

```bash
# Create volume for data persistence
docker volume create n8n_data

# Run n8n with official recommended settings
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -e GENERIC_TIMEZONE="America/New_York" \
  -e TZ="America/New_York" \
  -e N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true \
  -e N8N_RUNNERS_ENABLED=true \
  -e N8N_ENCRYPTION_KEY=your-key \
  -e WEBHOOK_URL=http://localhost:5678 \
  -e GEMINI_API_KEY=your-key \
  -v n8n_data:/home/node/.n8n \
  docker.n8n.io/n8nio/n8n
```

Access at: http://localhost:5678

**Or use Docker Compose:**
```bash
# Copy .env.example to .env and fill in values
cp .env.example .env

# Start n8n
docker compose up -d

# View logs
docker compose logs -f n8n
```

---

## ✅ Option 4: Railway One-Click Deploy

**Simplest of all** - Use Railway's template:

1. Go to Railway dashboard
2. Click "New Project"
3. Select "Deploy from GitHub"
4. Choose "n8n" template (if available)
5. Set environment variables
6. Deploy!

---

## 🎯 Recommended: Option 1 (Docker)

**Why Docker?**
- ✅ Official image maintained by n8n team
- ✅ Always up-to-date
- ✅ Production-ready
- ✅ Works perfectly on Railway
- ✅ No build time needed

**Our Dockerfile is minimal** - it just sets environment variables. Railway will:
1. Pull `docker.n8n.io/n8nio/n8n:latest`
2. Run it with your env vars
3. Expose port 5678

---

## 📚 Official n8n Resources

- **GitHub:** https://github.com/n8n-io/n8n
- **Docker Installation Docs:** https://docs.n8n.io/hosting/installation/docker/
- **Official Image:** `docker.n8n.io/n8nio/n8n:latest`
- **Docker Hub:** https://hub.docker.com/r/n8nio/n8n
- **n8n Hosting Repository:** https://github.com/n8n-io/n8n-hosting (Docker Compose examples)

---

## 🔧 Environment Variables Reference

All options use the same environment variables (per [official docs](https://docs.n8n.io/hosting/installation/docker/)):

| Variable | Required | Description |
|----------|----------|-------------|
| `N8N_ENCRYPTION_KEY` | ✅ | 32+ char random key (generate with `openssl rand -base64 32`) |
| `WEBHOOK_URL` | ✅ | Your Railway public URL |
| `GENERIC_TIMEZONE` | ✅ | Timezone for schedule nodes (e.g., `America/New_York`) |
| `TZ` | ✅ | System timezone (same as `GENERIC_TIMEZONE`) |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key (for our workflows) |
| `N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS` | Recommended | `true` (security, already in Dockerfile) |
| `N8N_RUNNERS_ENABLED` | Recommended | `true` (task execution, already in Dockerfile) |
| `DB_TYPE` | Optional | `postgresdb` for PostgreSQL |
| `DB_POSTGRESDB_*` | Optional | PostgreSQL connection details (see official docs) |
| `N8N_BASIC_AUTH_USER` | Optional | Basic auth username |
| `N8N_BASIC_AUTH_PASSWORD` | Optional | Basic auth password |
| `N8N_HOST` | Auto-set | `0.0.0.0` |
| `N8N_PORT` | Auto-set | `5678` |

---

## 🚀 Quick Start (Web Dashboard - No CLI)

### Step 1: Deploy to Railway

1. Go to https://railway.app
2. Click **"New Project"** → **"Deploy from GitHub repo"**
3. Select your `GAP_PROTOTYPE` repository
4. Select folder: `ag-mcp-chat-app/n8n`
5. Railway auto-detects Dockerfile and starts deploying

### Step 2: Set Environment Variables

1. Click on your service in Railway dashboard
2. Go to **"Variables"** tab
3. Click **"New Variable"** and add:

   | Variable | Value | How to Get |
   |----------|-------|------------|
   | `N8N_ENCRYPTION_KEY` | 32-char random string | Generate: https://www.random.org/strings/ |
   | `WEBHOOK_URL` | `https://your-app.railway.app` | Copy from Railway after deploy |
   | `GEMINI_API_KEY` | Your Gemini API key | From https://makersuite.google.com/app/apikey |
   | `GENERIC_TIMEZONE` | `America/New_York` | Your timezone |
   | `TZ` | `America/New_York` | Same as GENERIC_TIMEZONE |

### Step 3: Access n8n

1. Railway shows public URL after deployment
2. Open URL in browser
3. Create admin account (first user)
4. Import workflows from `workflows/` folder

---

**The Dockerfile we created is just a thin wrapper** - it uses the official image and sets Railway-specific environment variables. You're using the official n8n Docker image! 🎉

