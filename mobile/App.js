import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Animated } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider, useApp } from './contexts/AppContext';
import { ToastProvider, useToast } from './contexts/ToastContext';

// OneSignal notifications disabled for now - uncomment when ready
// import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import OfflineIndicator from './components/OfflineIndicator';
import ErrorBoundary from './components/ErrorBoundary';

// import NotificationHandler from './components/notifications/NotificationHandler';

// Screens
import WelcomeScreen from './screens/WelcomeScreen';
import LocationScreen from './screens/LocationScreen';
import LanguageScreen from './screens/LanguageScreen';

// HomeScreen disabled - uses content API that's not deployed yet
// import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';

// ContentDetailScreen disabled - uses content API that's not deployed yet
// import ContentDetailScreen from './screens/ContentDetailScreen';
import SettingsScreen from './screens/SettingsScreen';
import LanguageSelectScreen from './screens/LanguageSelectScreen';
import HistoryScreen from './screens/HistoryScreen';
import McpServersScreen from './screens/McpServersScreen';
import McpServerDetailScreen from './screens/McpServerDetailScreen';

const Stack = createNativeStackNavigator();

// Deep linking configuration for universal/app links
const linking = {
  prefixes: ['farmerchat://', 'https://farmerchat.digitalgreen.org'],
  config: {
    screens: {
      // Main app screens
      Chat: {
        path: 'chat/:sessionId?',
        parse: {
          sessionId: (sessionId) => sessionId,
        },
      },
      History: 'history',
      Settings: 'settings',
      LanguageSelect: 'settings/language',
      McpServers: 'debug/mcp-servers',
      McpServerDetail: {
        path: 'debug/mcp-servers/:serverId',
        parse: {
          serverId: (serverId) => serverId,
        },
      },
    },
  },
};

function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Location" component={LocationScreen} />
      <Stack.Screen name="Language" component={LanguageScreen} />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
      <Stack.Screen name="McpServers" component={McpServersScreen} />
      <Stack.Screen name="McpServerDetail" component={McpServerDetailScreen} />
    </Stack.Navigator>
  );
}

// Watch for sync errors and display toast notifications
function SyncErrorWatcher() {
  const { lastSyncError, clearSyncError } = useApp();
  const { showWarning } = useToast();

  useEffect(() => {
    if (lastSyncError) {
      showWarning(lastSyncError);
      clearSyncError();
    }
  }, [lastSyncError, clearSyncError, showWarning]);

  return null;
}

// OneSignal notifications disabled for now - uncomment when ready
// function NotificationRegistration() { ... }

function AppNavigator() {
  const { isLoading, onboardingComplete, theme, isDark } = useApp();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!isLoading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading, fadeAnim]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <Animated.View style={{ flex: 1, backgroundColor: theme.background, opacity: fadeAnim }}>
      {/* SystemBars handles both status bar and navigation bar for edge-to-edge */}
      <SystemBars style={isDark ? 'light' : 'dark'} />
      <OfflineIndicator />
      <SyncErrorWatcher />
      {/* OneSignal notifications disabled for now */}
      {/* <NotificationRegistration /> */}
      <NavigationContainer linking={linking}>
        {onboardingComplete ? <MainStack /> : <OnboardingStack />}
        {/* NotificationHandler disabled for now */}
        {/* {onboardingComplete && <NotificationHandler />} */}
      </NavigationContainer>
    </Animated.View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <KeyboardProvider>
        <SafeAreaProvider>
          <AppProvider>
            {/* NotificationProvider disabled for now - uncomment when OneSignal is set up */}
            {/* <NotificationProvider> */}
              <ToastProvider>
                <AppNavigator />
              </ToastProvider>
            {/* </NotificationProvider> */}
          </AppProvider>
        </SafeAreaProvider>
      </KeyboardProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
