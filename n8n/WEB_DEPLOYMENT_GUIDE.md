# n8n Deployment on Railway - Web Dashboard Guide
## No CLI Required - Everything via Web Interface

This guide shows you how to deploy n8n to Railway using only the web dashboard - no command line needed!

---

## 🎯 Prerequisites

- GitHub account (for GitHub integration)
- Railway account (free tier works)
- Google Gemini API key (for workflows)

---

## 📋 Step-by-Step Deployment

### Step 1: Prepare GitHub Repository

**If your code is already on GitHub:**
- ✅ Skip to Step 2

**If code is only local:**
1. Create GitHub repository
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Add n8n deployment"
   git remote add origin https://github.com/your-username/your-repo.git
   git push -u origin main
   ```

### Step 2: Create Railway Project

1. **Go to Railway Dashboard:**
   - Visit https://railway.app
   - Sign in (or create account)

2. **Create New Project:**
   - Click **"New Project"** button
   - Select **"Deploy from GitHub repo"**
   - Authorize Railway to access GitHub (if first time)
   - Select your repository: `GAP_PROTOTYPE`
   - Railway will scan for deployment files

3. **Select Service:**
   - Railway may auto-detect the `n8n` folder
   - Or click **"Add Service"** → **"GitHub Repo"**
   - Select folder: `ag-mcp-chat-app/n8n`
   - Railway will detect the Dockerfile

### Step 3: Configure Environment Variables

1. **Open Service Settings:**
   - Click on your service in Railway dashboard
   - Go to **"Variables"** tab

2. **Add Required Variables:**
   Click **"New Variable"** for each:

   **a) N8N_ENCRYPTION_KEY**
   - **Value:** Generate 32-character random string
   - **How:** Use https://www.random.org/strings/
     - Length: 32
     - Characters: Letters and Numbers
     - Copy the generated string

   **b) WEBHOOK_URL**
   - **Value:** `https://your-app.railway.app`
   - **Note:** Get this URL after Railway deploys (Step 4)
   - You can update this later

   **c) GEMINI_API_KEY**
   - **Value:** Your Google Gemini API key
   - **Get it:** https://makersuite.google.com/app/apikey

   **d) GENERIC_TIMEZONE**
   - **Value:** Your timezone (e.g., `America/New_York`)
   - **List:** https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

   **e) TZ**
   - **Value:** Same as GENERIC_TIMEZONE
   - Example: `America/New_York`

3. **Save Variables:**
   - Railway saves automatically
   - Variables are encrypted

### Step 4: Deploy

1. **Railway Auto-Deploys:**
   - If using GitHub integration, Railway deploys automatically
   - Watch the deployment logs in Railway dashboard

2. **Or Manual Deploy:**
   - Click **"Deploy"** button
   - Wait for build to complete

3. **Get Public URL:**
   - Railway shows public URL after deployment
   - Example: `https://your-app.up.railway.app`
   - Copy this URL

4. **Update WEBHOOK_URL:**
   - Go back to **"Variables"** tab
   - Edit `WEBHOOK_URL` variable
   - Set to your Railway public URL
   - Railway will redeploy automatically

### Step 5: Access n8n

1. **Open n8n UI:**
   - Click the public URL from Railway
   - Or copy URL from Railway dashboard

2. **Create Admin Account:**
   - First user becomes owner
   - Set username and password
   - Save credentials securely

3. **Verify Setup:**
   - You should see n8n dashboard
   - Check that workflows tab is visible

### Step 6: Import Workflows

1. **Download Workflow Files:**
   - From your repo: `ag-mcp-chat-app/n8n/workflows/`
   - Download `main-chat-workflow.json`

2. **Import in n8n:**
   - Go to **"Workflows"** tab
   - Click **"Import from File"**
   - Select `main-chat-workflow.json`
   - Workflow appears in list

3. **Configure Credentials:**
   - Click on imported workflow
   - Click on **"Call Gemini"** node
   - Click **"Credential"** dropdown
   - Click **"Create New Credential"**
   - Select **"Google Gemini API"**
   - Enter your `GEMINI_API_KEY`
   - Click **"Save"**

4. **Activate Workflow:**
   - Toggle **"Active"** switch (top right)
   - Workflow is now live

5. **Get Webhook URL:**
   - Click on **"Webhook"** node
   - Copy **"Production URL"**
   - Example: `https://your-app.railway.app/webhook/api/chat`
   - This is your API endpoint

### Step 7: Update Frontend

Update your frontend code to use the webhook URL:

```javascript
// In your frontend code
const API_URL = 'https://your-app.railway.app/webhook/api/chat';

// Example fetch
fetch(API_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: 'What is the weather?',
    device_id: 'device-123',
    latitude: -1.2864,
    longitude: 36.8172
  })
});
```

---

## 🔧 Managing Your Deployment

### View Logs

1. In Railway dashboard
2. Click on your service
3. Go to **"Deployments"** tab
4. Click on latest deployment
5. View build and runtime logs

### Update Environment Variables

1. Go to service → **"Variables"** tab
2. Click variable to edit
3. Change value
4. Railway redeploys automatically

### Restart Service

1. Go to service → **"Settings"** tab
2. Click **"Restart"** button
3. Service restarts with current config

### View Metrics

1. Go to service → **"Metrics"** tab
2. See CPU, Memory, Network usage
3. Monitor performance

---

## 🐛 Troubleshooting

### Deployment Fails

**Check:**
1. Dockerfile exists in `n8n/` folder
2. Environment variables are set
3. Check deployment logs in Railway

### n8n Not Accessible

**Check:**
1. Service is running (green status)
2. Public URL is correct
3. Port 5678 is exposed
4. Check service logs

### Workflow Not Working

**Check:**
1. Workflow is activated (toggle ON)
2. Credentials are configured
3. Webhook URL is correct
4. Check workflow execution logs in n8n

### Environment Variables Not Working

**Check:**
1. Variables are set in Railway dashboard
2. No typos in variable names
3. Values are correct (no extra spaces)
4. Service was redeployed after adding variables

---

## 📚 Next Steps

1. ✅ Deploy n8n to Railway
2. ✅ Import workflows
3. ✅ Configure credentials
4. ✅ Test webhook endpoint
5. ✅ Update frontend
6. ✅ Monitor usage

---

## 🔗 Useful Links

- **Railway Dashboard:** https://railway.app
- **n8n Official Docs:** https://docs.n8n.io/hosting/installation/docker/
- **Generate Random Key:** https://www.random.org/strings/
- **Timezone List:** https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
- **Gemini API Key:** https://makersuite.google.com/app/apikey

---

**Need Help?**
- Railway Support: Check Railway dashboard help section
- n8n Docs: https://docs.n8n.io
- n8n Forum: https://community.n8n.io

