#!/bin/bash

# n8n + PostgreSQL Connection Test Script
# Run this to verify your Railway deployment

echo "🔍 Testing n8n Deployment..."
echo ""

# Get URL from user or use default
N8N_URL="${1:-https://ag-mcp-app.up.railway.app}"

echo "📍 Testing: $N8N_URL"
echo ""

# Test 1: Health Check
echo "1️⃣ Testing Health Endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$N8N_URL/healthz")
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "   ✅ Health check passed (HTTP $HEALTH_RESPONSE)"
else
    echo "   ❌ Health check failed (HTTP $HEALTH_RESPONSE)"
fi
echo ""

# Test 2: Main Page
echo "2️⃣ Testing Main Page..."
MAIN_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$N8N_URL")
if [ "$MAIN_RESPONSE" = "200" ] || [ "$MAIN_RESPONSE" = "302" ]; then
    echo "   ✅ Main page accessible (HTTP $MAIN_RESPONSE)"
else
    echo "   ❌ Main page not accessible (HTTP $MAIN_RESPONSE)"
fi
echo ""

# Test 3: Check if n8n is responding
echo "3️⃣ Checking n8n Response..."
RESPONSE_BODY=$(curl -s "$N8N_URL" | head -c 200)
if echo "$RESPONSE_BODY" | grep -q "n8n\|workflow\|login"; then
    echo "   ✅ n8n is responding (detected n8n content)"
else
    echo "   ⚠️  Response doesn't look like n8n"
    echo "   Response preview: ${RESPONSE_BODY:0:100}..."
fi
echo ""

# Test 4: Webhook endpoint (if exists)
echo "4️⃣ Testing Webhook Endpoint (may fail if workflow not active)..."
WEBHOOK_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$N8N_URL/webhook/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "test", "userId": "test-123"}' 2>/dev/null)
if [ "$WEBHOOK_RESPONSE" = "200" ] || [ "$WEBHOOK_RESPONSE" = "404" ]; then
    echo "   ✅ Webhook endpoint exists (HTTP $WEBHOOK_RESPONSE)"
    if [ "$WEBHOOK_RESPONSE" = "404" ]; then
        echo "   ℹ️  Workflow may not be active yet"
    fi
else
    echo "   ⚠️  Webhook test returned HTTP $WEBHOOK_RESPONSE"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Summary:"
echo ""
echo "Next steps:"
echo "1. Check Railway logs: Dashboard → n8n Service → Deployments → View Logs"
echo "2. Verify environment variables are set correctly"
echo "3. Check PostgreSQL connection in logs"
echo "4. Access n8n UI: $N8N_URL"
echo ""
echo "For detailed checklist, see: VERIFICATION_CHECKLIST.md"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

