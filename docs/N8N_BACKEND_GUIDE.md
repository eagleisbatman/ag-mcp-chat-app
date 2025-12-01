# n8n Backend Implementation Guide
## Building Chat Backend with n8n Workflows + Google Gemini 2.5 Pro

**Yes, you can implement the entire backend using n8n workflows!** This guide shows you how.

---

## 🎯 Why n8n?

### Advantages:
- ✅ **Visual Workflow Builder** - No code required, drag-and-drop interface
- ✅ **Native Gemini Integration** - Built-in Google Gemini Chat Model node
- ✅ **HTTP Webhooks** - Create REST API endpoints easily
- ✅ **MCP Server Calls** - HTTP Request nodes for calling MCP servers
- ✅ **PostgreSQL Support** - Built-in database nodes
- ✅ **Easy Iteration** - Modify workflows visually without redeploying
- ✅ **Railway Compatible** - Can be self-hosted on Railway
- ✅ **Cost Effective** - Self-hosted = no per-workflow costs

### Trade-offs:
- ⚠️ **Function Calling** - Gemini function calling may need custom HTTP nodes
- ⚠️ **Complex Logic** - Some complex routing might be easier in code
- ⚠️ **Debugging** - Visual debugging vs. code debugging

---

## 📋 Workflow Architecture

```
Webhook (POST /api/chat)
  ↓
Extract Message & Location
  ↓
Detect Region (If/Else)
  ↓
Get MCP Servers for Region
  ↓
Call Gemini with MCP Tools
  ↓
Execute MCP Tool Calls (if needed)
  ↓
Format Response
  ↓
Return JSON
```

---

## 🚀 Step-by-Step Setup

### Step 1: Install n8n

**Option A: Self-Hosted (Recommended)**
```bash
# Using Docker
docker run -it --rm \
  --name n8n \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n

# Or using npm
npm install n8n -g
n8n start
```

**Option B: n8n Cloud**
- Sign up at https://n8n.io
- Create new workflow

### Step 2: Create Webhook Endpoint

1. **Add Webhook Node**
   - Drag "Webhook" node to canvas
   - Configure:
     - **HTTP Method:** POST
     - **Path:** `/api/chat`
     - **Response Mode:** Respond to Webhook
     - **Response Code:** 200

2. **Add Extract Node** (to parse request body)
   - Drag "Set" node after Webhook
   - Map fields:
     ```
     message = {{ $json.body.message }}
     device_id = {{ $json.body.device_id }}
     latitude = {{ $json.body.latitude }}
     longitude = {{ $json.body.longitude }}
     ```

### Step 3: Region Detection

1. **Add Code Node** (for region detection)
   - Drag "Code" node
   - **Mode:** Run Once for All Items
   - **Code:**
   ```javascript
   const lat = parseFloat($input.item.json.latitude) || -1.2864;
   const lon = parseFloat($input.item.json.longitude) || 36.8172;
   
   let region = 'global';
   
   // Ethiopia bounds
   if (lat >= 3.0 && lat <= 15.0 && lon >= 32.0 && lon <= 48.0) {
     region = 'ethiopia';
   }
   // East Africa bounds
   else if (lat >= -12.0 && lat <= 18.0 && lon >= 29.0 && lon <= 52.0) {
     region = 'east-africa';
   }
   
   return {
     json: {
       ...$input.item.json,
       region: region,
       latitude: lat,
       longitude: lon
     }
   };
   ```

### Step 4: Get MCP Servers for Region

1. **Add Switch Node** (route by region)
   - Drag "Switch" node
   - **Mode:** Rules
   - **Rules:**
     - Rule 1: `{{ $json.region }}` equals `ethiopia`
     - Rule 2: `{{ $json.region }}` equals `east-africa`
     - Rule 3: Default (global)

2. **Add Set Nodes** (one per region branch)
   - **Ethiopia Branch:**
     ```json
     {
       "mcp_servers": [
         {
           "name": "SSFR MCP",
           "url": "https://ssfr-mcp.up.railway.app/mcp",
           "tools": ["get_fertilizer_recommendation", "get_crop_advisory"]
         },
         {
           "name": "ISDA Soil MCP",
           "url": "https://isda-soil-mcp.up.railway.app/mcp",
           "tools": ["get_isda_soil_properties"]
         },
         {
           "name": "AgriVision MCP",
           "url": "https://agrivision-mcp.up.railway.app/mcp",
           "tools": ["diagnose_plant_health"]
         },
         {
           "name": "AccuWeather MCP",
           "url": "https://accuweather-mcp.up.railway.app/mcp",
           "tools": ["get_accuweather_weather_forecast"]
         }
       ]
     }
     ```
   
   - **East Africa Branch:** (similar, with GAP Weather MCP)
   - **Global Branch:** (default servers)

### Step 5: Call Google Gemini

1. **Add Google Gemini Chat Model Node**
   - Drag "Google Gemini Chat Model" node
   - **Credential:** Create new Google AI API credential
     - Get API key: https://makersuite.google.com/app/apikey
   - **Model:** `gemini-2.0-flash-exp` or `gemini-1.5-pro`
   - **Prompt:** 
     ```
     You are a helpful farming assistant for farmers in {{ $json.region }} region.
     
     User message: {{ $json.message }}
     
     You have access to these MCP tools:
     {{ $json.mcp_servers }}
     
     If the user asks about weather, soil, crops, or plant health, use the appropriate MCP tools.
     Keep responses SHORT and farmer-friendly (2-4 sentences).
     Respond in the same language the user uses.
     ```
   - **Options:**
     - Temperature: 0.7
     - Max Tokens: 1000

### Step 6: Check for Function Calls

1. **Add Code Node** (parse Gemini response)
   - **Code:**
   ```javascript
   const response = $input.item.json;
   const text = response.text || '';
   
   // Check if Gemini wants to call MCP tools
   // (This depends on Gemini's function calling format)
   // For now, we'll route based on message content
   
   const message = $('Extract').item.json.message.toLowerCase();
   let toolToCall = null;
   let toolName = null;
   
   if (message.includes('weather') || message.includes('forecast')) {
     toolToCall = $('Get MCP Servers').item.json.mcp_servers.find(s => 
       s.tools.some(t => t.includes('weather'))
     );
     toolName = toolToCall?.tools.find(t => t.includes('weather'));
   } else if (message.includes('soil')) {
     toolToCall = $('Get MCP Servers').item.json.mcp_servers.find(s => 
       s.tools.some(t => t.includes('soil'))
     );
     toolName = toolToCall?.tools.find(t => t.includes('soil'));
   }
   // ... more conditions
   
   return {
     json: {
       ...$('Extract').item.json,
       gemini_response: text,
       tool_to_call: toolToCall,
       tool_name: toolName,
       needs_mcp_call: !!toolToCall
     }
   };
   ```

### Step 7: Call MCP Server (if needed)

1. **Add If Node** (check if MCP call needed)
   - Condition: `{{ $json.needs_mcp_call }}` equals `true`

2. **Add HTTP Request Node** (call MCP server)
   - **Method:** POST
   - **URL:** `{{ $json.tool_to_call.url }}`
   - **Headers:**
     ```
     Content-Type: application/json
     X-Farm-Latitude: {{ $json.latitude }}
     X-Farm-Longitude: {{ $json.longitude }}
     ```
   - **Body:**
     ```json
     {
       "jsonrpc": "2.0",
       "id": "{{ $now }}",
       "method": "tools/call",
       "params": {
         "name": "{{ $json.tool_name }}",
         "arguments": {
           "latitude": {{ $json.latitude }},
           "longitude": {{ $json.longitude }}
         }
       }
     }
     ```

3. **Add Code Node** (format MCP response)
   - Extract text from MCP response
   - Combine with Gemini response

### Step 8: Format Final Response

1. **Add Set Node** (format response)
   - **Fields:**
     ```
     response = {{ $json.gemini_response }}
     region = {{ $json.region }}
     mcp_server = {{ $json.tool_to_call.name }}
     tool_used = {{ $json.tool_name }}
     coordinates = {
       "latitude": {{ $json.latitude }},
       "longitude": {{ $json.longitude }}
     }
     ```

2. **Connect to Webhook Response**
   - Webhook node automatically returns last node's output

---

## 🔧 Advanced: Gemini Function Calling

**Challenge:** n8n's Gemini node may not support function calling directly.

**Solution:** Use HTTP Request node to call Gemini API directly:

1. **Add HTTP Request Node** (call Gemini API)
   - **Method:** POST
   - **URL:** `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key={{ $env.GEMINI_API_KEY }}`
   - **Headers:**
     ```
     Content-Type: application/json
     ```
   - **Body:**
     ```json
     {
       "contents": [{
         "role": "user",
         "parts": [{
           "text": "{{ $json.message }}"
         }]
       }],
       "tools": [{
         "functionDeclarations": [
           {
             "name": "get_weather_forecast",
             "description": "Get weather forecast",
             "parameters": {
               "type": "object",
               "properties": {
                 "latitude": {"type": "number"},
                 "longitude": {"type": "number"}
               }
             }
           }
         ]
       }]
     }
     ```

2. **Parse Function Calls** from Gemini response
3. **Execute MCP Calls** based on function calls
4. **Send Results Back** to Gemini for final response

---

## 💾 Database Integration (Optional)

### Store User Location

1. **Add PostgreSQL Node** (after region detection)
   - **Operation:** Insert
   - **Table:** `user_preferences`
   - **Columns:**
     ```
     device_id = {{ $json.device_id }}
     latitude = {{ $json.latitude }}
     longitude = {{ $json.longitude }}
     region = {{ $json.region }}
     updated_at = {{ $now }}
     ```
   - **On Conflict:** Update

### Retrieve User Location

1. **Add PostgreSQL Node** (before region detection)
   - **Operation:** Execute Query
   - **Query:**
     ```sql
     SELECT * FROM user_preferences 
     WHERE device_id = $1
     ```
   - **Parameters:** `{{ $json.device_id }}`

---

## 🚂 Railway Deployment

### Option 1: Self-Hosted n8n on Railway

1. **Create Railway Project**
   ```bash
   railway init
   ```

2. **Add Dockerfile:**
   ```dockerfile
   FROM n8nio/n8n:latest
   ENV N8N_HOST=0.0.0.0
   ENV N8N_PORT=5678
   ENV WEBHOOK_URL=https://your-app.railway.app
   ```

3. **Set Environment Variables:**
   ```
   GEMINI_API_KEY=your_key
   DATABASE_URL=postgresql://...
   N8N_ENCRYPTION_KEY=your_encryption_key
   ```

4. **Deploy:**
   ```bash
   railway up
   ```

### Option 2: Export Workflow JSON

1. **Export Workflow** from n8n UI
2. **Import** into n8n Cloud or self-hosted instance
3. **Configure** credentials
4. **Activate** workflow

---

## 📊 Workflow JSON Example

```json
{
  "name": "ag-mcp-chat-backend",
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "api/chat",
        "responseMode": "responseNode"
      },
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "position": [250, 300]
    },
    {
      "parameters": {
        "values": {
          "string": [
            {
              "name": "message",
              "value": "={{ $json.body.message }}"
            },
            {
              "name": "device_id",
              "value": "={{ $json.body.device_id }}"
            },
            {
              "name": "latitude",
              "value": "={{ $json.body.latitude }}"
            },
            {
              "name": "longitude",
              "value": "={{ $json.body.longitude }}"
            }
          ]
        }
      },
      "name": "Extract",
      "type": "n8n-nodes-base.set",
      "position": [450, 300]
    }
    // ... more nodes
  ],
  "connections": {
    "Webhook": {
      "main": [[{"node": "Extract", "type": "main", "index": 0}]]
    }
    // ... more connections
  }
}
```

---

## ✅ Advantages of n8n Approach

1. **Visual Development** - See entire flow at a glance
2. **Easy Modifications** - Change logic without code
3. **Built-in Integrations** - Gemini, PostgreSQL, HTTP all built-in
4. **Version Control** - Export workflows as JSON
5. **Testing** - Test individual nodes in UI
6. **Monitoring** - Built-in execution logs

---

## ⚠️ Limitations & Workarounds

### Limitation 1: Gemini Function Calling
**Issue:** n8n Gemini node may not support function calling
**Workaround:** Use HTTP Request node to call Gemini API directly

### Limitation 2: Complex Logic
**Issue:** Complex routing logic can get messy visually
**Workaround:** Use Code nodes for complex logic

### Limitation 3: Performance
**Issue:** Visual workflows may be slower than code
**Workaround:** Optimize node order, use parallel execution

---

## 🎯 Recommendation

**Use n8n if:**
- ✅ You prefer visual development
- ✅ You want easy iteration
- ✅ You're comfortable with workflow tools
- ✅ You need quick prototyping

**Use Express.js if:**
- ✅ You need complex function calling logic
- ✅ You want maximum performance
- ✅ You prefer code-based development
- ✅ You need advanced error handling

---

## 📚 Resources

- **n8n Docs:** https://docs.n8n.io
- **Google Gemini Node:** https://n8n.io/integrations/google-gemini-chat-model
- **n8n Self-Hosting:** https://docs.n8n.io/hosting/installation
- **Railway Deployment:** https://docs.railway.app

---

**Next Steps:**
1. Install n8n (self-hosted or cloud)
2. Create workflow following steps above
3. Test with sample messages
4. Deploy to Railway
5. Connect frontend to n8n webhook URL

