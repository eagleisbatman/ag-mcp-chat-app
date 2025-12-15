const DEFAULT_LOCALE = 'en';

// Current locale - can be updated dynamically
let currentLocale = DEFAULT_LOCALE;

// Static import registry for translations
// Uncomment languages as translation files are created
// After running: node scripts/translate-strings.js <lang_code>
const TRANSLATION_REGISTRY = {
  // Priority Languages (Digital Green focus regions) - TRANSLATED
  hi: () => require('./translations/strings-hi.json'),    // Hindi
  te: () => require('./translations/strings-te.json'),    // Telugu
  kn: () => require('./translations/strings-kn.json'),    // Kannada
  sw: () => require('./translations/strings-sw.json'),    // Swahili
  am: () => require('./translations/strings-am.json'),    // Amharic
  om: () => require('./translations/strings-om.json'),    // Oromo
  vi: () => require('./translations/strings-vi.json'),    // Vietnamese
  fr: () => require('./translations/strings-fr.json'),    // French
  es: () => require('./translations/strings-es.json'),    // Spanish
  ar: () => require('./translations/strings-ar.json'),    // Arabic (RTL)

  // Indian Languages - TRANSLATED
  mr: () => require('./translations/strings-mr.json'),    // Marathi
  gu: () => require('./translations/strings-gu.json'),    // Gujarati
  ta: () => require('./translations/strings-ta.json'),    // Tamil
  bn: () => require('./translations/strings-bn.json'),    // Bengali
  ml: () => require('./translations/strings-ml.json'),    // Malayalam
  pa: () => require('./translations/strings-pa.json'),    // Punjabi
  or: () => require('./translations/strings-or.json'),    // Odia
  as: () => require('./translations/strings-as.json'),    // Assamese
  ne: () => require('./translations/strings-ne.json'),    // Nepali

  // African Languages - TRANSLATED
  aa: () => require('./translations/strings-aa.json'),    // Afar
  ti: () => require('./translations/strings-ti.json'),    // Tigrinya
  ha: () => require('./translations/strings-ha.json'),    // Hausa
  yo: () => require('./translations/strings-yo.json'),    // Yoruba
  zu: () => require('./translations/strings-zu.json'),    // Zulu
  ig: () => require('./translations/strings-ig.json'),    // Igbo
  rw: () => require('./translations/strings-rw.json'),    // Kinyarwanda
  so: () => require('./translations/strings-so.json'),    // Somali

  // Southeast Asian Languages - TRANSLATED
  th: () => require('./translations/strings-th.json'),    // Thai
  id: () => require('./translations/strings-id.json'),    // Indonesian
  fil: () => require('./translations/strings-fil.json'),  // Filipino
  ms: () => require('./translations/strings-ms.json'),    // Malay
  my: () => require('./translations/strings-my.json'),    // Burmese
  km: () => require('./translations/strings-km.json'),    // Khmer
  lo: () => require('./translations/strings-lo.json'),    // Lao

  // European Languages - TRANSLATED
  de: () => require('./translations/strings-de.json'),    // German
  pt: () => require('./translations/strings-pt.json'),    // Portuguese
  it: () => require('./translations/strings-it.json'),    // Italian
  nl: () => require('./translations/strings-nl.json'),    // Dutch
  pl: () => require('./translations/strings-pl.json'),    // Polish
  uk: () => require('./translations/strings-uk.json'),    // Ukrainian
  ru: () => require('./translations/strings-ru.json'),    // Russian
  ro: () => require('./translations/strings-ro.json'),    // Romanian
  el: () => require('./translations/strings-el.json'),    // Greek
  cs: () => require('./translations/strings-cs.json'),    // Czech
  sv: () => require('./translations/strings-sv.json'),    // Swedish

  // Middle Eastern Languages - TRANSLATED
  fa: () => require('./translations/strings-fa.json'),    // Persian (RTL)
  tr: () => require('./translations/strings-tr.json'),    // Turkish
  he: () => require('./translations/strings-he.json'),    // Hebrew (RTL)
  ur: () => require('./translations/strings-ur.json'),    // Urdu (RTL)

  // East Asian Languages - TRANSLATED
  'zh-CN': () => require('./translations/strings-zh-CN.json'), // Chinese (Simplified)
  'zh-TW': () => require('./translations/strings-zh-TW.json'), // Chinese (Traditional)
  ja: () => require('./translations/strings-ja.json'),    // Japanese
  ko: () => require('./translations/strings-ko.json'),    // Korean
};

// Loaded translations cache
const translationsCache = {};

// Set the current locale for translations
export function setLocale(locale) {
  currentLocale = locale || DEFAULT_LOCALE;
}

// Get the current locale
export function getLocale() {
  return currentLocale;
}

// Load translations for a specific language (called at app startup)
export async function loadTranslations(locale) {
  if (locale === 'en' || !locale) return; // English is built-in

  // Check cache first
  if (translationsCache[locale]) return;

  // Check if translation is available in registry
  const loader = TRANSLATION_REGISTRY[locale];
  if (loader) {
    try {
      translationsCache[locale] = loader();
    } catch (error) {
      console.log(`Failed to load translation for ${locale}, using English`);
    }
  } else {
    console.log(`Translation for ${locale} not available yet, using English`);
  }
}

export const STRINGS = {
  en: {
    common: {
      back: 'Back',
      retry: 'Retry',
      cancel: 'Cancel',
      delete: 'Delete',
      continue: 'Continue',
      dismiss: 'Dismiss',
      refresh: 'Refresh',
      clear: 'Clear',
      loading: 'Loading…',
      skipForNow: 'Skip for now',
    },
    onboarding: {
      appName: 'FarmerChat',
      tagline: 'Your AI-powered farming companion',
      getStarted: 'Get Started',
      features: {
        weatherTitle: 'Weather Forecasts',
        weatherDescription: 'Get accurate weather predictions for your farm',
        diagnosisTitle: 'Crop Diagnosis',
        diagnosisDescription: 'Identify plant diseases with photos',
        voiceTitle: 'Voice Support',
        voiceDescription: 'Speak naturally in your language',
      },
      locationTitle: 'Enable Location',
      locationDescription:
        'Share your location to get accurate weather forecasts and region-specific farming advice.',
      enableLocation: 'Enable Location',
      locationDenied: 'Location permission denied',
      locationError: 'Could not get location. Please try again.',
      benefits: {
        weather: 'Local weather forecasts',
        regionAdvice: 'Region-specific crop advice',
        soilData: 'Soil data for your area',
      },
      languageTitle: 'Select Language',
      languageSubtitle: 'Choose your preferred language for the assistant',
      searchLanguages: 'Search languages...',
      noLanguagesFound: 'No languages found',
      suggestedForYou: 'Suggested for You',
      currentLanguage: 'Current',
    },
    chat: {
      welcomeMessage:
        "Hello! 👋 I'm your farming assistant.\n\nI can help you with:\n• Crops, vegetables, fruits, and flowers\n• Livestock, poultry, and fish farming\n• Pest and disease management\n• Weather and market advice\n\nHow can I help you today?",
      locationDenied: 'Location permission denied',
      locationUpdated: 'Location updated!',
      locationUpdateFailed: 'Could not update location',
      loadingConversation: 'Loading conversation...',
      thinking: 'Thinking...',
      messagePlaceholder: 'Message...',
      fromVoice: 'From voice — edit if needed',
      voiceTranscribed: 'Voice transcribed! Edit if needed, then send.',
      noInternet: 'No internet connection. Please check your network.',
      couldNotLoadConversation: 'Could not load conversation',
      startedNewConversation: 'Started new conversation',
      connectionErrorBot: 'Connection error. Please try again.',
      analyzingPlantImage: 'Analyzing plant image...',
      imageAnalysisFailedBot: 'Image analysis failed. Please try again.',
      sorryCouldNotProcess: "Sorry, I couldn't process that. {details}",
      analysisCouldNotComplete: "Analysis couldn't complete. {details}",
      plantAnalysisIssues: 'Plant analysis had issues: {details}',
      tapLocationToSet: 'Tap location to set',
      senderAssistant: 'FarmerChat',
      senderYou: 'You',
      tapToAskNext: 'Tap to ask next:',
    },
    media: {
      photoLibraryPermission:
        'Photo library access is needed to select images. Enable in Settings.',
      cameraPermission: 'Camera access is needed to take photos. Enable in Settings.',
      pickImageFailed: 'Failed to pick image. Please try again.',
      cameraFailed: 'Failed to access camera. Please try again.',
      camera: 'Camera',
      gallery: 'Gallery',
    },
    voice: {
      microphonePermission: 'Microphone permission required',
      startRecordingFailed: 'Failed to start recording',
      recordingFailed: 'Recording failed',
      transcriptionFailed: 'Transcription failed',
      couldNotTranscribeAudio: 'Could not transcribe audio',
      voiceUnavailableLater: 'Voice unavailable - please try again later',
      voiceUnavailable: 'Voice unavailable - please try again',
      audioPlaybackFailed: 'Audio playback failed',
      recording: 'Recording',
      cancel: 'Cancel',
      done: 'Done',
      transcribing: 'Transcribing...',
      recordingHint: 'Tap Done to transcribe, or Cancel to discard',
    },
    history: {
      title: 'Conversations',
      noConversations: 'No conversations yet',
      noConversationsHint: 'Start a new chat to get farming advice',
      newChat: 'New Chat',
      newConversation: 'New Conversation',
      deleteTitle: 'Delete Conversation',
      deleteMessage: 'Delete "{title}"? This cannot be undone.',
      untitled: 'Untitled',
      deleted: 'Conversation deleted',
      deleteFailed: 'Delete failed',
      couldNotDelete: 'Could not delete conversation',
      notConnectedTitle: 'Not connected',
      notConnectedHint: 'Conversation history requires an internet connection',
      yesterday: 'Yesterday',
    },
    settings: {
      title: 'Settings',
      sectionConversations: 'CONVERSATIONS',
      sectionAiServices: 'AI SERVICES',
      sectionLocation: 'LOCATION',
      sectionLanguage: 'LANGUAGE',
      sectionAppearance: 'APPEARANCE',
      sectionDanger: 'DANGER ZONE',
      chatHistory: 'Chat History',
      chatHistorySubtitle: 'View and continue past conversations',
      aiServices: 'Active Services',
      aiServicesSubtitle: 'View AI services active for your region',
      locationPermissionDenied: 'Location permission denied',
      locationUpdated: 'Location updated successfully!',
      locationUpdateFailed: 'Could not update location. Please try again.',
      locationEnabled: 'Location enabled',
      tapToEnable: 'Tap to enable',
      tapToUpdateLocation: 'Tap to update location',
      themeLight: 'Light',
      themeDark: 'Dark',
      themeSystem: 'System',
      language: 'Language',
      resetOnboarding: 'Reset Onboarding',
      resetOnboardingSubtitle: 'Start fresh with setup wizard',
      resetConfirmTitle: 'Reset Setup',
      resetConfirmMessage: 'This will restart the onboarding process. Continue?',
      appInfoVersion: 'FarmerChat v2.0.0',
      appInfoPoweredBy: 'Powered by Digital Green Foundation',
    },
    mcp: {
      title: 'AI Services',
      loading: 'Loading services...',
      loadingDetails: 'Loading...',
      footer: 'Service availability depends on your location',
      couldNotLoad: 'Could not load services',
      couldNotLoadDetails: 'Could not load service details',
      failedToFetch: 'Failed to fetch services',
      serviceCategory: 'Category {name}',
      service: 'Service {name}',
      servicesAvailable: '{active} of {total} services available for your location',
      activeCount: '{active}/{total} active',
      statusActive: 'Active',
      statusUnavailable: 'Not available in your region',
      locationNotSet: 'Location not set',
      // Section titles
      sectionAbout: 'About',
      sectionFeatures: 'Features',
      sectionAvailableIn: 'Available In',
      sectionSupportedCrops: 'Supported Crops',
      // Category names
      categories: {
        plantHealth: 'Plant Health',
        soil: 'Soil Analysis',
        weather: 'Weather & Climate',
        livestock: 'Livestock Nutrition',
        agriculture: 'Crop Advisory',
      },
      // Service descriptions - these will be translated
      services: {
        agrivision: {
          name: 'AgriVision',
          tagline: 'AI-powered plant disease detection and diagnosis',
          description: 'Analyze plant images to identify diseases, pests, and nutrient deficiencies. Get instant diagnosis with treatment recommendations and prevention tips.',
        },
        isdaSoil: {
          name: 'ISDA Soil',
          tagline: 'Soil properties and nutrient analysis for Africa',
          description: 'Get detailed soil information including pH, nitrogen, phosphorus, potassium, and other nutrients. Coverage includes all of Africa with 30-meter resolution.',
        },
        accuweather: {
          name: 'AccuWeather',
          tagline: 'Current conditions and weather forecasts worldwide',
          description: 'Access real-time weather data including temperature, humidity, wind speed, and precipitation. Forecasts available up to 15 days.',
        },
        gapWeather: {
          name: 'GAP Weather',
          tagline: 'Agricultural weather forecasts for Kenya',
          description: 'Specialized weather forecasts for agriculture in Kenya. Includes evapotranspiration, solar radiation, and precipitation forecasts tailored for farming decisions.',
        },
        edacap: {
          name: 'EDACaP Climate',
          tagline: 'Seasonal climate forecasts for Ethiopia',
          description: 'Seasonal climate outlook including temperature and rainfall predictions. Helps farmers plan planting and harvesting schedules.',
        },
        weatherapi: {
          name: 'WeatherAPI',
          tagline: 'Weather data for global locations',
          description: 'Comprehensive weather data service providing current conditions and forecasts for locations worldwide.',
        },
        tomorrowIo: {
          name: 'Tomorrow.io',
          tagline: 'Weather intelligence and forecasting',
          description: 'Advanced weather intelligence platform with high-resolution forecasts and nowcasting capabilities.',
        },
        feedFormulation: {
          name: 'Feed Formulation',
          tagline: 'Optimal diet calculations for dairy cattle',
          description: 'Calculate the most cost-effective feed mix for your dairy cattle. Takes into account milk production targets, body weight, and available local feeds.',
        },
        nextgen: {
          name: 'NextGen Fertilizer',
          tagline: 'Site-specific fertilizer recommendations for Ethiopia',
          description: 'Get precise fertilizer recommendations based on your exact location. Includes both organic (compost, vermicompost) and inorganic (Urea, NPS) recommendations.',
        },
        decisionTree: {
          name: 'Crop Decision Tree',
          tagline: 'Growth stage recommendations for Kenya',
          description: 'Get crop management recommendations based on growth stage and current weather conditions. Helps you make timely decisions for pest control, irrigation, and harvesting.',
        },
        gapAgriculture: {
          name: 'GAP Agriculture',
          tagline: 'Agricultural advisory services',
          description: 'General agricultural advisory services for crop and livestock management.',
        },
      },
      // Feature labels
      features: {
        diseaseDetection: 'Disease Detection',
        pestIdentification: 'Pest Identification',
        nutrientAnalysis: 'Nutrient Analysis',
        treatmentAdvice: 'Treatment Advice',
        soilPh: 'Soil pH',
        nitrogen: 'Nitrogen',
        phosphorus: 'Phosphorus',
        potassium: 'Potassium',
        currentWeather: 'Current Weather',
        temperature: 'Temperature',
        humidity: 'Humidity',
        forecast: 'Forecast',
        precipitation: 'Precipitation',
        evapotranspiration: 'Evapotranspiration',
        solarRadiation: 'Solar Radiation',
        wind: 'Wind',
        seasonalOutlook: 'Seasonal Outlook',
        rainfallProbability: 'Rainfall Probability',
        temperatureTrend: 'Temperature Trend',
        cropForecasts: 'Crop Forecasts',
        historical: 'Historical',
        astronomy: 'Astronomy',
        nowcast: 'Nowcast',
        forecasts: 'Forecasts',
        alerts: 'Alerts',
        dietOptimization: 'Diet Optimization',
        nutrientBalance: 'Nutrient Balance',
        localFeeds: 'Local Feeds',
        costCalculation: 'Cost Calculation',
        organicFertilizers: 'Organic Fertilizers',
        inorganicFertilizers: 'Inorganic Fertilizers',
        expectedYield: 'Expected Yield',
        siteSpecific: 'Site-Specific',
        growthStage: 'Growth Stage',
        recommendations: 'Recommendations',
        weatherBased: 'Weather-Based',
        actions: 'Actions',
        cropAdvice: 'Crop Advice',
        bestPractices: 'Best Practices',
        seasonalTips: 'Seasonal Tips',
        localKnowledge: 'Local Knowledge',
      },
      // Fallback descriptions
      fallback: {
        service: 'Agricultural service',
        description: 'Service details not available.',
      },
      // Region names for coverage
      regions: {
        worldwide: 'Worldwide',
        africa: 'Africa',
        eastAfrica: 'East Africa',
        ethiopia: 'Ethiopia',
        kenya: 'Kenya',
      },
      // Crop names
      crops: {
        all: 'All crops',
        wheat: 'Wheat',
        maize: 'Maize',
        beans: 'Beans',
      },
    },
    system: {
      offline: 'No internet connection',
      errorTitle: 'Oops! Something went wrong',
      errorFallback: 'An unexpected error occurred',
      tryAgain: 'Try Again',
    },
    errors: {
      syncFailed: 'Could not connect to server. Some features may be limited.',
      weatherUnavailable: 'Weather service is temporarily unavailable. Try again later.',
      diagnosisTimeout: 'Plant diagnosis is taking too long. Please try again.',
      uploadFailed: 'Could not upload image. Check your connection and retry.',
      transcriptionFailed: 'Voice transcription failed. Try speaking again.',
      serverError: 'Server error. Please try again later.',
      requestTimeout: 'Request timed out. Check your connection.',
      locationLookupFailed: 'Could not determine your location details.',
    },
    a11y: {
      startNewChat: 'Start a new chat',
      retryLoadingIntegrations: 'Retry loading integrations',
      dismissNotification: 'Dismiss notification',
      dismiss: 'Dismiss',
      clearSearch: 'Clear search',
      cancelRecording: 'Cancel recording',
      finishRecording: 'Finish recording',
      refreshLocation: 'Refresh location',
      newChat: 'New chat',
      openSettings: 'Open settings',
      scrollToBottom: 'Scroll to bottom',
      clearVoiceTranscription: 'Clear voice transcription',
      takePhoto: 'Take photo',
      pickImage: 'Pick image',
      messageInput: 'Message input',
      sendMessage: 'Send message',
      recordVoice: 'Record voice',
      attachMedia: 'Attach media',
      closeMenu: 'Close menu',
      playVoice: 'Play voice',
      stopVoicePlayback: 'Stop voice playback',
      moreNotifications: '{count} more notifications',
      themeMode: 'Theme: {mode}',
      copyMessage: 'Copy message',
      askQuestion: 'Ask: {question}',
      selectLanguage: 'Language {name}',
    },
  },
};

function getByPath(obj, path) {
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

export function t(key, params) {
  // Try to get translation from current locale first
  let raw;

  // Check cached translations for current locale
  if (currentLocale !== 'en' && translationsCache[currentLocale]) {
    raw = getByPath(translationsCache[currentLocale], key);
  }

  // Fall back to English if translation not found
  if (!raw) {
    raw = getByPath(STRINGS[DEFAULT_LOCALE], key) ?? key;
  }

  if (!params) return raw;
  return Object.keys(params).reduce((acc, k) => acc.replaceAll(`{${k}}`, String(params[k])), raw);
}
