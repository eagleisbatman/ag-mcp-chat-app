# Check Logs for ag-mcp-mobile-app Service

## 🔍 Your Service is Deployed!

**Service Name:** `ag-mcp-mobile-app`  
**Status:** Deployed 5 minutes ago ✅  
**But:** Still getting HTTP 502 (not responding)

---

## 📍 How to Check Logs

### Step 1: Access Service Logs

1. **Railway Dashboard** → Your Project
2. Click on **`ag-mcp-mobile-app`** service (the one with Docker icon)
3. You should see tabs: **"Deployments"**, **"Logs"**, **"Metrics"**, **"Settings"**

### Step 2: Check Logs Tab

**Option A: Real-time Logs**
- Click **"Logs"** tab
- Should show live logs from the container
- Look for errors or startup messages

**Option B: Deployment Logs**
- Click **"Deployments"** tab
- Click on the **latest deployment** (5 minutes ago)
- Click **"View Logs"** or **"Logs"** button

---

## 🔍 What to Look For in Logs

### Good Signs:
```
[info] Starting n8n...
[info] Database connection established
[info] Connected to PostgreSQL database
[info] n8n ready on 0.0.0.0:5678
[info] Server started
```

### Bad Signs (Common Errors):
```
[error] Cannot connect to database
[error] Database authentication failed
[error] N8N_ENCRYPTION_KEY is required
[error] Port 5678 already in use
[error] Container exited with code 1
```

---

## 🚨 Common Issues & Fixes

### Issue 1: PostgreSQL Connection Failed

**Error in logs:** `"Cannot connect to PostgreSQL"` or `"Database authentication failed"`

**Fix:**
1. Check PostgreSQL service is running (green status)
2. Verify DB variables use Railway references:
   ```
   DB_POSTGRESDB_HOST=${{Postgres.POSTGRES_HOST}}
   ```
3. Or use actual values from PostgreSQL Variables tab

### Issue 2: Missing Encryption Key

**Error in logs:** `"N8N_ENCRYPTION_KEY is required"`

**Fix:**
1. Railway Dashboard → `ag-mcp-mobile-app` → **Variables**
2. Verify `N8N_ENCRYPTION_KEY` is set
3. If missing, add: `cc229a1973037f8644ac61046cb175ac`
4. Redeploy

### Issue 3: Port Not Configured

**Error in logs:** `"Port already in use"` or `"Cannot bind to port"`

**Fix:**
1. Railway Dashboard → `ag-mcp-mobile-app` → **Settings**
2. Check **Port** is set to `5678`
3. Or add variable: `PORT=5678`

### Issue 4: Container Crashes Immediately

**Error in logs:** `"Container exited"` or no logs at all

**Fix:**
- Check all required environment variables are set
- Verify Docker image: `n8nio/n8n:latest`
- Check PostgreSQL connection variables

---

## 📋 Quick Checklist

**Before checking logs, verify:**

- [ ] Service `ag-mcp-mobile-app` exists
- [ ] Service shows green/active status
- [ ] Docker image: `n8nio/n8n:latest` ✅ (you confirmed)
- [ ] Port: `5678` (check Settings)
- [ ] All environment variables set ✅ (you confirmed)

---

## 🆘 If You Still Don't See Logs

**Try these:**

1. **Refresh the page** - Sometimes logs don't load immediately
2. **Click "Redeploy"** - Railway Dashboard → `ag-mcp-mobile-app` → **Redeploy**
3. **Check different tabs** - Try "Logs", "Deployments", "Metrics"
4. **Wait 1-2 minutes** - Logs might take time to appear after deployment

---

## 📸 What to Share

**Please share:**
1. **Last 30-50 lines of logs** from `ag-mcp-mobile-app` service
2. **Any error messages** you see
3. **Service Settings** - Port configuration
4. **Deployment status** - Does it show "Success" or "Failed"?

---

## 🚀 Next Steps

1. **Check logs** (see steps above)
2. **Copy error messages** from logs
3. **Share with me** - I'll help fix it!

The logs will tell us exactly why n8n isn't starting! 🔍

