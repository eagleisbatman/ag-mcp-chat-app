import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { I18nManager, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { setLocale, loadTranslations, t } from '../../constants/strings';
import { isRTLLanguage } from '../../constants/languages';
import { updatePreferences } from '../../services/db';
import { log } from '../../utils/logger';
import { Language } from '../../types';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider = ({ children, userId }: { children: ReactNode; userId: string | null }) => {
  const [language, setLanguageState] = useState<Language>({ 
    code: 'en', 
    name: 'English', 
    nativeName: 'English', 
    region: 'Europe' 
  });

  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem('language');
        if (savedLanguage) {
          const lang = JSON.parse(savedLanguage) as Language;
          setLanguageState(lang);
          setLocale(lang.code);
          await loadTranslations(lang.code);

          const needsRTL = isRTLLanguage(lang.code);
          if (I18nManager.isRTL !== needsRTL) {
            log(`🔄 [LanguageContext] Correcting RTL setting: ${I18nManager.isRTL} → ${needsRTL}`);
            I18nManager.allowRTL(needsRTL);
            I18nManager.forceRTL(needsRTL);
          }
        }
      } catch (e) {
        log('Error loading language:', e);
      }
    };
    loadLanguage();
  }, []);

  const syncLanguageToDb = async (lang: Language, retryCount = 0): Promise<void> => {
    const maxRetries = 3;
    const retryDelay = 2000;
    
    if (!userId && retryCount < maxRetries) {
      log(`⏳ [LanguageContext] Waiting for user registration for language sync... (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return syncLanguageToDb(lang, retryCount + 1);
    }
    
    if (!userId) {
      log('⚠️ [LanguageContext] Could not sync language - user not registered');
      return;
    }
    
    log('💾 [LanguageContext] Syncing language to database...');
    try {
      const result = await updatePreferences({
        languageCode: lang.code,
        languageName: lang.name,
        languageNativeName: lang.nativeName,
      });
      log('💾 [LanguageContext] Language DB sync:', result.success ? 'Success' : result.error);
    } catch (e) {
      log('❌ [LanguageContext] Language DB sync error:', e);
    }
  };

  const setLanguage = async (lang: Language) => {
    log('🌐 [LanguageContext] Saving language:', lang.name, `(${lang.code})`);
    setLanguageState(lang);

    try {
      setLocale(lang.code);
      await loadTranslations(lang.code);
      await AsyncStorage.setItem('language', JSON.stringify(lang));
    } catch (e) {
      log('Error saving language:', e);
    }

    const needsRTL = isRTLLanguage(lang.code);
    if (needsRTL !== I18nManager.isRTL) {
      I18nManager.allowRTL(needsRTL);
      I18nManager.forceRTL(needsRTL);
      
      Alert.alert(
        t('system.restartRequired'),
        t('system.restartRequiredMessage', { language: lang.name }),
        [
          {
            text: t('system.restartNow'),
            onPress: async () => {
              try {
                await Updates.reloadAsync();
              } catch (e) {
                log('⚠️ [LanguageContext] Could not reload app:', e);
                Alert.alert(t('system.pleaseRestart'), t('system.pleaseRestartMessage'));
              }
            },
          },
        ],
        { cancelable: false }
      );
    }

    syncLanguageToDb(lang);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider');
  return context;
};
