# AG-MCP Chat App

React Native mobile app for FarmerChat.

## Git Workflow

| Branch | Environment | Notes |
|--------|-------------|-------|
| `main` | Production | Main release branch |
| `development` | Development | Active development |

**Always work on `development` branch.** Merge to `main` only for production releases.

---

## Structure

```
ag-mcp-chat-app/
├── mobile/           # Expo + React Native app
│   ├── screens/      # App screens
│   ├── components/   # UI components
│   ├── services/     # API, TTS services
│   └── contexts/     # React contexts
├── brand-assets/     # Logos and branding
└── docs/             # Documentation
```

## Development

```bash
cd mobile
npm install
cp .env.example .env  # Add EXPO_PUBLIC_API_KEY
npx expo start        # Start Expo dev server
```

Scan QR code with Expo Go app to run on device.

## Environment Variables

- `EXPO_PUBLIC_API_KEY` - API Gateway key
- `EXPO_PUBLIC_API_URL` - API Gateway URL (defaults to production)

## Features

- React Native Gifted Chat UI
- Voice input (speech-to-text)
- Text-to-speech responses
- Auto GPS location detection
- Multi-language support (54+ languages)
- Image upload for plant diagnosis

## Build

```bash
# iOS
npx expo build:ios

# Android
npx expo build:android
```

## Backend Integration

Mobile app connects to:
- **API Gateway** - `https://ag-mcp-api-gateway.up.railway.app`
- Routes through to AI Services and MCP servers
