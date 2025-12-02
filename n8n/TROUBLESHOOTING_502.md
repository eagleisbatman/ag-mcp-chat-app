# Troubleshooting HTTP 502 Error

## 🔴 Current Status: HTTP 502 - Application Failed to Respond

This means Railway can't reach your n8n container. Let's fix it!

---

## 🔍 Step 1: Check Railway Logs

**Go to:** Railway Dashboard → n8n Service → **Deployments** → Click latest deployment → **View Logs**

**Look for:**
- ❌ Database connection errors
- ❌ Missing environment variables
- ❌ Port binding errors
- ❌ Container crash errors

**Share the logs with me so I can help diagnose!**

---

## 🔧 Step 2: Common Fixes

### Fix 1: Missing N8N_ENCRYPTION_KEY

**Error in logs:** `"N8N_ENCRYPTION_KEY is required"`

**Fix:**
1. Railway Dashboard → n8n Service → **Variables**
2. Add: `N8N_ENCRYPTION_KEY` = `cc229a1973037f8644ac61046cb175ac`
3. Redeploy service

---

### Fix 2: PostgreSQL Connection Failed

**Error in logs:** `"Cannot connect to PostgreSQL"` or `"Database connection failed"`

**Check:**
1. PostgreSQL service is running (green status)
2. DB variables use Railway references correctly:
   ```
   DB_POSTGRESDB_HOST=${{Postgres.POSTGRES_HOST}}
   ```
   OR use actual values from PostgreSQL service variables

**Fix:**
- If using Railway references, ensure services are linked
- If using manual values, copy exact values from PostgreSQL Variables tab

---

### Fix 3: Port Configuration

**Error in logs:** `"Port 5678 already in use"` or `"Cannot bind to port"`

**Fix:**
1. Railway Dashboard → n8n Service → **Settings**
2. Ensure **Port** is set to `5678`
3. Or add environment variable: `PORT=5678`

---

### Fix 4: Service Not Started

**Check:**
1. Railway Dashboard → n8n Service
2. Is service status **"Active"** or **"Paused"**?
3. If paused, click **"Deploy"** or **"Restart"**

---

### Fix 5: Wrong Docker Image

**Check:**
1. Railway Dashboard → n8n Service → **Settings** → **Docker**
2. Image should be: `n8nio/n8n:latest`
3. NOT: `docker.n8n.io/n8nio/n8n:latest` (Railway can't access this)

---

## 📋 Quick Checklist

**Verify these in Railway Dashboard:**

**n8n Service:**
- [ ] Service is **Active** (not paused)
- [ ] Latest deployment shows **"Success"**
- [ ] **Port** is set to `5678`
- [ ] **Docker Image** is `n8nio/n8n:latest`

**Environment Variables (n8n Service):**
- [ ] `N8N_ENCRYPTION_KEY` is set (32 chars)
- [ ] `WEBHOOK_URL` matches your domain
- [ ] `DB_TYPE=postgresdb` (if using PostgreSQL)
- [ ] All DB variables are set correctly

**PostgreSQL Service:**
- [ ] Service is **Active**
- [ ] Has connection variables set
- [ ] n8n service can reference it

---

## 🚀 Quick Fix Steps

1. **Check Logs First** - Railway Dashboard → n8n Service → Deployments → View Logs
2. **Copy error message** - Share it with me
3. **Check Variables** - Verify all required variables are set
4. **Redeploy** - Railway Dashboard → n8n Service → **Redeploy**

---

## 📸 What to Share

To help diagnose, share:
1. **Railway logs** (last 50-100 lines)
2. **Environment variables** (screenshot or list - hide passwords!)
3. **Service status** (Active/Paused/Error)
4. **Any error messages** from logs

---

## ✅ Expected Logs (When Working)

When n8n starts successfully, you should see:
```
[info] Database connection established
[info] Connected to PostgreSQL database
[info] n8n ready on 0.0.0.0:5678
[info] Server started
```

If you see these, but still get 502, check:
- Port configuration
- Railway domain settings
- Service health checks

