import './global.css';
import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { ActivityIndicator, View, StyleSheet, Animated, Platform } from 'react-native';
import { SystemBars } from 'react-native-edge-to-edge';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { NavigationContainer, LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

import { AppProvider, useApp } from './contexts/AppContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import type { RootStackParamList } from './types';

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
import ProfileScreen from './screens/ProfileScreen';
import FarmListScreen from './screens/FarmListScreen';
import FarmDetailScreen from './screens/FarmDetailScreen';
import FarmEditScreen from './screens/FarmEditScreen';
import PlotEditScreen from './screens/PlotEditScreen';
import LivestockListScreen from './screens/LivestockListScreen';
import LivestockDetailScreen from './screens/LivestockDetailScreen';
import LivestockEditScreen from './screens/LivestockEditScreen';
import LivestockEventScreen from './screens/LivestockEventScreen';
import MyFarmersScreen from './screens/MyFarmersScreen';
import ConnectFarmerScreen from './screens/ConnectFarmerScreen';
import PendingRequestsScreen from './screens/PendingRequestsScreen';
import OtpVerificationScreen from './screens/OtpVerificationScreen';

// Type safe navigators
const Stack = createNativeStackNavigator<RootStackParamList>();

const noHeader = { headerShown: false } as const;

// Deep linking configuration
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['farmerchat://', 'https://farmerchat.digitalgreen.org'],
  config: {
    screens: {
      Chat: {
        path: 'chat/:sessionId?',
        parse: { sessionId: (s: string) => s },
      },
      History: 'history',
      Settings: 'settings',
      LanguageSelect: 'settings/language',
      McpServers: 'debug/mcp-servers',
      McpServerDetail: {
        path: 'debug/mcp-servers/:serverId',
        parse: { serverId: (s: string) => s },
      },
    },
  },
};

function OnboardingStack() {
  return (
    <Stack.Navigator screenOptions={noHeader}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Location" component={LocationScreen} />
      <Stack.Screen name="Language" component={LanguageScreen} />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={noHeader}>
      {/* Chat is the home screen */}
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="History" component={HistoryScreen} />
      {/* Settings hub (accessed via hamburger menu in chat header) */}
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="LanguageSelect" component={LanguageSelectScreen} />
      <Stack.Screen name="McpServers" component={McpServersScreen} />
      <Stack.Screen name="McpServerDetail" component={McpServerDetailScreen} />
      {/* Farm management */}
      <Stack.Screen name="FarmList" component={FarmListScreen} />
      <Stack.Screen name="FarmDetail" component={FarmDetailScreen} />
      <Stack.Screen name="FarmEdit" component={FarmEditScreen} />
      <Stack.Screen name="PlotEdit" component={PlotEditScreen} />
      {/* Livestock management */}
      <Stack.Screen name="LivestockList" component={LivestockListScreen} />
      <Stack.Screen name="LivestockDetail" component={LivestockDetailScreen} />
      <Stack.Screen name="LivestockEdit" component={LivestockEditScreen} />
      <Stack.Screen name="LivestockEvent" component={LivestockEventScreen} />
      {/* Extension Worker features */}
      <Stack.Screen name="MyFarmers" component={MyFarmersScreen} />
      <Stack.Screen name="ConnectFarmer" component={ConnectFarmerScreen} />
      <Stack.Screen name="PendingRequests" component={PendingRequestsScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
    </Stack.Navigator>
  );
}

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

  // Bridge app theme to React Native Paper MD3 theme
  const paperTheme = useMemo(() => {
    const base = isDark ? MD3DarkTheme : MD3LightTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.accent,
        onPrimary: '#FFFFFF',
        background: theme.background,
        surface: theme.surface,
        onBackground: theme.text,
        onSurface: theme.text,
        error: theme.error,
      },
    };
  }, [isDark, theme]);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Hide splash screen and animate in when loading is complete
  const onLayoutRootView = useCallback(async () => {
    if (!isLoading) {
      // Hide the native splash screen
      await SplashScreen.hideAsync();
      // Start fade-in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  }, [isLoading, fadeAnim]);

  useEffect(() => {
    onLayoutRootView();
  }, [onLayoutRootView]);

  if (isLoading) {
    // Return null to keep showing the native splash screen
    return null;
  }

  return (
    <PaperProvider theme={paperTheme}>
      <Animated.View style={{ flex: 1, backgroundColor: theme.background, opacity: fadeAnim }}>
        <SystemBars style={isDark ? 'light' : 'dark'} />
        <OfflineIndicator />
        <SyncErrorWatcher />
        <NavigationContainer linking={linking}>
          {onboardingComplete ? <MainStack /> : <OnboardingStack />}
        </NavigationContainer>
      </Animated.View>
    </PaperProvider>
  );
}

// Web container to center and limit width
function WebContainer({ children }: { children: React.ReactNode }) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={styles.webOuterContainer}>
      <View style={styles.webInnerContainer}>
        {children}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <KeyboardProvider>
        <SafeAreaProvider>
          <WebContainer>
            <AppProvider>
              <ToastProvider>
                <AppNavigator />
              </ToastProvider>
            </AppProvider>
          </WebContainer>
        </SafeAreaProvider>
      </KeyboardProvider>
    </ErrorBoundary>
  );
}

const MAX_WEB_WIDTH = 480; // Mobile-like width for web

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webOuterContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a', // Dark background outside the app
    alignItems: 'center',
  },
  webInnerContainer: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_WEB_WIDTH,
    // Add subtle shadow for depth
    ...(Platform.OS === 'web' ? {
      boxShadow: '0 0 20px rgba(0, 0, 0, 0.3)',
    } : {}),
  },
});
