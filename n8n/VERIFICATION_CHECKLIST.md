# n8n + PostgreSQL Setup Verification Checklist

## ✅ Quick Verification Steps

### 1. Check n8n is Accessible

**Test:** Open in browser
- **URL:** `https://ag-mcp-app.up.railway.app`
- **Expected:** n8n login/setup page should load
- **Status:** [ ] Working / [ ] Not Working

**If not working:**
- Check Railway logs: Dashboard → n8n Service → Deployments → View Logs
- Look for errors or connection issues

---

### 2. Verify Environment Variables

**Go to:** Railway Dashboard → n8n Service → **Variables** tab

**Required Variables (Check all):**
- [ ] `N8N_ENCRYPTION_KEY` = `cc229a1973037f8644ac61046cb175ac` (32 chars)
- [ ] `WEBHOOK_URL` = `https://ag-mcp-app.up.railway.app`
- [ ] `GEMINI_API_KEY` = (your key, should be set)

**PostgreSQL Variables (Check all):**
- [ ] `DB_TYPE` = `postgresdb`
- [ ] `DB_POSTGRESDB_HOST` = `${{Postgres.POSTGRES_HOST}}` (or actual host)
- [ ] `DB_POSTGRESDB_PORT` = `${{Postgres.POSTGRES_PORT}}` (or `5432`)
- [ ] `DB_POSTGRESDB_DATABASE` = `${{Postgres.POSTGRES_DATABASE}}` (or actual db name)
- [ ] `DB_POSTGRESDB_USER` = `${{Postgres.POSTGRES_USER}}` (or actual user)
- [ ] `DB_POSTGRESDB_PASSWORD` = `${{Postgres.POSTGRES_PASSWORD}}` (or actual password)
- [ ] `DB_POSTGRESDB_SCHEMA` = `public`

**Optional but Recommended:**
- [ ] `GENERIC_TIMEZONE` = `America/New_York` (or your timezone)
- [ ] `TZ` = `America/New_York` (same as GENERIC_TIMEZONE)
- [ ] `N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS` = `true`
- [ ] `N8N_RUNNERS_ENABLED` = `true`

---

### 3. Check Railway Logs

**Go to:** Railway Dashboard → n8n Service → **Deployments** → Click latest → **View Logs**

**Look for these SUCCESS messages:**
- ✅ `"Database connection established"`
- ✅ `"Connected to PostgreSQL database"`
- ✅ `"n8n ready on 0.0.0.0:5678"`
- ✅ `"Server started"`

**Watch out for these ERROR messages:**
- ❌ `"Database connection failed"`
- ❌ `"Cannot connect to PostgreSQL"`
- ❌ `"Authentication failed"`
- ❌ `"Host not found"`

**Share logs if you see errors!**

---

### 4. Test PostgreSQL Connection

**Option A: Check n8n Logs (Easiest)**
- If n8n starts successfully, PostgreSQL is connected!
- Look for: `"Database connection established"` in logs

**Option B: Test from Railway PostgreSQL Service**
- Railway Dashboard → PostgreSQL Service → **Data** tab
- Should show database tables (if n8n has created them)
- Or use Railway's built-in PostgreSQL query tool

**Option C: Test Connection Manually**
- Railway Dashboard → PostgreSQL Service → **Connect** tab
- Railway provides connection string
- Use Railway's built-in query tool to test

---

### 5. Test n8n Functionality

**After accessing n8n UI:**

1. **Create Account (if first time):**
   - [ ] Can create admin account
   - [ ] Can login successfully

2. **Create Test Workflow:**
   - [ ] Can create new workflow
   - [ ] Can add nodes
   - [ ] Can save workflow
   - [ ] Workflow persists after refresh

3. **Check Database Tables (if PostgreSQL connected):**
   - Railway Dashboard → PostgreSQL Service → **Data** tab
   - Should see tables like:
     - `workflow_entity`
     - `execution_entity`
     - `credentials_entity`
     - `settings` (if created)

---

### 6. Verify PostgreSQL Service

**Go to:** Railway Dashboard → PostgreSQL Service

**Check:**
- [ ] Service is running (green status)
- [ ] Has connection variables set
- [ ] Can see connection details in **Variables** tab

**PostgreSQL Variables (should be auto-generated):**
- `POSTGRES_HOST`
- `POSTGRES_PORT`
- `POSTGRES_DATABASE`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`

---

## 🔍 Common Issues & Fixes

### Issue: n8n not accessible
**Fix:**
- Check Railway logs for errors
- Verify `WEBHOOK_URL` matches your domain
- Ensure service is deployed (not paused)

### Issue: PostgreSQL connection failed
**Fix:**
- Verify PostgreSQL service is running
- Check DB variables use correct Railway references: `${{Postgres.*}}`
- Or use actual values from PostgreSQL service variables
- Ensure `DB_TYPE=postgresdb` is set

### Issue: Can't save workflows
**Fix:**
- Check PostgreSQL connection in logs
- Verify all DB variables are set correctly
- Check Railway logs for database errors

---

## 📋 Quick Test Commands

### Test n8n Health Endpoint
```bash
curl https://ag-mcp-app.up.railway.app/healthz
```
**Expected:** `200 OK` response

### Test n8n Webhook (if workflow is active)
```bash
curl -X POST https://ag-mcp-app.up.railway.app/webhook/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "userId": "test-123"}'
```

---

## ✅ Success Criteria

Your setup is working if:
- ✅ n8n UI loads at `https://ag-mcp-app.up.railway.app`
- ✅ Can create/login to account
- ✅ Can create and save workflows
- ✅ Logs show "Database connection established"
- ✅ PostgreSQL tables are created (check PostgreSQL Data tab)

---

## 🆘 Need Help?

**Share these details:**
1. Railway logs (n8n service)
2. Environment variables (screenshot or list)
3. Any error messages
4. What happens when you access n8n URL

