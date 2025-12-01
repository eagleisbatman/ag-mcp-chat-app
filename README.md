# ag-mcp Chat App
## Complete Chat Application with MCP Server Integration

**Fresh app with backend (Railway-ready) and frontend chat interface**

---

## 🎯 Features

- ✅ **Chat UI** - Beautiful, responsive chat interface
- ✅ **Google Gemini 2.5 Pro** - Powered by Gemini AI (better multilingual support)
- ✅ **GPS Location** - Automatic location detection
- ✅ **Region Detection** - Automatically detects Ethiopia, East Africa, or Global
- ✅ **MCP Integration** - Gemini function calling with MCP servers (AI-agnostic)
- ✅ **Multilingual Support** - English, Swahili, Amharic, and more
- ✅ **Location Persistence** - Stores location in database (optional)
- ✅ **Railway Ready** - Configured for Railway deployment

---

## 📁 Project Structure

```
ag-mcp-chat-app/
├── backend/
│   ├── src/
│   │   └── index.js          # Express server with MCP routing
│   ├── package.json
│   ├── railway.json          # Railway deployment config
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   │   ├── ChatInterface.jsx
│   │   │   └── LocationManager.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
└── README.md
```

---

## 🚀 Quick Start

### 1. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your configuration
npm run dev
```

Backend runs on `http://localhost:3000`

### 2. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## 🔧 Backend Configuration

### Environment Variables

Create `backend/.env`:

```bash
# Server
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Google Gemini AI (REQUIRED)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash-exp
# Options: gemini-2.0-flash-exp, gemini-1.5-pro, gemini-1.5-flash

# Database (Optional - for location persistence)
DATABASE_URL=postgresql://user:password@localhost:5432/ag_mcp_chat

# MCP Server URLs (Optional - defaults provided)
GAP_MCP_URL=https://gap-mcp.up.railway.app/mcp
SSFR_MCP_URL=https://ssfr-mcp.up.railway.app/mcp
ISDA_SOIL_MCP_URL=https://isda-soil-mcp.up.railway.app/mcp
AGRIVISION_MCP_URL=https://agrivision-mcp.up.railway.app/mcp
ACCUWEATHER_MCP_URL=https://accuweather-mcp.up.railway.app/mcp
DECISION_TREE_MCP_URL=https://decision-tree-mcp.up.railway.app/mcp
FEED_FORMULATION_MCP_URL=https://feed-formulation-mcp.up.railway.app/mcp
```

**Get Gemini API Key:** https://makersuite.google.com/app/apikey

### API Endpoints

**POST `/api/chat`**
- Send chat message (processed by Gemini 2.5 Pro)
- Body: `{ message, device_id, latitude, longitude, conversation_history?, image? }`
- Returns: `{ response, region, language, mcp_server, tool_used, coordinates }`
- **Multilingual:** Automatically detects and responds in user's language

**POST `/api/user/location`**
- Save user location
- Body: `{ device_id, latitude, longitude, country, city }`

**GET `/api/user/location/:device_id`**
- Get saved location for device

**GET `/health`**
- Health check endpoint

---

## 🌐 Frontend Configuration

### Environment Variables

Create `frontend/.env`:

```bash
VITE_API_URL=http://localhost:3000
```

For production, set to your Railway backend URL:
```bash
VITE_API_URL=https://your-backend.railway.app
```

---

## 🚂 Railway Deployment

### Backend Deployment

1. **Connect to Railway:**
   ```bash
   cd backend
   railway login
   railway init
   ```

2. **Set Environment Variables:**
   - `PORT` (auto-set by Railway)
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://your-frontend-url.com`
   - `DATABASE_URL` (if using PostgreSQL)
   - MCP server URLs (optional)

3. **Deploy:**
   ```bash
   railway up
   ```

### Frontend Deployment

Deploy to Vercel, Netlify, or Railway:

**Vercel:**
```bash
cd frontend
vercel --prod
```

**Netlify:**
```bash
cd frontend
npm run build
netlify deploy --prod --dir=dist
```

**Railway:**
```bash
cd frontend
railway init
railway up
```

---

## 🔗 MCP Server Integration

### Gemini Function Calling with MCP

**How it works:**
1. User sends message → Gemini analyzes it
2. Gemini decides which MCP tools to call (function calling)
3. Backend executes MCP tool calls
4. Gemini processes results and generates response
5. Response sent to user

**MCP servers are AI-agnostic** - they work with any AI model via MCP protocol!

### Region-Based Tool Availability

The backend provides appropriate MCP tools to Gemini based on region:

**Ethiopia:**
- SSFR MCP (fertilizer, crop advisory)
- ISDA Soil MCP (soil properties)
- AgriVision MCP (plant diagnosis)
- AccuWeather MCP (weather)

**East Africa:**
- GAP Weather MCP (weather forecast)
- ISDA Soil MCP (soil properties)
- AgriVision MCP (plant diagnosis)
- Decision Tree MCP (crop recommendations)

**Global:**
- AccuWeather MCP (weather)
- AgriVision MCP (plant diagnosis)
- Feed Formulation MCP (livestock feed)

### Message Routing Logic

The backend analyzes message content to route to appropriate tools:
- Weather queries → Weather MCP servers
- Soil queries → ISDA Soil MCP
- Fertilizer queries → SSFR MCP (Ethiopia)
- Crop queries → SSFR MCP or Decision Tree MCP
- Disease queries → AgriVision MCP
- Feed queries → Feed Formulation MCP

---

## 📱 Features

### Chat Interface
- ✅ Real-time messaging
- ✅ Typing indicators
- ✅ Message timestamps
- ✅ Responsive design (mobile + desktop)
- ✅ Location badge in header
- ✅ MCP server metadata display

### Location Management
- ✅ Automatic GPS detection
- ✅ Location caching (24 hours)
- ✅ Fallback to default location
- ✅ Location persistence in database

---

## 🧪 Testing

### Test Backend

```bash
# Health check
curl http://localhost:3000/health

# Test chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What is the weather forecast?",
    "device_id": "test-device",
    "latitude": -1.2864,
    "longitude": 36.8172
  }'
```

### Test Frontend

1. Open `http://localhost:5173`
2. Allow location access
3. Send a message like "What is the weather forecast?"
4. See response from MCP server

---

## 🔒 Security Notes

- Backend validates all inputs
- CORS configured for frontend URL
- Device IDs stored in localStorage (client-side)
- Location data optional (can work without database)

---

## 📚 Next Steps

1. **Deploy Backend to Railway**
2. **Deploy Frontend to Vercel/Netlify**
3. **Configure Environment Variables**
4. **Test End-to-End Flow**
5. **Add More Features** (voice, images, etc.)

---

## 🔄 Alternative: n8n Backend

**Want to use n8n workflows instead of Express.js?**

✅ **Yes, it's possible!** See [`docs/N8N_BACKEND_GUIDE.md`](docs/N8N_BACKEND_GUIDE.md) for complete guide.

**Benefits:**
- Visual workflow builder (no code)
- Native Gemini integration
- Easy to modify and iterate
- Can be self-hosted on Railway

**Workflow JSON:** [`n8n-workflow.json`](n8n-workflow.json) - Import this into n8n to get started!

---

## 🐛 Troubleshooting

### Backend won't start
- Check `PORT` environment variable
- Verify Node.js version (18+)
- Check for port conflicts

### Frontend can't connect
- Verify `VITE_API_URL` is correct
- Check CORS settings in backend
- Verify backend is running

### MCP servers not responding
- Check MCP server URLs in `.env`
- Verify MCP servers are deployed
- Check network connectivity

---

## 📄 License

MIT License - see LICENSE file

---

**Built for:** GAP_PROTOTYPE - ag-mcp Ecosystem Demo  
**Created:** January 2025

