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
import { LANGUAGES } from './utils/languages.js';
import { extractJSON, flattenObject, unflattenObject } from './utils/translationHelpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '../constants/translations');

// Get language from command line
const targetLang = process.argv[2];
if (!targetLang) {
  console.error('Usage: node translate-strings.js <lang_code>');
  console.error('Example: node translate-strings.js am');
  process.exit(1);
}


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


async function translateStrings(strings, section) {
  const prompt = `You are translating UI labels for a mobile farming assistant app called "FarmerChat".
Translate these strings from English to ${langInfo.name} (${langInfo.nativeName}).

CONTEXT:
- This is a mobile app for farmers in rural areas
- Strings are used for: buttons, labels, error messages, tooltips, accessibility
- Users are farmers who may have basic literacy
- Strings include error and diagnosis messages shown to users
- Keep translations SHORT and CONCISE (similar length to English)
- Use simple, everyday language that farmers understand

SOURCE STRINGS (English):
${JSON.stringify(strings, null, 2)}

STRICT REQUIREMENTS:
1. Use the correct ${langInfo.script} - this is critical
2. Keep JSON structure and keys EXACTLY the same (only translate values)
3. Keep {placeholder} variables unchanged: {active}, {total}, {title}, {details}, {count}, {mode}, {question}, {name}, {minutes}, {location}
4. Keep "FarmerChat" unchanged (brand name)
5. Keep emoji characters unchanged (👋, etc.)
6. Translations must be natural and culturally appropriate
7. For section "${section}": these are ${section === 'a11y' ? 'accessibility labels for screen readers' : section === 'errors' ? 'error messages shown to users' : section === 'diagnosis' ? 'plant diagnosis messages and guidance' : 'UI labels and messages'}
8. Keep button labels short (1-3 words ideally)

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
  const sections = ['common', 'onboarding', 'chat', 'media', 'voice', 'history', 'settings', 'mcp', 'system', 'errors', 'diagnosis', 'a11y'];
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
