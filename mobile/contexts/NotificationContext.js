import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notificationService from '../services/notifications';
import { log, error as logError } from '../utils/logger';

const NotificationContext = createContext(null);

// Storage key for notification preferences
const NOTIFICATION_PREFS_KEY = 'notificationPreferences';

// Default preferences
const DEFAULT_PREFERENCES = {
  weatherAlerts: true,
  contentUpdates: true,
  tipsAndReminders: true,
};

export const NotificationProvider = ({ children, onNotificationOpened }) => {
  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);
  const [playerId, setPlayerId] = useState(null);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [lastNotification, setLastNotification] = useState(null);
  const [pendingNavigation, setPendingNavigation] = useState(null);

  // Ref to hold navigation callback
  const navigationCallbackRef = useRef(onNotificationOpened);

  // Update ref when callback changes
  useEffect(() => {
    navigationCallbackRef.current = onNotificationOpened;
  }, [onNotificationOpened]);

  // Load saved preferences
  const loadPreferences = useCallback(async () => {
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
  const savePreferences = useCallback(async (newPrefs) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(newPrefs));
    } catch (error) {
      logError('[NotificationContext] Error saving preferences:', error);
    }
  }, []);

  // Initialize OneSignal
  const initialize = useCallback(async () => {
    log('[NotificationContext] Initializing...');

    // Load saved preferences first
    const savedPrefs = await loadPreferences();

    // Initialize OneSignal with handlers
    notificationService.initialize({
      onNotificationOpened: (data, notification) => {
        log('[NotificationContext] Notification opened with data:', data);
        setLastNotification({ data, notification, openedAt: new Date() });

        // Handle navigation based on notification type
        if (data?.type) {
          const navigationData = {
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
      onNotificationReceived: (notification) => {
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
  const requestPermission = useCallback(async () => {
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
  const registerToken = useCallback(async () => {
    const id = await notificationService.registerToken();
    setPlayerId(id);
    return id;
  }, []);

  // Update preferences
  const updatePreferences = useCallback(async (newPrefs) => {
    const updated = { ...preferences, ...newPrefs };
    setPreferences(updated);
    await savePreferences(updated);
    await notificationService.setPreferences(updated);
    return updated;
  }, [preferences, savePreferences]);

  // Set region for targeted notifications
  const setRegion = useCallback(async (regionCode) => {
    await notificationService.setRegion(regionCode);
  }, []);

  // Set language for localized notifications
  const setLanguage = useCallback(async (languageCode) => {
    await notificationService.setLanguage(languageCode);
  }, []);

  // Set external user ID (link to backend user)
  const setExternalUserId = useCallback(async (userId) => {
    await notificationService.setExternalUserId(userId);
  }, []);

  // Clear pending navigation (call after handling)
  const clearPendingNavigation = useCallback(() => {
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

  const value = {
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

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export default NotificationContext;
