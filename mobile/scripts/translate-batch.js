/**
 * Batch translate missing keys - processes only specified languages
 * Run: node scripts/translate-batch.js hi te kn mr
 */

import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LANGUAGES } from './utils/languages.js';
import { extractJSON, flattenObject, unflattenObject } from './utils/translationHelpers.js';
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
  return strings;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('\nUsage: node scripts/translate-batch.js <lang1> <lang2> ...');
    console.log('\nExample: node scripts/translate-batch.js hi te kn mr');
    console.log('\nAvailable languages:');
    console.log(Object.keys(LANGUAGES).join(', '));
    process.exit(0);
  }

  console.log(`\n🔄 Translating missing keys for: ${args.join(', ')}\n`);

  const englishStrings = loadEnglishStrings();
  const flatEnglish = flattenObject(englishStrings);

  console.log(`📖 English strings: ${Object.keys(flatEnglish).length} total\n`);

  for (const langCode of args) {
    const langInfo = LANGUAGES[langCode];

    if (!langInfo) {
      console.log(`⏭️ Skipping ${langCode} (unknown language code)`);
      continue;
    }

    const filePath = path.join(TRANSLATIONS_DIR, `strings-${langCode}.json`);

    if (!fs.existsSync(filePath)) {
      console.log(`⏭️ Skipping ${langCode} (file not found)`);
      continue;
    }

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

    console.log(`🔄 ${langInfo.name.padEnd(25)} - ${missingCount} missing keys`);

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
    console.log(`   ✅ Updated strings-${langCode}.json`);

    // Rate limiting
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n✅ Batch complete!\n');
}

main().catch(console.error);
