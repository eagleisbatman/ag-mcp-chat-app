import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Animated } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider, useApp } from './contexts/AppContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import OfflineIndicator from './components/OfflineIndicator';
import ErrorBoundary from './components/ErrorBoundary';

// Screens
import WelcomeScreen from './screens/WelcomeScreen';
import LocationScreen from './screens/LocationScreen';
import LanguageScreen from './screens/LanguageScreen';
import ChatScreen from './screens/ChatScreen';
import SettingsScreen from './screens/SettingsScreen';
import LanguageSelectScreen from './screens/LanguageSelectScreen';
import HistoryScreen from './screens/HistoryScreen';
import McpServersScreen from './screens/McpServersScreen';
import McpServerDetailScreen from './screens/McpServerDetailScreen';

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
      <NavigationContainer>
        {onboardingComplete ? <MainStack /> : <OnboardingStack />}
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
            <ToastProvider>
              <AppNavigator />
            </ToastProvider>
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
