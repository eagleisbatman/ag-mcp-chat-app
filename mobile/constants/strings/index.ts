/**
 * Internationalization module
 * Provides translation functions and locale management
 */

import { en, type StringsType } from './en';
import { TRANSLATION_REGISTRY, isRTL } from './registry';
import { log } from '../../utils/logger';

const DEFAULT_LOCALE = 'en';

// Current locale - can be updated dynamically
let currentLocale = DEFAULT_LOCALE;

// Loaded translations cache
const translationsCache: Record<string, StringsType> = {};

// English strings for reference
export const STRINGS = { en };

/**
 * Set the current locale for translations
 */
export function setLocale(locale: string | null): void {
  currentLocale = locale || DEFAULT_LOCALE;
}

/**
 * Get the current locale
 */
export function getLocale(): string {
  return currentLocale;
}

/**
 * Load translations for a specific language (called at app startup)
 */
export async function loadTranslations(locale: string | null): Promise<void> {
  if (locale === 'en' || !locale) return; // English is built-in

  // Check cache first
  if (translationsCache[locale]) return;

  // Check if translation is available in registry
  const loader = TRANSLATION_REGISTRY[locale];
  if (loader) {
    try {
      translationsCache[locale] = loader();
    } catch (error) {
      log(`Failed to load translation for ${locale}, using English`);
    }
  } else {
    log(`Translation for ${locale} not available yet, using English`);
  }
}

/**
 * Navigate an object by dot-separated path
 */
function getByPath(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === 'string' ? current : undefined;
}

/**
 * Get a translated string by key
 * @param key - Dot-separated key path (e.g., 'common.back')
 * @param params - Optional parameters to interpolate (e.g., {count: 5})
 * @returns Translated string or the key if not found
 */
export function t(key: string, params?: Record<string, string | number>): string {
  // Try to get translation from current locale first
  let raw: string | undefined;

  // Check cached translations for current locale
  if (currentLocale !== 'en' && translationsCache[currentLocale]) {
    raw = getByPath(translationsCache[currentLocale] as unknown as Record<string, unknown>, key);
  }

  // Fall back to English if translation not found
  if (!raw) {
    raw = getByPath(en as unknown as Record<string, unknown>, key) ?? key;
  }

  if (!params) return raw;
  
  // Replace parameters in the string
  return Object.keys(params).reduce(
    (acc, k) => acc.replace(new RegExp(`\\{${k}\\}`, 'g'), String(params[k])),
    raw
  );
}

// Re-export utilities
export { isRTL, TRANSLATION_REGISTRY } from './registry';
export type { StringsType } from './en';
