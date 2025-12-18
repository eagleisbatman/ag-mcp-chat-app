import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
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

  // Set Android navigation bar color to match theme
  useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync(theme.background);
      NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
    }
  }, [theme.background, isDark]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={theme.statusBar} backgroundColor={theme.surface} translucent={false} />
      <OfflineIndicator />
      <SyncErrorWatcher />
      <NavigationContainer>
        {onboardingComplete ? <MainStack /> : <OnboardingStack />}
      </NavigationContainer>
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AppProvider>
          <ToastProvider>
            <AppNavigator />
          </ToastProvider>
        </AppProvider>
      </SafeAreaProvider>
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
