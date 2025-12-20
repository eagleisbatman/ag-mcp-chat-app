// 45+ Languages supported by Gemini 2.5 Flash
// Organized by region with native names for display
// isRTL: true for right-to-left languages (Arabic, Urdu, Persian, Hebrew)

export const LANGUAGES = [
  // Indian Languages
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', region: 'India' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', region: 'India' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', region: 'India' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', region: 'India' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', region: 'India' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', region: 'India' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', region: 'India' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', region: 'India' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', region: 'India' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', region: 'India' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', region: 'India' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', region: 'India' },

  // African Languages
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', region: 'Africa' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', region: 'Africa' },
  { code: 'aa', name: 'Afar', nativeName: 'Qafar', region: 'Africa' },
  { code: 'om', name: 'Oromo', nativeName: 'Afaan Oromoo', region: 'Africa' },
  { code: 'ti', name: 'Tigrinya', nativeName: 'ትግርኛ', region: 'Africa' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', region: 'Africa' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá', region: 'Africa' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', region: 'Africa' },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo', region: 'Africa' },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda', region: 'Africa' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali', region: 'Africa' },

  // Southeast Asian Languages
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', region: 'Southeast Asia' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', region: 'Southeast Asia' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', region: 'Southeast Asia' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino', region: 'Southeast Asia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', region: 'Southeast Asia' },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာ', region: 'Southeast Asia' },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ', region: 'Southeast Asia' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ', region: 'Southeast Asia' },

  // European Languages
  { code: 'en', name: 'English', nativeName: 'English', region: 'Europe' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', region: 'Europe' },
  { code: 'fr', name: 'French', nativeName: 'Français', region: 'Europe' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', region: 'Europe' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', region: 'Europe' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', region: 'Europe' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', region: 'Europe' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', region: 'Europe' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', region: 'Europe' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', region: 'Europe' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', region: 'Europe' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', region: 'Europe' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', region: 'Europe' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', region: 'Europe' },

  // Middle Eastern Languages (RTL languages marked)
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', region: 'Middle East', isRTL: true },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', region: 'Middle East', isRTL: true },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', region: 'Middle East' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', region: 'Middle East', isRTL: true },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', region: 'Middle East', isRTL: true },

  // East Asian Languages
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', region: 'East Asia' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', region: 'East Asia' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', region: 'East Asia' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', region: 'East Asia' },
];

// Get unique regions for filtering
export const REGIONS = [...new Set(LANGUAGES.map(l => l.region))];

// Country to suggested languages mapping
// Maps country names (from reverse geocoding) to language codes
const COUNTRY_LANGUAGE_MAP = {
  // South Asia
  'India': ['hi', 'te', 'kn', 'mr', 'ta', 'bn', 'gu', 'ml', 'pa', 'or', 'as', 'en'],
  'Nepal': ['ne', 'hi', 'en'],
  'Bangladesh': ['bn', 'en'],
  'Pakistan': ['ur', 'en'],
  'Sri Lanka': ['ta', 'en'],

  // East Africa
  'Ethiopia': ['am', 'om', 'ti', 'aa', 'en'],
  'Kenya': ['sw', 'en'],
  'Tanzania': ['sw', 'en'],
  'Uganda': ['sw', 'en'],
  'Rwanda': ['rw', 'sw', 'en', 'fr'],
  'Burundi': ['rw', 'sw', 'fr'],
  'Somalia': ['so', 'ar', 'en'],
  'Djibouti': ['aa', 'ar', 'fr'],
  'Eritrea': ['ti', 'ar', 'en'],

  // West Africa
  'Nigeria': ['ha', 'yo', 'ig', 'en'],
  'Ghana': ['en'],
  'Senegal': ['fr'],
  'Mali': ['fr'],
  'Niger': ['ha', 'fr'],
  'Cameroon': ['fr', 'en'],

  // Southern Africa
  'South Africa': ['zu', 'en'],
  'Zimbabwe': ['en'],
  'Mozambique': ['pt'],

  // Southeast Asia
  'Vietnam': ['vi', 'en'],
  'Thailand': ['th', 'en'],
  'Indonesia': ['id', 'en'],
  'Philippines': ['fil', 'en'],
  'Malaysia': ['ms', 'en'],
  'Myanmar': ['my', 'en'],
  'Cambodia': ['km', 'en'],
  'Laos': ['lo', 'en'],

  // Middle East
  'Saudi Arabia': ['ar', 'en'],
  'Egypt': ['ar', 'en'],
  'UAE': ['ar', 'en'],
  'United Arab Emirates': ['ar', 'en'],
  'Iran': ['fa', 'en'],
  'Iraq': ['ar', 'en'],
  'Israel': ['he', 'ar', 'en'],
  'Turkey': ['tr', 'en'],
  'Jordan': ['ar', 'en'],
  'Lebanon': ['ar', 'fr', 'en'],
  'Syria': ['ar', 'en'],
  'Yemen': ['ar', 'en'],
  'Oman': ['ar', 'en'],
  'Kuwait': ['ar', 'en'],
  'Qatar': ['ar', 'en'],
  'Bahrain': ['ar', 'en'],

  // East Asia
  'China': ['zh-CN', 'en'],
  'Taiwan': ['zh-TW', 'en'],
  'Japan': ['ja', 'en'],
  'South Korea': ['ko', 'en'],
  'Korea': ['ko', 'en'],

  // Europe
  'Spain': ['es', 'en'],
  'France': ['fr', 'en'],
  'Germany': ['de', 'en'],
  'Portugal': ['pt', 'en'],
  'Brazil': ['pt', 'en'],
  'Italy': ['it', 'en'],
  'Netherlands': ['nl', 'en'],
  'Poland': ['pl', 'en'],
  'Ukraine': ['uk', 'ru', 'en'],
  'Russia': ['ru', 'en'],
  'Romania': ['ro', 'en'],
  'Greece': ['el', 'en'],
  'Czech Republic': ['cs', 'en'],
  'Czechia': ['cs', 'en'],
  'Sweden': ['sv', 'en'],

  // Americas (Spanish/Portuguese speaking)
  'Mexico': ['es', 'en'],
  'Argentina': ['es', 'en'],
  'Colombia': ['es', 'en'],
  'Peru': ['es', 'en'],
  'Chile': ['es', 'en'],
  'Ecuador': ['es', 'en'],
  'Venezuela': ['es', 'en'],
  'Guatemala': ['es', 'en'],
  'Bolivia': ['es', 'en'],
  'Honduras': ['es', 'en'],
  'Paraguay': ['es', 'en'],
  'El Salvador': ['es', 'en'],
  'Nicaragua': ['es', 'en'],
  'Costa Rica': ['es', 'en'],
  'Panama': ['es', 'en'],
  'Uruguay': ['es', 'en'],
  'Dominican Republic': ['es', 'en'],
  'Cuba': ['es', 'en'],

  // Default
  'United States': ['en', 'es'],
  'United Kingdom': ['en'],
  'Canada': ['en', 'fr'],
  'Australia': ['en'],
};

// Get suggested languages based on country name
export const getSuggestedLanguages = (countryName) => {
  if (!countryName) return [];

  // Try exact match first
  const codes = COUNTRY_LANGUAGE_MAP[countryName];
  if (codes) {
    return codes.map(code => LANGUAGES.find(l => l.code === code)).filter(Boolean);
  }

  // Try partial match (e.g., "United States of America" -> "United States")
  const countryLower = countryName.toLowerCase();
  for (const [key, langCodes] of Object.entries(COUNTRY_LANGUAGE_MAP)) {
    if (countryLower.includes(key.toLowerCase()) || key.toLowerCase().includes(countryLower)) {
      return langCodes.map(code => LANGUAGES.find(l => l.code === code)).filter(Boolean);
    }
  }

  // No match - return English as default
  return [LANGUAGES.find(l => l.code === 'en')];
};

// Get languages grouped by region (simple list, no location-based suggestions)
export const getLanguagesByRegion = () => {
  const sections = [];

  for (const region of REGIONS) {
    const regionLangs = LANGUAGES.filter(l => l.region === region);
    if (regionLangs.length > 0) {
      sections.push({
        title: region,
        data: regionLangs,
      });
    }
  }

  return sections;
};

// Search function for language picker
export const searchLanguages = (query) => {
  if (!query) return LANGUAGES;
  const lowerQuery = query.toLowerCase();
  return LANGUAGES.filter(
    lang =>
      lang.name.toLowerCase().includes(lowerQuery) ||
      lang.nativeName.toLowerCase().includes(lowerQuery) ||
      lang.code.toLowerCase().includes(lowerQuery)
  );
};

// Check if a language is RTL
export const isRTLLanguage = (code) => {
  const lang = LANGUAGES.find(l => l.code === code);
  return lang?.isRTL === true;
};

// Get RTL language codes
export const RTL_LANGUAGES = LANGUAGES.filter(l => l.isRTL).map(l => l.code);

export default LANGUAGES;

