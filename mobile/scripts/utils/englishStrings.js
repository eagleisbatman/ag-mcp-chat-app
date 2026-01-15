import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STRINGS_TS_PATH = path.join(__dirname, '../../constants/strings/en.ts');
const STRINGS_JSON_PATH = path.join(__dirname, '../../constants/translations/strings-en.json');

function extractEnObject(tsContent) {
  const marker = 'export const en';
  const start = tsContent.indexOf(marker);
  if (start === -1) return null;

  const braceStart = tsContent.indexOf('{', start);
  if (braceStart === -1) return null;

  let depth = 0;
  for (let i = braceStart; i < tsContent.length; i++) {
    const ch = tsContent[i];
    if (ch === '{') depth++;
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        return tsContent.slice(braceStart, i + 1);
      }
    }
  }
  return null;
}

export function loadEnglishStrings() {
  try {
    const tsContent = fs.readFileSync(STRINGS_TS_PATH, 'utf8');
    const objectLiteral = extractEnObject(tsContent);
    if (objectLiteral) {
      // eslint-disable-next-line no-new-func
      return Function(`"use strict"; return (${objectLiteral});`)();
    }
  } catch {
    // Fallback to JSON
  }

  const jsonContent = fs.readFileSync(STRINGS_JSON_PATH, 'utf8');
  return JSON.parse(jsonContent);
}
