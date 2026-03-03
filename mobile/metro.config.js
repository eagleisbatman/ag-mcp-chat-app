const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Stub out optional native modules that may not be installed
const optionalModuleStubs = {
  'react-native-onesignal': path.resolve(__dirname, 'stubs/react-native-onesignal.js'),
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (optionalModuleStubs[moduleName]) {
    try {
      // Try resolving the real module first
      if (originalResolveRequest) {
        return originalResolveRequest(context, moduleName, platform);
      }
      return context.resolveRequest(context, moduleName, platform);
    } catch {
      // Fall back to stub
      return {
        filePath: optionalModuleStubs[moduleName],
        type: 'sourceFile',
      };
    }
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
