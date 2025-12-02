# Railway Deployment - NO DOCKERFILE METHOD

## ✅ The SIMPLEST Way (No Dockerfile, No Config Files)

Railway keeps looking for Dockerfile even when you don't need it. Here's how to deploy WITHOUT any Dockerfile:

### Step 1: Create Empty Project

1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Empty Project"**

### Step 2: Add Docker Service (NOT Dockerfile!)

1. Click **"Add Service"**
2. **IMPORTANT:** Select **"Docker"** (NOT "Dockerfile")
3. In the Docker service settings:
   - **Image:** `docker.n8n.io/n8nio/n8n:latest`
   - **Port:** `5678`
   - Leave everything else default

### Step 3: Set Environment Variables

Go to **Variables** tab and add:

```
N8N_ENCRYPTION_KEY=<generate-32-char-key>
WEBHOOK_URL=https://your-app.railway.app
GEMINI_API_KEY=your_gemini_api_key
GENERIC_TIMEZONE=America/New_York
TZ=America/New_York
N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=true
N8N_RUNNERS_ENABLED=true
```

### Step 4: Deploy!

Railway will:
- Pull the official n8n image
- Run it with your env vars
- No Dockerfile needed!

---

## 🚫 What NOT to Do

- ❌ Don't use "Dockerfile" builder
- ❌ Don't use railway.json files
- ❌ Don't set Root Directory
- ❌ Don't use GitHub repo deployment (causes Dockerfile issues)

---

## ✅ What TO Do

- ✅ Use "Docker" service type
- ✅ Specify image directly: `docker.n8n.io/n8nio/n8n:latest`
- ✅ Set environment variables
- ✅ Deploy!

---

## Why This Works

Railway's "Docker" service type:
- Pulls images directly from Docker Hub
- No build process needed
- No Dockerfile needed
- Just runs the container with your env vars

This is the SIMPLEST and most reliable method!

