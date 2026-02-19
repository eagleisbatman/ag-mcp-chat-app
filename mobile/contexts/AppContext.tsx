import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ThemeProvider, useTheme } from './app/ThemeContext';
import { LanguageProvider, useLanguage } from './app/LanguageContext';
import { LocationProvider, useLocation } from './app/LocationContext';
import { UserProvider, useUser } from './app/UserContext';
import { OnboardingProvider, useOnboarding } from './app/OnboardingContext';
import { OnboardingDetectionProvider, useOnboardingDetection } from './app/OnboardingDetectionContext';
import { ProfileProvider, useProfile } from './app/ProfileContext';
import { ThemeColors } from '../constants/themes';
import { ThemeMode, Language, LocationDetails, UserProfile, Farm, Animal, MasterCrop, MasterLivestock } from '../types';

interface AppContextValue {
  // From ThemeContext
  theme: ThemeColors;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  isDark: boolean;

  // From LanguageContext
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  hasUserSelectedLanguage: boolean;

  // From LocationContext
  location: { latitude: number | null; longitude: number | null };
  locationStatus: 'pending' | 'granted' | 'denied';
  locationDetails: LocationDetails | null;
  setLocation: (loc: { latitude: number | null; longitude: number | null }, status: 'pending' | 'granted' | 'denied', details?: LocationDetails) => Promise<void>;

  // From OnboardingContext
  onboardingComplete: boolean;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;

  // From OnboardingDetectionContext
  detectedLocation: LocationDetails | null;
  detectedLanguage: Language | null;
  detectedCountry: string | null;
  suggestedLanguages: Language[];
  isDetectionComplete: boolean;

  // From UserContext
  userId: string | null;
  isDbSynced: boolean;
  lastSyncError: string | null;
  clearSyncError: () => void;

  // From ProfileContext
  profile: UserProfile | null;
  farms: Farm[];
  animals: Animal[];
  masterCrops: MasterCrop[];
  masterLivestock: MasterLivestock[];
  profileSummary: string;

  // Local to AppContext
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  isLoading: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

const AppContextAggregator = ({ children }: { children: ReactNode }) => {
  const { theme, themeMode, setThemeMode, isDark } = useTheme();
  const { language, setLanguage, hasUserSelectedLanguage } = useLanguage();
  const { location, locationStatus, locationDetails, setLocation } = useLocation();
  const { userId, isDbSynced, lastSyncError, clearSyncError, isLoadingUser } = useUser();
  const { onboardingComplete, completeOnboarding, resetOnboarding, isLoadingOnboarding } = useOnboarding();
  const { detectedInfo, detectionComplete, suggestedLanguages, isDetecting } = useOnboardingDetection();
  const { profile, farms, animals, masterCrops, masterLivestock, profileSummary } = useProfile();

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const value: AppContextValue = {
    theme, themeMode, setThemeMode, isDark,
    language, setLanguage, hasUserSelectedLanguage,
    location, locationStatus, locationDetails, setLocation,
    onboardingComplete, completeOnboarding, resetOnboarding,
    detectedLocation: detectedInfo.location,
    detectedLanguage: detectedInfo.language,
    detectedCountry: detectedInfo.country,
    suggestedLanguages,
    isDetectionComplete: detectionComplete,
    userId, isDbSynced, lastSyncError, clearSyncError,
    profile, farms, animals, masterCrops, masterLivestock, profileSummary,
    currentSessionId, setCurrentSessionId,
    isLoading: isLoadingUser || isLoadingOnboarding || isDetecting,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  return (
    <UserProvider>
      <OnboardingDetectionProvider>
        <OnboardingProvider>
          <UserContextConsumer>
            {(userId, isDbSynced) => (
              <LocationProvider userId={userId}>
                <LanguageProvider userId={userId}>
                  <ThemeProvider isDbSynced={isDbSynced}>
                    <LanguageCodeConsumer>
                      {(languageCode) => (
                        <ProfileProvider userId={userId} languageCode={languageCode}>
                          <AppContextAggregator>
                            {children}
                          </AppContextAggregator>
                        </ProfileProvider>
                      )}
                    </LanguageCodeConsumer>
                  </ThemeProvider>
                </LanguageProvider>
              </LocationProvider>
            )}
          </UserContextConsumer>
        </OnboardingProvider>
      </OnboardingDetectionProvider>
    </UserProvider>
  );
};

// Helper component to consume UserContext values needed by other providers
const UserContextConsumer = ({ children }: { children: (userId: string | null, isDbSynced: boolean) => ReactNode }) => {
  const { userId, isDbSynced } = useUser();
  return <>{children(userId, isDbSynced)}</>;
};

// Helper component to consume language code for ProfileProvider
const LanguageCodeConsumer = ({ children }: { children: (languageCode: string) => ReactNode }) => {
  const { language } = useLanguage();
  return <>{children(language.code)}</>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export default AppContext;
