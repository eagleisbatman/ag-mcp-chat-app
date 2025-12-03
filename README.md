# ag-mcp Chat App

AI-powered farming assistant mobile app with region-specific MCP server integration.

## 🚀 Architecture

```
Mobile App → API Gateway (auth) → n8n (AI workflow)
```

**API Endpoint:**
```
POST https://ag-mcp-api-gateway.up.railway.app/api/chat
Header: X-API-Key: your-api-key
```

## 📁 Project Structure

```
ag-mcp-chat-app/
├── mobile/               # Expo + React Native Gifted Chat
│   └── App.js
├── api-gateway/          # Express.js (handles API key auth)
│   └── index.js
├── n8n/                  # n8n workflow (AI processing)
│   └── workflows/
│       └── chat-workflow.json
└── README.md
```

## 📱 Mobile App Setup

```bash
cd mobile
npm install

# Create .env file with your API key
echo "EXPO_PUBLIC_API_KEY=your-api-key-here" > .env

npx expo start
```

**Scan QR code** with Expo Go app (iOS/Android) to run on your phone.

### Build for Production

```bash
# iOS
npx expo build:ios

# Android
npx expo build:android
```

## ✨ Features

- **React Native Gifted Chat** - Beautiful chat UI
- **Google Gemini 2.0** - AI-powered responses
- **Auto Location** - GPS detection for regional advice
- **Region Detection** - Ethiopia, East Africa, Global
- **Language Detection** - English, Swahili auto-detection
- **Typing Indicator** - Shows when AI is thinking

## 🎨 Customization

Edit `mobile/App.js` to customize:
- Colors (green theme by default)
- Bot avatar
- Welcome message
- Input placeholder

## 📍 Supported Regions

| Coordinates | Region | MCP Servers |
|------------|--------|-------------|
| Ethiopia (3-15°N, 32-48°E) | `ethiopia` | SSFR, ISDA Soil |
| East Africa (-12-18°N, 29-52°E) | `east-africa` | GAP Weather, Decision Tree |
| Other | `global` | AccuWeather, AgriVision |

## 🔧 Backend (n8n)

Already deployed at `ag-mcp-app.up.railway.app`

To modify:
1. Open n8n UI
2. Edit workflow
3. Save & activate

---

**Built for:** Digital Green - GAP_PROTOTYPE
