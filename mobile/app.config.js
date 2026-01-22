const fs = require('fs');
const path = require('path');

// Load .env file manually for production builds
const envPath = path.join(__dirname, '.env');
const envVars = {};

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });
}

// Get env vars from shell environment or .env file
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || envVars.EXPO_PUBLIC_API_BASE_URL;
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || envVars.EXPO_PUBLIC_API_KEY;

module.exports = ({ config }) => {
  return {
    ...config,
    extra: {
      ...config.extra,
      apiBaseUrl: API_BASE_URL,
      apiKey: API_KEY,
    },
  };
};
