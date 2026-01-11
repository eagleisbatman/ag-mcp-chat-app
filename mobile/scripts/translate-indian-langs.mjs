import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

const INDIAN_LANGUAGES = [
  { code: "bn", name: "Bengali" },
  { code: "te", name: "Telugu" },
  { code: "ta", name: "Tamil" },
  { code: "mr", name: "Marathi" },
  { code: "gu", name: "Gujarati" },
  { code: "kn", name: "Kannada" },
  { code: "ml", name: "Malayalam" },
  { code: "or", name: "Odia" },
  { code: "pa", name: "Punjabi" },
  { code: "as", name: "Assamese" },
  { code: "ur", name: "Urdu" },
  { code: "ne", name: "Nepali" }
];

const TRANSLATIONS_DIR = "/Users/eagleisbatman/digitalgreen_projects/GAP_PROTOTYPE/ag-mcp-chat-app/mobile/constants/translations";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY environment variable is required');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

function getNestedValue(obj, keyPath) {
  return keyPath.split('.').reduce((o, k) => o?.[k], obj);
}

function setNestedValue(obj, keyPath, value) {
  const keys = keyPath.split('.');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
}

function collectKeys(obj, prefix = '') {
  const keys = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? prefix + '.' + key : key;
    if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      keys.push(...collectKeys(obj[key], fullKey));
    } else {
      keys.push({ key: fullKey, value: obj[key] });
    }
  }
  return keys;
}

async function translateBatch(texts, targetLang) {
  const prompt = `Translate the following English texts to ${targetLang}. Return ONLY a JSON array of translated strings in the same order. No explanation.

Texts to translate:
${JSON.stringify(texts, null, 2)}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().replace(/```json\n?|\n?```/g, '').trim();
  return JSON.parse(text);
}

async function main() {
  const englishPath = path.join(TRANSLATIONS_DIR, "strings-en.json");
  const english = JSON.parse(fs.readFileSync(englishPath, "utf8"));

  // Get all scheme keys from English
  const allSchemeKeys = collectKeys({ schemes: english.schemes });

  console.log("\\n╔════════════════════════════════════════════════════════════╗");
  console.log("║  🇮🇳 Translating SCHEME keys for Indian languages only      ║");
  console.log("╚════════════════════════════════════════════════════════════╝\\n");
  console.log("Found " + allSchemeKeys.length + " scheme keys to check\\n");

  for (const lang of INDIAN_LANGUAGES) {
    const targetPath = path.join(TRANSLATIONS_DIR, "strings-" + lang.code + ".json");
    const target = JSON.parse(fs.readFileSync(targetPath, "utf8"));

    // Find missing keys
    const missing = allSchemeKeys.filter(k => !getNestedValue(target, k.key));

    if (missing.length === 0) {
      console.log("✅ " + lang.name.padEnd(12) + " - already complete");
      continue;
    }

    console.log("🔄 " + lang.name.padEnd(12) + " - " + missing.length + " keys to translate");

    try {
      const texts = missing.map(m => m.value);
      const translations = await translateBatch(texts, lang.name);

      for (let i = 0; i < missing.length; i++) {
        setNestedValue(target, missing[i].key, translations[i]);
      }

      fs.writeFileSync(targetPath, JSON.stringify(target, null, 2) + "\\n");
      console.log("   ✅ Updated strings-" + lang.code + ".json");
    } catch (err) {
      console.error("   ❌ Error: " + err.message);
    }

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 1500));
  }

  console.log("\\n╔════════════════════════════════════════════════════════════╗");
  console.log("║  ✅ Done! Indian languages translated for schemes          ║");
  console.log("╚════════════════════════════════════════════════════════════╝\\n");
}

main().catch(console.error);
