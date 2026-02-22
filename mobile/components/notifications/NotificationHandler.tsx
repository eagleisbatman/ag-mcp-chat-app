import { useEffect, useCallback } from 'react';
import { useNavigation, NavigationProp, ParamListBase } from '@react-navigation/native';
import { useNotifications } from '../../contexts/NotificationContext';
import { useApp } from '../../contexts/AppContext';
import { log } from '../../utils/logger';

interface NotificationData {
  type?: string;
  alertId?: string;
  severity?: string;
  title?: string;
  message?: string;
  contentId?: string;
  contentType?: string;
  sessionId?: string;
  tipId?: string;
  serverId?: string;
}

interface LastNotification {
  data?: NotificationData;
  isForground?: boolean;
  openedAt?: Date | string;
  receivedAt?: Date | string;
}

/**
 * NotificationHandler Component
 *
 * Handles notification-triggered navigation and side effects.
 * Should be placed inside NavigationContainer.
 *
 * Notification types and their navigation targets:
 * - weather_alert: Navigate to Chat with weather context
 * - content_update: Navigate to Chat with content context
 * - chat_message: Navigate to specific chat/session
 * - tip: Navigate to Chat with tip displayed
 */
export default function NotificationHandler(): null {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { pendingNavigation, clearPendingNavigation, lastNotification } = useNotifications();
  const { onboardingComplete } = useApp();

  // Handle navigation based on notification type
  const handleNavigation = useCallback((data: NotificationData | null | undefined) => {
    if (!data?.type || !onboardingComplete) {
      return;
    }

    log('[NotificationHandler] Handling navigation for type:', data.type);

    switch (data.type) {
      case 'weather_alert':
        // Navigate to Chat screen with weather alert context
        navigation.navigate('Chat', {
          notification: {
            type: 'weather_alert',
            alertId: data.alertId,
            severity: data.severity,
            title: data.title,
            message: data.message,
          },
        });
        break;

      case 'content_update':
        // Navigate to Chat screen with content context
        navigation.navigate('Chat', {
          notification: {
            type: 'content_update',
            contentId: data.contentId,
            contentType: data.contentType,
            title: data.title,
          },
        });
        break;

      case 'chat_message':
        // Navigate to specific chat session if provided
        navigation.navigate('Chat', {
          sessionId: data.sessionId,
          notification: {
            type: 'chat_message',
            message: data.message,
          },
        });
        break;

      case 'tip':
      case 'reminder':
        // Navigate to Chat with tip/reminder message
        navigation.navigate('Chat', {
          notification: {
            type: data.type,
            message: data.message,
            tipId: data.tipId,
          },
        });
        break;

      case 'profile_collection':
        // Navigate to Chat with a predefined nudge to trigger A2UI data collection.
        // Uses a fixed message (never free-text from push payload) to prevent prompt injection.
        navigation.navigate('Chat', {
          newSession: true,
          nudgeMessage: 'setup_farm_profile',
        });
        break;

      case 'mcp_update':
        // Navigate to MCP servers screen
        navigation.navigate('McpServers', {
          notification: {
            type: 'mcp_update',
            serverId: data.serverId,
          },
        });
        break;

      default:
        // For unknown types, just open the app (Chat screen)
        log('[NotificationHandler] Unknown notification type:', data.type);
        navigation.navigate('Chat');
        break;
    }
  }, [navigation, onboardingComplete]);

  // Handle pending navigation (from cold start or background)
  useEffect(() => {
    if (pendingNavigation && onboardingComplete) {
      handleNavigation(pendingNavigation as NotificationData);
      clearPendingNavigation();
    }
  }, [pendingNavigation, onboardingComplete, handleNavigation, clearPendingNavigation]);

  // Log last notification for debugging
  useEffect(() => {
    if (lastNotification) {
      const notif = lastNotification as LastNotification;
      log('[NotificationHandler] Last notification:', {
        type: notif.data?.type,
        isForground: notif.isForground,
        openedAt: notif.openedAt,
        receivedAt: notif.receivedAt,
      });
    }
  }, [lastNotification]);

  // This component doesn't render anything visible
  return null;
}
