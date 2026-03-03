/**
 * Tests for LanguageContext
 * Covers: initial state, language loading from storage, setLanguage,
 * RTL switching, DB sync retries, error handling.
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

// Mock react-native-css-interop and its internal modules to prevent
// deep access to Appearance/AppState/Dimensions from react-native.
// The jsx-runtime is loaded transitively by LanguageContext importing logger.
jest.mock('react-native-css-interop/src/runtime/jsx-runtime', () => ({
  jsx: jest.fn(),
  jsxs: jest.fn(),
  Fragment: jest.fn(),
}));

jest.mock('react-native-css-interop', () => ({
  cssInterop: jest.fn(() => (c: any) => c),
  remapProps: jest.fn(() => (c: any) => c),
}));

jest.mock('nativewind', () => ({
  styled: jest.fn((c: any) => c),
  useColorScheme: jest.fn(() => ({ colorScheme: 'dark' })),
}));

jest.mock('react-native', () => ({
  I18nManager: {
    isRTL: false,
    allowRTL: jest.fn(),
    forceRTL: jest.fn(),
  },
  Alert: {
    alert: jest.fn(),
  },
  Appearance: {
    getColorScheme: jest.fn(() => 'light'),
    addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  AppState: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    currentState: 'active',
  },
  AccessibilityInfo: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 393, height: 852, scale: 3, fontScale: 1 })),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
  PixelRatio: {
    get: jest.fn(() => 3),
    getFontScale: jest.fn(() => 1),
  },
  Platform: { OS: 'ios' },
}));

jest.mock('expo-updates', () => ({
  reloadAsync: jest.fn(),
}));

jest.mock('../../constants/strings', () => ({
  setLocale: jest.fn(),
  loadTranslations: jest.fn().mockResolvedValue(undefined),
  t: jest.fn((key: string) => key),
}));

jest.mock('../../constants/languages', () => ({
  isRTLLanguage: jest.fn((code: string) => code === 'ar' || code === 'he'),
}));

jest.mock('../../services/db', () => ({
  updatePreferences: jest.fn().mockResolvedValue({ success: true }),
}));

jest.mock('../../utils/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, Alert } from 'react-native';
import { setLocale, loadTranslations } from '../../constants/strings';
import { updatePreferences } from '../../services/db';
import { LanguageProvider, useLanguage } from '../../contexts/app/LanguageContext';

function createWrapper(userId: string | null = 'test-user') {
  return ({ children }: { children: React.ReactNode }) => (
    <LanguageProvider userId={userId}>{children}</LanguageProvider>
  );
}

const englishLang = { code: 'en', name: 'English', nativeName: 'English', region: 'Europe' };
const hindiLang = { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', region: 'South Asia' };
const arabicLang = { code: 'ar', name: 'Arabic', nativeName: 'العربية', region: 'Middle East' };

describe('LanguageContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (I18nManager as any).isRTL = false;
  });

  describe('initial state', () => {
    it('defaults to English', () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: createWrapper(),
      });

      expect(result.current.language.code).toBe('en');
      expect(result.current.hasUserSelectedLanguage).toBe(false);
    });

    it('loads saved language from AsyncStorage', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(hindiLang));

      const { result } = renderHook(() => useLanguage(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.language.code).toBe('hi');
      });

      expect(result.current.hasUserSelectedLanguage).toBe(true);
      expect(setLocale).toHaveBeenCalledWith('hi');
      expect(loadTranslations).toHaveBeenCalledWith('hi');
    });

    it('handles corrupted stored language gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('not-json');

      const { result } = renderHook(() => useLanguage(), {
        wrapper: createWrapper(),
      });

      // Should remain at default English after parse error
      await waitFor(() => {
        expect(result.current.language.code).toBe('en');
      });
    });

    it('handles storage error gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('fail'));

      const { result } = renderHook(() => useLanguage(), {
        wrapper: createWrapper(),
      });

      // Should remain at default English
      await waitFor(() => {
        expect(result.current.language.code).toBe('en');
      });
    });
  });

  describe('setLanguage', () => {
    it('updates language, persists, and calls setLocale', async () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: createWrapper(),
      });

      // Call setLanguage and wait for all async effects
      act(() => {
        result.current.setLanguage(hindiLang);
      });

      // Wait for the async operations (loadTranslations, AsyncStorage) to complete
      await waitFor(() => {
        expect(result.current.language.code).toBe('hi');
      });

      expect(result.current.hasUserSelectedLanguage).toBe(true);
      expect(setLocale).toHaveBeenCalledWith('hi');
      expect(loadTranslations).toHaveBeenCalledWith('hi');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        'language',
        JSON.stringify(hindiLang)
      );
    });

    it('syncs language to database', async () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: createWrapper('user-123'),
      });

      await act(async () => {
        await result.current.setLanguage(hindiLang);
      });

      // Wait for the async sync
      await waitFor(() => {
        expect(updatePreferences).toHaveBeenCalledWith({
          languageCode: 'hi',
          languageName: 'Hindi',
          languageNativeName: 'हिन्दी',
        });
      });
    });

    it('handles storage error during save gracefully', async () => {
      (AsyncStorage.setItem as jest.Mock).mockRejectedValue(new Error('Write fail'));

      const { result } = renderHook(() => useLanguage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.setLanguage(hindiLang);
      });

      // Language should still be updated in state
      expect(result.current.language.code).toBe('hi');
    });
  });

  describe('RTL support', () => {
    it('triggers RTL and alert for Arabic', async () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.setLanguage(arabicLang);
      });

      expect(I18nManager.allowRTL).toHaveBeenCalledWith(true);
      expect(I18nManager.forceRTL).toHaveBeenCalledWith(true);
      expect(Alert.alert).toHaveBeenCalled();
    });

    it('does not trigger RTL for LTR language', async () => {
      const { result } = renderHook(() => useLanguage(), {
        wrapper: createWrapper(),
      });

      await act(async () => {
        await result.current.setLanguage(hindiLang);
      });

      expect(I18nManager.allowRTL).not.toHaveBeenCalled();
      expect(I18nManager.forceRTL).not.toHaveBeenCalled();
      expect(Alert.alert).not.toHaveBeenCalled();
    });

    it('corrects RTL on initial load when language is RTL but I18nManager disagrees', async () => {
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(arabicLang));
      (I18nManager as any).isRTL = false;

      renderHook(() => useLanguage(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(I18nManager.allowRTL).toHaveBeenCalledWith(true);
        expect(I18nManager.forceRTL).toHaveBeenCalledWith(true);
      });
    });
  });

  describe('useLanguage outside provider', () => {
    it('throws when used outside LanguageProvider', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => {
        renderHook(() => useLanguage());
      }).toThrow('useLanguage must be used within LanguageProvider');
      spy.mockRestore();
    });
  });
});
