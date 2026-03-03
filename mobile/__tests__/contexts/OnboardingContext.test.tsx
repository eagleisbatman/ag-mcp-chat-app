/**
 * Tests for OnboardingContext
 * Covers: initial load, completeOnboarding, resetOnboarding, error handling.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { OnboardingProvider, useOnboarding } from '../../contexts/app/OnboardingContext';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <OnboardingProvider>{children}</OnboardingProvider>
);

describe('OnboardingContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);
  });

  describe('initial state', () => {
    it('defaults to onboardingComplete false', async () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingOnboarding).toBe(false);
      });

      expect(result.current.onboardingComplete).toBe(false);
    });

    it('loads true from AsyncStorage if previously completed', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      await waitFor(() => {
        expect(result.current.onboardingComplete).toBe(true);
      });
    });

    it('treats non-"true" values as incomplete', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('false');

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingOnboarding).toBe(false);
      });

      expect(result.current.onboardingComplete).toBe(false);
    });

    it('handles AsyncStorage errors gracefully during load', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoadingOnboarding).toBe(false);
      });

      expect(result.current.onboardingComplete).toBe(false);
    });
  });

  describe('completeOnboarding', () => {
    it('sets onboardingComplete to true and persists', async () => {
      const { result } = renderHook(() => useOnboarding(), { wrapper });

      await waitFor(() => expect(result.current.isLoadingOnboarding).toBe(false));

      await act(async () => {
        await result.current.completeOnboarding();
      });

      expect(result.current.onboardingComplete).toBe(true);
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('onboardingComplete', 'true');
    });

    it('handles storage error during save gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Write error'));

      const { result } = renderHook(() => useOnboarding(), { wrapper });
      await waitFor(() => expect(result.current.isLoadingOnboarding).toBe(false));

      await act(async () => {
        await result.current.completeOnboarding();
      });

      // State should still be updated even if storage fails
      expect(result.current.onboardingComplete).toBe(true);
    });
  });

  describe('resetOnboarding', () => {
    it('sets onboardingComplete to false and clears related data', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

      const { result } = renderHook(() => useOnboarding(), { wrapper });

      await waitFor(() => expect(result.current.onboardingComplete).toBe(true));

      await act(async () => {
        await result.current.resetOnboarding();
      });

      expect(result.current.onboardingComplete).toBe(false);
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('onboardingComplete');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('language');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('location');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('locationDetails');
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('detectedLocationDetails');
    });

    it('handles storage error during reset gracefully', async () => {
      (AsyncStorage.removeItem as jest.Mock).mockRejectedValue(new Error('Delete error'));

      const { result } = renderHook(() => useOnboarding(), { wrapper });
      await waitFor(() => expect(result.current.isLoadingOnboarding).toBe(false));

      await act(async () => {
        await result.current.resetOnboarding();
      });

      // State should still be updated
      expect(result.current.onboardingComplete).toBe(false);
    });
  });

  describe('useOnboarding outside provider', () => {
    it('throws when used outside OnboardingProvider', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => {
        renderHook(() => useOnboarding());
      }).toThrow('useOnboarding must be used within OnboardingProvider');
      spy.mockRestore();
    });
  });
});
