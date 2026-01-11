import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";

const TRANSLATIONS_DIR = new URL("../constants/translations", import.meta.url).pathname;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('Error: GEMINI_API_KEY environment variable is required');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const LANGUAGES = {
  am: "Amharic", ar: "Arabic", as: "Assamese", aa: "Afar", bn: "Bengali",
  cs: "Czech", de: "German", el: "Greek", es: "Spanish", fa: "Persian",
  fil: "Filipino", fr: "French", gu: "Gujarati", ha: "Hausa", he: "Hebrew",
  hi: "Hindi", id: "Indonesian", ig: "Igbo", it: "Italian", ja: "Japanese",
  km: "Khmer", kn: "Kannada", ko: "Korean", lo: "Lao", ml: "Malayalam",
  mr: "Marathi", ms: "Malay", my: "Burmese", ne: "Nepali", nl: "Dutch",
  om: "Oromo", or: "Odia", pa: "Punjabi", pl: "Polish", pt: "Portuguese",
  ro: "Romanian", ru: "Russian", rw: "Kinyarwanda", so: "Somali", sv: "Swedish",
  sw: "Swahili", ta: "Tamil", te: "Telugu", th: "Thai", ti: "Tigrinya",
  tr: "Turkish", uk: "Ukrainian", ur: "Urdu", vi: "Vietnamese", yo: "Yoruba",
  "zh-CN": "Chinese Simplified", "zh-TW": "Chinese Traditional", zu: "Zulu"
};

async function translateText(text, targetLang) {
  const prompt = `Translate this English text to ${targetLang}. Return ONLY the translated text, nothing else:\n${text}`;
  const result = await model.generateContent(prompt);
  return result.response.text().trim().replace(/^["']|["']$/g, '');
}

async function main() {
  console.log("");
  console.log("Updating ag-mcp translations for all languages");
  console.log("=".repeat(50));
  console.log("");

  const englishText = "An initiative by Digital Green Foundation";
  let updated = 0;
  let failed = 0;

  for (const [code, langName] of Object.entries(LANGUAGES)) {
    const filePath = path.join(TRANSLATIONS_DIR, `strings-${code}.json`);

    if (!fs.existsSync(filePath)) {
      console.log(`SKIP ${langName} - file not found`);
      continue;
    }

    try {
      const content = JSON.parse(fs.readFileSync(filePath, "utf8"));
      let fileUpdated = false;

      // Update sectionAiServices to "ag-mcp" (brand name, no translation)
      if (content.settings && content.settings.sectionAiServices !== "ag-mcp") {
        content.settings.sectionAiServices = "ag-mcp";
        fileUpdated = true;
      }

      // Update mcp.title to "ag-mcp" (brand name, no translation)
      if (content.mcp && content.mcp.title !== "ag-mcp") {
        content.mcp.title = "ag-mcp";
        fileUpdated = true;
      }

      // Add mcp.description if missing
      if (content.mcp && !content.mcp.description) {
        console.log(`TRANSLATE ${langName}...`);
        const translated = await translateText(englishText, langName);
        content.mcp.description = translated;
        fileUpdated = true;
        await new Promise(r => setTimeout(r, 500));
      }

      if (fileUpdated) {
        fs.writeFileSync(filePath, JSON.stringify(content, null, 2) + "\n");
        console.log(`OK ${langName}`);
        updated++;
      } else {
        console.log(`SKIP ${langName} - already up to date`);
      }
    } catch (err) {
      console.error(`FAIL ${langName} - ${err.message}`);
      failed++;
    }
  }

  console.log("");
  console.log("=".repeat(50));
  console.log(`Done! Updated: ${updated}, Failed: ${failed}`);
  console.log("");
}

main().catch(console.error);
