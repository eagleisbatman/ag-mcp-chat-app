console.log('[App] Starting App.js imports...');

import React, { useEffect, useCallback } from 'react';
console.log('[App] React imported');

import { ActivityIndicator, View, StyleSheet, Animated } from 'react-native';
console.log('[App] react-native imported');

import { SystemBars } from 'react-native-edge-to-edge';
console.log('[App] edge-to-edge imported');

import { KeyboardProvider } from 'react-native-keyboard-controller';
console.log('[App] keyboard-controller imported');

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
console.log('[App] navigation imported');

import { SafeAreaProvider } from 'react-native-safe-area-context';
console.log('[App] safe-area imported');

import { AppProvider, useApp } from './contexts/AppContext';
console.log('[App] AppContext imported');

import { ToastProvider, useToast } from './contexts/ToastContext';
console.log('[App] ToastContext imported');

// OneSignal notifications disabled for now - uncomment when ready
// import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import OfflineIndicator from './components/OfflineIndicator';
console.log('[App] OfflineIndicator imported');

import ErrorBoundary from './components/ErrorBoundary';
console.log('[App] ErrorBoundary imported');

// import NotificationHandler from './components/notifications/NotificationHandler';

// Screens
import WelcomeScreen from './screens/WelcomeScreen';
console.log('[App] WelcomeScreen imported');

import LocationScreen from './screens/LocationScreen';
console.log('[App] LocationScreen imported');

import LanguageScreen from './screens/LanguageScreen';
console.log('[App] LanguageScreen imported');

// HomeScreen disabled - uses content API that's not deployed yet
// import HomeScreen from './screens/HomeScreen';
import ChatScreen from './screens/ChatScreen';
console.log('[App] ChatScreen imported');

// ContentDetailScreen disabled - uses content API that's not deployed yet
// import ContentDetailScreen from './screens/ContentDetailScreen';
import SettingsScreen from './screens/SettingsScreen';
console.log('[App] SettingsScreen imported');

import LanguageSelectScreen from './screens/LanguageSelectScreen';
console.log('[App] LanguageSelectScreen imported');

import HistoryScreen from './screens/HistoryScreen';
console.log('[App] HistoryScreen imported');

import McpServersScreen from './screens/McpServersScreen';
console.log('[App] McpServersScreen imported');

import McpServerDetailScreen from './screens/McpServerDetailScreen';
console.log('[App] McpServerDetailScreen imported');

console.log('[App] All imports complete!');

const Stack = createNativeStackNavigator();

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
      <NavigationContainer>
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
