const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Available Gemini TTS Voices
const TTS_VOICES = [
  { id: 'Aoede', name: 'Aoede', displayName: 'Aoede', description: 'Bright and engaging voice', style: 'engaging', gender: 'female', isDefault: false },
  { id: 'Charon', name: 'Charon', displayName: 'Charon', description: 'Informative and conversational', style: 'conversational', gender: 'male', isDefault: false },
  { id: 'Fenrir', name: 'Fenrir', displayName: 'Fenrir', description: 'Expressive and narrative', style: 'narrative', gender: 'male', isDefault: false },
  { id: 'Kore', name: 'Kore', displayName: 'Kore', description: 'Clear and professional', style: 'professional', gender: 'female', isDefault: false },
  { id: 'Leda', name: 'Leda', displayName: 'Leda', description: 'Youthful and approachable', style: 'friendly', gender: 'female', isDefault: false },
  { id: 'Orus', name: 'Orus', displayName: 'Orus', description: 'Deep and authoritative', style: 'authoritative', gender: 'male', isDefault: false },
  { id: 'Perseus', name: 'Perseus', displayName: 'Perseus', description: 'Confident and dynamic', style: 'dynamic', gender: 'male', isDefault: false },
  { id: 'Puck', name: 'Puck', displayName: 'Puck', description: 'Upbeat and friendly - best for farmers', style: 'friendly', gender: 'male', isDefault: true },
  { id: 'Zephyr', name: 'Zephyr', displayName: 'Zephyr', description: 'Smooth and calming', style: 'calm', gender: 'neutral', isDefault: false },
  { id: 'Orbit', name: 'Orbit', displayName: 'Orbit', description: 'Clear and neutral', style: 'neutral', gender: 'neutral', isDefault: false },
];

// 45+ Languages with TTS voice mappings
// Voice selection based on language characteristics and farming context
const LANGUAGES = [
  // Indian Languages (12)
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', region: 'India', ttsVoiceId: 'Charon' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', region: 'India', ttsVoiceId: 'Kore' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', region: 'India', ttsVoiceId: 'Puck' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', region: 'India', ttsVoiceId: 'Charon' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', region: 'India', ttsVoiceId: 'Puck' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', region: 'India', ttsVoiceId: 'Zephyr' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', region: 'India', ttsVoiceId: 'Kore' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', region: 'India', ttsVoiceId: 'Zephyr' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', region: 'India', ttsVoiceId: 'Charon' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', region: 'India', ttsVoiceId: 'Kore' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', region: 'India', ttsVoiceId: 'Zephyr' },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', region: 'India', ttsVoiceId: 'Puck' },
  
  // African Languages (11)
  { code: 'sw', name: 'Swahili', nativeName: 'Kiswahili', region: 'Africa', ttsVoiceId: 'Puck' },
  { code: 'am', name: 'Amharic', nativeName: 'አማርኛ', region: 'Africa', ttsVoiceId: 'Charon' },
  { code: 'aa', name: 'Afar', nativeName: 'Qafar', region: 'Africa', ttsVoiceId: 'Kore' },
  { code: 'om', name: 'Oromo', nativeName: 'Afaan Oromoo', region: 'Africa', ttsVoiceId: 'Puck' },
  { code: 'ti', name: 'Tigrinya', nativeName: 'ትግርኛ', region: 'Africa', ttsVoiceId: 'Charon' },
  { code: 'ha', name: 'Hausa', nativeName: 'Hausa', region: 'Africa', ttsVoiceId: 'Kore' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Yorùbá', region: 'Africa', ttsVoiceId: 'Puck' },
  { code: 'zu', name: 'Zulu', nativeName: 'isiZulu', region: 'Africa', ttsVoiceId: 'Charon' },
  { code: 'ig', name: 'Igbo', nativeName: 'Igbo', region: 'Africa', ttsVoiceId: 'Kore' },
  { code: 'rw', name: 'Kinyarwanda', nativeName: 'Ikinyarwanda', region: 'Africa', ttsVoiceId: 'Puck' },
  { code: 'so', name: 'Somali', nativeName: 'Soomaali', region: 'Africa', ttsVoiceId: 'Charon' },
  
  // Southeast Asian Languages (8)
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tiếng Việt', region: 'Southeast Asia', ttsVoiceId: 'Kore' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', region: 'Southeast Asia', ttsVoiceId: 'Zephyr' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', region: 'Southeast Asia', ttsVoiceId: 'Puck' },
  { code: 'fil', name: 'Filipino', nativeName: 'Filipino', region: 'Southeast Asia', ttsVoiceId: 'Leda' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', region: 'Southeast Asia', ttsVoiceId: 'Puck' },
  { code: 'my', name: 'Burmese', nativeName: 'မြန်မာ', region: 'Southeast Asia', ttsVoiceId: 'Zephyr' },
  { code: 'km', name: 'Khmer', nativeName: 'ខ្មែរ', region: 'Southeast Asia', ttsVoiceId: 'Kore' },
  { code: 'lo', name: 'Lao', nativeName: 'ລາວ', region: 'Southeast Asia', ttsVoiceId: 'Zephyr' },
  
  // European Languages (14)
  { code: 'en', name: 'English', nativeName: 'English', region: 'Europe', ttsVoiceId: 'Puck' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', region: 'Europe', ttsVoiceId: 'Charon' },
  { code: 'fr', name: 'French', nativeName: 'Français', region: 'Europe', ttsVoiceId: 'Zephyr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', region: 'Europe', ttsVoiceId: 'Kore' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', region: 'Europe', ttsVoiceId: 'Puck' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', region: 'Europe', ttsVoiceId: 'Aoede' },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', region: 'Europe', ttsVoiceId: 'Kore' },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', region: 'Europe', ttsVoiceId: 'Charon' },
  { code: 'uk', name: 'Ukrainian', nativeName: 'Українська', region: 'Europe', ttsVoiceId: 'Zephyr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', region: 'Europe', ttsVoiceId: 'Orus' },
  { code: 'ro', name: 'Romanian', nativeName: 'Română', region: 'Europe', ttsVoiceId: 'Leda' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά', region: 'Europe', ttsVoiceId: 'Perseus' },
  { code: 'cs', name: 'Czech', nativeName: 'Čeština', region: 'Europe', ttsVoiceId: 'Kore' },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', region: 'Europe', ttsVoiceId: 'Zephyr' },
  
  // Middle Eastern Languages (5)
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', region: 'Middle East', ttsVoiceId: 'Orus', rtl: true },
  { code: 'fa', name: 'Persian', nativeName: 'فارسی', region: 'Middle East', ttsVoiceId: 'Charon', rtl: true },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', region: 'Middle East', ttsVoiceId: 'Kore' },
  { code: 'he', name: 'Hebrew', nativeName: 'עברית', region: 'Middle East', ttsVoiceId: 'Perseus', rtl: true },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', region: 'Middle East', ttsVoiceId: 'Charon', rtl: true },
  
  // East Asian Languages (4)
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', region: 'East Asia', ttsVoiceId: 'Kore' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文', region: 'East Asia', ttsVoiceId: 'Kore' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', region: 'East Asia', ttsVoiceId: 'Zephyr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', region: 'East Asia', ttsVoiceId: 'Leda' },
];

async function main() {
  console.log('🌱 Seeding database...');
  
  // 1. Seed TTS Voices
  console.log('📢 Creating TTS voices...');
  for (const voice of TTS_VOICES) {
    await prisma.ttsVoice.upsert({
      where: { id: voice.id },
      update: voice,
      create: voice,
    });
  }
  console.log(`✅ Created ${TTS_VOICES.length} TTS voices`);
  
  // 2. Seed Languages with TTS mappings
  console.log('🌐 Creating languages with TTS mappings...');
  for (const lang of LANGUAGES) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: {
        name: lang.name,
        nativeName: lang.nativeName,
        region: lang.region,
        rtl: lang.rtl || false,
        ttsVoiceId: lang.ttsVoiceId,
      },
      create: {
        code: lang.code,
        name: lang.name,
        nativeName: lang.nativeName,
        region: lang.region,
        rtl: lang.rtl || false,
        geminiSupported: true,
        ttsSupported: true,
        asrSupported: true,
        ttsVoiceId: lang.ttsVoiceId,
      },
    });
  }
  console.log(`✅ Created ${LANGUAGES.length} languages with TTS mappings`);
  
  // 3. Summary
  const voiceCount = await prisma.ttsVoice.count();
  const langCount = await prisma.language.count();
  console.log(`\n📊 Database Summary:`);
  console.log(`   - TTS Voices: ${voiceCount}`);
  console.log(`   - Languages: ${langCount}`);
  
  // 4. Show voice distribution
  const voiceUsage = await prisma.language.groupBy({
    by: ['ttsVoiceId'],
    _count: true,
  });
  console.log(`\n🎤 Voice Distribution:`);
  for (const usage of voiceUsage) {
    console.log(`   - ${usage.ttsVoiceId}: ${usage._count} languages`);
  }
  
  console.log('\n✨ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

