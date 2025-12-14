const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// ============================================
// REGIONS - Geographic regions for MCP activation
// ============================================
const REGIONS = [
  // Level 0: Global (always active)
  { 
    name: 'Global', 
    code: 'GLOBAL', 
    description: 'Global services available everywhere',
    level: 0,
    displayOrder: 0,
  },
  
  // Level 1: Continents
  { 
    name: 'Africa', 
    code: 'AFRICA', 
    description: 'African continent - ISDA Soil data available',
    level: 1,
    displayOrder: 1,
    boundsMinLat: -35.0,
    boundsMaxLat: 37.5,
    boundsMinLon: -18.0,
    boundsMaxLon: 52.0,
  },
  { 
    name: 'Asia', 
    code: 'ASIA', 
    description: 'Asian continent',
    level: 1,
    displayOrder: 2,
    boundsMinLat: -10.0,
    boundsMaxLat: 55.0,
    boundsMinLon: 25.0,
    boundsMaxLon: 180.0,
  },
  
  // Level 2: Sub-regions
  { 
    name: 'East Africa', 
    code: 'EAST_AFRICA', 
    description: 'East African region - GAP weather data available',
    parentCode: 'AFRICA',
    level: 2,
    displayOrder: 10,
    boundsMinLat: -12.0,
    boundsMaxLat: 18.0,
    boundsMinLon: 28.0,
    boundsMaxLon: 52.0,
  },
  { 
    name: 'South Asia', 
    code: 'SOUTH_ASIA', 
    description: 'South Asian region - India, Nepal, Bangladesh',
    parentCode: 'ASIA',
    level: 2,
    displayOrder: 20,
    boundsMinLat: 5.0,
    boundsMaxLat: 37.0,
    boundsMinLon: 60.0,
    boundsMaxLon: 98.0,
  },
  { 
    name: 'Southeast Asia', 
    code: 'SOUTHEAST_ASIA', 
    description: 'Southeast Asian region - Vietnam, Thailand, etc.',
    parentCode: 'ASIA',
    level: 2,
    displayOrder: 21,
    boundsMinLat: -11.0,
    boundsMaxLat: 28.0,
    boundsMinLon: 92.0,
    boundsMaxLon: 141.0,
  },
  
  // Level 3: Countries
  { 
    name: 'Ethiopia', 
    code: 'ETH', 
    description: 'Ethiopia - SSFR fertilizer and Feed Formulation available',
    parentCode: 'EAST_AFRICA',
    level: 3,
    displayOrder: 100,
    boundsMinLat: 3.0,
    boundsMaxLat: 15.0,
    boundsMinLon: 32.0,
    boundsMaxLon: 48.0,
  },
  { 
    name: 'Kenya', 
    code: 'KEN', 
    description: 'Kenya - GAP weather and Decision Tree available',
    parentCode: 'EAST_AFRICA',
    level: 3,
    displayOrder: 101,
    boundsMinLat: -4.7,
    boundsMaxLat: 4.6,
    boundsMinLon: 33.9,
    boundsMaxLon: 41.9,
  },
  { 
    name: 'Tanzania', 
    code: 'TZA', 
    description: 'Tanzania - GAP weather available',
    parentCode: 'EAST_AFRICA',
    level: 3,
    displayOrder: 102,
    boundsMinLat: -11.8,
    boundsMaxLat: -0.9,
    boundsMinLon: 29.3,
    boundsMaxLon: 40.5,
  },
  { 
    name: 'Uganda', 
    code: 'UGA', 
    description: 'Uganda - GAP weather available',
    parentCode: 'EAST_AFRICA',
    level: 3,
    displayOrder: 103,
    boundsMinLat: -1.5,
    boundsMaxLat: 4.2,
    boundsMinLon: 29.5,
    boundsMaxLon: 35.0,
  },
  { 
    name: 'India', 
    code: 'IND', 
    description: 'India - Future Feed Formulation support',
    parentCode: 'SOUTH_ASIA',
    level: 3,
    displayOrder: 200,
    boundsMinLat: 6.7,
    boundsMaxLat: 35.5,
    boundsMinLon: 68.1,
    boundsMaxLon: 97.4,
  },
  { 
    name: 'Vietnam', 
    code: 'VNM', 
    description: 'Vietnam - WeatherAPI with Vietnamese support',
    parentCode: 'SOUTHEAST_ASIA',
    level: 3,
    displayOrder: 210,
    boundsMinLat: 8.2,
    boundsMaxLat: 23.4,
    boundsMinLon: 102.1,
    boundsMaxLon: 109.5,
  },
];

// ============================================
// MCP SERVERS - Registry of all MCP servers
// ============================================
const MCP_SERVERS = [
  // === GLOBAL MCP SERVERS (always active) ===
  {
    name: 'AgriVision Plant Diagnosis',
    slug: 'agrivision',
    description: 'AI-powered plant health diagnosis from images',
    endpointEnvVar: 'MCP_AGRIVISION_URL',
    endpointUrl: 'https://agrivision.up.railway.app',
    category: 'ai',
    isGlobal: true,
    tools: ['diagnose_plant_health'],
    capabilities: ['plant-diagnosis', 'disease-detection', 'pest-identification'],
    icon: 'leaf',
    color: '#4CAF50',
  },
  {
    name: 'User Preferences',
    slug: 'user-preferences',
    description: 'Store and retrieve user preferences',
    endpointEnvVar: 'MCP_USER_PREFERENCES_URL',
    category: 'utility',
    isGlobal: true,
    tools: ['get_preferences', 'set_preferences'],
    capabilities: ['user-settings', 'personalization'],
    icon: 'settings',
    color: '#9E9E9E',
  },
  {
    name: 'Profile Memory',
    slug: 'profile-memory',
    description: 'Remember user context and farming profile',
    endpointEnvVar: 'MCP_PROFILE_MEMORY_URL',
    category: 'utility',
    isGlobal: true,
    tools: ['remember_profile', 'recall_profile'],
    capabilities: ['context-memory', 'user-profile'],
    icon: 'person',
    color: '#2196F3',
  },
  {
    name: 'Content Management',
    slug: 'content',
    description: 'Agricultural content and knowledge base',
    endpointEnvVar: 'MCP_CONTENT_URL',
    category: 'utility',
    isGlobal: true,
    tools: ['search_content', 'get_article'],
    capabilities: ['knowledge-base', 'content-search'],
    icon: 'book',
    color: '#FF9800',
  },
  {
    name: 'Guardrails',
    slug: 'guardrails',
    description: 'Content safety and agricultural relevance checks',
    endpointEnvVar: 'MCP_GUARDRAILS_URL',
    category: 'utility',
    isGlobal: true,
    tools: ['check_safety', 'check_relevance'],
    capabilities: ['safety', 'moderation'],
    icon: 'shield',
    color: '#F44336',
  },
  {
    name: 'Intent Classification',
    slug: 'intent-classification',
    description: 'Classify user query intent for routing',
    endpointEnvVar: 'MCP_INTENT_URL',
    endpointUrl: 'https://intent-classification-mcp.up.railway.app',
    category: 'ai',
    isGlobal: true,
    tools: ['classify_intent'],
    capabilities: ['intent-detection', 'query-routing'],
    icon: 'brain',
    color: '#9C27B0',
    // Marketing content
    tagline: 'Smart query understanding for personalized farming advice',
    longDescription: 'Our AI-powered intent classification understands what you really mean, even when you ask in your local language. Whether you\'re asking about weather, crop disease, soil health, or livestock nutrition, we instantly route your question to the right agricultural expert system.',
    features: [
      { icon: 'translate', title: 'Multi-Language Support', description: 'Understands queries in 45+ languages including Amharic, Swahili, Hindi, and Vietnamese' },
      { icon: 'speed', title: 'Instant Classification', description: 'Routes your question to the right expert in milliseconds' },
      { icon: 'category', title: 'Smart Categorization', description: 'Detects crops, livestock, locations, and farming activities automatically' },
      { icon: 'auto_fix_high', title: 'Context Aware', description: 'Remembers your farm profile to give more relevant responses' },
    ],
    useCases: [
      'Ask about weather in your local language and get location-specific forecasts',
      'Describe crop symptoms in your own words and get disease diagnosis',
      'Request fertilizer advice and get region-appropriate recommendations',
      'Ask about animal nutrition and get feed formulation guidance',
    ],
    dataSource: 'Digital Green AI Platform',
    supportedCrops: [],
    supportedRegions: ['Global - Available everywhere'],
    heroColor: '#9C27B0',
  },
  {
    name: 'Agricultural Tips',
    slug: 'tips',
    description: 'Daily farming tips and best practices',
    endpointEnvVar: 'MCP_TIPS_URL',
    category: 'agriculture',
    isGlobal: true,
    tools: ['get_daily_tip', 'get_tips_by_crop'],
    capabilities: ['tips', 'best-practices'],
    icon: 'lightbulb',
    color: '#FFC107',
  },
  {
    name: 'AccuWeather',
    slug: 'accuweather',
    description: 'Global weather forecasts and conditions via AccuWeather API',
    endpointEnvVar: 'MCP_ACCUWEATHER_URL',
    endpointUrl: 'https://accuweather-mcp.up.railway.app',
    category: 'weather',
    isGlobal: true,
    tools: ['get_current_conditions', 'get_forecast', 'get_location_key'],
    capabilities: ['weather', 'forecast', 'global'],
    icon: 'cloud',
    color: '#FF6F00',
    // Marketing content
    tagline: 'Accurate weather forecasts for smarter farming decisions',
    longDescription: 'Get hyper-local weather data powered by AccuWeather, the world\'s most accurate weather service. Know exactly when to plant, spray, irrigate, or harvest based on real-time conditions and reliable forecasts. Make weather-smart decisions that protect your crops and maximize yields.',
    features: [
      { icon: 'thermometer', title: 'Current Conditions', description: 'Real-time temperature, humidity, wind speed, and precipitation data for your exact location' },
      { icon: 'calendar', title: '5-Day Forecast', description: 'Plan your farming activities with accurate daily and hourly predictions' },
      { icon: 'water', title: 'Precipitation Alerts', description: 'Know when rain is coming so you can time irrigation and spraying perfectly' },
      { icon: 'air', title: 'Wind Monitoring', description: 'Check wind conditions before spraying pesticides or fertilizers' },
    ],
    useCases: [
      'Know the best time to spray pesticides without rain washing them away',
      'Plan irrigation based on rainfall predictions to save water',
      'Protect crops from extreme weather with advance warnings',
      'Schedule planting and harvesting around optimal weather windows',
    ],
    dataSource: 'AccuWeather API',
    supportedCrops: [],
    supportedRegions: ['Global - Available everywhere'],
    heroColor: '#FF6F00',
    // Widget Configuration
    widgetCategory: 'weather',
    requiresInput: false,
    inputWidget: {
      type: 'weather_input',
      prompt: 'Want to see a detailed forecast? You can customize the number of days.',
      reason: 'You can customize the forecast parameters for more specific results.',
    },
    outputWidget: {
      type: 'weather_forecast_card',
    },
  },
  {
    name: 'Entity Extraction',
    slug: 'entity-extraction',
    description: 'Extract entities from user queries for analytics and policymaker insights',
    endpointEnvVar: 'MCP_ENTITY_EXTRACTION_URL',
    category: 'ai',
    isGlobal: true,
    isActive: false,
    isDeployed: false,
    tools: ['extract_entities', 'get_query_topics'],
    capabilities: ['nlp', 'entity-extraction', 'analytics'],
    icon: 'analytics',
    color: '#E91E63',
  },
  
  // === REGIONAL MCP SERVERS ===
  
  // Ethiopia-specific
  {
    name: 'NextGen Fertilizer Recommendations',
    slug: 'nextgen',
    description: 'NextGen Agro Advisory - Site-Specific Fertilizer Recommendations for Ethiopian farmers (wheat, maize)',
    endpointEnvVar: 'MCP_NEXTGEN_URL',
    endpointUrl: 'https://nextgen-mcp.up.railway.app',
    category: 'agriculture',
    isGlobal: false,
    isDeployed: true,
    tools: ['get_fertilizer_recommendation'],
    capabilities: ['fertilizer', 'soil-nutrients', 'wheat', 'maize'],
    icon: 'science',
    color: '#8BC34A',
    // Marketing content
    tagline: 'Precision fertilizer advice tailored to your farm',
    longDescription: 'Get scientifically-proven, site-specific fertilizer recommendations developed by agricultural experts for Ethiopian farmers. Our system analyzes your location\'s soil conditions and provides exact nutrient requirements for wheat and maize crops, helping you maximize yields while reducing costs.',
    features: [
      { icon: 'my_location', title: 'Location-Specific', description: 'Recommendations based on your exact farm location and local soil conditions' },
      { icon: 'science', title: 'Research-Backed', description: 'Developed with NextGen Agro Advisory and Ethiopian agricultural research institutes' },
      { icon: 'grass', title: 'Crop-Optimized', description: 'Tailored advice for wheat and maize growing in Ethiopian conditions' },
      { icon: 'savings', title: 'Cost-Effective', description: 'Apply only what your soil needs - save money on unnecessary fertilizers' },
    ],
    useCases: [
      'Get NPK fertilizer amounts customized for your wheat field',
      'Know exactly how much DAP and Urea to apply for maize',
      'Understand nutrient deficiencies in your local soil',
      'Plan fertilizer purchases based on your farm size',
    ],
    dataSource: 'NextGen Agro Advisory - SSFR Database',
    supportedCrops: ['Wheat', 'Maize'],
    supportedRegions: ['Ethiopia'],
    heroColor: '#8BC34A',
    // Widget Configuration
    widgetCategory: 'fertilizer',
    requiresInput: true, // Always needs location + crop selection
    inputWidget: {
      type: 'fertilizer_input',
      prompt: 'I can calculate fertilizer recommendations for wheat or maize. Want to use the calculator?',
      reason: 'Site-specific fertilizer recommendations need your field location and crop type.',
    },
    outputWidget: {
      type: 'fertilizer_result_card',
    },
  },
  {
    name: 'EDACaP Climate Advisory',
    slug: 'edacap',
    description: 'Climate forecasts and crop yield predictions for Ethiopian farmers via Aclimate',
    endpointEnvVar: 'MCP_EDACAP_URL',
    endpointUrl: 'https://edacap-mcp-server.up.railway.app',
    category: 'weather',
    isGlobal: false,
    isDeployed: true,
    tools: ['get_weather_stations', 'get_climate_forecast', 'get_crop_forecast'],
    capabilities: ['climate', 'seasonal-forecast', 'crop-yield', 'weather-stations'],
    icon: 'cloud',
    color: '#00BCD4',
    // Marketing content
    tagline: 'Seasonal climate forecasts for Ethiopian agriculture',
    longDescription: 'Plan your farming season with confidence using climate forecasts from the Ethiopian Data Science Initiative (EDACaP) and Aclimate. Get 3-month seasonal outlooks, understand rainfall patterns, and predict crop yields before you plant. Make data-driven decisions that protect your harvest.',
    features: [
      { icon: 'calendar_month', title: 'Seasonal Forecasts', description: 'Get 3-month climate predictions to plan your planting and harvesting' },
      { icon: 'grain', title: 'Yield Predictions', description: 'Estimate expected crop yields based on climate conditions' },
      { icon: 'location_on', title: 'Weather Stations', description: 'Access data from local Ethiopian weather stations near your farm' },
      { icon: 'water_drop', title: 'Rainfall Analysis', description: 'Understand expected rainfall patterns for the growing season' },
    ],
    useCases: [
      'Plan when to plant based on seasonal rainfall forecasts',
      'Estimate expected harvest yields before planting',
      'Understand climate risks for the upcoming season',
      'Find the nearest weather station for local conditions',
    ],
    dataSource: 'Aclimate / CIAT / EDACaP',
    supportedCrops: ['Wheat', 'Maize', 'Teff', 'Sorghum'],
    supportedRegions: ['Ethiopia'],
    heroColor: '#00BCD4',
    // Widget Configuration
    widgetCategory: 'climate',
    requiresInput: false,
    inputWidget: {
      type: 'climate_query_input',
      prompt: 'Want to see the seasonal forecast? I can show climate predictions for your area.',
      reason: 'You can customize the climate query for specific stations or forecast types.',
    },
    outputWidget: {
      type: 'climate_forecast_card',
    },
  },
  {
    name: 'Feed Formulation',
    slug: 'feed-formulation',
    description: 'Dairy cattle nutrition optimization and diet recommendations',
    endpointEnvVar: 'MCP_FEED_FORMULATION_URL',
    endpointUrl: 'https://feed-formulation-mcp.up.railway.app',
    category: 'agriculture',
    isGlobal: false,
    isDeployed: true,
    tools: ['evaluate_diet', 'get_diet_recommendation', 'search_feeds', 'get_feed_info'],
    capabilities: ['livestock', 'dairy', 'nutrition', 'feed'],
    icon: 'pets',
    color: '#795548',
    // Marketing content
    tagline: 'Optimize your dairy cattle nutrition for maximum milk production',
    longDescription: 'Maximize your dairy herd\'s milk production with scientifically formulated feed recommendations. Our system analyzes your available feed ingredients and creates balanced diets that meet nutritional requirements while minimizing costs. Get advice on local feed alternatives and optimize your feeding strategy.',
    features: [
      { icon: 'pets', title: 'Diet Evaluation', description: 'Analyze your current feeding program against nutritional requirements' },
      { icon: 'restaurant', title: 'Feed Database', description: 'Access nutritional information for 200+ local Ethiopian feed ingredients' },
      { icon: 'balance', title: 'Balanced Rations', description: 'Get optimized feed mixes that meet energy, protein, and mineral needs' },
      { icon: 'attach_money', title: 'Cost Optimization', description: 'Minimize feed costs while maintaining milk production' },
    ],
    useCases: [
      'Create a balanced diet for lactating dairy cows',
      'Find nutritional alternatives for expensive feed ingredients',
      'Evaluate if your current feeding meets cow requirements',
      'Optimize feed for different production stages (lactation, dry period)',
    ],
    dataSource: 'ILRI / Ethiopian Feed Database',
    supportedCrops: [],
    supportedRegions: ['Ethiopia'],
    heroColor: '#795548',
    // Widget Configuration
    widgetCategory: 'feed',
    requiresInput: true, // Always needs cattle details and feed selection
    inputWidget: {
      type: 'feed_formulation_input',
      prompt: 'Would you like to use our feed calculator for a personalized diet recommendation?',
      reason: 'Feed formulation requires specific cattle and feed details for accurate results.',
    },
    outputWidget: {
      type: 'diet_result_card',
    },
  },
  
  // Africa-wide
  {
    name: 'ISDA Soil Intelligence',
    slug: 'isda-soil',
    description: 'Soil property data and analysis for African locations',
    endpointEnvVar: 'MCP_ISDA_URL',
    endpointUrl: 'https://isda-soil-mcp.up.railway.app',
    category: 'agriculture',
    isGlobal: false,
    isDeployed: true,
    tools: ['get_isda_soil_properties', 'get_isda_available_layers'],
    capabilities: ['soil', 'soil-analysis', 'africa'],
    icon: 'terrain',
    color: '#6D4C41',
    // Marketing content
    tagline: 'Know your soil to grow better crops',
    longDescription: 'Understand your soil\'s properties with detailed analysis from iSDAsoil - Africa\'s first continent-wide digital soil map. Get precise data on soil texture, pH, organic carbon, nutrients, and more at 30-meter resolution. Use this information to make smarter decisions about fertilizer application, crop selection, and land management.',
    features: [
      { icon: 'terrain', title: 'Soil Properties', description: 'Access 20+ soil properties including pH, nitrogen, phosphorus, and organic matter' },
      { icon: 'map', title: '30m Resolution', description: 'High-precision soil data at 30-meter resolution for accurate field-level insights' },
      { icon: 'layers', title: 'Multiple Depths', description: 'Analyze soil properties at different depths (0-20cm and 20-50cm)' },
      { icon: 'public', title: 'Africa-Wide', description: 'Coverage across the entire African continent' },
    ],
    useCases: [
      'Check soil pH before choosing which crops to plant',
      'Understand nutrient levels to plan fertilizer application',
      'Assess soil texture for irrigation planning',
      'Identify problem areas like acidic or saline soils',
    ],
    dataSource: 'iSDAsoil / Innovative Solutions for Decision Agriculture',
    supportedCrops: [],
    supportedRegions: ['Africa - All countries'],
    heroColor: '#6D4C41',
    // Widget Configuration
    widgetCategory: 'soil',
    requiresInput: false,
    inputWidget: {
      type: 'soil_query_input',
      prompt: 'I can show you detailed soil analysis. Want to explore different depths?',
      reason: 'You can customize the soil query for specific depths and properties.',
    },
    outputWidget: {
      type: 'soil_profile_card',
    },
  },
  
  // East Africa
  {
    name: 'GAP Weather Intelligence',
    slug: 'gap-weather',
    description: 'Satellite weather data for agriculture in East Africa via TomorrowNow GAP',
    endpointEnvVar: 'MCP_GAP_URL',
    category: 'weather',
    isGlobal: false,
    tools: ['get_gap_weather_forecast'],
    capabilities: ['weather', 'forecast', 'satellite-data'],
    icon: 'cloud',
    color: '#03A9F4',
  },
  {
    name: 'TomorrowNow Decision Tree',
    slug: 'decision-tree',
    description: 'Crop decision trees based on weather and growth stages',
    endpointEnvVar: 'MCP_DECISION_TREE_URL',
    category: 'agriculture',
    isGlobal: false,
    tools: ['get_crop_recommendation', 'get_growth_stage', 'list_crops', 'list_growth_stages'],
    capabilities: ['decision-support', 'crop-advice', 'growth-stages'],
    icon: 'account_tree',
    color: '#009688',
    // Widget Configuration
    widgetCategory: 'advisory',
    requiresInput: false,
    inputWidget: {
      type: 'decision_tree_input',
      prompt: 'I can give you crop-specific recommendations based on growth stage.',
      reason: 'Advisory recommendations are more accurate with crop and growth stage details.',
    },
    outputWidget: {
      type: 'recommendations_card',
    },
  },
  
  // Vietnam/Global weather
  {
    name: 'WeatherAPI',
    slug: 'weatherapi',
    description: 'Global weather data with Vietnamese language support',
    endpointEnvVar: 'MCP_WEATHERAPI_URL',
    category: 'weather',
    isGlobal: false,
    tools: ['get_weather_by_coords', 'get_forecast', 'get_weather_history', 'get_astronomy'],
    capabilities: ['weather', 'forecast', 'historical', 'marine'],
    icon: 'wb_sunny',
    color: '#FF5722',
  },
  
  // Future: AccuWeather or Tomorrow.io
  {
    name: 'Tomorrow.io Weather',
    slug: 'tomorrow-io',
    description: 'Advanced weather intelligence from Tomorrow.io (coming soon)',
    endpointEnvVar: 'MCP_TOMORROW_IO_URL',
    category: 'weather',
    isGlobal: false,
    isActive: false,
    isDeployed: false,
    tools: ['get_weather', 'get_forecast', 'get_alerts'],
    capabilities: ['weather', 'forecast', 'alerts', 'historical'],
    icon: 'thunderstorm',
    color: '#3F51B5',
  },
];

// ============================================
// REGION-MCP MAPPINGS - Which servers are active in which regions
// ============================================
const REGION_MCP_MAPPINGS = [
  // Global servers are automatically active everywhere via isGlobal flag
  // These mappings are for regional servers only
  
  // Ethiopia
  { regionCode: 'ETH', mcpSlug: 'nextgen', priority: 1 },
  { regionCode: 'ETH', mcpSlug: 'edacap', priority: 2 },
  { regionCode: 'ETH', mcpSlug: 'feed-formulation', priority: 3 },
  { regionCode: 'ETH', mcpSlug: 'decision-tree', priority: 4 },
  
  // East Africa (includes Ethiopia, Kenya, Tanzania, Uganda)
  { regionCode: 'EAST_AFRICA', mcpSlug: 'gap-weather', priority: 1 },
  { regionCode: 'EAST_AFRICA', mcpSlug: 'decision-tree', priority: 2 },
  
  // All of Africa
  { regionCode: 'AFRICA', mcpSlug: 'isda-soil', priority: 1 },
  
  // Kenya
  { regionCode: 'KEN', mcpSlug: 'gap-weather', priority: 1 },
  { regionCode: 'KEN', mcpSlug: 'decision-tree', priority: 2 },
  
  // Vietnam
  { regionCode: 'VNM', mcpSlug: 'weatherapi', priority: 1 },
  
  // India (future)
  // { regionCode: 'IND', mcpSlug: 'feed-formulation', priority: 1 },
];

// ============================================
// COUNTRY-REGION MAPPINGS - Key countries for initial setup
// ============================================
const COUNTRY_REGION_MAPPINGS = [
  // East African countries
  { countryCode: 'ETH', countryName: 'Ethiopia', regionCode: 'ETH', isPrimary: true },
  { countryCode: 'ETH', countryName: 'Ethiopia', regionCode: 'EAST_AFRICA', isPrimary: false },
  { countryCode: 'ETH', countryName: 'Ethiopia', regionCode: 'AFRICA', isPrimary: false },
  
  { countryCode: 'KEN', countryName: 'Kenya', regionCode: 'KEN', isPrimary: true },
  { countryCode: 'KEN', countryName: 'Kenya', regionCode: 'EAST_AFRICA', isPrimary: false },
  { countryCode: 'KEN', countryName: 'Kenya', regionCode: 'AFRICA', isPrimary: false },
  
  { countryCode: 'TZA', countryName: 'Tanzania', regionCode: 'TZA', isPrimary: true },
  { countryCode: 'TZA', countryName: 'Tanzania', regionCode: 'EAST_AFRICA', isPrimary: false },
  { countryCode: 'TZA', countryName: 'Tanzania', regionCode: 'AFRICA', isPrimary: false },
  
  { countryCode: 'UGA', countryName: 'Uganda', regionCode: 'UGA', isPrimary: true },
  { countryCode: 'UGA', countryName: 'Uganda', regionCode: 'EAST_AFRICA', isPrimary: false },
  { countryCode: 'UGA', countryName: 'Uganda', regionCode: 'AFRICA', isPrimary: false },
  
  { countryCode: 'SOM', countryName: 'Somalia', regionCode: 'EAST_AFRICA', isPrimary: true },
  { countryCode: 'SOM', countryName: 'Somalia', regionCode: 'AFRICA', isPrimary: false },
  
  // Other African countries (inherit Africa region)
  { countryCode: 'NGA', countryName: 'Nigeria', regionCode: 'AFRICA', isPrimary: true },
  { countryCode: 'GHA', countryName: 'Ghana', regionCode: 'AFRICA', isPrimary: true },
  { countryCode: 'ZAF', countryName: 'South Africa', regionCode: 'AFRICA', isPrimary: true },
  { countryCode: 'EGY', countryName: 'Egypt', regionCode: 'AFRICA', isPrimary: true },
  { countryCode: 'MAR', countryName: 'Morocco', regionCode: 'AFRICA', isPrimary: true },
  { countryCode: 'RWA', countryName: 'Rwanda', regionCode: 'AFRICA', isPrimary: true },
  
  // Asian countries
  { countryCode: 'IND', countryName: 'India', regionCode: 'IND', isPrimary: true },
  { countryCode: 'IND', countryName: 'India', regionCode: 'SOUTH_ASIA', isPrimary: false },
  
  { countryCode: 'VNM', countryName: 'Vietnam', regionCode: 'VNM', isPrimary: true },
  { countryCode: 'VNM', countryName: 'Vietnam', regionCode: 'SOUTHEAST_ASIA', isPrimary: false },
  
  { countryCode: 'THA', countryName: 'Thailand', regionCode: 'SOUTHEAST_ASIA', isPrimary: true },
  { countryCode: 'IDN', countryName: 'Indonesia', regionCode: 'SOUTHEAST_ASIA', isPrimary: true },
  { countryCode: 'PHL', countryName: 'Philippines', regionCode: 'SOUTHEAST_ASIA', isPrimary: true },
];

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
  console.log('🌱 Seeding database...\n');
  
  // ========================================
  // 1. Seed TTS Voices
  // ========================================
  console.log('📢 Creating TTS voices...');
  for (const voice of TTS_VOICES) {
    await prisma.ttsVoice.upsert({
      where: { id: voice.id },
      update: voice,
      create: voice,
    });
  }
  console.log(`   ✅ Created ${TTS_VOICES.length} TTS voices`);
  
  // ========================================
  // 2. Seed Languages with TTS mappings
  // ========================================
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
  console.log(`   ✅ Created ${LANGUAGES.length} languages with TTS mappings`);
  
  // ========================================
  // 3. Seed Regions (hierarchical)
  // ========================================
  console.log('🗺️  Creating regions...');
  
  // First pass: Create all regions without parent references
  const regionMap = new Map();
  for (const region of REGIONS) {
    const created = await prisma.region.upsert({
      where: { code: region.code },
      update: {
        name: region.name,
        description: region.description,
        level: region.level,
        displayOrder: region.displayOrder,
        boundsMinLat: region.boundsMinLat,
        boundsMaxLat: region.boundsMaxLat,
        boundsMinLon: region.boundsMinLon,
        boundsMaxLon: region.boundsMaxLon,
        isActive: true,
      },
      create: {
        name: region.name,
        code: region.code,
        description: region.description,
        level: region.level,
        displayOrder: region.displayOrder,
        boundsMinLat: region.boundsMinLat,
        boundsMaxLat: region.boundsMaxLat,
        boundsMinLon: region.boundsMinLon,
        boundsMaxLon: region.boundsMaxLon,
        isActive: true,
      },
    });
    regionMap.set(region.code, created.id);
  }
  
  // Second pass: Set parent relationships
  for (const region of REGIONS) {
    if (region.parentCode) {
      const parentId = regionMap.get(region.parentCode);
      if (parentId) {
        await prisma.region.update({
          where: { code: region.code },
          data: { parentRegionId: parentId },
        });
      }
    }
  }
  console.log(`   ✅ Created ${REGIONS.length} regions with hierarchy`);
  
  // ========================================
  // 4. Seed MCP Servers
  // ========================================
  console.log('🔌 Creating MCP server registry...');
  const mcpServerMap = new Map();
  for (const server of MCP_SERVERS) {
    const created = await prisma.mcpServerRegistry.upsert({
      where: { slug: server.slug },
      update: {
        name: server.name,
        description: server.description,
        endpointEnvVar: server.endpointEnvVar,
        endpointUrl: server.endpointUrl,
        category: server.category,
        isGlobal: server.isGlobal,
        tools: server.tools,
        capabilities: server.capabilities,
        icon: server.icon,
        color: server.color,
        isActive: server.isActive !== false,
        isDeployed: server.isDeployed !== false,
        // Marketing content
        tagline: server.tagline,
        longDescription: server.longDescription,
        features: server.features,
        useCases: server.useCases,
        dataSource: server.dataSource,
        supportedCrops: server.supportedCrops || [],
        supportedRegions: server.supportedRegions,
        heroColor: server.heroColor,
        contentUpdatedAt: server.tagline ? new Date() : null,
        // Widget configuration
        inputWidget: server.inputWidget || null,
        outputWidget: server.outputWidget || null,
        widgetCategory: server.widgetCategory || null,
        requiresInput: server.requiresInput || false,
      },
      create: {
        name: server.name,
        slug: server.slug,
        description: server.description,
        endpointEnvVar: server.endpointEnvVar,
        endpointUrl: server.endpointUrl,
        category: server.category,
        isGlobal: server.isGlobal,
        tools: server.tools,
        capabilities: server.capabilities,
        icon: server.icon,
        color: server.color,
        isActive: server.isActive !== false,
        isDeployed: server.isDeployed !== false,
        // Marketing content
        tagline: server.tagline,
        longDescription: server.longDescription,
        features: server.features,
        useCases: server.useCases,
        dataSource: server.dataSource,
        supportedCrops: server.supportedCrops || [],
        supportedRegions: server.supportedRegions,
        heroColor: server.heroColor,
        contentUpdatedAt: server.tagline ? new Date() : null,
        // Widget configuration
        inputWidget: server.inputWidget || null,
        outputWidget: server.outputWidget || null,
        widgetCategory: server.widgetCategory || null,
        requiresInput: server.requiresInput || false,
      },
    });
    mcpServerMap.set(server.slug, created.id);
  }
  console.log(`   ✅ Created ${MCP_SERVERS.length} MCP servers`);
  
  // ========================================
  // 5. Seed Region-MCP Mappings
  // ========================================
  console.log('🔗 Creating region-MCP mappings...');
  let mappingCount = 0;
  for (const mapping of REGION_MCP_MAPPINGS) {
    const regionId = regionMap.get(mapping.regionCode);
    const mcpServerId = mcpServerMap.get(mapping.mcpSlug);
    
    if (regionId && mcpServerId) {
      await prisma.regionMcpMapping.upsert({
        where: {
          regionId_mcpServerId: {
            regionId,
            mcpServerId,
          },
        },
        update: {
          isActive: true,
          priority: mapping.priority,
        },
        create: {
          regionId,
          mcpServerId,
          isActive: true,
          priority: mapping.priority,
        },
      });
      mappingCount++;
    } else {
      console.warn(`   ⚠️  Skipped mapping: ${mapping.regionCode} -> ${mapping.mcpSlug} (not found)`);
    }
  }
  console.log(`   ✅ Created ${mappingCount} region-MCP mappings`);
  
  // ========================================
  // 6. Seed Country-Region Mappings
  // ========================================
  console.log('🌍 Creating country-region mappings...');
  let countryMappingCount = 0;
  for (const mapping of COUNTRY_REGION_MAPPINGS) {
    const regionId = regionMap.get(mapping.regionCode);
    
    if (regionId) {
      await prisma.countryRegionMapping.upsert({
        where: {
          countryCode_regionId: {
            countryCode: mapping.countryCode,
            regionId,
          },
        },
        update: {
          countryName: mapping.countryName,
          isPrimary: mapping.isPrimary,
        },
        create: {
          countryCode: mapping.countryCode,
          countryName: mapping.countryName,
          regionId,
          isPrimary: mapping.isPrimary,
        },
      });
      countryMappingCount++;
    } else {
      console.warn(`   ⚠️  Skipped country mapping: ${mapping.countryCode} -> ${mapping.regionCode} (region not found)`);
    }
  }
  console.log(`   ✅ Created ${countryMappingCount} country-region mappings`);
  
  // ========================================
  // 7. Summary
  // ========================================
  const voiceCount = await prisma.ttsVoice.count();
  const langCount = await prisma.language.count();
  const regionCount = await prisma.region.count();
  const mcpCount = await prisma.mcpServerRegistry.count();
  const globalMcpCount = await prisma.mcpServerRegistry.count({ where: { isGlobal: true } });
  const regionMcpCount = await prisma.regionMcpMapping.count();
  const countryCount = await prisma.countryRegionMapping.count({ where: { isPrimary: true } });
  
  console.log(`\n📊 Database Summary:`);
  console.log(`   - TTS Voices: ${voiceCount}`);
  console.log(`   - Languages: ${langCount}`);
  console.log(`   - Regions: ${regionCount}`);
  console.log(`   - MCP Servers: ${mcpCount} (${globalMcpCount} global)`);
  console.log(`   - Region-MCP Mappings: ${regionMcpCount}`);
  console.log(`   - Countries Mapped: ${countryCount}`);
  
  // Show MCP server breakdown
  console.log(`\n🔌 MCP Server Breakdown:`);
  const globalServers = await prisma.mcpServerRegistry.findMany({ 
    where: { isGlobal: true },
    select: { name: true, slug: true }
  });
  console.log(`   Global (always active):`);
  for (const server of globalServers) {
    console.log(`      - ${server.name} (${server.slug})`);
  }
  
  const regionalServers = await prisma.mcpServerRegistry.findMany({ 
    where: { isGlobal: false, isActive: true },
    select: { name: true, slug: true }
  });
  console.log(`   Regional (location-based):`);
  for (const server of regionalServers) {
    console.log(`      - ${server.name} (${server.slug})`);
  }
  
  // Show Ethiopia setup
  console.log(`\n🇪🇹 Ethiopia MCP Servers:`);
  const ethiopiaRegion = await prisma.region.findUnique({ where: { code: 'ETH' } });
  if (ethiopiaRegion) {
    const ethiopiaMappings = await prisma.regionMcpMapping.findMany({
      where: { regionId: ethiopiaRegion.id, isActive: true },
      include: { mcpServer: { select: { name: true, slug: true } } },
      orderBy: { priority: 'asc' }
    });
    for (const m of ethiopiaMappings) {
      console.log(`      - ${m.mcpServer.name} (priority: ${m.priority})`);
    }
    // Also show inherited from parent regions
    const eastAfrica = await prisma.region.findUnique({ where: { code: 'EAST_AFRICA' } });
    const africa = await prisma.region.findUnique({ where: { code: 'AFRICA' } });
    if (eastAfrica) {
      const eaMappings = await prisma.regionMcpMapping.findMany({
        where: { regionId: eastAfrica.id, isActive: true },
        include: { mcpServer: { select: { name: true, slug: true } } }
      });
      if (eaMappings.length > 0) {
        console.log(`      (inherited from East Africa):`);
        for (const m of eaMappings) {
          console.log(`         - ${m.mcpServer.name}`);
        }
      }
    }
    if (africa) {
      const afMappings = await prisma.regionMcpMapping.findMany({
        where: { regionId: africa.id, isActive: true },
        include: { mcpServer: { select: { name: true, slug: true } } }
      });
      if (afMappings.length > 0) {
        console.log(`      (inherited from Africa):`);
        for (const m of afMappings) {
          console.log(`         - ${m.mcpServer.name}`);
        }
      }
    }
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

