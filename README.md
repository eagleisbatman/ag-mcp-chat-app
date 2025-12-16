# AG-MCP Chat App

AI-powered farming assistant mobile app with region-specific MCP server integration.

## Architecture

```
Mobile App → API Gateway (auth + orchestration) → AI Services (Gemini)
                    ↓
            MCP Servers (Weather, Soil, Feed, etc.)
```

**API Endpoint:**
```
POST https://ag-mcp-api-gateway.up.railway.app/api/chat
Header: X-API-Key: your-api-key
```

## Project Structure

```
ag-mcp-chat-app/
├── mobile/               # Expo + React Native Gifted Chat
│   ├── screens/          # App screens
│   ├── components/       # UI components
│   ├── services/         # API, TTS, transcription services
│   ├── contexts/         # React contexts (app state)
│   └── constants/        # Translations, config
├── api-gateway/          # Express.js + TypeScript
│   ├── src/
│   │   ├── config/       # Zod-validated env config
│   │   ├── middleware/   # Auth, validation, error handling
│   │   ├── routes/
│   │   │   ├── ai/       # Chat, TTS, transcribe, title routes
│   │   │   └── mcp-servers/ # MCP server management routes
│   │   ├── services/
│   │   │   ├── mcp/      # MCP caller, registry, orchestrator
│   │   │   ├── intent/   # Intent detection (keywords, LLM)
│   │   │   ├── geocoding.ts # Nominatim/IP-API location lookup
│   │   │   └── ai-services.ts # AI Services client
│   │   ├── types/        # TypeScript interfaces
│   │   └── utils/        # Logger utilities
│   └── prisma/           # Database schema + seed
└── README.md
```

## Mobile App Setup

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

## Features

- **React Native Gifted Chat** - Beautiful chat UI
- **Google Gemini 2.5 Flash** - AI-powered responses via AI Services
- **Auto Location** - GPS detection for regional advice
- **Region Detection** - Ethiopia, Kenya, Tanzania, Vietnam, Global
- **Language Detection** - 20+ languages supported
- **Voice Input** - Speech-to-text transcription
- **Text-to-Speech** - Audio responses

## API Gateway Services

| Service | Description |
|---------|-------------|
| Chat | Gemini chat with MCP context |
| TTS | Text-to-Speech via Gemini |
| Transcribe | Speech-to-Text via Gemini |
| Location | Geocoding via Nominatim/IP-API |
| MCP Servers | Regional server orchestration |

## Supported Regions

| Region | MCP Servers |
|--------|-------------|
| Ethiopia | NextGen, Feed Formulation, EDACaP, ISDA Soil |
| Kenya | GAP Weather, ISDA Soil |
| Tanzania | GAP Weather, ISDA Soil |
| Vietnam | WeatherAPI |
| Global | AccuWeather, AgriVision |

## Backend Services

### API Gateway (Express.js + TypeScript)
- Deployed at `ag-mcp-api-gateway.up.railway.app`
- Handles authentication, MCP orchestration, and request routing

### AI Services (TypeScript)
- Deployed at `ag-mcp-ai-services.up.railway.app`
- Handles Gemini API calls for chat, TTS, and transcription

## Testing

### API Gateway Tests

```bash
cd api-gateway
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

**Test coverage:** 112 tests covering services, middleware, and routes.

### AI Services Tests

See the [ai-services README](../ai-services/README.md) for testing instructions.

## Development

### API Gateway

```bash
cd api-gateway
npm install
npm run dev   # Start development server with hot reload
```

### Mobile App

```bash
cd mobile
npm install
npx expo start
```

---

**Built for:** Digital Green - GAP_PROTOTYPE
