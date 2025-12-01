/**
 * ag-mcp Chat Backend Server
 * 
 * Express server that:
 * - Receives chat messages from frontend
 * - Uses Google Gemini 2.5 Pro for AI processing
 * - Detects user region from GPS coordinates
 * - Routes to appropriate MCP servers via Gemini function calling
 * - Returns AI responses with multilingual support
 * 
 * Railway-ready deployment
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Pool } from 'pg';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createGeminiTools, executeMcpToolCall } from './gemini-mcp-integration.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Gemini AI Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'; // or 'gemini-1.5-pro'

if (!GEMINI_API_KEY) {
  console.warn('⚠️  WARNING: GEMINI_API_KEY not set. Chat will not work without it.');
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// PostgreSQL connection (optional - for location persistence)
let db = null;
if (process.env.DATABASE_URL) {
  db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
  
  // Initialize database
  db.query(`
    CREATE TABLE IF NOT EXISTS user_preferences (
      device_id VARCHAR(255) PRIMARY KEY,
      latitude DECIMAL(10, 7),
      longitude DECIMAL(10, 7),
      country VARCHAR(100),
      city VARCHAR(100),
      region VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `).catch(err => console.warn('[DB] Table creation:', err.message));
}

/**
 * Detect region from coordinates
 */
function detectRegion(latitude, longitude) {
  if (!latitude || !longitude) return 'global';
  
  const lat = parseFloat(latitude);
  const lon = parseFloat(longitude);
  
  // Ethiopia bounds
  if (lat >= 3.0 && lat <= 15.0 && lon >= 32.0 && lon <= 48.0) {
    return 'ethiopia';
  }
  
  // East Africa bounds
  if (lat >= -12.0 && lat <= 18.0 && lon >= 29.0 && lon <= 52.0) {
    return 'east-africa';
  }
  
  return 'global';
}

/**
 * Get MCP servers for region
 */
function getMCPServersForRegion(region) {
  const servers = {
    'ethiopia': [
      {
        name: 'SSFR MCP',
        url: process.env.SSFR_MCP_URL || 'https://ssfr-mcp.up.railway.app/mcp',
        tools: ['get_fertilizer_recommendation', 'get_crop_advisory']
      },
      {
        name: 'ISDA Soil MCP',
        url: process.env.ISDA_SOIL_MCP_URL || 'https://isda-soil-mcp.up.railway.app/mcp',
        tools: ['get_isda_soil_properties']
      },
      {
        name: 'AgriVision MCP',
        url: process.env.AGRIVISION_MCP_URL || 'https://agrivision-mcp.up.railway.app/mcp',
        tools: ['diagnose_plant_health']
      },
      {
        name: 'AccuWeather MCP',
        url: process.env.ACCUWEATHER_MCP_URL || 'https://accuweather-mcp.up.railway.app/mcp',
        tools: ['get_accuweather_weather_forecast']
      }
    ],
    'east-africa': [
      {
        name: 'GAP Weather MCP',
        url: process.env.GAP_MCP_URL || 'https://gap-mcp.up.railway.app/mcp',
        tools: ['get_gap_weather_forecast']
      },
      {
        name: 'ISDA Soil MCP',
        url: process.env.ISDA_SOIL_MCP_URL || 'https://isda-soil-mcp.up.railway.app/mcp',
        tools: ['get_isda_soil_properties']
      },
      {
        name: 'AgriVision MCP',
        url: process.env.AGRIVISION_MCP_URL || 'https://agrivision-mcp.up.railway.app/mcp',
        tools: ['diagnose_plant_health']
      },
      {
        name: 'Decision Tree MCP',
        url: process.env.DECISION_TREE_MCP_URL || 'https://decision-tree-mcp.up.railway.app/mcp',
        tools: ['get_crop_recommendation']
      }
    ],
    'global': [
      {
        name: 'AccuWeather MCP',
        url: process.env.ACCUWEATHER_MCP_URL || 'https://accuweather-mcp.up.railway.app/mcp',
        tools: ['get_accuweather_weather_forecast']
      },
      {
        name: 'AgriVision MCP',
        url: process.env.AGRIVISION_MCP_URL || 'https://agrivision-mcp.up.railway.app/mcp',
        tools: ['diagnose_plant_health']
      },
      {
        name: 'Feed Formulation MCP',
        url: process.env.FEED_FORMULATION_MCP_URL || 'https://feed-formulation-mcp.up.railway.app/mcp',
        tools: ['get_diet_recommendation']
      }
    ]
  };
  
  return servers[region] || servers['global'];
}

/**
 * Build system prompt for Gemini
 */
function buildSystemPrompt(region, mcpServers) {
  const serverNames = mcpServers.map(s => s.name).join(', ');
  
  return `You are a helpful farming assistant for farmers in ${region} region.

You have access to these agricultural tools via MCP servers:
${serverNames}

IMPORTANT INSTRUCTIONS:
- Always use the appropriate MCP tools to get real agricultural data
- Never make up weather forecasts, soil data, or crop advice
- Keep responses SHORT and farmer-friendly (2-4 sentences for simple queries)
- Hide technical details (coordinates, tool names, MCP terminology)
- Respond in the same language the user uses (English, Swahili, Amharic, etc.)
- For weather queries, use weather tools
- For soil queries, use soil tools
- For crop advice, use crop advisory tools
- For plant diseases, use plant diagnosis tools

Be conversational, helpful, and practical.`;
}

/**
 * Detect language from message (for multilingual support)
 */
function detectLanguage(message) {
  // Simple detection - can be enhanced
  const swahiliWords = ['hali', 'hewa', 'mvua', 'joto', 'shamba', 'mahindi', 'kumwagilia'];
  const amharicPattern = /[\u1200-\u137F]/; // Amharic Unicode range
  
  const lowerMessage = message.toLowerCase();
  
  if (swahiliWords.some(word => lowerMessage.includes(word))) {
    return 'sw'; // Swahili
  }
  
  if (amharicPattern.test(message)) {
    return 'am'; // Amharic
  }
  
  return 'en'; // Default to English
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ag-mcp-chat-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Store user location
app.post('/api/user/location', async (req, res) => {
  try {
    const { device_id, latitude, longitude, country, city } = req.body;
    
    if (!device_id) {
      return res.status(400).json({ error: 'device_id is required' });
    }
    
    const region = detectRegion(latitude, longitude);
    
    if (db) {
      await db.query(`
        INSERT INTO user_preferences (device_id, latitude, longitude, country, city, region)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (device_id) 
        DO UPDATE SET 
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          country = EXCLUDED.country,
          city = EXCLUDED.city,
          region = EXCLUDED.region,
          updated_at = NOW()
      `, [device_id, latitude, longitude, country, city, region]);
    }
    
    const servers = getMCPServersForRegion(region);
    
    res.json({
      success: true,
      device_id,
      region,
      recommended_servers: servers.map(s => s.name)
    });
  } catch (error) {
    console.error('[API] Error storing location:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user location
app.get('/api/user/location/:device_id', async (req, res) => {
  try {
    const { device_id } = req.params;
    
    if (!db) {
      return res.status(404).json({ error: 'Location not found (database not configured)' });
    }
    
    const result = await db.query(
      'SELECT * FROM user_preferences WHERE device_id = $1',
      [device_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    
    const prefs = result.rows[0];
    const servers = getMCPServersForRegion(prefs.region);
    
    res.json({
      device_id: prefs.device_id,
      latitude: parseFloat(prefs.latitude),
      longitude: parseFloat(prefs.longitude),
      country: prefs.country,
      city: prefs.city,
      region: prefs.region,
      recommended_servers: servers.map(s => s.name)
    });
  } catch (error) {
    console.error('[API] Error getting location:', error);
    res.status(500).json({ error: error.message });
  }
});

// Main chat endpoint with Gemini 2.5 Pro
app.post('/api/chat', async (req, res) => {
  try {
    const { message, device_id, latitude, longitude, image, conversation_history } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    if (!genAI) {
      return res.status(500).json({
        error: 'Gemini AI not configured',
        message: 'GEMINI_API_KEY environment variable is required'
      });
    }
    
    // Detect region
    let region = 'global';
    let userLat = latitude;
    let userLon = longitude;
    
    // Try to get location from database if coordinates not provided
    if ((!latitude || !longitude) && device_id && db) {
      const result = await db.query(
        'SELECT latitude, longitude, region FROM user_preferences WHERE device_id = $1',
        [device_id]
      );
      
      if (result.rows.length > 0) {
        userLat = parseFloat(result.rows[0].latitude);
        userLon = parseFloat(result.rows[0].longitude);
        region = result.rows[0].region;
      }
    } else if (latitude && longitude) {
      region = detectRegion(latitude, longitude);
    }
    
    // Detect language
    const language = detectLanguage(message);
    
    console.log(`[Chat] Message: "${message.substring(0, 50)}..."`);
    console.log(`[Chat] Region: ${region}, Language: ${language}, Coordinates: ${userLat}, ${userLon}`);
    
    // Get MCP servers for region
    const mcpServers = getMCPServersForRegion(region);
    
    // Create Gemini model with MCP tools
    const tools = createGeminiTools(mcpServers, {
      'X-Farm-Latitude': userLat?.toString(),
      'X-Farm-Longitude': userLon?.toString()
    });
    
    const model = genAI.getGenerativeModel({ 
      model: GEMINI_MODEL,
      tools: [tools]
    });
    
    // Build conversation history
    const history = conversation_history || [];
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: buildSystemPrompt(region, mcpServers) }]
        },
        {
          role: 'model',
          parts: [{ text: 'I understand. I\'ll use the MCP tools to provide accurate agricultural information.' }]
        }
      ]
    });
    
    // Add conversation history
    for (const msg of history.slice(-10)) { // Keep last 10 messages for context
      if (msg.role === 'user') {
        await chat.sendMessage(msg.content);
      } else if (msg.role === 'assistant') {
        // Add assistant response to history
        // Note: Gemini manages history automatically
      }
    }
    
    // Prepare message parts
    const messageParts = [{ text: message }];
    if (image) {
      // Handle image - convert base64 if needed
      const imageData = image.startsWith('data:') 
        ? image.split(',')[1] 
        : image;
      messageParts.push({
        inlineData: {
          data: imageData,
          mimeType: 'image/jpeg'
        }
      });
    }
    
    // Generate response with Gemini
    let responseText = '';
    let toolUsed = null;
    let mcpServerUsed = null;
    
    const result = await chat.sendMessage(messageParts);
    const response = result.response;
    
    // Check if Gemini called any functions (MCP tools)
    const functionCalls = response.functionCalls();
    
    if (functionCalls && functionCalls.length > 0) {
      console.log(`[Chat] Gemini called ${functionCalls.length} function(s)`);
      
      // Execute MCP tool calls
      const functionResponses = [];
      for (const functionCall of functionCalls) {
        const toolName = functionCall.name;
        const toolArgs = functionCall.args;
        
        console.log(`[Chat] Executing tool: ${toolName}`, toolArgs);
        
        try {
          // Find which MCP server has this tool
          const server = mcpServers.find(s => s.tools.includes(toolName));
          if (server) {
            mcpServerUsed = server.name;
            toolUsed = toolName;
            
            // Merge default coordinates with tool args
            const finalArgs = {
              ...toolArgs,
              latitude: toolArgs.latitude || userLat,
              longitude: toolArgs.longitude || userLon
            };
            
            // Execute MCP tool call
            const toolResult = await executeMcpToolCall(
              { name: toolName, args: finalArgs },
              mcpServers,
              {
                'X-Farm-Latitude': userLat?.toString(),
                'X-Farm-Longitude': userLon?.toString()
              }
            );
            
            // Extract text from MCP response
            let toolResultText = '';
            if (toolResult.content && Array.isArray(toolResult.content)) {
              toolResultText = toolResult.content
                .filter(c => c.type === 'text')
                .map(c => c.text)
                .join('\n');
            } else if (toolResult.text) {
              toolResultText = toolResult.text;
            } else if (typeof toolResult === 'string') {
              toolResultText = toolResult;
            } else {
              toolResultText = JSON.stringify(toolResult);
            }
            
            functionResponses.push({
              name: toolName,
              response: toolResultText
            });
          }
        } catch (error) {
          console.error(`[Chat] Error executing tool ${toolName}:`, error);
          functionResponses.push({
            name: toolName,
            response: `Error: ${error.message}`
          });
        }
      }
      
      // Get final response from Gemini with tool results
      const finalResult = await chat.sendMessage(functionResponses);
      responseText = finalResult.response.text();
    } else {
      // No function calls, use direct response
      responseText = response.text();
    }
    
    // If no response, provide fallback
    if (!responseText || responseText.trim().length === 0) {
      responseText = `I received your message. I'm processing your request using agricultural data tools. Please try again if you don't see results.`;
    }
    
    res.json({
      response: responseText,
      region,
      language,
      mcp_server: mcpServerUsed,
      tool_used: toolUsed,
      coordinates: {
        latitude: userLat,
        longitude: userLon
      }
    });
  } catch (error) {
    console.error('[Chat] Error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      message: error.message,
      response: 'I apologize, but I encountered an error processing your request. Please try again.'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log('');
  console.log('🚀 =========================================');
  console.log('   ag-mcp Chat Backend Server');
  console.log('   Powered by Google Gemini 2.5 Pro');
  console.log('   Region-Based MCP Routing');
  console.log('=========================================');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🌿 Chat endpoint: http://localhost:${PORT}/api/chat`);
  console.log(`🤖 AI Model: ${GEMINI_MODEL}`);
  console.log(`💾 Database: ${db ? 'Connected' : 'Not configured (optional)'}`);
  console.log(`🌍 Gemini AI: ${genAI ? '✅ Configured' : '❌ Not configured (set GEMINI_API_KEY)'}`);
  console.log('');
  console.log('✅ Ready to process messages with Gemini + MCP servers');
  console.log('=========================================');
});

