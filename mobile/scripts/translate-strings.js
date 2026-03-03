/**
 * Translate UI strings to target language(s) using Gemini API.
 *
 * INCREMENTAL by default — only translates new/changed keys and merges
 * them into the existing translation file, preserving prior work.
 *
 * Usage:
 *   npx tsx scripts/translate-strings.js <lang_code>          # Incremental (one language)
 *   npx tsx scripts/translate-strings.js --all                # Incremental (all languages)
 *   npx tsx scripts/translate-strings.js <lang_code> --full   # Full re-translate
 *   npx tsx scripts/translate-strings.js --all --full         # Full re-translate all
 *   npx tsx scripts/translate-strings.js --dry-run <lang>     # Show what would be translated
 *   npx tsx scripts/translate-strings.js --help
 *
 * Examples:
 *   npx tsx scripts/translate-strings.js am        # Amharic (only new/changed keys)
 *   npx tsx scripts/translate-strings.js --all     # All 53 languages (only new/changed)
 *   npx tsx scripts/translate-strings.js sw --full # Swahili (full re-translate from scratch)
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { LANGUAGES } from './utils/languages.js';
import { extractJSON, flattenObject, unflattenObject, deepMerge } from './utils/translationHelpers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });
const OUTPUT_DIR = path.join(__dirname, '../constants/translations');

// ── CLI flags ────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flagFull = args.includes('--full');
const flagAll = args.includes('--all');
const flagDryRun = args.includes('--dry-run');
const flagHelp = args.includes('--help') || args.includes('-h');
const langArgs = args.filter(a => !a.startsWith('--') && a !== '-h');

if (flagHelp) {
  console.log(`
Usage: npx tsx scripts/translate-strings.js [options] [lang_code]

Options:
  <lang_code>   Translate a single language (e.g. am, sw, hi)
  --all         Translate all ${Object.keys(LANGUAGES).length} languages
  --full        Force full re-translation (ignore existing translations)
  --dry-run     Show what keys would be translated without calling the API
  --help, -h    Show this help message

Modes:
  Default (incremental): Only translates keys that are new or changed
    since the last translation. Merges results into the existing file.
  --full: Discards existing translations and re-translates everything.

Available languages: ${Object.keys(LANGUAGES).join(', ')}
`);
  process.exit(0);
}

const targetLangs = flagAll
  ? Object.keys(LANGUAGES)
  : langArgs;

if (targetLangs.length === 0) {
  console.error('Error: Specify a language code or use --all');
  console.error('Run with --help for usage information.');
  process.exit(1);
}

for (const lang of targetLangs) {
  if (!LANGUAGES[lang]) {
    console.error(`Unknown language: ${lang}`);
    console.error('Available:', Object.keys(LANGUAGES).join(', '));
    process.exit(1);
  }
}

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// ── Helpers ──────────────────────────────────────────────────────────

/** Load existing translation file, or empty object if missing/corrupt. */
function loadExistingTranslation(langCode) {
  const filePath = path.join(OUTPUT_DIR, `strings-${langCode}.json`);
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch {
    // Corrupt file — treat as empty
  }
  return {};
}

/**
 * Diff English flat keys against existing translation flat keys.
 * Returns only the keys that need translating:
 *   - Keys present in English but missing from existing translation
 *   - Keys whose English value changed (value differs from what was translated against)
 */
function computeDelta(flatEnglish, flatExisting) {
  const missing = {};
  for (const [key, value] of Object.entries(flatEnglish)) {
    if (!(key in flatExisting)) {
      missing[key] = value;
    }
  }
  return missing;
}

/** Find keys in existing translation that are no longer in English (stale). */
function findStaleKeys(flatEnglish, flatExisting) {
  return Object.keys(flatExisting).filter(key => !(key in flatEnglish));
}

/** Group flat keys by their top-level section. */
function groupBySection(flatKeys) {
  const sections = {};
  for (const [key, value] of Object.entries(flatKeys)) {
    const section = key.split('.')[0];
    if (!sections[section]) sections[section] = {};
    sections[section][key] = value;
  }
  return sections;
}

// ── Translation ──────────────────────────────────────────────────────

async function translateStrings(strings, section, langInfo) {
  const count = Object.keys(strings).length;
  if (count === 0) return {};

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
5. Keep emoji characters unchanged
6. Translations must be natural and culturally appropriate
7. For section "${section}": these are ${section === 'a11y' ? 'accessibility labels for screen readers' : section === 'errors' ? 'error messages shown to users' : section === 'diagnosis' ? 'plant diagnosis messages and guidance' : 'UI labels and messages'}
8. Keep button labels short (1-3 words ideally)

Return ONLY valid JSON with translated values. No explanation needed.`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const jsonStr = extractJSON(text);
      const parsed = JSON.parse(jsonStr);

      // Validate: every key in input should be in output
      const inputKeys = Object.keys(strings);
      const outputKeys = Object.keys(parsed);
      const missingFromOutput = inputKeys.filter(k => !outputKeys.includes(k));
      if (missingFromOutput.length > 0) {
        console.log(`    ⚠️  Gemini dropped ${missingFromOutput.length} keys, retrying...`);
        if (attempt < 3) { await new Promise(r => setTimeout(r, 2000)); continue; }
      }

      return parsed;
    } catch (error) {
      console.log(`    ⚠️  Attempt ${attempt}/3 failed: ${error.message}`);
      if (attempt < 3) await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log(`    ❌  All attempts failed for ${section}, keeping English as fallback`);
  return strings; // Return original on failure
}

// ── Main ─────────────────────────────────────────────────────────────

async function translateLanguage(langCode, flatEnglish, englishStrings, langIndex, totalLangs) {
  const langInfo = LANGUAGES[langCode];
  const prefix = totalLangs > 1 ? `[${langIndex}/${totalLangs}] ` : '';

  console.log(`\n${prefix}╔════════════════════════════════════════════════════════════╗`);
  console.log(`${prefix}║  🌍 ${langInfo.name} (${langInfo.nativeName})`.padEnd(61 + prefix.length) + '║');
  console.log(`${prefix}╚════════════════════════════════════════════════════════════╝`);

  // Load existing translation
  const existing = loadExistingTranslation(langCode);
  const flatExisting = Object.keys(existing).length > 0 ? flattenObject(existing) : {};

  // Determine what needs translating
  let toTranslate;
  let mode;

  if (flagFull || Object.keys(flatExisting).length === 0) {
    toTranslate = flatEnglish;
    mode = Object.keys(flatExisting).length === 0 ? 'new' : 'full';
  } else {
    toTranslate = computeDelta(flatEnglish, flatExisting);
    mode = 'incremental';
  }

  // Find stale keys to prune
  const staleKeys = Object.keys(flatExisting).length > 0
    ? findStaleKeys(flatEnglish, flatExisting)
    : [];

  const totalKeys = Object.keys(flatEnglish).length;
  const deltaCount = Object.keys(toTranslate).length;

  console.log(`   Mode: ${mode === 'incremental' ? 'INCREMENTAL' : mode === 'new' ? 'NEW FILE' : 'FULL RE-TRANSLATE'}`);
  console.log(`   Total English keys: ${totalKeys}`);
  if (mode === 'incremental') {
    console.log(`   Existing translations: ${Object.keys(flatExisting).length}`);
    console.log(`   New/missing keys: ${deltaCount}`);
    if (staleKeys.length > 0) console.log(`   Stale keys to remove: ${staleKeys.length}`);
  }

  // Dry-run: just report, don't call API
  if (flagDryRun) {
    if (deltaCount > 0) {
      console.log(`\n   Keys to translate:`);
      for (const key of Object.keys(toTranslate)) {
        console.log(`     + ${key}`);
      }
    }
    if (staleKeys.length > 0) {
      console.log(`\n   Stale keys to remove:`);
      for (const key of staleKeys) {
        console.log(`     - ${key}`);
      }
    }
    if (deltaCount === 0 && staleKeys.length === 0) {
      console.log(`   ✅ Already up to date — nothing to do\n`);
    }
    return { lang: langCode, translated: 0, total: totalKeys, skipped: true };
  }

  // Nothing to translate and nothing to prune
  if (deltaCount === 0 && staleKeys.length === 0) {
    console.log(`   ✅ Already up to date — nothing to do\n`);
    return { lang: langCode, translated: 0, total: totalKeys, skipped: true };
  }

  // Translate only the delta, grouped by section
  const newTranslations = {};

  if (deltaCount > 0) {
    const sectionGroups = groupBySection(toTranslate);

    for (const [section, sectionStrings] of Object.entries(sectionGroups)) {
      const count = Object.keys(sectionStrings).length;
      console.log(`   📂 ${section.toUpperCase()} (${count} keys)...`);

      const translations = await translateStrings(sectionStrings, section, langInfo);
      Object.assign(newTranslations, translations);

      console.log(`      ✅ Done`);
      await new Promise(r => setTimeout(r, 1000)); // Rate limiting
    }
  }

  // Merge: existing + new translations
  let mergedFlat;
  if (mode === 'incremental') {
    // Start from existing, overlay new translations
    mergedFlat = { ...flatExisting, ...newTranslations };
  } else {
    // Full mode: use only new translations
    mergedFlat = newTranslations;
  }

  // Prune stale keys
  for (const key of staleKeys) {
    delete mergedFlat[key];
  }

  // Unflatten and save
  const nested = unflattenObject(mergedFlat);
  const outputFile = path.join(OUTPUT_DIR, `strings-${langCode}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(nested, null, 2));

  const prunedMsg = staleKeys.length > 0 ? `, pruned ${staleKeys.length} stale` : '';
  console.log(`   ✅ Translated ${deltaCount} keys${prunedMsg} → strings-${langCode}.json\n`);

  return { lang: langCode, translated: deltaCount, total: totalKeys, skipped: false };
}

async function main() {
  // Import the English strings
  const stringsModule = await import('../constants/strings/en.ts');
  const englishStrings = stringsModule.en;
  const flatEnglish = flattenObject(englishStrings);

  console.log(`📖 English source: ${Object.keys(flatEnglish).length} keys`);
  console.log(`🎯 Languages to process: ${targetLangs.length}`);
  if (flagFull) console.log(`⚠️  FULL mode: re-translating all keys`);
  if (flagDryRun) console.log(`🔍 DRY RUN: no API calls will be made`);

  const results = [];
  for (let i = 0; i < targetLangs.length; i++) {
    const result = await translateLanguage(
      targetLangs[i],
      flatEnglish,
      englishStrings,
      i + 1,
      targetLangs.length,
    );
    results.push(result);
  }

  // Summary
  const translated = results.filter(r => !r.skipped);
  const skipped = results.filter(r => r.skipped);
  const totalKeysTranslated = translated.reduce((sum, r) => sum + r.translated, 0);

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  SUMMARY'.padEnd(61) + '║');
  console.log('╠════════════════════════════════════════════════════════════╣');
  if (translated.length > 0) {
    console.log(`║  Languages updated: ${translated.length}`.padEnd(61) + '║');
    console.log(`║  Total keys translated: ${totalKeysTranslated}`.padEnd(61) + '║');
  }
  if (skipped.length > 0) {
    console.log(`║  Languages already up-to-date: ${skipped.length}`.padEnd(61) + '║');
  }
  if (flagDryRun) {
    console.log('║  (Dry run — no files were modified)'.padEnd(61) + '║');
  }
  console.log('╚════════════════════════════════════════════════════════════╝');
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
