/**
 * OnboardingDetectionContext
 * Handles early IP-based location and language detection during app loading
 * to show onboarding screens in the user's detected language
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { lookupLocation } from '../../services/db';
import { getSuggestedLanguages, LANGUAGES, Language } from '../../constants/languages';
import { setLocale, loadTranslations } from '../../constants/strings';
import { log } from '../../utils/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocationDetails } from '../../types';

interface DetectedInfo {
  location: LocationDetails | null;
  language: Language | null;
  country: string | null;
}

interface OnboardingDetectionContextValue {
  detectedInfo: DetectedInfo;
  isDetecting: boolean;
  detectionComplete: boolean;
  suggestedLanguages: Language[];
}

const OnboardingDetectionContext = createContext<OnboardingDetectionContextValue | null>(null);

const normalizeLocaleToLanguageCode = (locale: string): string => {
  const normalized = locale.replace('_', '-').toLowerCase();
  const parts = normalized.split('-');
  const base = parts[0];
  const region = parts[1];

  const aliases: Record<string, string> = {
    tl: 'fil',
    iw: 'he',
    in: 'id',
  };

  const mappedBase = aliases[base] || base;

  if (mappedBase === 'zh') {
    if (region && ['tw', 'hk', 'mo'].includes(region)) {
      return 'zh-TW';
    }
    return 'zh-CN';
  }

  return mappedBase;
};

const getDeviceLanguageCode = (): string | null => {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    if (!locale) return null;
    return normalizeLocaleToLanguageCode(locale);
  } catch {
    return null;
  }
};

const pickDetectedLanguage = (suggested: Language[]): Language | null => {
  if (!suggested.length) return null;
  const deviceLang = getDeviceLanguageCode();
  if (deviceLang) {
    const match = suggested.find(lang => lang.code.toLowerCase() === deviceLang.toLowerCase());
    if (match) return match;
  }
  return suggested[0];
};

export const OnboardingDetectionProvider = ({ children }: { children: ReactNode }) => {
  const [detectedInfo, setDetectedInfo] = useState<DetectedInfo>({
    location: null,
    language: null,
    country: null,
  });
  const [isDetecting, setIsDetecting] = useState(true);
  const [detectionComplete, setDetectionComplete] = useState(false);
  const [suggestedLanguages, setSuggestedLanguages] = useState<Language[]>([]);

  useEffect(() => {
    const detectLocationAndLanguage = async () => {
      try {
        // Check if user has already saved a language AND completed onboarding
        const [savedLanguage, onboardingComplete] = await Promise.all([
          AsyncStorage.getItem('language'),
          AsyncStorage.getItem('onboardingComplete'),
        ]);

        // Only skip detection if user has both a saved language AND has completed onboarding
        // This ensures detection runs fresh after onboarding reset
        if (savedLanguage && onboardingComplete === 'true') {
          const lang = JSON.parse(savedLanguage) as Language;
          log('🌐 [OnboardingDetection] Returning user with saved language:', lang.code);
          setLocale(lang.code);
          await loadTranslations(lang.code);
          setDetectionComplete(true);
          setIsDetecting(false);
          return;
        }

        // Clear any stale data if onboarding was reset
        if (onboardingComplete !== 'true') {
          log('🌐 [OnboardingDetection] Onboarding not complete, clearing stale data for fresh detection');
          await Promise.all([
            AsyncStorage.removeItem('language'),
            AsyncStorage.removeItem('locationDetails'),
            AsyncStorage.removeItem('detectedLocationDetails'),
          ]);
        }

        // Check if user has saved location details
        const savedLocationDetails = await AsyncStorage.getItem('locationDetails');
        if (savedLocationDetails) {
          const locationDetails = JSON.parse(savedLocationDetails) as LocationDetails;
          const country = locationDetails.level1Country;
          log('🌐 [OnboardingDetection] Using saved location, country:', country);

          const suggested = getSuggestedLanguages(country);
          setSuggestedLanguages(suggested);

          if (suggested.length > 0) {
            const detectedLang = pickDetectedLanguage(suggested);
            if (!detectedLang) {
              setDetectionComplete(true);
              setIsDetecting(false);
              return;
            }
            log('🌐 [OnboardingDetection] Detected language from saved location:', detectedLang.code);

            setDetectedInfo({
              location: locationDetails,
              language: detectedLang,
              country: country || null,
            });

            // Load translations for detected language
            setLocale(detectedLang.code);
            await loadTranslations(detectedLang.code);
          }

          setDetectionComplete(true);
          setIsDetecting(false);
          return;
        }

        // No saved data, detect via IP
        log('🌐 [OnboardingDetection] Starting IP-based detection...');
        const result = await lookupLocation(null, null, 'auto');

        if (result.success) {
          const country = result.level1Country;
          log('🌐 [OnboardingDetection] IP location detected, country:', country);

          const locationDetails: LocationDetails = {
            ...result,
            latitude: result.latitude ?? 0,
            longitude: result.longitude ?? 0,
            displayName: result.displayName || result.level5City || result.level3District || result.level2State || country || 'Unknown',
            source: 'ip',
          };

          // Get suggested languages for this country
          const suggested = getSuggestedLanguages(country);
          setSuggestedLanguages(suggested);

          if (suggested.length > 0) {
            const detectedLang = pickDetectedLanguage(suggested);
            if (!detectedLang) {
              setDetectionComplete(true);
              setIsDetecting(false);
              return;
            }
            log('🌐 [OnboardingDetection] Detected language:', detectedLang.code, 'for country:', country);

            setDetectedInfo({
              location: locationDetails,
              language: detectedLang,
              country: country || null,
            });

            // Load translations for detected language
            setLocale(detectedLang.code);
            await loadTranslations(detectedLang.code);

            // Save detected location for later use (but not language - user will confirm that)
            await AsyncStorage.setItem('detectedLocationDetails', JSON.stringify(locationDetails));
          } else {
            // Fallback to English
            const english = LANGUAGES.find(l => l.code === 'en');
            setDetectedInfo({
              location: locationDetails,
              language: english || null,
              country: country || null,
            });
            setSuggestedLanguages(english ? [english] : []);
          }
        } else {
          log('⚠️ [OnboardingDetection] IP detection failed, using English');
          const english = LANGUAGES.find(l => l.code === 'en');
          setDetectedInfo({
            location: null,
            language: english || null,
            country: null,
          });
          setSuggestedLanguages(english ? [english] : []);
        }
      } catch (error) {
        log('❌ [OnboardingDetection] Detection error:', error);
        const english = LANGUAGES.find(l => l.code === 'en');
        setDetectedInfo({
          location: null,
          language: english || null,
          country: null,
        });
        setSuggestedLanguages(english ? [english] : []);
      } finally {
        setDetectionComplete(true);
        setIsDetecting(false);
      }
    };

    detectLocationAndLanguage();
  }, []);

  return (
    <OnboardingDetectionContext.Provider
      value={{
        detectedInfo,
        isDetecting,
        detectionComplete,
        suggestedLanguages,
      }}
    >
      {children}
    </OnboardingDetectionContext.Provider>
  );
};

export const useOnboardingDetection = () => {
  const context = useContext(OnboardingDetectionContext);
  if (!context) {
    throw new Error('useOnboardingDetection must be used within OnboardingDetectionProvider');
  }
  return context;
};
