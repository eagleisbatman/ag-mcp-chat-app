import React from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppProvider, useApp } from './contexts/AppContext';
import { ToastProvider } from './contexts/ToastContext';
import OfflineIndicator from './components/OfflineIndicator';
import ErrorBoundary from './components/ErrorBoundary';

// Screens
import WelcomeScreen from './screens/WelcomeScreen';
import LocationScreen from './screens/LocationScreen';
import LanguageScreen from './screens/LanguageScreen';
import ChatScreen from './screens/ChatScreen';
import SettingsScreen from './screens/SettingsScreen';
import LanguageSelectScreen from './screens/LanguageSelectScreen';

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
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const { isLoading, onboardingComplete, theme } = useApp();

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={theme.statusBar} />
      <OfflineIndicator />
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
