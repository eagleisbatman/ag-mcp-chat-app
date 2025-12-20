/**
 * Translate ONLY missing keys to all languages
 * This avoids re-translating everything from scratch
 *
 * Run: node scripts/translate-missing-keys.js
 */

import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRANSLATIONS_DIR = path.join(__dirname, '../constants/translations');

// All supported languages
const LANGUAGES = {
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
  sw: { name: 'Swahili', nativeName: 'Kiswahili', script: 'Latin script' },
  am: { name: 'Amharic', nativeName: 'አማርኛ', script: 'Ethiopic script' },
  aa: { name: 'Afar', nativeName: 'Qafar', script: 'Latin script' },
  om: { name: 'Oromo', nativeName: 'Afaan Oromoo', script: 'Latin script' },
  ti: { name: 'Tigrinya', nativeName: 'ትግርኛ', script: 'Ethiopic script' },
  ha: { name: 'Hausa', nativeName: 'Hausa', script: 'Latin script' },
  yo: { name: 'Yoruba', nativeName: 'Yorùbá', script: 'Latin script' },
  zu: { name: 'Zulu', nativeName: 'isiZulu', script: 'Latin script' },
  ig: { name: 'Igbo', nativeName: 'Igbo', script: 'Latin script' },
  rw: { name: 'Kinyarwanda', nativeName: 'Ikinyarwanda', script: 'Latin script' },
  so: { name: 'Somali', nativeName: 'Soomaali', script: 'Latin script' },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt', script: 'Latin with diacritics' },
  th: { name: 'Thai', nativeName: 'ไทย', script: 'Thai script' },
  id: { name: 'Indonesian', nativeName: 'Bahasa Indonesia', script: 'Latin script' },
  fil: { name: 'Filipino', nativeName: 'Filipino', script: 'Latin script' },
  ms: { name: 'Malay', nativeName: 'Bahasa Melayu', script: 'Latin script' },
  my: { name: 'Burmese', nativeName: 'မြန်မာ', script: 'Myanmar script' },
  km: { name: 'Khmer', nativeName: 'ខ្មែរ', script: 'Khmer script' },
  lo: { name: 'Lao', nativeName: 'ລາວ', script: 'Lao script' },
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
  ar: { name: 'Arabic', nativeName: 'العربية', script: 'Arabic script (RTL)' },
  fa: { name: 'Persian', nativeName: 'فارسی', script: 'Perso-Arabic script (RTL)' },
  tr: { name: 'Turkish', nativeName: 'Türkçe', script: 'Latin script' },
  he: { name: 'Hebrew', nativeName: 'עברית', script: 'Hebrew script (RTL)' },
  ur: { name: 'Urdu', nativeName: 'اردو', script: 'Nastaliq script (RTL)' },
  'zh-CN': { name: 'Chinese (Simplified)', nativeName: '简体中文', script: 'Simplified Chinese' },
  'zh-TW': { name: 'Chinese (Traditional)', nativeName: '繁體中文', script: 'Traditional Chinese' },
  ja: { name: 'Japanese', nativeName: '日本語', script: 'Japanese script' },
  ko: { name: 'Korean', nativeName: '한국어', script: 'Hangul script' },
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

// Deep merge two objects
function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

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

async function translateStrings(strings, langInfo) {
  const prompt = `You are translating UI labels for a mobile farming assistant app called "FarmerChat".
Translate these strings from English to ${langInfo.name} (${langInfo.nativeName}).

CONTEXT:
- This is a mobile app for farmers in rural areas
- Users are farmers who may have basic literacy
- Keep translations SHORT and CONCISE
- Use simple, everyday language

SOURCE STRINGS (English):
${JSON.stringify(strings, null, 2)}

STRICT REQUIREMENTS:
1. Use the correct ${langInfo.script} - this is critical
2. Keep JSON structure and keys EXACTLY the same
3. Keep {placeholder} variables unchanged: {active}, {total}, {title}, {details}, {count}, {mode}, {question}, {name}, {language}
4. Keep "FarmerChat" unchanged (brand name)
5. Keep emoji characters unchanged
6. Translations must be natural and culturally appropriate

Return ONLY valid JSON with translated values. No explanation needed.`;

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
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  🔄 Translating MISSING KEYS to all languages              ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  // Load English strings
  const englishFile = path.join(TRANSLATIONS_DIR, 'strings-en.json');
  const englishStrings = JSON.parse(fs.readFileSync(englishFile, 'utf8'));
  const flatEnglish = flattenObject(englishStrings);

  console.log(`📖 English strings: ${Object.keys(flatEnglish).length} total\n`);

  // Find all translation files (excluding English)
  const files = fs.readdirSync(TRANSLATIONS_DIR)
    .filter(f => f.startsWith('strings-') && f.endsWith('.json') && f !== 'strings-en.json');

  console.log(`📁 Found ${files.length} translation files to check\n`);

  let totalMissing = 0;
  let totalUpdated = 0;

  for (const file of files) {
    const langCode = file.replace('strings-', '').replace('.json', '');
    const langInfo = LANGUAGES[langCode];

    if (!langInfo) {
      console.log(`⏭️ Skipping ${file} (unknown language code)`);
      continue;
    }

    const filePath = path.join(TRANSLATIONS_DIR, file);
    const existingStrings = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const flatExisting = flattenObject(existingStrings);

    // Find missing keys
    const missingKeys = {};
    for (const [key, value] of Object.entries(flatEnglish)) {
      if (!(key in flatExisting)) {
        missingKeys[key] = value;
      }
    }

    const missingCount = Object.keys(missingKeys).length;

    if (missingCount === 0) {
      console.log(`✅ ${langInfo.name.padEnd(25)} - all keys present`);
      continue;
    }

    totalMissing += missingCount;
    console.log(`\n🔄 ${langInfo.name.padEnd(25)} - ${missingCount} missing keys`);
    console.log(`   Keys: ${Object.keys(missingKeys).join(', ')}`);

    // Translate missing keys
    const translations = await translateStrings(missingKeys, langInfo);

    // Merge translations into existing file
    const flatMerged = { ...flatExisting, ...translations };
    const nestedMerged = unflattenObject(flatMerged);

    // Preserve section order from English
    const orderedMerged = {};
    for (const section of Object.keys(englishStrings)) {
      if (nestedMerged[section]) {
        orderedMerged[section] = nestedMerged[section];
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(orderedMerged, null, 2));
    console.log(`   ✅ Updated ${file}`);
    totalUpdated++;

    // Rate limiting
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log(`║  ✅ Done! ${totalMissing} missing keys translated                    ║`);
  console.log(`║  📁 ${totalUpdated} files updated                                    ║`);
  console.log('╚════════════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);
