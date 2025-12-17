// AI Routes - Chat, TTS, Transcription, Location
const express = require('express');
const cloudinary = require('cloudinary').v2;
const { prisma } = require('../db');

const router = express.Router();

// Intent classification handled by Intent Classification MCP Server
// Global keywords in GLOBAL_INTENT_KEYWORDS provide fast matching for common queries

// AI Services for Gemini-based endpoints
const AI_SERVICES_URL = process.env.AI_SERVICES_URL || 'https://ag-mcp-ai-services.up.railway.app';
const AI_SERVICES_KEY = process.env.AI_SERVICES_KEY || '';

// External service URLs
const INTENT_CLASSIFICATION_URL = process.env.INTENT_CLASSIFICATION_URL || 'https://intent-classification-mcp.up.railway.app';
const AGRIVISION_URL = process.env.AGRIVISION_URL || 'https://agrivision-mcp-server.up.railway.app';
const CHAT_TIMEOUT_MS = parseInt(process.env.CHAT_TIMEOUT_MS || '60000'); // 60s default
const AGRIVISION_TIMEOUT_MS = parseInt(process.env.AGRIVISION_TIMEOUT_MS || '45000'); // 45s for image analysis

// Geocoding APIs (direct calls)
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const IP_API_URL = 'http://ip-api.com/json';


/**
 * Get active MCP servers for a location (helper function)
 */
async function getActiveMcpServersForLocation(latitude, longitude) {
  try {
    // Get all global servers
    const globalServers = await prisma.mcpServerRegistry.findMany({
      where: { isGlobal: true, isActive: true, isDeployed: true },
      select: {
        slug: true,
        name: true,
        category: true,
        tools: true,
        capabilities: true,
        endpointEnvVar: true,
      },
    });

    let regionalServers = [];
    let detectedRegions = [];

    if (latitude && longitude) {
      // Find matching regions
      const matchingRegions = await prisma.region.findMany({
        where: {
          isActive: true,
          boundsMinLat: { lte: latitude },
          boundsMaxLat: { gte: latitude },
          boundsMinLon: { lte: longitude },
          boundsMaxLon: { gte: longitude },
        },
        orderBy: { level: 'desc' },
      });

      detectedRegions = matchingRegions.map(r => ({ name: r.name, code: r.code, level: r.level }));

      if (matchingRegions.length > 0) {
        // Build region hierarchy
        const regionIds = [];
        for (const region of matchingRegions) {
          regionIds.push(region.id);
          let currentId = region.parentRegionId;
          while (currentId) {
            regionIds.push(currentId);
            const parent = await prisma.region.findUnique({
              where: { id: currentId },
              select: { parentRegionId: true },
            });
            currentId = parent?.parentRegionId;
          }
        }

        const uniqueRegionIds = [...new Set(regionIds)];

        // Get regional MCP servers
        const mappings = await prisma.regionMcpMapping.findMany({
          where: { regionId: { in: uniqueRegionIds }, isActive: true },
          include: {
            region: { select: { name: true, code: true } },
            mcpServer: {
              select: {
                slug: true,
                name: true,
                category: true,
                tools: true,
                capabilities: true,
                endpointEnvVar: true,
                isActive: true,
                isDeployed: true,
              },
            },
          },
          orderBy: { priority: 'asc' },
        });

        const seenSlugs = new Set();
        for (const m of mappings) {
          if (!seenSlugs.has(m.mcpServer.slug) && m.mcpServer.isActive && m.mcpServer.isDeployed) {
            seenSlugs.add(m.mcpServer.slug);
            regionalServers.push({
              ...m.mcpServer,
              sourceRegion: m.region.name,
            });
          }
        }
      }
    }

    // Format with endpoints
    const formatServer = (server) => ({
      slug: server.slug,
      name: server.name,
      category: server.category,
      tools: server.tools,
      capabilities: server.capabilities,
      endpoint: process.env[server.endpointEnvVar] || null,
      sourceRegion: server.sourceRegion,
    });

    return {
      global: globalServers.map(formatServer).filter(s => s.endpoint),
      regional: regionalServers.map(formatServer).filter(s => s.endpoint),
      detectedRegions,
    };
  } catch (error) {
    console.error('Error getting MCP servers for location:', error);
    return { global: [], regional: [], detectedRegions: [] };
  }
}

/**
 * Call an MCP server tool
 */
async function callMcpTool(endpoint, toolName, args, extraHeaders = {}) {
  try {
    const response = await fetch(`${endpoint}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        ...extraHeaders,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: toolName, arguments: args },
      }),
    });
    const text = await response.text();
    const dataLine = text.split('\n').find(l => l.startsWith('data: '));
    if (dataLine) {
      const data = JSON.parse(dataLine.replace('data: ', ''));
      if (data.result?.content?.[0]?.text) {
        try { return JSON.parse(data.result.content[0].text); }
        catch { return data.result.content[0].text; }
      }
    }
    return null;
  } catch (e) {
    console.error(`[MCP] Error calling ${toolName}:`, e.message);
    return { error: e.message };
  }
}

/**
 * Call AgriVision MCP for plant health diagnosis
 * Triggered when user sends an image with their message
 */
async function callAgriVisionDiagnosis(imageBase64, expectedCrop = null) {
  try {
    console.log('[AgriVision] Starting plant diagnosis...');
    console.log('[AgriVision] Image size:', Math.round(imageBase64.length / 1024), 'KB');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), AGRIVISION_TIMEOUT_MS);

    const args = { image: imageBase64 };
    if (expectedCrop) {
      args.crop = expectedCrop;
    }

    const response = await fetch(`${AGRIVISION_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: { name: 'diagnose_plant_health', arguments: args },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await response.text();
    const dataLine = text.split('\n').find(l => l.startsWith('data: '));

    if (dataLine) {
      const data = JSON.parse(dataLine.replace('data: ', ''));
      if (data.result?.content?.[0]?.text) {
        const diagnosisText = data.result.content[0].text;

        // Try to parse as JSON (AgriVision returns JSON in json output mode)
        try {
          const diagnosis = JSON.parse(diagnosisText);
          console.log('[AgriVision] ✅ Diagnosis complete:', {
            crop: diagnosis.crop?.name,
            health: diagnosis.health_status,
            issues: diagnosis.issues?.length || 0,
          });
          return diagnosis;
        } catch {
          // If not JSON, return as structured text
          console.log('[AgriVision] ✅ Diagnosis complete (text format)');
          return { text: diagnosisText, format: 'text' };
        }
      }
    }

    console.warn('[AgriVision] No diagnosis data in response');
    return null;
  } catch (e) {
    if (e.name === 'AbortError') {
      console.error('[AgriVision] ❌ Timeout after', AGRIVISION_TIMEOUT_MS / 1000, 'seconds');
      return { error: 'timeout', message: 'Plant diagnosis timed out. Please try again.' };
    }
    console.error('[AgriVision] ❌ Error:', e.message);
    return { error: e.message };
  }
}

/**
 * Call Intent Classification MCP for multi-language intent detection
 * Provides structured entity extraction (crops, livestock, practices)
 */
async function classifyIntentWithLLM(message, language = 'en') {
  try {
    const response = await fetch(`${INTENT_CLASSIFICATION_URL}/tools/classify_intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, language }),
    });
    
    if (!response.ok) {
      console.warn('[Intent] LLM classification failed');
      return null;
    }
    
    const data = await response.json();
    if (data.success && data.classification) {
      console.log(`[Intent] LLM classified: ${data.classification.main_intent} (${data.classification.confidence})`);
      return data.classification;
    }
    return null;
  } catch (e) {
    console.error('[Intent] LLM error:', e.message);
    return null;
  }
}

/**
 * Map intent names to our MCP categories
 */
function mapIntentToMcpCategory(intentName) {
  const mapping = {
    // Weather (short-term forecasts)
    'weather_forecast': 'weather',
    'weather': 'weather',
    // Climate (seasonal/long-term forecasts)
    'climate_forecast': 'climate',
    'climate': 'climate',
    'seasonal_forecast': 'climate',
    'seasonal': 'climate',
    // Soil
    'soil_analysis': 'soil',
    'soil': 'soil',
    'soil_nutrients': 'soil',
    // Fertilizer
    'fertilizer_recommendation': 'fertilizer',
    'fertilization': 'fertilizer',
    'fertilizer': 'fertilizer',
    // Feed/Livestock
    'feeding': 'feed',
    'livestock': 'feed',
    'dairy': 'feed',
    'feed': 'feed',
    'nutrition': 'feed',
    // Advisory/Decision Tree (crop management)
    'crop_advisory': 'advisory',
    'advisory': 'advisory',
    'growth_stage': 'advisory',
    'crop_management': 'advisory',
    // Planting/Irrigation (can trigger weather for timing)
    'planting_advice': 'weather',
    'irrigation_advice': 'weather',
  };
  return mapping[intentName] || null;
}

/**
 * Global keyword patterns for intent detection
 * Works for ANY location - no country-specific entries needed
 */
const GLOBAL_INTENT_KEYWORDS = {
  weather: [
    'weather', 'forecast', 'temperature', 'rain', 'rainfall', 'precipitation',
    'humidity', 'wind', 'will it rain', 'how hot', 'how cold', 'sunny', 'cloudy',
    'storm', 'drought', 'flood', 'climate today', 'weather today', 'tomorrow weather',
  ],
  soil: [
    'soil', 'ph', 'nitrogen', 'phosphorus', 'potassium', 'soil quality',
    'soil test', 'soil analysis', 'soil nutrients', 'soil health', 'land quality',
  ],
  fertilizer: [
    'fertilizer', 'fertiliser', 'urea', 'nps', 'dap', 'compost', 'manure',
    'fertilizer recommendation', 'what fertilizer', 'which fertilizer',
  ],
  feed: [
    'feed', 'cow', 'cattle', 'dairy', 'livestock', 'milk', 'fodder', 'diet',
    'ration', 'animal feed', 'feeding', 'nutrition', 'lactating',
  ],
  climate: [
    'seasonal', 'season', 'monsoon', 'long term', 'climate forecast',
    'seasonal outlook', 'climate prediction', 'next season',
  ],
  advisory: [
    'growth stage', 'crop stage', 'recommendation', 'advice', 'what should i do',
    'pest', 'disease', 'harvest', 'planting advice', 'crop management',
  ],
};

/**
 * Simple keyword-based intent detection
 * Works globally - no country-specific config needed
 */
function detectIntentsFromKeywords(message) {
  if (!message) return [];

  const lowerMessage = message.toLowerCase();
  const detectedIntents = [];

  for (const [intent, keywords] of Object.entries(GLOBAL_INTENT_KEYWORDS)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      detectedIntents.push(intent);
    }
  }

  return detectedIntents;
}

/**
 * Unified intent detection: Global keywords first, then Intent Classification MCP
 */
async function detectIntents(message, country = 'ethiopia', language = 'en') {
  // Step 1: Try fast global keyword detection (works for ALL locations)
  const keywordIntents = detectIntentsFromKeywords(message);

  if (keywordIntents.length > 0) {
    console.log(`[Intent] Global keyword match: ${keywordIntents.join(', ')}`);
    return {
      intents: keywordIntents,
      rawIntents: keywordIntents,
      source: 'keywords',
      classification: null,
    };
  }

  // Step 2: Use Intent Classification MCP for structured classification
  console.log('[Intent] No keyword match, using Intent Classification MCP...');
  const llmResult = await classifyIntentWithLLM(message, language);

  if (llmResult) {
    const mcpIntents = [];
    const mainIntent = llmResult.main_intent?.toLowerCase() || '';
    const practices = (llmResult.practices || []).map(p => p.name?.toLowerCase());
    const hasLivestock = (llmResult.livestock || []).length > 0;

    // Weather (short-term forecasts)
    if (mainIntent.includes('weather') || (mainIntent.includes('forecast') && !mainIntent.includes('seasonal') && !mainIntent.includes('climate'))) {
      mcpIntents.push('weather');
    }
    // Climate (seasonal/long-term forecasts from EDACaP)
    if (mainIntent.includes('climate') || mainIntent.includes('seasonal') || mainIntent.includes('season outlook')) {
      mcpIntents.push('climate');
    }
    // Soil
    if (mainIntent.includes('soil') || practices.includes('soil_preparation') || practices.includes('soil_analysis')) {
      mcpIntents.push('soil');
    }
    // Fertilizer
    if (mainIntent.includes('fertiliz') || practices.includes('fertilization')) {
      mcpIntents.push('fertilizer');
    }
    // Feed/Livestock
    if (hasLivestock || practices.includes('feeding') || mainIntent.includes('feeding') || mainIntent.includes('feed') || mainIntent.includes('nutrition')) {
      mcpIntents.push('feed');
    }
    // Advisory/Crop Management (growth stages, crop recommendations from TomorrowNow)
    if (mainIntent.includes('advisory') || mainIntent.includes('growth stage') || mainIntent.includes('crop management') ||
        practices.includes('harvesting') || practices.includes('pest_management') || practices.includes('disease_management')) {
      mcpIntents.push('advisory');
    }

    return {
      intents: mcpIntents,
      rawIntents: [mainIntent],
      source: 'llm',
      classification: llmResult,
    };
  }

  return { intents: [], rawIntents: [], source: 'none', classification: null };
}

/**
 * Determine country from detected regions
 */
function getCountryFromRegions(detectedRegions) {
  const regionNames = (detectedRegions || []).map(r => r.name?.toLowerCase());
  if (regionNames.includes('ethiopia')) return 'ethiopia';
  if (regionNames.includes('kenya')) return 'kenya';
  if (regionNames.includes('india')) return 'india';
  if (regionNames.includes('vietnam')) return 'vietnam';
  return 'ethiopia'; // default
}

/**
 * Check if MCP result indicates an error or no data
 */
function isErrorOrNoData(result) {
  if (!result) return true;
  if (result.error) return true;
  if (typeof result === 'string' && (
    result.includes('error') ||
    result.includes('no data') ||
    result.includes('not available') ||
    result.includes('having trouble')
  )) return true;
  return false;
}

/**
 * Build a helpful fallback context for AI when MCP data is unavailable
 */
function buildFallbackContext(type, options = {}) {
  const { region, serviceProvider, crop, livestock, reason } = options;

  const fallbackTemplates = {
    fertilizer: {
      serviceProvider: 'NextGen Agro Advisory (SSFR)',
      instruction: `I don't have site-specific fertilizer data for ${region || 'your location'} from ${serviceProvider || 'NextGen Agro Advisory'}. ${reason ? `Reason: ${reason}. ` : ''}However, I can provide general recommendations based on agricultural best practices for ${crop || 'your crop'} farming in ${region || 'your region'}.

When providing fertilizer recommendations, please structure them as:
1. **Organic Fertilizers**: List compost and vermicompost amounts in tons/ha
2. **Inorganic Fertilizers**: List Urea and NPS/DAP amounts in kg/ha (don't mention Nitrogen/Phosphorus - farmers understand Urea and NPS better)
3. **Expected Yield**: Provide estimated yield in quintals/ha or kg/ha

You can also mention that farmers can use a combination of organic and inorganic fertilizers in proportional amounts.`,
      useGeneralKnowledge: true,
    },
    weather: {
      serviceProvider: 'AccuWeather',
      instruction: `I don't have real-time weather data for ${region || 'your location'} from ${serviceProvider || 'AccuWeather'}. ${reason ? `Reason: ${reason}. ` : ''}However, I can provide general seasonal weather patterns and farming advice for ${region || 'your region'} based on historical climate data.`,
      useGeneralKnowledge: true,
    },
    soil: {
      serviceProvider: 'ISDA Soil Intelligence',
      instruction: `I don't have specific soil analysis data for ${region || 'your location'} from ${serviceProvider || 'ISDA Soil'}. ${reason ? `Reason: ${reason}. ` : ''}However, I can provide general soil management advice based on typical soil conditions in ${region || 'your region'}.`,
      useGeneralKnowledge: true,
    },
    feed: {
      serviceProvider: 'Feed Formulation Service',
      instruction: `I don't have specific feed formulation data from our database right now. ${reason ? `Reason: ${reason}. ` : ''}However, I can provide general feeding recommendations for ${livestock || 'your livestock'} based on standard nutritional guidelines.`,
      useGeneralKnowledge: true,
    },
  };

  return fallbackTemplates[type] || {
    instruction: `Service data unavailable. Providing general recommendations based on agricultural knowledge.`,
    useGeneralKnowledge: true,
  };
}

/**
 * Call MCP servers based on user intent
 * Uses global keyword matching first, then Intent Classification MCP for structured detection
 */
async function callMcpServersForIntent(message, latitude, longitude, mcpServers, language = 'en', detectedRegions = []) {
  const lowerMessage = (message || '').toLowerCase();
  const allServers = [...(mcpServers.global || []), ...(mcpServers.regional || [])];
  const mcpResults = {};
  const noDataFallbacks = {}; // Track which services have no data and need AI fallback

  // Determine country/region for pattern matching and fallback messages
  const country = getCountryFromRegions(detectedRegions);
  const regionName = detectedRegions?.[0]?.name || country.charAt(0).toUpperCase() + country.slice(1);

  // Unified intent detection (patterns first, LLM fallback)
  const intentResult = await detectIntents(message, country, language);
  const intentsDetected = intentResult.intents;
  const classification = intentResult.classification;

  // Extract crop from classification if available
  const detectedCrop = classification?.crops?.[0]?.canonical_name?.toLowerCase() ||
                       classification?.crops?.[0]?.name?.toLowerCase();

  console.log(`[Intent] Country: ${country}, Region: ${regionName}, Source: ${intentResult.source}`);
  console.log(`[Intent] MCP intents: ${intentsDetected.join(', ') || 'none'}`);

  // Weather intent
  if (intentsDetected.includes('weather')) {
    const server = allServers.find(s => s.slug === 'accuweather');
    if (server?.endpoint && latitude && longitude) {
      // Call both current conditions and forecast for complete weather data
      const [current, forecast] = await Promise.all([
        callMcpTool(server.endpoint, 'get_accuweather_current_conditions', { latitude, longitude }),
        callMcpTool(server.endpoint, 'get_accuweather_weather_forecast', { latitude, longitude, days: 5 }),
      ]);

      // Combine results for widget rendering
      // AccuWeather returns nested structure: { location, current: {...}, data_source }
      // Flatten it so AI Services can access weather data directly
      const weatherError = isErrorOrNoData(current) && isErrorOrNoData(forecast);
      const currentWeatherData = current?.current || current; // Extract inner current object

      console.log('🌤️ [Weather] Flattening AccuWeather data:', {
        hasNestedCurrent: !!current?.current,
        temperature: currentWeatherData?.temperature,
        conditions: currentWeatherData?.conditions,
      });

      mcpResults.weather = {
        current: currentWeatherData, // Flattened: { temperature, humidity, conditions, ... }
        forecast: forecast?.forecast || forecast,
        location: current?.location || { latitude, longitude },
        error: weatherError, // Flag to indicate data unavailable for widget logic
      };

      if (weatherError) {
        noDataFallbacks.weather = buildFallbackContext('weather', {
          region: regionName,
          reason: 'Service temporarily unavailable',
        });
      }
    } else if (!latitude || !longitude) {
      noDataFallbacks.weather = buildFallbackContext('weather', {
        region: regionName,
        reason: 'Location coordinates not provided',
      });
    }
  }

  // Soil intent
  if (intentsDetected.includes('soil')) {
    const server = allServers.find(s => s.slug === 'isda-soil');
    if (server?.endpoint && latitude && longitude) {
      mcpResults.soil = await callMcpTool(server.endpoint, 'get_isda_soil_properties', { latitude, longitude });
      if (isErrorOrNoData(mcpResults.soil)) {
        noDataFallbacks.soil = buildFallbackContext('soil', {
          region: regionName,
          reason: 'This location is outside ISDA coverage area (Africa only)',
        });
      }
    } else if (!latitude || !longitude) {
      noDataFallbacks.soil = buildFallbackContext('soil', {
        region: regionName,
        reason: 'Location coordinates not provided',
      });
    }
  }

  // Fertilizer intent
  if (intentsDetected.includes('fertilizer')) {
    const server = allServers.find(s => s.slug === 'nextgen');
    if (server?.endpoint && latitude && longitude) {
      const crop = detectedCrop === 'maize' ? 'maize' : 'wheat';
      mcpResults.fertilizer = await callMcpTool(server.endpoint, 'get_fertilizer_recommendation',
        { crop, latitude, longitude },
        { 'X-Farm-Latitude': String(latitude), 'X-Farm-Longitude': String(longitude) }
      );
      if (isErrorOrNoData(mcpResults.fertilizer)) {
        noDataFallbacks.fertilizer = buildFallbackContext('fertilizer', {
          region: regionName,
          crop: crop,
          reason: `Site-specific ${crop} data not available for these coordinates`,
        });
      }
    } else if (!latitude || !longitude) {
      noDataFallbacks.fertilizer = buildFallbackContext('fertilizer', {
        region: regionName,
        crop: detectedCrop || 'your crop',
        reason: 'Location coordinates not provided for site-specific recommendations',
      });
    }
  }

  // Feed intent
  if (intentsDetected.includes('feed')) {
    const server = allServers.find(s => s.slug === 'feed-formulation');
    if (server?.endpoint) {
      const livestock = classification?.livestock?.[0]?.canonical_name || 'dairy cattle';
      mcpResults.feed = await callMcpTool(server.endpoint, 'search_feeds', { query: livestock, limit: 5 });
      if (isErrorOrNoData(mcpResults.feed)) {
        noDataFallbacks.feed = buildFallbackContext('feed', {
          region: regionName,
          livestock: livestock,
          reason: 'Feed database temporarily unavailable',
        });
      }
    }
  }

  // Climate intent (seasonal forecasts - EDACaP for Ethiopia)
  if (intentsDetected.includes('climate')) {
    const server = allServers.find(s => s.slug === 'edacap');
    if (server?.endpoint && latitude && longitude) {
      const detectedCrop = classification?.crops?.[0]?.canonical_name;
      mcpResults.climate = await callMcpTool(server.endpoint, 'get_climate_forecast', {
        latitude,
        longitude,
      });
      // Also get crop forecast if a crop was detected
      if (detectedCrop) {
        const cropForecast = await callMcpTool(server.endpoint, 'get_crop_forecast', {
          latitude,
          longitude,
          crop: detectedCrop,
        });
        if (!isErrorOrNoData(cropForecast)) {
          mcpResults.cropForecast = cropForecast;
        }
      }
      if (isErrorOrNoData(mcpResults.climate)) {
        noDataFallbacks.climate = buildFallbackContext('climate', {
          region: regionName,
          reason: 'Seasonal forecast data not available for this location',
        });
      }
    } else if (!latitude || !longitude) {
      noDataFallbacks.climate = buildFallbackContext('climate', {
        region: regionName,
        reason: 'Location coordinates required for seasonal forecasts',
      });
    }
  }

  return {
    mcpResults,
    intentsDetected,
    classification,
    intentSource: intentResult.source,
    rawIntents: intentResult.rawIntents,
    noDataFallbacks, // Track which services need AI fallback with rich context
  };
}

/**
 * Chat endpoint - routes to AI Services with MCP context
 *
 * SIMPLIFIED TEXT-ONLY MODE:
 * - Intent classification determines which MCP servers to call
 * - MCP data is passed to AI Services for Gemini response generation
 * - Returns pure text responses (no widgets)
 */
router.post('/chat', async (req, res) => {
  const startTime = Date.now();
  try {
    const { latitude, longitude, language, location, message, history, image } = req.body;

    console.log('💬 [Chat] Request:', {
      hasLocation: !!(latitude && longitude),
      language: language || 'en',
      messageLength: message?.length || 0,
      historyCount: history?.length || 0,
      hasImage: !!image,
    });

    // Get active MCP servers for user's location
    const mcpContext = await getActiveMcpServersForLocation(
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null
    );

    console.log('🔌 [Chat] MCP Context:', {
      globalCount: mcpContext.global.length,
      regionalCount: mcpContext.regional.length,
      detectedRegions: mcpContext.detectedRegions.map(r => r.name).join(', '),
    });

    // Call MCP servers based on detected intents (pattern matching + LLM fallback)
    const { mcpResults, intentsDetected, classification, intentSource, rawIntents, noDataFallbacks } = await callMcpServersForIntent(
      message,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      { global: mcpContext.global, regional: mcpContext.regional },
      language || 'en',
      mcpContext.detectedRegions
    );

    // If user sent an image, call AgriVision for plant diagnosis
    if (image) {
      console.log('🌿 [Chat] Image detected, calling AgriVision...');

      // Extract expected crop from classification if available
      const expectedCrop = classification?.crops?.[0]?.canonical_name?.toLowerCase();

      const diagnosis = await callAgriVisionDiagnosis(image, expectedCrop);

      if (diagnosis && !diagnosis.error) {
        mcpResults.diagnosis = diagnosis;
        intentsDetected.push('diagnosis');
        console.log('🌿 [Chat] AgriVision diagnosis added to context');
      } else if (diagnosis?.error) {
        console.warn('🌿 [Chat] AgriVision error:', diagnosis.error);
        mcpResults.diagnosis = { error: diagnosis.error, message: diagnosis.message || 'Could not analyze plant image' };
      }
    }

    console.log('🔧 [Chat] MCP Results:', {
      intents: intentsDetected.join(', ') || 'none',
      toolsCalled: Object.keys(mcpResults).join(', ') || 'none',
      intentSource,
    });

    // Build enhanced request body for AI Services (text-only, no widgets)
    const enhancedBody = {
      ...req.body,
      mcpServers: {
        global: mcpContext.global,
        regional: mcpContext.regional,
        allTools: [
          ...mcpContext.global.flatMap(s => s.tools || []),
          ...mcpContext.regional.flatMap(s => s.tools || []),
        ],
      },
      mcpResults,
      intentsDetected,
      detectedRegions: mcpContext.detectedRegions,
      locationContext: location || null,
      // Fallback instructions when MCP data is unavailable
      noDataFallbacks: Object.keys(noDataFallbacks).length > 0 ? noDataFallbacks : null,
    };

    // Check if streaming is requested
    const useStreaming = req.body.stream === true;

    // Call AI Services with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

    try {
      // ==========================================
      // STREAMING MODE - Proxy SSE from AI Services V2
      // ==========================================
      if (useStreaming) {
        console.log('💬 [Chat] Starting streaming response...');

        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

        // Build V2 request body
        const v2Body = {
          message,
          language: language || 'en',
          stream: true,
          location: latitude && longitude ? {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            displayName: location?.displayName,
            country: location?.country,
          } : undefined,
          regions: mcpContext.detectedRegions.map(r => r.name),
        };

        // If there's an image, include it
        if (image) {
          v2Body.imageBase64 = image;
        }

        const response = await fetch(`${AI_SERVICES_URL}/api/v2/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': AI_SERVICES_KEY,
          },
          body: JSON.stringify(v2Body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          console.error('💬 [Chat] AI Services V2 error:', response.status, errorText);
          res.write(`data: ${JSON.stringify({ type: 'error', error: `AI Services returned ${response.status}` })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }

        // Send initial metadata
        res.write(`data: ${JSON.stringify({
          type: 'meta',
          mcpToolsUsed: Object.keys(mcpResults),
          intentsDetected,
          regions: mcpContext.detectedRegions.map(r => r.name),
        })}\n\n`);

        // Proxy SSE stream from AI Services
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              // Forward the SSE line directly to client
              res.write(line + '\n\n');
            }
          }
        }

        // Send any remaining buffered data
        if (buffer.startsWith('data: ')) {
          res.write(buffer + '\n\n');
        }

        res.write('data: [DONE]\n\n');
        res.end();

        console.log('💬 [Chat] Streaming complete');
        return;
      }

      // ==========================================
      // NON-STREAMING MODE - Original behavior
      // ==========================================
      const response = await fetch(`${AI_SERVICES_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': AI_SERVICES_KEY,
        },
        body: JSON.stringify(enhancedBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('💬 [Chat] AI Services error:', response.status, errorText);
        throw new Error(`AI Services returned ${response.status}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      console.log('💬 [Chat] Response:', {
        success: data.success !== false,
        duration: `${duration}ms`,
        hasFollowUp: !!(data.followUpQuestions?.length),
        responseLength: data.response?.length || 0,
      });

      // Return pure text response - explicitly remove ALL widget-related fields
      // Filter out widget fields for text-only mode
      const {
        widget,
        widgetPrompt,
        widgetReason,
        suggestedWidget,
        widgetData,
        ...cleanData
      } = data;

      // Extract entities for analytics (crops, livestock, practices from Intent Classification)
      const extractedEntities = classification ? {
        crops: (classification.crops || []).map(c => c.canonical_name || c.name),
        livestock: (classification.livestock || []).map(l => l.canonical_name || l.name),
        practices: (classification.practices || []).map(p => p.name),
        mainIntent: classification.main_intent,
        confidence: classification.confidence,
      } : null;

      res.json({
        ...cleanData,
        mcpToolsUsed: Object.keys(mcpResults),
        intentsDetected,
        extractedEntities, // For analytics - save with message
        _meta: {
          duration,
          mcpServersUsed: mcpContext.global.length + mcpContext.regional.length,
          regions: mcpContext.detectedRegions.map(r => r.name),
          intentSource,
        },
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      if (fetchError.name === 'AbortError') {
        console.error('💬 [Chat] Timeout after', CHAT_TIMEOUT_MS, 'ms');
        // Handle streaming timeout differently
        if (useStreaming && !res.headersSent) {
          res.setHeader('Content-Type', 'text/event-stream');
        }
        if (useStreaming) {
          res.write(`data: ${JSON.stringify({ type: 'error', error: 'Request timed out' })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
          return;
        }
        return res.status(504).json({
          success: false,
          error: 'Request timed out. Please try again.',
          response: 'I apologize, but the request took too long. Please try again with a simpler question.',
        });
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('💬 [Chat] Error:', error.message);
    // Handle streaming errors
    if (req.body.stream === true) {
      if (!res.headersSent) {
        res.setHeader('Content-Type', 'text/event-stream');
      }
      res.write(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
      return;
    }
    res.status(500).json({
      success: false,
      error: 'Failed to process request',
      response: 'I apologize, but I encountered an error. Please try again.',
    });
  }
});

/**
 * Voice transcription endpoint
 */
router.post('/transcribe', async (req, res) => {
  try {
    const { audio, language, mimeType, saveAudio = false } = req.body;
    
    // Validate audio input
    if (!audio) {
      return res.status(400).json({ success: false, error: 'No audio data provided' });
    }
    
    // Extract base64 from data URI if present
    let audioBase64 = audio;
    let detectedMimeType = mimeType || 'audio/m4a';
    
    if (audio.startsWith('data:')) {
      const matches = audio.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        detectedMimeType = matches[1];
        audioBase64 = matches[2];
      }
    }
    
    console.log(`Transcribe request: language=${language}, mimeType=${detectedMimeType}, audioLength=${audioBase64.length}`);
    
    let audioUrl = null;
    if (saveAudio && audioBase64) {
      try {
        const uploadResult = await cloudinary.uploader.upload(
          `data:${detectedMimeType};base64,${audioBase64}`,
          { folder: 'ag-mcp/voice-recordings', resource_type: 'video' }
        );
        audioUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Audio upload failed:', uploadError.message);
      }
    }

    const response = await fetch(`${AI_SERVICES_URL}/api/transcribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AI_SERVICES_KEY,
      },
      body: JSON.stringify({
        audio: audioBase64,  // Send raw base64, not data URI
        language,
        mimeType: detectedMimeType
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI Services transcribe error: ${response.status} - ${errorText}`);
      return res.status(response.status).json({
        success: false,
        error: `Transcription service error: ${response.status}`
      });
    }

    const data = await response.json();
    console.log('Transcribe response:', JSON.stringify(data).substring(0, 200));
    
    if (audioUrl) data.audioUrl = audioUrl;
    
    // Ensure consistent response format
    if (data.text || data.transcription) {
      res.json({
        success: true,
        text: data.text || data.transcription,
        language: data.detected_language || language,
        audioUrl,
      });
    } else {
      res.json({
        success: false,
        error: data.error || 'No transcription returned',
        audioUrl,
      });
    }
  } catch (error) {
    console.error('Error calling AI Services transcribe:', error.message);
    res.status(500).json({ success: false, error: 'Failed to transcribe audio: ' + error.message });
  }
});

/**
 * Text-to-Speech endpoint - uploads to Cloudinary
 */
router.post('/tts', async (req, res) => {
  try {
    const response = await fetch(`${AI_SERVICES_URL}/api/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AI_SERVICES_KEY,
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (data.success && data.audioBase64) {
      try {
        const uploadResult = await cloudinary.uploader.upload(
          `data:audio/wav;base64,${data.audioBase64}`,
          { folder: 'ag-mcp/tts', resource_type: 'video', format: 'wav' }
        );
        res.json({
          success: true,
          audioUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          duration: data.duration || uploadResult.duration,
          mimeType: 'audio/wav',
        });
      } catch (uploadError) {
        console.error('TTS upload failed:', uploadError);
        res.json(data);
      }
    } else {
      res.json(data);
    }
  } catch (error) {
    console.error('Error calling AI Services TTS:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

/**
 * Generate session title via AI Services
 */
router.post('/generate-title', async (req, res) => {
  try {
    console.log('📝 [Title] Generating title, messages:', req.body.messages?.length || 0);

    const response = await fetch(`${AI_SERVICES_URL}/api/generate-title`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': AI_SERVICES_KEY,
      },
      body: JSON.stringify(req.body),
    });

    if (!response.ok) {
      console.log('📝 [Title] AI Services error:', response.status);
      return res.status(response.status).json({
        success: false,
        error: `AI Services returned ${response.status}`,
        title: 'New Conversation'
      });
    }
    
    const data = await response.json();
    console.log('📝 [Title] Generated:', data.title);
    res.json(data);
  } catch (error) {
    console.error('📝 [Title] Error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to generate title', title: 'New Conversation' });
  }
});

/**
 * Location lookup via Nominatim/IP-API (direct calls)
 */
router.post('/location-lookup', async (req, res) => {
  try {
    const { latitude, longitude, ipAddress } = req.body;
    console.log('📍 [Location] Looking up:', { latitude, longitude, ipAddress });

    // Try coordinates first using Nominatim
    if (latitude && longitude) {
      try {
        const nominatimUrl = `${NOMINATIM_URL}/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`;
        const nominatimResponse = await fetch(nominatimUrl, {
          headers: {
            'User-Agent': 'AG-MCP-Chat/1.0 (agriculture-advisor@digitalgreen.org)',
            'Accept': 'application/json',
          },
        });

        if (nominatimResponse.ok) {
          const data = await nominatimResponse.json();
          if (!data.error) {
            const address = data.address || {};
            const result = {
              success: true,
              source: 'coordinates',
              level1Country: address.country,
              level1CountryCode: address.country_code?.toUpperCase(),
              level2State: address.state || address.region,
              level5City: address.city || address.town || address.village || address.county,
              displayName: address.city || address.town || address.village
                ? `${address.city || address.town || address.village}, ${address.country}`
                : address.country,
              formattedAddress: [
                address.city || address.town || address.village,
                address.state || address.region,
                address.country
              ].filter(Boolean).join(', '),
              latitude,
              longitude,
            };
            console.log('📍 [Location] Nominatim result:', {
              success: result.success,
              source: result.source,
              displayName: result.displayName,
              country: result.level1Country,
              city: result.level5City,
            });
            return res.json(result);
          }
        }
      } catch (nominatimError) {
        console.error('📍 [Location] Nominatim error:', nominatimError.message);
      }
    }

    // Fallback to IP-API if coordinates failed or not provided
    if (ipAddress && ipAddress !== '127.0.0.1' && ipAddress !== '::1') {
      try {
        const ipApiUrl = `${IP_API_URL}/${ipAddress}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp`;
        const ipResponse = await fetch(ipApiUrl, {
          headers: { 'Accept': 'application/json' },
        });

        if (ipResponse.ok) {
          const data = await ipResponse.json();
          if (data.status === 'success') {
            const result = {
              success: true,
              source: 'ip',
              level1Country: data.country,
              level1CountryCode: data.countryCode,
              level2State: data.regionName,
              level5City: data.city,
              isp: data.isp,
              timezone: data.timezone,
              displayName: data.city ? `${data.city}, ${data.country}` : data.country,
              formattedAddress: [data.city, data.regionName, data.country].filter(Boolean).join(', '),
              latitude: data.lat,
              longitude: data.lon,
            };
            console.log('📍 [Location] IP-API result:', {
              success: result.success,
              source: result.source,
              displayName: result.displayName,
              country: result.level1Country,
              city: result.level5City,
            });
            return res.json(result);
          }
        }
      } catch (ipError) {
        console.error('📍 [Location] IP-API error:', ipError.message);
      }
    }

    // No location found
    console.log('📍 [Location] No location found');
    res.json({ success: false, source: 'none', error: 'Could not determine location' });
  } catch (error) {
    console.error('📍 [Location] Error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to lookup location' });
  }
});

module.exports = router;

