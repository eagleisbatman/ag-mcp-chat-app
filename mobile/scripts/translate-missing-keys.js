/**
 * Translate ONLY missing keys to all languages
 * This avoids re-translating everything from scratch
 *
 * Run: node scripts/translate-missing-keys.js
 */

import dotenv from 'dotenv';
import { fileURLToPath as fileURLToPathDotenv } from 'url';
import { dirname, join } from 'path';

// Load .env from scripts directory
const __dirnameEnv = dirname(fileURLToPathDotenv(import.meta.url));
dotenv.config({ path: join(__dirnameEnv, '.env') });
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LANGUAGES } from './utils/languages.js';
import { deepMerge, extractJSON, flattenObject, unflattenObject } from './utils/translationHelpers.js';
import { loadEnglishStrings } from './utils/englishStrings.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRANSLATIONS_DIR = path.join(__dirname, '../constants/translations');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

async function translateStrings(strings, langInfo) {
  const prompt = `You are translating UI labels for a mobile farming assistant app called "FarmerChat".
Translate these strings from English to ${langInfo.name} (${langInfo.nativeName}).

CONTEXT:
- This is a mobile app for farmers in rural areas
- Users are farmers who may have basic literacy
- Strings include error and diagnosis messages shown to users
- Keep translations SHORT and CONCISE
- Use simple, everyday language

SOURCE STRINGS (English):
${JSON.stringify(strings, null, 2)}

STRICT REQUIREMENTS:
1. Use the correct ${langInfo.script} - this is critical
2. Keep JSON structure and keys EXACTLY the same
3. Keep {placeholder} variables unchanged: {active}, {total}, {title}, {details}, {count}, {mode}, {question}, {name}, {language}, {minutes}, {location}
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

  const englishStrings = loadEnglishStrings();
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
