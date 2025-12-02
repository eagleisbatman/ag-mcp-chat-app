# Railway Deployment Troubleshooting

## Issue: Dockerfile Not Found

**Error:** `Dockerfile 'Dockerfile' does not exist`

### Solution 1: Verify Folder Selection in Railway

When deploying from GitHub:
1. Make sure you selected the **`n8n`** folder (not root)
2. Railway should set the **Root Directory** to `n8n`
3. The Dockerfile should be at `n8n/Dockerfile` (relative to repo root)

### Solution 2: Check Railway Service Settings

1. Go to Railway dashboard
2. Click on your service
3. Go to **Settings** tab
4. Check **Root Directory** - should be `n8n`
5. If not set, change it to `n8n`

### Solution 3: Verify Dockerfile Exists

The Dockerfile should be at:
- Repository path: `n8n/Dockerfile`
- When Railway deploys from `n8n` folder, it looks for `Dockerfile` in that folder

### Solution 4: Use Nixpacks Instead

If Dockerfile continues to cause issues, use Nixpacks:

1. In Railway dashboard → Service → Settings
2. Change **Builder** to **Nixpacks**
3. Or use `railway-nixpacks.json`:
   ```bash
   # Rename file
   mv n8n/railway-nixpacks.json n8n/railway.json
   ```

### Solution 5: Manual Dockerfile Path

If Railway still can't find it:
1. In Railway dashboard → Service → Settings
2. Set **Dockerfile Path** to `./Dockerfile` or `Dockerfile`
3. Make sure **Root Directory** is `n8n`

---

## Common Issues

### Issue: Wrong Root Directory

**Symptom:** Railway looks for files in wrong location

**Fix:**
- Set Root Directory to `n8n` in Railway settings
- Or deploy entire repo and use `n8n/Dockerfile` as path

### Issue: Railway.json Not Recognized

**Symptom:** Railway ignores railway.json settings

**Fix:**
- Make sure `railway.json` is in the `n8n/` folder
- Verify JSON syntax is valid (no comments)
- Railway reads `railway.json` from root directory

### Issue: Build Fails

**Symptom:** Build process fails

**Fix:**
- Check Railway build logs
- Verify Dockerfile syntax
- Check environment variables are set

---

## Quick Fix Checklist

- [ ] Root Directory set to `n8n` in Railway
- [ ] Dockerfile exists at `n8n/Dockerfile`
- [ ] railway.json is valid JSON (no comments)
- [ ] Environment variables are set
- [ ] Service is connected to GitHub repo

---

## Alternative: Deploy Without railway.json

If railway.json causes issues:

1. Remove `railway.json` temporarily
2. Railway will auto-detect Dockerfile
3. Configure settings manually in Railway dashboard:
   - Builder: Dockerfile
   - Root Directory: `n8n`
   - Healthcheck: `/healthz`

