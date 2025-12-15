/**
 * Translate UI strings to a specific language using Gemini API
 * Run: node scripts/translate-strings.js <lang_code>
 *
 * Example:
 *   node scripts/translate-strings.js am   # Amharic
 *   node scripts/translate-strings.js sw   # Swahili
 *   node scripts/translate-strings.js hi   # Hindi
 *   node scripts/translate-strings.js vi   # Vietnamese
 */

import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STRINGS_DIR = path.join(__dirname, '../constants');
const OUTPUT_DIR = path.join(__dirname, '../constants/translations');

// Get language from command line
const targetLang = process.argv[2];
if (!targetLang) {
  console.error('Usage: node translate-strings.js <lang_code>');
  console.error('Example: node translate-strings.js am');
  process.exit(1);
}

// All supported languages with native names and script info
const LANGUAGES = {
  // Indian Languages
  hi: { name: 'Hindi', nativeName: 'हिन्दी', script: 'Devanagari script' },
  te: { name: 'Telugu', nativeName: 'తెలుగు', script: 'Telugu script' },
  kn: { name: 'Kannada', nativeName: 'ಕನ್ನಡ', script: 'Kannada script' },
  mr: { name: 'Marathi', nativeName: 'मराठी', script: 'Devanagari script' },
  gu: { name: 'Gujarati', nativeName: 'ગુજરાતી', script: 'Gujarati script' },
  ta: { name: 'Tamil', nativeName: 'தமிழ்', script: 'Tamil script' },
  bn: { name: 'Bengali', nativeName: 'বাংলা', script: 'Bengali script' },
  ml: { name: 'Malayalam', nativeName: 'മലയാളം', script: 'Malayalam script' },
  pa: { name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', script: 'Gurmukhi script' },
  or: { name: 'Odia', nativeName: 'ଓଡ଼ିଆ', script: 'Odia script' },
  as: { name: 'Assamese', nativeName: 'অসমীয়া', script: 'Assamese script' },
  ne: { name: 'Nepali', nativeName: 'नेपाली', script: 'Devanagari script' },

  // African Languages
  sw: { name: 'Swahili', nativeName: 'Kiswahili', script: 'Latin script' },
  am: { name: 'Amharic', nativeName: 'አማርኛ', script: 'Ethiopic script (Ge\'ez)' },
  aa: { name: 'Afar', nativeName: 'Qafar', script: 'Latin script' },
  om: { name: 'Oromo', nativeName: 'Afaan Oromoo', script: 'Latin script (Qubee)' },
  ti: { name: 'Tigrinya', nativeName: 'ትግርኛ', script: 'Ethiopic script (Ge\'ez)' },
  ha: { name: 'Hausa', nativeName: 'Hausa', script: 'Latin script' },
  yo: { name: 'Yoruba', nativeName: 'Yorùbá', script: 'Latin script with diacritics' },
  zu: { name: 'Zulu', nativeName: 'isiZulu', script: 'Latin script' },
  ig: { name: 'Igbo', nativeName: 'Igbo', script: 'Latin script' },
  rw: { name: 'Kinyarwanda', nativeName: 'Ikinyarwanda', script: 'Latin script' },
  so: { name: 'Somali', nativeName: 'Soomaali', script: 'Latin script' },

  // Southeast Asian Languages
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', script: 'Latin with diacritics' },
  th: { name: 'Thai', nativeName: 'ไทย', script: 'Thai script' },
  id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia', script: 'Latin script' },
  fil: { name: 'Filipino', nativeName: 'Filipino', script: 'Latin script' },
  ms: { name: 'Malay', nativeName: 'Bahasa Melayu', script: 'Latin script' },
  my: { name: 'Burmese', nativeName: 'မြန်မာ', script: 'Myanmar script' },
  km: { name: 'Khmer', nativeName: 'ខ្មែរ', script: 'Khmer script' },
  lo: { name: 'Lao', nativeName: 'ລາວ', script: 'Lao script' },

  // European Languages
  es: { name: 'Spanish', nativeName: 'Español', script: 'Latin script' },
  fr: { name: 'French', nativeName: 'Français', script: 'Latin script' },
  de: { name: 'German', nativeName: 'Deutsch', script: 'Latin script' },
  pt: { name: 'Portuguese', nativeName: 'Português', script: 'Latin script' },
  it: { name: 'Italian', nativeName: 'Italiano', script: 'Latin script' },
  nl: { name: 'Dutch', nativeName: 'Nederlands', script: 'Latin script' },
  pl: { name: 'Polish', nativeName: 'Polski', script: 'Latin script' },
  uk: { name: 'Ukrainian', nativeName: 'Українська', script: 'Cyrillic script' },
  ru: { name: 'Russian', nativeName: 'Русский', script: 'Cyrillic script' },
  ro: { name: 'Romanian', nativeName: 'Română', script: 'Latin script' },
  el: { name: 'Greek', nativeName: 'Ελληνικά', script: 'Greek script' },
  cs: { name: 'Czech', nativeName: 'Čeština', script: 'Latin script' },
  sv: { name: 'Swedish', nativeName: 'Svenska', script: 'Latin script' },

  // Middle Eastern Languages
  ar: { name: 'Arabic', nativeName: 'العربية', script: 'Arabic script (RTL)' },
  fa: { name: 'Persian', nativeName: 'فارسی', script: 'Perso-Arabic script (RTL)' },
  tr: { name: 'Turkish', nativeName: 'Türkçe', script: 'Latin script' },
  he: { name: 'Hebrew', nativeName: 'עברית', script: 'Hebrew script (RTL)' },
  ur: { name: 'Urdu', nativeName: 'اردو', script: 'Nastaliq script (RTL)' },

  // East Asian Languages
  'zh-CN': { name: 'Chinese (Simplified)', nativeName: '简体中文', script: 'Simplified Chinese characters' },
  'zh-TW': { name: 'Chinese (Traditional)', nativeName: '繁體中文', script: 'Traditional Chinese characters' },
  ja: { name: 'Japanese', nativeName: '日本語', script: 'Japanese script (Kanji, Hiragana, Katakana)' },
  ko: { name: 'Korean', nativeName: '한국어', script: 'Hangul script' },
};

if (!LANGUAGES[targetLang]) {
  console.error(`Unknown language: ${targetLang}`);
  console.error('Available languages:', Object.keys(LANGUAGES).join(', '));
  process.exit(1);
}

const langInfo = LANGUAGES[targetLang];
console.log(`\n🌍 Translating UI strings to ${langInfo.name} (${langInfo.nativeName})...\n`);

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

function extractJSON(text) {
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  let depth = 0, start = -1;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{' && start === -1) { start = i; depth = 1; }
    else if (start !== -1) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) {
          let jsonStr = text.substring(start, i + 1);
          jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
          return jsonStr;
        }
      }
    }
  }
  return text.trim();
}

// Flatten nested object to dot notation
function flattenObject(obj, prefix = '') {
  return Object.keys(obj).reduce((acc, key) => {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
      Object.assign(acc, flattenObject(obj[key], newKey));
    } else {
      acc[newKey] = obj[key];
    }
    return acc;
  }, {});
}

// Unflatten dot notation back to nested object
function unflattenObject(obj) {
  const result = {};
  for (const key of Object.keys(obj)) {
    const keys = key.split('.');
    let current = result;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) current[keys[i]] = {};
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = obj[key];
  }
  return result;
}

async function translateStrings(strings, section) {
  const prompt = `Translate these UI strings from English to ${langInfo.name} (${langInfo.nativeName}).

SOURCE STRINGS (English):
${JSON.stringify(strings, null, 2)}

REQUIREMENTS:
1. Use the correct ${langInfo.script}
2. Keep the JSON structure and keys EXACTLY the same
3. Only translate the VALUES, not the keys
4. Keep any {placeholder} variables unchanged (e.g., {active}, {total})
5. Keep technical terms like "FarmerChat" unchanged
6. Translations should be natural and conversational
7. Context: This is for a mobile farming assistant app

Return ONLY valid JSON with translated values.`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonStr = extractJSON(text);
      return JSON.parse(jsonStr);
    } catch (error) {
      console.log(`    ⚠️ Attempt ${attempt}/3 failed: ${error.message}`);
      if (attempt < 3) await new Promise(r => setTimeout(r, 2000));
    }
  }
  return strings; // Return original on failure
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log(`║  🌍 Translating to ${langInfo.name.padEnd(30)}       ║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Import the English strings
  const stringsModule = await import('../constants/strings.js');
  const englishStrings = stringsModule.STRINGS.en;

  console.log('📖 Loaded English strings\n');

  // Flatten for easier translation
  const flatStrings = flattenObject(englishStrings);
  console.log(`📊 Total strings to translate: ${Object.keys(flatStrings).length}\n`);

  // Translate in sections to avoid token limits
  const sections = ['common', 'onboarding', 'chat', 'media', 'voice', 'history', 'settings', 'mcp', 'system', 'a11y'];
  const allTranslations = {};

  for (const section of sections) {
    const sectionStrings = {};
    for (const [key, value] of Object.entries(flatStrings)) {
      if (key.startsWith(section + '.')) {
        sectionStrings[key] = value;
      }
    }

    if (Object.keys(sectionStrings).length === 0) continue;

    console.log(`📂 Translating ${section.toUpperCase()} (${Object.keys(sectionStrings).length} strings)...`);

    const translations = await translateStrings(sectionStrings, section);
    Object.assign(allTranslations, translations);

    console.log(`   ✅ Done\n`);
    await new Promise(r => setTimeout(r, 1000)); // Rate limiting
  }

  // Unflatten back to nested structure
  const nestedTranslations = unflattenObject(allTranslations);

  // Save translation file
  const outputFile = path.join(OUTPUT_DIR, `strings-${targetLang}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(nestedTranslations, null, 2));

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log(`║  ✅ Translated ${Object.keys(flatStrings).length} strings to ${langInfo.name.padEnd(20)}   ║`);
  console.log(`║  📁 Saved to: translations/strings-${targetLang}.json            ║`);
  console.log('╚════════════════════════════════════════════════════════════╝');
}

main().catch(console.error);
