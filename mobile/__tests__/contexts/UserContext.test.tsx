/**
 * Tests for UserContext
 * Covers: initial state, user registration, service preferences sync,
 * error handling, loading state, and clearSyncError.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';

// Mock dependencies BEFORE importing the module under test
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../../services/db', () => ({
  registerUser: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { registerUser } from '../../services/db';
import { UserProvider, useUser } from '../../contexts/app/UserContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <UserProvider>{children}</UserProvider>
);

describe('UserContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Initial state ──
  describe('initial state', () => {
    it('starts with userId null and isLoadingUser true', async () => {
      (registerUser as jest.Mock).mockReturnValue(new Promise(() => {})); // never resolves

      const { result } = renderHook(() => useUser(), { wrapper });

      expect(result.current.userId).toBeNull();
      expect(result.current.isLoadingUser).toBe(true);
      expect(result.current.isDbSynced).toBe(false);
      expect(result.current.lastSyncError).toBeNull();
    });
  });

  // ── Successful registration ──
  describe('successful registration', () => {
    it('sets userId and isDbSynced on success', async () => {
      (registerUser as jest.Mock).mockResolvedValue({
        success: true,
        userId: 'user-123',
        user: null,
      });

      const { result } = renderHook(() => useUser(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingUser).toBe(false);
      });

      expect(result.current.userId).toBe('user-123');
      expect(result.current.isDbSynced).toBe(true);
      expect(result.current.lastSyncError).toBeNull();
    });

    it('syncs service preferences from server when no local prefs exist', async () => {
      (registerUser as jest.Mock).mockResolvedValue({
        success: true,
        userId: 'user-456',
        user: {
          preferences: {
            servicePreferences: { weather: 'google', soil: 'isda' },
          },
        },
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const { result } = renderHook(() => useUser(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingUser).toBe(false);
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'user-456:@service_preferences',
        JSON.stringify({ weather: 'google', soil: 'isda' })
      );
    });

    it('does NOT overwrite existing local service preferences', async () => {
      (registerUser as jest.Mock).mockResolvedValue({
        success: true,
        userId: 'user-789',
        user: {
          preferences: {
            servicePreferences: { weather: 'google' },
          },
        },
      });
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify({ weather: 'accuweather' })
      );

      const { result } = renderHook(() => useUser(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingUser).toBe(false);
      });

      // setItem should NOT be called for service prefs since existing prefs exist
      const calls = (AsyncStorage.setItem as jest.Mock).mock.calls;
      const prefCalls = calls.filter(
        (c: string[]) => c[0] === 'user-789:@service_preferences'
      );
      expect(prefCalls.length).toBe(0);
    });

    it('handles missing servicePreferences gracefully', async () => {
      (registerUser as jest.Mock).mockResolvedValue({
        success: true,
        userId: 'user-abc',
        user: { preferences: {} },
      });

      const { result } = renderHook(() => useUser(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingUser).toBe(false);
      });

      expect(result.current.userId).toBe('user-abc');
    });

    it('handles null user in response', async () => {
      (registerUser as jest.Mock).mockResolvedValue({
        success: true,
        userId: 'user-null',
        user: null,
      });

      const { result } = renderHook(() => useUser(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingUser).toBe(false);
      });

      expect(result.current.userId).toBe('user-null');
    });
  });

  // ── Failed registration ──
  describe('failed registration', () => {
    it('sets lastSyncError when registerUser throws', async () => {
      (registerUser as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useUser(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingUser).toBe(false);
      });

      expect(result.current.userId).toBeNull();
      expect(result.current.isDbSynced).toBe(false);
      expect(result.current.lastSyncError).toBe(
        'Could not connect to server. Some features may be limited.'
      );
    });

    it('does not set userId when success is false', async () => {
      (registerUser as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Server error',
      });

      const { result } = renderHook(() => useUser(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingUser).toBe(false);
      });

      expect(result.current.userId).toBeNull();
      expect(result.current.isDbSynced).toBe(false);
    });

    it('does not set userId when userId is missing from response', async () => {
      (registerUser as jest.Mock).mockResolvedValue({
        success: true,
        userId: null,
      });

      const { result } = renderHook(() => useUser(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingUser).toBe(false);
      });

      expect(result.current.userId).toBeNull();
    });
  });

  // ── clearSyncError ──
  describe('clearSyncError', () => {
    it('clears the lastSyncError', async () => {
      (registerUser as jest.Mock).mockRejectedValue(new Error('fail'));

      const { result } = renderHook(() => useUser(), { wrapper });

      await waitFor(() => {
        expect(result.current.lastSyncError).toBeTruthy();
      });

      act(() => {
        result.current.clearSyncError();
      });

      expect(result.current.lastSyncError).toBeNull();
    });
  });

  // ── Service preferences sync error ──
  describe('service preferences sync error', () => {
    it('does not crash when AsyncStorage fails during pref sync', async () => {
      (registerUser as jest.Mock).mockResolvedValue({
        success: true,
        userId: 'user-err',
        user: {
          preferences: {
            servicePreferences: { weather: 'gap' },
          },
        },
      });
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage broken'));

      const { result } = renderHook(() => useUser(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingUser).toBe(false);
      });

      // User registration still succeeds even if pref sync fails
      expect(result.current.userId).toBe('user-err');
      expect(result.current.isDbSynced).toBe(true);
    });
  });

  // ── useUser outside provider ──
  describe('useUser outside provider', () => {
    it('throws when used outside UserProvider', () => {
      // Suppress console.error for expected error
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => {
        renderHook(() => useUser());
      }).toThrow('useUser must be used within UserProvider');
      spy.mockRestore();
    });
  });
});
