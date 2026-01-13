/**
 * Translation registry - maps language codes to translation loaders
 * Translations are loaded dynamically to reduce bundle size
 */

import type { StringsType } from './en';

type TranslationLoader = () => StringsType;

/**
 * Static import registry for translations
 * Uncomment languages as translation files are created
 * After running: node scripts/translate-strings.js <lang_code>
 */
export const TRANSLATION_REGISTRY: Record<string, TranslationLoader> = {
  // Priority Languages (Digital Green focus regions) - TRANSLATED
  hi: () => require('../translations/strings-hi.json'),    // Hindi
  te: () => require('../translations/strings-te.json'),    // Telugu
  kn: () => require('../translations/strings-kn.json'),    // Kannada
  sw: () => require('../translations/strings-sw.json'),    // Swahili
  am: () => require('../translations/strings-am.json'),    // Amharic
  om: () => require('../translations/strings-om.json'),    // Oromo
  vi: () => require('../translations/strings-vi.json'),    // Vietnamese
  fr: () => require('../translations/strings-fr.json'),    // French
  es: () => require('../translations/strings-es.json'),    // Spanish
  ar: () => require('../translations/strings-ar.json'),    // Arabic (RTL)

  // Indian Languages - TRANSLATED
  mr: () => require('../translations/strings-mr.json'),    // Marathi
  gu: () => require('../translations/strings-gu.json'),    // Gujarati
  ta: () => require('../translations/strings-ta.json'),    // Tamil
  bn: () => require('../translations/strings-bn.json'),    // Bengali
  ml: () => require('../translations/strings-ml.json'),    // Malayalam
  pa: () => require('../translations/strings-pa.json'),    // Punjabi
  or: () => require('../translations/strings-or.json'),    // Odia
  as: () => require('../translations/strings-as.json'),    // Assamese
  ne: () => require('../translations/strings-ne.json'),    // Nepali

  // African Languages - TRANSLATED
  aa: () => require('../translations/strings-aa.json'),    // Afar
  ti: () => require('../translations/strings-ti.json'),    // Tigrinya
  ha: () => require('../translations/strings-ha.json'),    // Hausa
  yo: () => require('../translations/strings-yo.json'),    // Yoruba
  zu: () => require('../translations/strings-zu.json'),    // Zulu
  ig: () => require('../translations/strings-ig.json'),    // Igbo
  rw: () => require('../translations/strings-rw.json'),    // Kinyarwanda
  so: () => require('../translations/strings-so.json'),    // Somali

  // Southeast Asian Languages - TRANSLATED
  th: () => require('../translations/strings-th.json'),    // Thai
  id: () => require('../translations/strings-id.json'),    // Indonesian
  fil: () => require('../translations/strings-fil.json'),  // Filipino
  ms: () => require('../translations/strings-ms.json'),    // Malay
  my: () => require('../translations/strings-my.json'),    // Burmese
  km: () => require('../translations/strings-km.json'),    // Khmer
  lo: () => require('../translations/strings-lo.json'),    // Lao

  // European Languages - TRANSLATED
  de: () => require('../translations/strings-de.json'),    // German
  pt: () => require('../translations/strings-pt.json'),    // Portuguese
  it: () => require('../translations/strings-it.json'),    // Italian
  nl: () => require('../translations/strings-nl.json'),    // Dutch
  pl: () => require('../translations/strings-pl.json'),    // Polish
  uk: () => require('../translations/strings-uk.json'),    // Ukrainian
  ru: () => require('../translations/strings-ru.json'),    // Russian
  ro: () => require('../translations/strings-ro.json'),    // Romanian
  el: () => require('../translations/strings-el.json'),    // Greek
  cs: () => require('../translations/strings-cs.json'),    // Czech
  sv: () => require('../translations/strings-sv.json'),    // Swedish

  // Middle Eastern Languages - TRANSLATED
  fa: () => require('../translations/strings-fa.json'),    // Persian (RTL)
  tr: () => require('../translations/strings-tr.json'),    // Turkish
  he: () => require('../translations/strings-he.json'),    // Hebrew (RTL)
  ur: () => require('../translations/strings-ur.json'),    // Urdu (RTL)

  // East Asian Languages - TRANSLATED
  'zh-CN': () => require('../translations/strings-zh-CN.json'), // Chinese (Simplified)
  'zh-TW': () => require('../translations/strings-zh-TW.json'), // Chinese (Traditional)
  ja: () => require('../translations/strings-ja.json'),    // Japanese
  ko: () => require('../translations/strings-ko.json'),    // Korean
};

/**
 * RTL (Right-to-Left) languages
 */
export const RTL_LANGUAGES = ['ar', 'fa', 'he', 'ur'];

/**
 * Check if a language is RTL
 */
export function isRTL(locale: string): boolean {
  return RTL_LANGUAGES.includes(locale);
}
