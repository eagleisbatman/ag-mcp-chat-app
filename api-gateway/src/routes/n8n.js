// n8n workflow proxy routes
const express = require('express');
const cloudinary = require('cloudinary').v2;
const { prisma } = require('../db');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Load intents database for fast pattern-based classification
let intentsDb = null;
try {
  const intentsPath = path.join(__dirname, '../data/intents.json');
  intentsDb = JSON.parse(fs.readFileSync(intentsPath, 'utf8'));
  console.log('✅ Loaded intents database with countries:', Object.keys(intentsDb.countries || {}).join(', '));
} catch (e) {
  console.warn('⚠️ Could not load intents.json, will use LLM-only classification');
}

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://ag-mcp-app.up.railway.app/webhook/api/chat';
const N8N_WHISPER_URL = process.env.N8N_WHISPER_URL || 'https://ag-mcp-app.up.railway.app/webhook/api/transcribe';
const N8N_TTS_URL = process.env.N8N_TTS_URL || 'https://ag-mcp-app.up.railway.app/webhook/api/tts';
const N8N_TITLE_URL = process.env.N8N_TITLE_URL || 'https://ag-mcp-app.up.railway.app/webhook/generate-title';
const N8N_LOCATION_URL = process.env.N8N_LOCATION_URL || 'https://ag-mcp-app.up.railway.app/webhook/location-lookup';
const INTENT_CLASSIFICATION_URL = process.env.INTENT_CLASSIFICATION_URL || 'https://intent-classification-mcp.up.railway.app';
const AGRIVISION_URL = process.env.AGRIVISION_URL || 'https://agrivision-mcp-server.up.railway.app';
const CHAT_TIMEOUT_MS = parseInt(process.env.CHAT_TIMEOUT_MS || '60000'); // 60s default
const AGRIVISION_TIMEOUT_MS = parseInt(process.env.AGRIVISION_TIMEOUT_MS || '45000'); // 45s for image analysis

// Widget type mappings
const WIDGET_TYPES = {
  // Input Widgets
  WEATHER_INPUT: 'weather_input',
  FEED_FORM: 'feed_formulation_input',
  SOIL_QUERY: 'soil_query_input',
  FERTILIZER_INPUT: 'fertilizer_input',
  CLIMATE_QUERY: 'climate_query_input',
  DECISION_TREE: 'decision_tree_input',
  // Output Widgets
  WEATHER_FORECAST: 'weather_forecast_card',
  DIET_RESULT: 'diet_result_card',
  SOIL_PROFILE: 'soil_profile_card',
  FERTILIZER_RESULT: 'fertilizer_result_card',
  CLIMATE_FORECAST: 'climate_forecast_card',
  RECOMMENDATIONS: 'recommendations_card',
};

// Map input widget types to output widget types
const INPUT_TO_OUTPUT_MAP = {
  [WIDGET_TYPES.WEATHER_INPUT]: WIDGET_TYPES.WEATHER_FORECAST,
  [WIDGET_TYPES.FEED_FORM]: WIDGET_TYPES.DIET_RESULT,
  [WIDGET_TYPES.SOIL_QUERY]: WIDGET_TYPES.SOIL_PROFILE,
  [WIDGET_TYPES.FERTILIZER_INPUT]: WIDGET_TYPES.FERTILIZER_RESULT,
  [WIDGET_TYPES.CLIMATE_QUERY]: WIDGET_TYPES.CLIMATE_FORECAST,
  [WIDGET_TYPES.DECISION_TREE]: WIDGET_TYPES.RECOMMENDATIONS,
};

// Map MCP categories to input widget types
const INTENT_TO_INPUT_WIDGET = {
  weather: WIDGET_TYPES.WEATHER_INPUT,
  feed: WIDGET_TYPES.FEED_FORM,
  soil: WIDGET_TYPES.SOIL_QUERY,
  fertilizer: WIDGET_TYPES.FERTILIZER_INPUT,
  climate: WIDGET_TYPES.CLIMATE_QUERY,
  advisory: WIDGET_TYPES.DECISION_TREE,
};

// Map MCP categories to output widget types
const INTENT_TO_OUTPUT_WIDGET = {
  weather: WIDGET_TYPES.WEATHER_FORECAST,
  feed: WIDGET_TYPES.DIET_RESULT,
  soil: WIDGET_TYPES.SOIL_PROFILE,
  fertilizer: WIDGET_TYPES.FERTILIZER_RESULT,
  climate: WIDGET_TYPES.CLIMATE_FORECAST,
  advisory: WIDGET_TYPES.RECOMMENDATIONS,
};

/**
 * Determine if we should suggest an input widget based on query analysis
 * Returns widget suggestion only when it would genuinely help the user
 */
function analyzeQueryForWidgetSuggestion(message, intentsDetected, mcpResults) {
  const lowerMessage = (message || '').toLowerCase();

  // Keyword-based fallback detection for widget-specific terms
  // This catches cases where intents.json patterns don't match
  const keywordIntents = {
    climate: ['climate', 'seasonal forecast', 'season outlook', 'rainy season', 'dry season'],
    advisory: ['advisory', 'growth stage', 'flowering', 'germination', 'harvesting', 'crop management', 'crop stage'],
    soil: ['soil', 'nutrient', 'ph level', 'nitrogen', 'phosphorus', 'potassium'],
    feed: ['feed', 'cattle', 'livestock', 'dairy', 'milk production', 'nutrition', 'diet'],
    fertilizer: ['fertilizer', 'urea', 'nps', 'compost', 'manure'],
    weather: ['weather', 'rain', 'temperature', 'forecast'],
  };

  // Augment detected intents with keyword matches
  const augmentedIntents = [...intentsDetected];
  for (const [intent, keywords] of Object.entries(keywordIntents)) {
    if (!augmentedIntents.includes(intent)) {
      if (keywords.some(kw => lowerMessage.includes(kw))) {
        augmentedIntents.push(intent);
      }
    }
  }

  // Phrases that indicate user wants to explore/customize (suggest input widget)
  const exploratoryPhrases = [
    'help me with', 'i want to', 'can you help', 'how do i', 'what should i',
    'recommend', 'advice', 'suggest', 'calculate', 'formulate', 'plan',
    'i need', 'show me options', 'let me', 'i\'d like to',
  ];

  // Phrases that indicate user wants immediate answer (show output widget)
  const directPhrases = [
    'what is', 'what\'s', 'tell me', 'show me', 'get me', 'give me',
    'today', 'now', 'current', 'right now', 'at the moment',
  ];

  const isExploratory = exploratoryPhrases.some(p => lowerMessage.includes(p));
  const isDirect = directPhrases.some(p => lowerMessage.includes(p));

  // Analyze each detected intent (including keyword-augmented ones)
  const suggestions = [];

  for (const intent of augmentedIntents) {
    const inputWidget = INTENT_TO_INPUT_WIDGET[intent];
    const outputWidget = INTENT_TO_OUTPUT_WIDGET[intent];
    const hasData = mcpResults && mcpResults[intent] && !mcpResults[intent]?.error;

    if (!inputWidget) continue;

    // Decision logic for natural suggestions
    if (intent === 'feed') {
      // Feed formulation always needs structured input - it's complex
      suggestions.push({
        type: 'input',
        widget: inputWidget,
        reason: 'Feed formulation requires specific cattle and feed details for accurate results.',
        prompt: 'Would you like to use our feed calculator for a personalized diet recommendation?',
      });
    } else if (intent === 'fertilizer') {
      // Fertilizer always needs structured input - requires location AND crop selection
      suggestions.push({
        type: 'input',
        widget: inputWidget,
        reason: 'Site-specific fertilizer recommendations need your field location and crop type.',
        prompt: 'I can calculate fertilizer recommendations for wheat or maize. Want to use the calculator?',
      });
    } else if (isExploratory && !isDirect) {
      // User is exploring - offer input widget
      suggestions.push({
        type: 'input',
        widget: inputWidget,
        reason: 'You can customize the parameters for more specific results.',
        prompt: getWidgetPrompt(intent),
      });
    } else if (hasData) {
      // We have data - include output widget
      suggestions.push({
        type: 'output',
        widget: outputWidget,
        data: formatWidgetData(intent, mcpResults[intent]),
      });
    }
  }

  return suggestions;
}

/**
 * Get a natural prompt for suggesting a widget
 */
function getWidgetPrompt(intent) {
  const prompts = {
    weather: 'Want to see a detailed forecast? You can customize the number of days.',
    soil: 'I can show you detailed soil analysis. Want to explore different depths?',
    fertilizer: 'For precise fertilizer recommendations, I can calculate based on your exact location.',
    climate: 'Want to see the seasonal forecast? I can show climate predictions for your area.',
    advisory: 'I can give you crop-specific recommendations based on growth stage.',
  };
  return prompts[intent] || 'Would you like to use our interactive tool for more details?';
}

/**
 * Format MCP result data for output widget
 */
function formatWidgetData(intent, mcpResult) {
  if (!mcpResult) return {};

  switch (intent) {
    case 'weather':
      return {
        current: mcpResult,
        forecast: mcpResult.forecast || [],
      };
    case 'soil':
      return {
        properties: mcpResult.properties || mcpResult,
        depth: mcpResult.depth || '0-20cm',
      };
    case 'fertilizer':
      return {
        organic: mcpResult.organic || {},
        inorganic: mcpResult.inorganic || {},
        expected_yield: mcpResult.expected_yield,
        timing: mcpResult.timing || [],
      };
    case 'feed':
      return {
        diet: mcpResult.diet || mcpResult,
        total_cost: mcpResult.total_cost,
      };
    case 'climate':
      return {
        climate_forecasts: mcpResult.forecasts || [],
        station: mcpResult.station,
      };
    case 'advisory':
      return {
        recommendations: mcpResult.recommendations || [],
        growth_stage: mcpResult.growth_stage,
      };
    default:
      return mcpResult;
  }
}

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
 * Process widget data and call appropriate MCP servers
 * Returns structured data for output widget rendering
 */
async function processWidgetData(widgetData, mcpServers, options = {}) {
  const { latitude, longitude } = options;
  const widgetType = widgetData?.widget_type;
  const data = widgetData?.data || {};
  const allServers = [...(mcpServers.global || []), ...(mcpServers.regional || [])];

  console.log(`🔧 [Widget] Processing ${widgetType}:`, JSON.stringify(data).substring(0, 200));

  let result = null;
  let outputWidgetType = INPUT_TO_OUTPUT_MAP[widgetType];
  let widgetResult = { type: outputWidgetType, data: {} };

  try {
    switch (widgetType) {
      case WIDGET_TYPES.WEATHER_INPUT: {
        const server = allServers.find(s => s.slug === 'accuweather');
        if (server?.endpoint) {
          const lat = data.latitude || latitude;
          const lon = data.longitude || longitude;
          const days = data.days || 5;

          // Get current conditions
          const current = await callMcpTool(server.endpoint, 'get_accuweather_current_conditions', {
            latitude: lat,
            longitude: lon,
          });

          // Get forecast
          const forecast = await callMcpTool(server.endpoint, 'get_accuweather_forecast', {
            latitude: lat,
            longitude: lon,
            days: days,
          });

          widgetResult.data = {
            location: data.location || { latitude: lat, longitude: lon },
            current: current,
            forecast: forecast?.forecast || forecast,
            days: days,
          };
          result = { current, forecast };
        }
        break;
      }

      case WIDGET_TYPES.FEED_FORM: {
        const server = allServers.find(s => s.slug === 'feed-formulation');
        if (server?.endpoint) {
          // Call feed formulation with cattle and feed data
          const formulation = await callMcpTool(server.endpoint, 'formulate_diet', {
            cattle: {
              is_lactating: data.cattle?.is_lactating ?? true,
              target_milk: data.cattle?.target_milk || 12,
              body_weight: data.cattle?.body_weight || 400,
              breed: data.cattle?.breed || 'Local Zebu',
              days_in_milk: data.cattle?.days_in_milk || 100,
              parity: data.cattle?.parity || 2,
              days_pregnant: data.cattle?.days_pregnant || 0,
            },
            feeds: data.feeds || [],
          });

          widgetResult.data = {
            cattle: data.cattle,
            diet: formulation?.diet || formulation,
            total_cost: formulation?.total_cost,
            expected_yield: formulation?.expected_yield,
            nutrient_balance: formulation?.nutrient_balance,
            warnings: formulation?.warnings || [],
          };
          result = formulation;
        }
        break;
      }

      case WIDGET_TYPES.SOIL_QUERY: {
        const server = allServers.find(s => s.slug === 'isda-soil');
        if (server?.endpoint) {
          const lat = data.latitude || latitude;
          const lon = data.longitude || longitude;
          const depth = data.depth || '0-20';

          const soilData = await callMcpTool(server.endpoint, 'get_isda_soil_properties', {
            latitude: lat,
            longitude: lon,
            depth: depth,
          });

          widgetResult.data = {
            location: { latitude: lat, longitude: lon },
            depth: depth,
            properties: soilData?.properties || soilData,
            suitability: soilData?.crop_suitability,
            confidence: soilData?.confidence,
          };
          result = soilData;
        }
        break;
      }

      case WIDGET_TYPES.FERTILIZER_INPUT: {
        const server = allServers.find(s => s.slug === 'nextgen');
        if (server?.endpoint) {
          const lat = data.latitude || latitude;
          const lon = data.longitude || longitude;
          const crop = data.crop || 'wheat';

          const recommendation = await callMcpTool(
            server.endpoint,
            'get_fertilizer_recommendation',
            { crop, latitude: lat, longitude: lon },
            { 'X-Farm-Latitude': String(lat), 'X-Farm-Longitude': String(lon) }
          );

          widgetResult.data = {
            crop: crop,
            location: { latitude: lat, longitude: lon },
            organic: recommendation?.organic || {},
            inorganic: recommendation?.inorganic || {},
            expected_yield: recommendation?.expected_yield,
            timing: recommendation?.timing || [],
            notes: recommendation?.notes || [],
          };
          result = recommendation;
        }
        break;
      }

      case WIDGET_TYPES.CLIMATE_QUERY: {
        const server = allServers.find(s => s.slug === 'edacap');
        if (server?.endpoint) {
          const lat = data.latitude || latitude;
          const lon = data.longitude || longitude;
          const forecastType = data.forecastType || 'climate';

          let climateData = null;
          let cropData = null;

          if (forecastType === 'climate' || forecastType === 'both') {
            climateData = await callMcpTool(server.endpoint, 'get_climate_forecast', {
              latitude: lat,
              longitude: lon,
            });
          }

          if (forecastType === 'crop' || forecastType === 'both') {
            cropData = await callMcpTool(server.endpoint, 'get_crop_forecast', {
              latitude: lat,
              longitude: lon,
            });
          }

          widgetResult.data = {
            station: climateData?.station || cropData?.station,
            confidence: climateData?.confidence,
            climate_forecasts: climateData?.forecasts || [],
            crop_forecasts: cropData?.forecasts || [],
            message: (!climateData && !cropData) ? 'Forecast data not available for this location' : null,
          };
          result = { climate: climateData, crop: cropData };
        }
        break;
      }

      case WIDGET_TYPES.DECISION_TREE: {
        const server = allServers.find(s => s.slug === 'tomorrowio' || s.slug === 'tomorrowio-decision-tree');
        if (server?.endpoint) {
          const lat = data.latitude || latitude;
          const lon = data.longitude || longitude;

          const recommendations = await callMcpTool(server.endpoint, 'get_crop_recommendations', {
            crop: data.crop || 'maize',
            growth_stage: data.growth_stage || 'vegetative',
            gdd: data.gdd || 500,
            latitude: lat,
            longitude: lon,
            weather: data.weather || {},
          });

          widgetResult.data = {
            crop: data.crop,
            growth_stage: data.growth_stage,
            recommendations: recommendations?.recommendations || [],
            weather_summary: recommendations?.weather_summary,
          };
          result = recommendations;
        }
        break;
      }

      default:
        console.warn(`[Widget] Unknown widget type: ${widgetType}`);
        return { success: false, error: `Unknown widget type: ${widgetType}` };
    }

    // Check if we got valid data
    if (!result || result.error) {
      console.warn(`[Widget] No data from MCP for ${widgetType}:`, result?.error);
      return {
        success: false,
        error: result?.error || 'No data available',
        widget: { ...widgetResult, data: { message: 'Data not available for this request' } },
      };
    }

    console.log(`[Widget] ✅ Processed ${widgetType} successfully`);
    return {
      success: true,
      widget: widgetResult,
      rawResult: result,
    };

  } catch (error) {
    console.error(`[Widget] Error processing ${widgetType}:`, error.message);
    return {
      success: false,
      error: error.message,
      widget: { type: outputWidgetType, data: { message: 'Error processing request' } },
    };
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
 * Pattern-based intent detection from intents.json database
 * Fast, deterministic, supports multiple languages
 */
function detectIntentsFromPatterns(message, country = 'ethiopia', language = 'en') {
  if (!intentsDb) return { intents: [], source: 'none' };
  
  const lowerMessage = (message || '').toLowerCase();
  const detectedIntents = [];
  const matchedPatterns = [];
  
  // Get country-specific intents
  const countryData = intentsDb.countries?.[country.toLowerCase()];
  if (countryData?.intents) {
    for (const [intentName, intentData] of Object.entries(countryData.intents)) {
      // Check patterns in specified language first, then fallback to English
      const patterns = intentData.patterns?.[language] || intentData.patterns?.en || [];
      for (const pattern of patterns) {
        if (lowerMessage.includes(pattern.toLowerCase())) {
          detectedIntents.push({
            intent: intentName,
            tool: intentData.tool,
            pattern: pattern,
            priority: intentData.priority || 1,
          });
          matchedPatterns.push(pattern);
          break; // One match per intent is enough
        }
      }
    }
  }
  
  // Also check global tools
  if (intentsDb.global_tools) {
    for (const [toolName, toolData] of Object.entries(intentsDb.global_tools)) {
      if (toolData.intents) {
        for (const [intentName, intentData] of Object.entries(toolData.intents)) {
          const patterns = intentData.patterns?.[language] || intentData.patterns?.en || [];
          for (const pattern of patterns) {
            if (lowerMessage.includes(pattern.toLowerCase())) {
              detectedIntents.push({
                intent: intentName,
                tool: intentData.tool,
                pattern: pattern,
                priority: intentData.priority || 1,
              });
              matchedPatterns.push(pattern);
              break;
            }
          }
        }
      }
    }
  }
  
  // Sort by priority and deduplicate
  detectedIntents.sort((a, b) => a.priority - b.priority);
  const uniqueIntents = [...new Set(detectedIntents.map(i => i.intent))];
  
  console.log(`[Intent] Pattern match: ${uniqueIntents.join(', ') || 'none'} (patterns: ${matchedPatterns.join(', ') || 'none'})`);
  
  return {
    intents: uniqueIntents,
    details: detectedIntents,
    source: 'patterns',
    matchedPatterns,
  };
}

/**
 * Call Intent Classification MCP for multi-language intent detection (LLM fallback)
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
 * Unified intent detection: Pattern-based first, LLM fallback if no matches
 */
async function detectIntents(message, country = 'ethiopia', language = 'en') {
  // Step 1: Try fast pattern matching from intents.json
  const patternResult = detectIntentsFromPatterns(message, country, language);
  
  if (patternResult.intents.length > 0) {
    // Map to MCP categories
    const mcpIntents = patternResult.intents
      .map(i => mapIntentToMcpCategory(i))
      .filter(Boolean);
    
    return {
      intents: [...new Set(mcpIntents)],
      rawIntents: patternResult.intents,
      source: 'patterns',
      classification: null,
    };
  }
  
  // Step 2: Fallback to LLM classification
  console.log('[Intent] No pattern match, falling back to LLM...');
  const llmResult = await classifyIntentWithLLM(message, language);
  
  if (llmResult) {
    const mcpIntents = [];
    const mainIntent = llmResult.main_intent?.toLowerCase() || '';
    const practices = (llmResult.practices || []).map(p => p.name?.toLowerCase());
    const hasLivestock = (llmResult.livestock || []).length > 0;
    
    if (mainIntent.includes('weather') || mainIntent.includes('forecast')) mcpIntents.push('weather');
    if (mainIntent.includes('soil') || practices.includes('soil_preparation')) mcpIntents.push('soil');
    if (mainIntent.includes('fertiliz') || practices.includes('fertilization')) mcpIntents.push('fertilizer');
    if (hasLivestock || practices.includes('feeding') || mainIntent.includes('feeding')) mcpIntents.push('feed');
    
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
 * Uses pattern matching from intents.json, falls back to LLM
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
      mcpResults.weather = await callMcpTool(server.endpoint, 'get_accuweather_current_conditions', { latitude, longitude });
      if (isErrorOrNoData(mcpResults.weather)) {
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
 * Chat endpoint - routes to n8n Gemini chat workflow with MCP context
 */
router.post('/chat', async (req, res) => {
  const startTime = Date.now();
  try {
    const { latitude, longitude, language, location, message, history, image, widget_data } = req.body;

    console.log('💬 [Chat] Request:', {
      hasLocation: !!(latitude && longitude),
      language: language || 'en',
      messageLength: message?.length || 0,
      historyCount: history?.length || 0,
      hasImage: !!image,
      hasWidgetData: !!widget_data,
      widgetType: widget_data?.widget_type,
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

    // If widget_data is provided, process it directly without intent detection
    if (widget_data?.widget_type) {
      console.log('🔧 [Chat] Processing widget submission:', widget_data.widget_type);

      const widgetResult = await processWidgetData(widget_data, mcpContext, {
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
      });

      // Build enhanced body with widget result for n8n
      const enhancedBody = {
        ...req.body,
        mcpServers: {
          global: mcpContext.global,
          regional: mcpContext.regional,
        },
        mcpResults: widgetResult.rawResult ? { [widget_data.widget_type]: widgetResult.rawResult } : {},
        intentsDetected: [widget_data.widget_type.replace('_input', '')],
        detectedRegions: mcpContext.detectedRegions,
        locationContext: location || null,
        widgetProcessed: true,
        widgetSuccess: widgetResult.success,
      };

      // Call n8n for response generation
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

      try {
        const response = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(enhancedBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`n8n returned ${response.status}`);
        }

        const data = await response.json();
        const duration = Date.now() - startTime;

        console.log('💬 [Chat] Widget response:', {
          success: data.success !== false,
          duration: `${duration}ms`,
          hasWidget: !!widgetResult.widget,
        });

        return res.json({
          ...data,
          widget: widgetResult.widget, // Include widget for mobile rendering
          mcpToolsUsed: [widget_data.widget_type],
          intentsDetected: [widget_data.widget_type.replace('_input', '')],
          _meta: {
            duration,
            widgetType: widget_data.widget_type,
            widgetSuccess: widgetResult.success,
          },
        });
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          return res.status(504).json({
            success: false,
            error: 'Request timed out',
            widget: widgetResult.widget,
            response: 'Request timed out. Please try again.',
          });
        }
        throw fetchError;
      }
    }

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
        // Still add partial data so user knows diagnosis was attempted
        mcpResults.diagnosis = { error: diagnosis.error, message: diagnosis.message || 'Could not analyze plant image' };
      }
    }

    console.log('🔧 [Chat] MCP Results:', {
      intents: intentsDetected.join(', '),
      toolsCalled: Object.keys(mcpResults).join(', '),
    });

    // Analyze query for natural widget suggestions
    const widgetSuggestions = analyzeQueryForWidgetSuggestion(message, intentsDetected, mcpResults);
    const inputSuggestions = widgetSuggestions.filter(s => s.type === 'input');
    const outputWidgets = widgetSuggestions.filter(s => s.type === 'output');

    console.log('🎯 [Chat] Widget analysis:', {
      inputSuggestions: inputSuggestions.map(s => s.widget),
      outputWidgets: outputWidgets.map(s => s.widget),
    });

    // Build enhanced request body for n8n
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
      // NEW: Fallback instructions when MCP data is unavailable
      noDataFallbacks: Object.keys(noDataFallbacks).length > 0 ? noDataFallbacks : null,
    };

    // Call n8n with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

    try {
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enhancedBody),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        console.error('💬 [Chat] n8n error:', response.status, errorText);
        throw new Error(`n8n returned ${response.status}`);
      }
      
      const data = await response.json();
      const duration = Date.now() - startTime;
      
      console.log('💬 [Chat] Response:', {
        success: data.success !== false,
        duration: `${duration}ms`,
        hasFollowUp: !!(data.followUpQuestions?.length),
        hasSuggestedWidget: inputSuggestions.length > 0,
        hasOutputWidget: outputWidgets.length > 0,
      });

      // Build response with widget information
      const responseData = {
        ...data,
        mcpToolsUsed: Object.keys(mcpResults),
        intentsDetected,
        _meta: {
          duration,
          mcpServersUsed: mcpContext.global.length + mcpContext.regional.length,
          regions: mcpContext.detectedRegions.map(r => r.name),
        },
      };

      // Add output widget if we have MCP data to display
      if (outputWidgets.length > 0) {
        responseData.widget = {
          type: outputWidgets[0].widget,
          data: outputWidgets[0].data,
        };
      }

      // Add suggested input widget if query would benefit from structured input
      if (inputSuggestions.length > 0) {
        responseData.suggestedWidget = {
          type: inputSuggestions[0].widget,
          prompt: inputSuggestions[0].prompt,
          reason: inputSuggestions[0].reason,
        };
      }

      res.json(responseData);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        console.error('💬 [Chat] Timeout after', CHAT_TIMEOUT_MS, 'ms');
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

    const response = await fetch(N8N_WHISPER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        audio: audioBase64,  // Send raw base64, not data URI
        language, 
        mimeType: detectedMimeType 
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`n8n transcribe error: ${response.status} - ${errorText}`);
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
    console.error('Error calling n8n transcribe:', error.message);
    res.status(500).json({ success: false, error: 'Failed to transcribe audio: ' + error.message });
  }
});

/**
 * Text-to-Speech endpoint - uploads to Cloudinary
 */
router.post('/tts', async (req, res) => {
  try {
    const response = await fetch(N8N_TTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    console.error('Error calling n8n TTS:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

/**
 * Generate session title via n8n workflow
 */
router.post('/generate-title', async (req, res) => {
  try {
    console.log('📝 [Title] Generating title, messages:', req.body.messages?.length || 0);
    
    const response = await fetch(N8N_TITLE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    
    if (!response.ok) {
      console.log('📝 [Title] n8n error:', response.status);
      return res.status(response.status).json({ 
        success: false, 
        error: `n8n returned ${response.status}`,
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
 * Location lookup via n8n workflow
 */
router.post('/location-lookup', async (req, res) => {
  try {
    const { latitude, longitude, ipAddress } = req.body;
    console.log('📍 [Location] Looking up:', { latitude, longitude, ipAddress });
    
    const response = await fetch(N8N_LOCATION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    
    if (!response.ok) {
      console.log('📍 [Location] n8n error:', response.status);
      return res.status(response.status).json({ 
        success: false, 
        error: `n8n returned ${response.status}` 
      });
    }
    
    const data = await response.json();
    console.log('📍 [Location] Result:', { 
      success: data.success, 
      source: data.source, 
      displayName: data.displayName,
      country: data.level1Country,
      city: data.level5City 
    });
    
    res.json(data);
  } catch (error) {
    console.error('📍 [Location] Error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to lookup location' });
  }
});

module.exports = router;

