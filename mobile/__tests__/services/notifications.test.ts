/**
 * Tests for services/notifications.ts
 * Covers: initialize, registerToken, setTags, requestPermission,
 * areNotificationsEnabled, setPreferences, enablePush, disablePush.
 *
 * Note: uses dynamic require because the module reads process.env at load time,
 * and ES imports are hoisted above process.env assignments.
 */

const mockSetAppId = jest.fn();
const mockSetLogLevel = jest.fn();
const mockSetNotificationOpenedHandler = jest.fn();
const mockSetNotificationWillShowInForegroundHandler = jest.fn();
const mockGetDeviceState = jest.fn();
const mockSendTags = jest.fn();
const mockPromptForPush = jest.fn();
const mockSetExternalUserId = jest.fn();
const mockRemoveExternalUserId = jest.fn();
const mockDisablePush = jest.fn();
const mockFetchWithTimeout = jest.fn().mockResolvedValue({ ok: true, json: jest.fn() });

jest.mock('react-native-onesignal', () => {
  const mockObj = {
    setAppId: mockSetAppId,
    setLogLevel: mockSetLogLevel,
    setNotificationOpenedHandler: mockSetNotificationOpenedHandler,
    setNotificationWillShowInForegroundHandler: mockSetNotificationWillShowInForegroundHandler,
    getDeviceState: mockGetDeviceState,
    sendTags: mockSendTags,
    promptForPushNotificationsWithUserResponse: mockPromptForPush,
    setExternalUserId: mockSetExternalUserId,
    removeExternalUserId: mockRemoveExternalUserId,
    disablePush: mockDisablePush,
  };
  return { __esModule: true, default: mockObj, ...mockObj };
}, { virtual: true });

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('../../utils/apiHelpers', () => ({
  fetchWithTimeout: mockFetchWithTimeout,
}), { virtual: true });

jest.mock('../../utils/config', () => ({
  API_BASE_URL: 'https://test-api.example.com',
  API_KEY: 'test-key',
}), { virtual: true });

jest.mock('../../utils/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

// Set env BEFORE require so the module-level const picks it up
process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID = 'test-app-id';

// Use require instead of import to ensure process.env is set first
// (ES imports are hoisted above process.env assignments by jest/babel)
const { notificationService } = require('../../services/notifications');

describe('notificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('sets app ID and handlers', () => {
      notificationService.initialize();

      expect(mockSetAppId).toHaveBeenCalledWith('test-app-id');
      expect(mockSetNotificationOpenedHandler).toHaveBeenCalled();
      expect(mockSetNotificationWillShowInForegroundHandler).toHaveBeenCalled();
    });

    it('calls custom onNotificationOpened handler', () => {
      const onOpened = jest.fn();
      notificationService.initialize({ onNotificationOpened: onOpened });

      const registeredHandler = mockSetNotificationOpenedHandler.mock.calls[0][0];

      registeredHandler({
        notification: { additionalData: { type: 'weather' } },
      });

      expect(onOpened).toHaveBeenCalledWith({ type: 'weather' }, expect.anything());
    });

    it('calls custom onNotificationReceived handler', () => {
      const onReceived = jest.fn(() => false);
      notificationService.initialize({ onNotificationReceived: onReceived });

      const registeredHandler =
        mockSetNotificationWillShowInForegroundHandler.mock.calls[0][0];

      const mockEvent = {
        getNotification: jest.fn(() => ({ title: 'Test' })),
        complete: jest.fn(),
      };

      registeredHandler(mockEvent);

      expect(onReceived).toHaveBeenCalled();
      expect(mockEvent.complete).toHaveBeenCalledWith();
    });

    it('shows notification when handler returns true', () => {
      const onReceived = jest.fn(() => true);
      notificationService.initialize({ onNotificationReceived: onReceived });

      const registeredHandler =
        mockSetNotificationWillShowInForegroundHandler.mock.calls[0][0];

      const notification = { title: 'Test' };
      const mockEvent = {
        getNotification: jest.fn(() => notification),
        complete: jest.fn(),
      };

      registeredHandler(mockEvent);

      expect(mockEvent.complete).toHaveBeenCalledWith(notification);
    });
  });

  describe('registerToken', () => {
    it('registers token with backend on success', async () => {
      mockGetDeviceState.mockResolvedValue({
        userId: 'player-123',
        pushToken: 'push-token-abc',
      });

      const result = await notificationService.registerToken();
      expect(result).toBe('player-123');
      expect(mockFetchWithTimeout).toHaveBeenCalledWith(
        expect.stringContaining('/api/users/push-token'),
        expect.objectContaining({ method: 'POST' }),
        10000
      );
    });

    it('returns null when no player ID', async () => {
      mockGetDeviceState.mockResolvedValue({ userId: null });

      const result = await notificationService.registerToken();
      expect(result).toBeNull();
    });

    it('returns null on error', async () => {
      mockGetDeviceState.mockRejectedValue(new Error('OneSignal error'));

      const result = await notificationService.registerToken();
      expect(result).toBeNull();
    });
  });

  describe('setTags', () => {
    it('sends tags to OneSignal', async () => {
      await notificationService.setTags({ language: 'en', region: 'KE' });
      expect(mockSendTags).toHaveBeenCalledWith({ language: 'en', region: 'KE' });
    });

    it('handles error gracefully', async () => {
      mockSendTags.mockImplementationOnce(() => { throw new Error('fail'); });

      // Should not throw
      await notificationService.setTags({ language: 'en' });
    });
  });

  describe('setRegion', () => {
    it('sets region tag', async () => {
      await notificationService.setRegion('KE');
      expect(mockSendTags).toHaveBeenCalledWith({ region: 'KE' });
    });

    it('skips for null region', async () => {
      await notificationService.setRegion(null);
      expect(mockSendTags).not.toHaveBeenCalled();
    });
  });

  describe('setLanguage', () => {
    it('sets language tag', async () => {
      await notificationService.setLanguage('hi');
      expect(mockSendTags).toHaveBeenCalledWith({ language: 'hi' });
    });

    it('skips for null language', async () => {
      await notificationService.setLanguage(null);
      expect(mockSendTags).not.toHaveBeenCalled();
    });
  });

  describe('requestPermission', () => {
    it('returns true when granted', async () => {
      mockPromptForPush.mockResolvedValue(true);
      const result = await notificationService.requestPermission();
      expect(result).toBe(true);
    });

    it('returns false when denied', async () => {
      mockPromptForPush.mockResolvedValue(false);
      const result = await notificationService.requestPermission();
      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      mockPromptForPush.mockRejectedValue(new Error('fail'));
      const result = await notificationService.requestPermission();
      expect(result).toBe(false);
    });
  });

  describe('areNotificationsEnabled', () => {
    it('returns true when permission granted', async () => {
      mockGetDeviceState.mockResolvedValue({ hasNotificationPermission: true });
      const result = await notificationService.areNotificationsEnabled();
      expect(result).toBe(true);
    });

    it('returns false when permission not granted', async () => {
      mockGetDeviceState.mockResolvedValue({ hasNotificationPermission: false });
      const result = await notificationService.areNotificationsEnabled();
      expect(result).toBe(false);
    });

    it('returns false on error', async () => {
      mockGetDeviceState.mockRejectedValue(new Error('fail'));
      const result = await notificationService.areNotificationsEnabled();
      expect(result).toBe(false);
    });
  });

  describe('setPreferences', () => {
    it('sets tags and syncs to backend', async () => {
      await notificationService.setPreferences({
        weatherAlerts: true,
        contentUpdates: false,
      });

      expect(mockSendTags).toHaveBeenCalledWith(
        expect.objectContaining({
          weather_alerts: 'true',
          content_updates: 'false',
        })
      );
      expect(mockFetchWithTimeout).toHaveBeenCalled();
    });
  });

  describe('enablePush / disablePush', () => {
    it('enables push', () => {
      notificationService.enablePush();
      expect(mockDisablePush).toHaveBeenCalledWith(false);
    });

    it('disables push', () => {
      notificationService.disablePush();
      expect(mockDisablePush).toHaveBeenCalledWith(true);
    });
  });

  describe('external user ID', () => {
    it('sets external user ID', async () => {
      await notificationService.setExternalUserId('user-123');
      expect(mockSetExternalUserId).toHaveBeenCalledWith('user-123');
    });

    it('skips null user ID', async () => {
      await notificationService.setExternalUserId(null);
      expect(mockSetExternalUserId).not.toHaveBeenCalled();
    });

    it('removes external user ID', async () => {
      await notificationService.removeExternalUserId();
      expect(mockRemoveExternalUserId).toHaveBeenCalled();
    });
  });

  describe('getPlayerId', () => {
    it('returns player ID', async () => {
      mockGetDeviceState.mockResolvedValue({ userId: 'player-abc' });
      const result = await notificationService.getPlayerId();
      expect(result).toBe('player-abc');
    });

    it('returns null on error', async () => {
      mockGetDeviceState.mockRejectedValue(new Error('fail'));
      const result = await notificationService.getPlayerId();
      expect(result).toBeNull();
    });
  });
});
