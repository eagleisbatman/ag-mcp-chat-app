import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ThemeProvider, useTheme } from './app/ThemeContext';
import { LanguageProvider, useLanguage } from './app/LanguageContext';
import { LocationProvider, useLocation } from './app/LocationContext';
import { UserProvider, useUser } from './app/UserContext';
import { OnboardingProvider, useOnboarding } from './app/OnboardingContext';
import { ThemeColors } from '../constants/themes';
import { ThemeMode, Language, LocationDetails } from '../types';

interface AppContextValue {
  // From ThemeContext
  theme: ThemeColors;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  isDark: boolean;
  
  // From LanguageContext
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  
  // From LocationContext
  location: { latitude: number | null; longitude: number | null };
  locationStatus: 'pending' | 'granted' | 'denied';
  locationDetails: LocationDetails | null;
  setLocation: (loc: { latitude: number | null; longitude: number | null }, status: 'pending' | 'granted' | 'denied') => Promise<void>;
  
  // From OnboardingContext
  onboardingComplete: boolean;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  
  // From UserContext
  userId: string | null;
  isDbSynced: boolean;
  lastSyncError: string | null;
  clearSyncError: () => void;
  
  // Local to AppContext
  currentSessionId: string | null;
  setCurrentSessionId: (id: string | null) => void;
  isLoading: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

const AppContextAggregator = ({ children }: { children: ReactNode }) => {
  const { theme, themeMode, setThemeMode, isDark } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { location, locationStatus, locationDetails, setLocation } = useLocation();
  const { userId, isDbSynced, lastSyncError, clearSyncError, isLoadingUser } = useUser();
  const { onboardingComplete, completeOnboarding, resetOnboarding, isLoadingOnboarding } = useOnboarding();
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const value: AppContextValue = {
    theme, themeMode, setThemeMode, isDark,
    language, setLanguage,
    location, locationStatus, locationDetails, setLocation,
    onboardingComplete, completeOnboarding, resetOnboarding,
    userId, isDbSynced, lastSyncError, clearSyncError,
    currentSessionId, setCurrentSessionId,
    isLoading: isLoadingUser || isLoadingOnboarding,
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
      <OnboardingProvider>
        <UserContextConsumer>
          {(userId, isDbSynced) => (
            <LocationProvider userId={userId}>
              <LanguageProvider userId={userId}>
                <ThemeProvider isDbSynced={isDbSynced}>
                  <AppContextAggregator>
                    {children}
                  </AppContextAggregator>
                </ThemeProvider>
              </LanguageProvider>
            </LocationProvider>
          )}
        </UserContextConsumer>
      </OnboardingProvider>
    </UserProvider>
  );
};

// Helper component to consume UserContext values needed by other providers
const UserContextConsumer = ({ children }: { children: (userId: string | null, isDbSynced: boolean) => ReactNode }) => {
  const { userId, isDbSynced } = useUser();
  return <>{children(userId, isDbSynced)}</>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};

export default AppContext;
