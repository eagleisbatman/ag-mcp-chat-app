import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { log } from '../../utils/logger';

interface OnboardingContextValue {
  onboardingComplete: boolean;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
  isLoadingOnboarding: boolean;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [onboardingComplete, setOnboardingComplete] = useState(false);
  const [isLoadingOnboarding, setIsLoadingOnboarding] = useState(true);

  useEffect(() => {
    const loadOnboarding = async () => {
      try {
        const saved = await AsyncStorage.getItem('onboardingComplete');
        if (saved === 'true') setOnboardingComplete(true);
      } catch (e) {
        log('Error loading onboarding:', e);
      } finally {
        setIsLoadingOnboarding(false);
      }
    };
    loadOnboarding();
  }, []);

  const completeOnboarding = async () => {
    setOnboardingComplete(true);
    try {
      await AsyncStorage.setItem('onboardingComplete', 'true');
    } catch (e) {
      log('Error saving onboarding:', e);
    }
  };

  const resetOnboarding = async () => {
    setOnboardingComplete(false);
    try {
      await AsyncStorage.removeItem('onboardingComplete');
    } catch (e) {
      log('Error resetting onboarding:', e);
    }
  };

  return (
    <OnboardingContext.Provider value={{ 
      onboardingComplete, 
      completeOnboarding, 
      resetOnboarding,
      isLoadingOnboarding 
    }}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used within OnboardingProvider');
  return context;
};
