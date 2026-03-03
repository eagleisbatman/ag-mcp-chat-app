import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notificationService from '../services/notifications';
import { log, error as logError } from '../utils/logger';

// Storage key for notification preferences
const NOTIFICATION_PREFS_KEY = 'notificationPreferences';

// Types
interface NotificationPreferences {
  weatherAlerts: boolean;
  contentUpdates: boolean;
  tipsAndReminders: boolean;
}

interface NotificationData {
  type?: string;
  [key: string]: unknown;
}

interface NotificationInfo {
  data?: NotificationData;
  notification?: unknown;
  receivedAt?: Date;
  openedAt?: Date;
  isForground?: boolean;
}

interface NavigationData {
  type: string;
  [key: string]: unknown;
}

interface NotificationContextValue {
  // State
  isInitialized: boolean;
  isPermissionGranted: boolean;
  playerId: string | null;
  preferences: NotificationPreferences;
  lastNotification: NotificationInfo | null;
  pendingNavigation: NavigationData | null;

  // Methods
  initialize: () => Promise<void>;
  requestPermission: () => Promise<boolean>;
  registerToken: () => Promise<string | null>;
  updatePreferences: (newPrefs: Partial<NotificationPreferences>) => Promise<NotificationPreferences>;
  setRegion: (regionCode: string) => Promise<void>;
  setLanguage: (languageCode: string) => Promise<void>;
  setExternalUserId: (userId: string) => Promise<void>;
  clearPendingNavigation: () => void;
}

interface NotificationProviderProps {
  children: ReactNode;
  onNotificationOpened?: (data: NavigationData) => void;
}

// Default preferences
const DEFAULT_PREFERENCES: NotificationPreferences = {
  weatherAlerts: true,
  contentUpdates: true,
  tipsAndReminders: true,
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const NotificationProvider = ({ children, onNotificationOpened }: NotificationProviderProps): JSX.Element => {
  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const [lastNotification, setLastNotification] = useState<NotificationInfo | null>(null);
  const [pendingNavigation, setPendingNavigation] = useState<NavigationData | null>(null);

  // Ref to hold navigation callback
  const navigationCallbackRef = useRef(onNotificationOpened);

  // Update ref when callback changes
  useEffect(() => {
    navigationCallbackRef.current = onNotificationOpened;
  }, [onNotificationOpened]);

  // Load saved preferences
  const loadPreferences = useCallback(async (): Promise<NotificationPreferences> => {
    try {
      const saved = await AsyncStorage.getItem(NOTIFICATION_PREFS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
        return parsed;
      }
    } catch (error) {
      logError('[NotificationContext] Error loading preferences:', error);
    }
    return DEFAULT_PREFERENCES;
  }, []);

  // Save preferences
  const savePreferences = useCallback(async (newPrefs: NotificationPreferences): Promise<void> => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(newPrefs));
    } catch (error) {
      logError('[NotificationContext] Error saving preferences:', error);
    }
  }, []);

  // Initialize OneSignal
  const initialize = useCallback(async (): Promise<void> => {
    log('[NotificationContext] Initializing...');

    // Load saved preferences first
    const savedPrefs = await loadPreferences();

    // Initialize OneSignal with handlers
    notificationService.initialize({
      onNotificationOpened: (data: NotificationData, notification: unknown) => {
        log('[NotificationContext] Notification opened with data:', data);
        setLastNotification({ data, notification, openedAt: new Date() });

        // Handle navigation based on notification type
        if (data?.type) {
          const navigationData: NavigationData = {
            type: data.type,
            ...data,
          };

          // Try to navigate immediately if callback is available
          if (navigationCallbackRef.current) {
            navigationCallbackRef.current(navigationData);
          } else {
            // Store for later navigation when app is ready
            setPendingNavigation(navigationData);
          }
        }
      },
      onNotificationReceived: (notification: unknown) => {
        log('[NotificationContext] Notification received in foreground');
        setLastNotification({
          notification,
          receivedAt: new Date(),
          isForground: true,
        });
        // Return true to show notification, false to suppress
        return true;
      },
    });

    // Check permission status
    const hasPermission = await notificationService.areNotificationsEnabled();
    setIsPermissionGranted(hasPermission);

    // Get player ID if permission is granted
    if (hasPermission) {
      const id = await notificationService.getPlayerId();
      setPlayerId(id);

      // Sync saved preferences to OneSignal
      await notificationService.setPreferences(savedPrefs);
    }

    setIsInitialized(true);
    log('[NotificationContext] Initialization complete');
  }, [loadPreferences]);

  // Request permission and register token
  const requestPermission = useCallback(async (): Promise<boolean> => {
    log('[NotificationContext] Requesting permission...');
    const granted = await notificationService.requestPermission();
    setIsPermissionGranted(granted);

    if (granted) {
      // Register token with backend
      const id = await notificationService.registerToken();
      setPlayerId(id);

      // Sync preferences to OneSignal
      await notificationService.setPreferences(preferences);
    }

    return granted;
  }, [preferences]);

  // Register token (after onboarding or when ready)
  const registerToken = useCallback(async (): Promise<string | null> => {
    const id = await notificationService.registerToken();
    setPlayerId(id);
    return id;
  }, []);

  // Update preferences
  const updatePreferences = useCallback(async (newPrefs: Partial<NotificationPreferences>): Promise<NotificationPreferences> => {
    const updated: NotificationPreferences = { ...preferences, ...newPrefs };
    setPreferences(updated);
    await savePreferences(updated);
    await notificationService.setPreferences(updated);
    return updated;
  }, [preferences, savePreferences]);

  // Set region for targeted notifications
  const setRegion = useCallback(async (regionCode: string): Promise<void> => {
    await notificationService.setRegion(regionCode);
  }, []);

  // Set language for localized notifications
  const setLanguage = useCallback(async (languageCode: string): Promise<void> => {
    await notificationService.setLanguage(languageCode);
  }, []);

  // Set external user ID (link to backend user)
  const setExternalUserId = useCallback(async (userId: string): Promise<void> => {
    await notificationService.setExternalUserId(userId);
  }, []);

  // Clear pending navigation (call after handling)
  const clearPendingNavigation = useCallback((): void => {
    setPendingNavigation(null);
  }, []);

  // Initialize on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Handle pending navigation when callback becomes available
  useEffect(() => {
    if (pendingNavigation && navigationCallbackRef.current) {
      navigationCallbackRef.current(pendingNavigation);
      setPendingNavigation(null);
    }
  }, [pendingNavigation]);

  const value: NotificationContextValue = {
    // State
    isInitialized,
    isPermissionGranted,
    playerId,
    preferences,
    lastNotification,
    pendingNavigation,

    // Methods
    initialize,
    requestPermission,
    registerToken,
    updatePreferences,
    setRegion,
    setLanguage,
    setExternalUserId,
    clearPendingNavigation,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Safe defaults when NotificationProvider is not in the tree
// (e.g. OneSignal SDK not yet installed)
const NOOP_ASYNC = async () => {};
const NOOP_DEFAULTS: NotificationContextValue = {
  isInitialized: false,
  isPermissionGranted: false,
  playerId: null,
  preferences: { weatherAlerts: true, contentUpdates: true, tipsAndReminders: true },
  lastNotification: null,
  pendingNavigation: null,
  initialize: NOOP_ASYNC,
  requestPermission: async () => false,
  registerToken: async () => null,
  updatePreferences: async (p) => ({ weatherAlerts: true, contentUpdates: true, tipsAndReminders: true, ...p }),
  setRegion: NOOP_ASYNC,
  setLanguage: NOOP_ASYNC,
  setExternalUserId: NOOP_ASYNC,
  clearPendingNavigation: () => {},
};

export const useNotifications = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  return context ?? NOOP_DEFAULTS;
};

export default NotificationContext;
