/**
 * Widget Schema Definitions
 *
 * Defines all widget types and their schema structures for the MCP Chat App.
 * These schemas drive both input collection and output rendering.
 */

// Widget Type Constants
export const WIDGET_TYPES = {
  // Input Widgets - Collect structured data from users
  WEATHER_INPUT: 'weather_input',
  GAP_WEATHER_INPUT: 'gap_weather_input',  // GAP Weather (Kenya)
  FEED_FORM: 'feed_formulation_input',
  SOIL_QUERY: 'soil_query_input',
  FERTILIZER_INPUT: 'fertilizer_input',
  CLIMATE_QUERY: 'climate_query_input',
  DECISION_TREE: 'decision_tree_input',

  // Output Widgets - Display formatted results
  WEATHER_FORECAST: 'weather_forecast_card',
  SALIENT_FORECAST: 'salient_forecast_card',  // GAP Salient Seasonal
  CBAM_DETAILED: 'cbam_detailed_card',        // GAP CBAM Daily
  NOWCAST_ALERT: 'nowcast_alert_card',        // GAP Nowcast
  DIET_RESULT: 'diet_result_card',
  SOIL_PROFILE: 'soil_profile_card',
  FERTILIZER_RESULT: 'fertilizer_result_card',
  CLIMATE_FORECAST: 'climate_forecast_card',
  RECOMMENDATIONS: 'recommendations_card',
};

// Map input widgets to their corresponding output widgets
export const INPUT_TO_OUTPUT_MAP = {
  [WIDGET_TYPES.WEATHER_INPUT]: WIDGET_TYPES.WEATHER_FORECAST,
  [WIDGET_TYPES.GAP_WEATHER_INPUT]: WIDGET_TYPES.SALIENT_FORECAST,  // Default to Salient
  [WIDGET_TYPES.FEED_FORM]: WIDGET_TYPES.DIET_RESULT,
  [WIDGET_TYPES.SOIL_QUERY]: WIDGET_TYPES.SOIL_PROFILE,
  [WIDGET_TYPES.FERTILIZER_INPUT]: WIDGET_TYPES.FERTILIZER_RESULT,
  [WIDGET_TYPES.CLIMATE_QUERY]: WIDGET_TYPES.CLIMATE_FORECAST,
  [WIDGET_TYPES.DECISION_TREE]: WIDGET_TYPES.RECOMMENDATIONS,
};

// Widget category groupings for UI organization
export const WIDGET_CATEGORIES = {
  WEATHER: 'weather',
  NUTRITION: 'nutrition',
  SOIL: 'soil',
  FERTILIZER: 'fertilizer',
  CLIMATE: 'climate',
  ADVISORY: 'advisory',
};

// Widget metadata for tools menu display
export const WIDGET_METADATA = {
  [WIDGET_TYPES.WEATHER_INPUT]: {
    name: 'Weather Forecast',
    icon: 'cloud',
    category: WIDGET_CATEGORIES.WEATHER,
    description: 'Get weather forecast for your location',
    triggerKeywords: ['weather', 'forecast', 'rain', 'temperature', 'climate today'],
  },
  [WIDGET_TYPES.GAP_WEATHER_INPUT]: {
    name: 'GAP Weather (Kenya)',
    icon: 'partly-sunny',
    category: WIDGET_CATEGORIES.WEATHER,
    description: 'Detailed forecasts via TomorrowNow',
    triggerKeywords: ['gap weather', 'kenya weather', 'nowcast', 'cbam', 'evapotranspiration', 'et', 'solar radiation', 'will it rain now'],
    region: 'kenya',
  },
  [WIDGET_TYPES.FEED_FORM]: {
    name: 'Feed Calculator',
    icon: 'nutrition',
    category: WIDGET_CATEGORIES.NUTRITION,
    description: 'Calculate optimal cattle diet',
    triggerKeywords: ['feed', 'diet', 'nutrition', 'cattle', 'milk production', 'fodder'],
  },
  [WIDGET_TYPES.SOIL_QUERY]: {
    name: 'Soil Analysis',
    icon: 'layers',
    category: WIDGET_CATEGORIES.SOIL,
    description: 'Get soil properties for your location',
    triggerKeywords: ['soil', 'ph', 'nitrogen', 'nutrient', 'land'],
  },
  [WIDGET_TYPES.FERTILIZER_INPUT]: {
    name: 'Fertilizer Advisor',
    icon: 'flask',
    category: WIDGET_CATEGORIES.FERTILIZER,
    description: 'Get fertilizer recommendations',
    triggerKeywords: ['fertilizer', 'urea', 'nps', 'compost', 'yield'],
  },
  [WIDGET_TYPES.CLIMATE_QUERY]: {
    name: 'Seasonal Forecast',
    icon: 'calendar',
    category: WIDGET_CATEGORIES.CLIMATE,
    description: 'Get seasonal climate outlook',
    triggerKeywords: ['season', 'seasonal', 'outlook', 'prediction', 'monsoon'],
  },
  [WIDGET_TYPES.DECISION_TREE]: {
    name: 'Crop Advisor',
    icon: 'leaf',
    category: WIDGET_CATEGORIES.ADVISORY,
    description: 'Get crop management recommendations',
    triggerKeywords: ['recommendation', 'advice', 'growth stage', 'what should I do'],
  },
};

// Check if a widget type is an input widget
export const isInputWidget = (type) => {
  return Object.values(WIDGET_TYPES).includes(type) && type.endsWith('_input');
};

// Check if a widget type is an output widget
export const isOutputWidget = (type) => {
  return Object.values(WIDGET_TYPES).includes(type) && type.endsWith('_card');
};

// Get output widget type for a given input type
export const getOutputWidgetType = (inputType) => {
  return INPUT_TO_OUTPUT_MAP[inputType] || null;
};

// Detect widget trigger from message text
export const detectWidgetTrigger = (message) => {
  if (!message) return null;

  const lowerMessage = message.toLowerCase();

  for (const [widgetType, metadata] of Object.entries(WIDGET_METADATA)) {
    if (metadata.triggerKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return widgetType;
    }
  }

  return null;
};

// Get all input widgets for tools menu
export const getInputWidgets = () => {
  return Object.entries(WIDGET_METADATA)
    .filter(([type]) => isInputWidget(type))
    .map(([type, metadata]) => ({
      type,
      ...metadata,
    }));
};

export default {
  WIDGET_TYPES,
  INPUT_TO_OUTPUT_MAP,
  WIDGET_CATEGORIES,
  WIDGET_METADATA,
  isInputWidget,
  isOutputWidget,
  getOutputWidgetType,
  detectWidgetTrigger,
  getInputWidgets,
};
