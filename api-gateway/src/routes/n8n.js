// n8n workflow proxy routes
const express = require('express');
const cloudinary = require('cloudinary').v2;
const { prisma } = require('../db');

const router = express.Router();

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://ag-mcp-app.up.railway.app/webhook/api/chat';
const N8N_WHISPER_URL = process.env.N8N_WHISPER_URL || 'https://ag-mcp-app.up.railway.app/webhook/api/transcribe';
const N8N_TTS_URL = process.env.N8N_TTS_URL || 'https://ag-mcp-app.up.railway.app/webhook/api/tts';
const N8N_TITLE_URL = process.env.N8N_TITLE_URL || 'https://ag-mcp-app.up.railway.app/webhook/generate-title';
const N8N_LOCATION_URL = process.env.N8N_LOCATION_URL || 'https://ag-mcp-app.up.railway.app/webhook/location-lookup';
const CHAT_TIMEOUT_MS = parseInt(process.env.CHAT_TIMEOUT_MS || '60000'); // 60s default

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
 * Multi-language intent keywords
 * Covers: English, Amharic (am), Hindi (hi), Kannada (kn), Telugu (te), Swahili (sw), Vietnamese (vi)
 */
const INTENT_KEYWORDS = {
  weather: [
    // English
    'weather', 'forecast', 'rain', 'temperature', 'climate', 'sunny', 'cloudy', 'storm',
    // Amharic (Ethiopia)
    'የአየር', 'ዝናብ', 'ሙቀት', 'ቀዝቃዛ', 'ፀሐይ',
    // Hindi
    'मौसम', 'बारिश', 'तापमान', 'गर्मी', 'ठंड',
    // Kannada
    'ಹವಾಮಾನ', 'ಮಳೆ', 'ತಾಪಮಾನ',
    // Telugu
    'వాతావరణం', 'వర్షం', 'ఉష్ణోగ్రత',
    // Swahili
    'hali ya hewa', 'mvua', 'joto',
  ],
  soil: [
    // English
    'soil', 'ph', 'nitrogen', 'phosphorus', 'potassium', 'nutrient', 'fertility', 'acidity',
    // Amharic
    'አፈር', 'ማዳበሪያ', 'ለምነት',
    // Hindi
    'मिट्टी', 'भूमि', 'उर्वरता', 'नाइट्रोजन',
    // Kannada
    'ಮಣ್ಣು', 'ಫಲವತ್ತತೆ',
    // Telugu
    'మట్టి', 'సారవంతత',
    // Swahili
    'udongo', 'rutuba',
  ],
  fertilizer: [
    // English
    'fertilizer', 'fertiliser', 'npk', 'urea', 'nps', 'compost', 'manure', 'dap',
    // Amharic
    'ማዳበሪያ', 'ኮምፖስት', 'ፍግ', 'ዩሪያ',
    // Hindi
    'खाद', 'उर्वरक', 'यूरिया', 'गोबर',
    // Kannada
    'ಗೊಬ್ಬರ', 'ಯೂರಿಯಾ',
    // Telugu
    'ఎరువు', 'యూరియా',
    // Swahili
    'mbolea', 'samadi',
  ],
  feed: [
    // English
    'feed', 'cow', 'cattle', 'dairy', 'livestock', 'milk', 'fodder', 'diet', 'ration', 'animal',
    // Amharic
    'ላም', 'ከብት', 'ወተት', 'መኖ', 'እንሰሳ', 'ለመመገብ', 'ላሞች',
    // Hindi
    'गाय', 'दूध', 'पशु', 'चारा', 'भैंस',
    // Kannada
    'ಹಸು', 'ಹಾಲು', 'ಜಾನುವಾರು', 'ಮೇವು',
    // Telugu
    'ఆవు', 'పాలు', 'పశువులు', 'దాణా',
    // Swahili
    'ng\'ombe', 'maziwa', 'mifugo', 'lishe',
  ],
};

/**
 * Detect intents from message in any supported language
 */
function detectIntents(message) {
  const lowerMessage = (message || '').toLowerCase();
  const intents = [];
  
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some(kw => lowerMessage.includes(kw.toLowerCase()))) {
      intents.push(intent);
    }
  }
  
  return intents;
}

/**
 * Call MCP servers based on user intent
 */
async function callMcpServersForIntent(message, latitude, longitude, mcpServers) {
  const lowerMessage = (message || '').toLowerCase();
  const allServers = [...(mcpServers.global || []), ...(mcpServers.regional || [])];
  const mcpResults = {};
  const intentsDetected = detectIntents(message);

  // Weather intent
  if (intentsDetected.includes('weather')) {
    const server = allServers.find(s => s.slug === 'accuweather');
    if (server?.endpoint && latitude && longitude) {
      mcpResults.weather = await callMcpTool(server.endpoint, 'get_accuweather_current_conditions', { latitude, longitude });
    }
  }

  // Soil intent
  if (intentsDetected.includes('soil')) {
    const server = allServers.find(s => s.slug === 'isda-soil');
    if (server?.endpoint && latitude && longitude) {
      mcpResults.soil = await callMcpTool(server.endpoint, 'get_isda_soil_properties', { latitude, longitude });
    }
  }

  // Fertilizer intent
  if (intentsDetected.includes('fertilizer')) {
    const server = allServers.find(s => s.slug === 'nextgen');
    if (server?.endpoint && latitude && longitude) {
      const crop = lowerMessage.includes('maize') || lowerMessage.includes('በቆሎ') ? 'maize' : 'wheat';
      mcpResults.fertilizer = await callMcpTool(server.endpoint, 'get_fertilizer_recommendation', 
        { crop, latitude, longitude },
        { 'X-Farm-Latitude': String(latitude), 'X-Farm-Longitude': String(longitude) }
      );
    }
  }

  // Feed intent
  if (intentsDetected.includes('feed')) {
    const server = allServers.find(s => s.slug === 'feed-formulation');
    if (server?.endpoint) {
      const feedQuery = lowerMessage.match(/maize|teff|noug|wheat|straw|bran|በቆሎ|ጤፍ|ኑግ/)?.[0] || 'dairy';
      mcpResults.feed = await callMcpTool(server.endpoint, 'search_feeds', { query: feedQuery, limit: 5 });
    }
  }

  return { mcpResults, intentsDetected };
}

/**
 * Chat endpoint - routes to n8n Gemini chat workflow with MCP context
 */
router.post('/chat', async (req, res) => {
  const startTime = Date.now();
  try {
    const { latitude, longitude, language, location, message, history } = req.body;
    
    console.log('💬 [Chat] Request:', {
      hasLocation: !!(latitude && longitude),
      language: language || 'en',
      messageLength: message?.length || 0,
      historyCount: history?.length || 0,
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

    // Call MCP servers based on detected intents
    const { mcpResults, intentsDetected } = await callMcpServersForIntent(
      message,
      latitude ? parseFloat(latitude) : null,
      longitude ? parseFloat(longitude) : null,
      { global: mcpContext.global, regional: mcpContext.regional }
    );

    console.log('🔧 [Chat] MCP Results:', {
      intents: intentsDetected.join(', '),
      toolsCalled: Object.keys(mcpResults).join(', '),
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
      });
      
      res.json({
        ...data,
        mcpToolsUsed: Object.keys(mcpResults),
        intentsDetected,
        _meta: {
          duration,
          mcpServersUsed: mcpContext.global.length + mcpContext.regional.length,
          regions: mcpContext.detectedRegions.map(r => r.name),
        },
      });
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

