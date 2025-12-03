// 45+ Languages supported by Gemini 2.5 Flash
// Organized by region with native names for display

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
  
  // Middle Eastern Languages
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', region: 'Middle East' },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', region: 'Middle East' },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', region: 'Middle East' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', region: 'Middle East' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', region: 'Middle East' },
  
  // East Asian Languages
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', region: 'East Asia' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', region: 'East Asia' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', region: 'East Asia' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', region: 'East Asia' },
];

// Get unique regions for filtering
export const REGIONS = [...new Set(LANGUAGES.map(l => l.region))];

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

export default LANGUAGES;

