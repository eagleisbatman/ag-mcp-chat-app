/**
 * Gemini MCP Integration Module
 * Converts MCP server tools to Gemini Function Declarations
 */

// Gemini MCP Integration - Function declarations for Gemini function calling

/**
 * Create Gemini function declaration from MCP tool
 */
export function createMcpFunctionDeclaration(toolName, description, parameters) {
  return {
    name: toolName,
    description: description || `MCP tool: ${toolName}`,
    parameters: {
      type: 'object',
      properties: parameters || {},
      required: []
    }
  };
}

/**
 * Create Gemini tools from MCP server configs
 * Returns function declarations for Gemini function calling
 */
export function createGeminiTools(mcpServers, headers = {}) {
  const functionDeclarations = [];
  
  for (const server of mcpServers) {
    for (const toolName of server.tools) {
      const declaration = createMcpFunctionDeclarationForTool(toolName, server);
      functionDeclarations.push(declaration);
    }
  }
  
  return {
    functionDeclarations
  };
}

/**
 * Create function declaration for specific tool
 */
function createMcpFunctionDeclarationForTool(toolName, server) {
  // Weather tools
  if (toolName.includes('weather') || toolName.includes('forecast')) {
    return {
      name: toolName,
      description: 'Get weather forecast data for agricultural planning',
      parameters: {
        type: 'object',
        properties: {
          latitude: {
            type: 'number',
            description: 'Latitude coordinate'
          },
          longitude: {
            type: 'number',
            description: 'Longitude coordinate'
          },
          days: {
            type: 'integer',
            description: 'Number of days for forecast (1-14, default: 7)'
          }
        },
        required: []
      }
    };
  }
  
  // Soil tools
  if (toolName.includes('soil')) {
    return {
      name: toolName,
      description: 'Get soil properties and fertility information',
      parameters: {
        type: 'object',
        properties: {
          latitude: {
            type: 'number',
            description: 'Latitude coordinate'
          },
          longitude: {
            type: 'number',
            description: 'Longitude coordinate'
          }
        },
        required: []
      }
    };
  }
  
  // Fertilizer tools
  if (toolName.includes('fertilizer') || toolName.includes('fertiliser')) {
    return {
      name: toolName,
      description: 'Get fertilizer recommendations for crops',
      parameters: {
        type: 'object',
        properties: {
          crop_name: {
            type: 'string',
            description: 'Crop name (e.g., "maize", "wheat")'
          },
          latitude: {
            type: 'number',
            description: 'Latitude coordinate'
          },
          longitude: {
            type: 'number',
            description: 'Longitude coordinate'
          }
        },
        required: ['crop_name']
      }
    };
  }
  
  // Crop advisory tools
  if (toolName.includes('crop') || toolName.includes('advisory')) {
    return {
      name: toolName,
      description: 'Get crop farming recommendations and advice',
      parameters: {
        type: 'object',
        properties: {
          crop: {
            type: 'string',
            description: 'Crop name (e.g., "maize", "beans")'
          },
          growth_stage_order: {
            type: 'integer',
            description: 'Growth stage (1-6)'
          },
          latitude: {
            type: 'number',
            description: 'Latitude coordinate'
          },
          longitude: {
            type: 'number',
            description: 'Longitude coordinate'
          }
        },
        required: ['crop']
      }
    };
  }
  
  // Plant diagnosis tools
  if (toolName.includes('diagnose') || toolName.includes('health')) {
    return {
      name: toolName,
      description: 'Diagnose plant health, diseases, and pests from images',
      parameters: {
        type: 'object',
        properties: {
          image_url: {
            type: 'string',
            description: 'URL or base64 encoded image of the plant'
          },
          crop_name: {
            type: 'string',
            description: 'Crop name (optional, helps with accuracy)'
          },
          latitude: {
            type: 'number',
            description: 'Latitude coordinate (optional)'
          },
          longitude: {
            type: 'number',
            description: 'Longitude coordinate (optional)'
          }
        },
        required: ['image_url']
      }
    };
  }
  
  // Feed formulation tools
  if (toolName.includes('feed') || toolName.includes('diet')) {
    return {
      name: toolName,
      description: 'Get livestock feed formulation recommendations',
      parameters: {
        type: 'object',
        properties: {
          animal_type: {
            type: 'string',
            description: 'Type of animal (e.g., "cattle", "goat", "chicken")'
          },
          weight: {
            type: 'number',
            description: 'Animal weight in kg'
          },
          production_stage: {
            type: 'string',
            description: 'Production stage (e.g., "lactating", "growing")'
          }
        },
        required: ['animal_type']
      }
    };
  }
  
  // Default declaration
  return {
    name: toolName,
    description: `MCP tool: ${toolName}`,
    parameters: {
      type: 'object',
      properties: {},
      required: []
    }
  };
}

/**
 * Execute MCP tool call
 */
export async function executeMcpToolCall(functionCall, mcpServers, headers = {}) {
  const { name, args } = functionCall;
  
  // Find server that supports this tool
  const server = mcpServers.find(s => s.tools.includes(name));
  if (!server) {
    throw new Error(`Tool ${name} not found in available MCP servers`);
  }
  
  // Prepare MCP JSON-RPC request
  const mcpRequest = {
    jsonrpc: '2.0',
    id: Date.now().toString(),
    method: 'tools/call',
    params: {
      name: name,
      arguments: args || {}
    }
  };
  
  const response = await fetch(server.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...headers
    },
    body: JSON.stringify(mcpRequest)
  });
  
  if (!response.ok) {
    throw new Error(`MCP server error: ${response.status} ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (result.error) {
    throw new Error(`MCP error: ${result.error.message}`);
  }
  
  return result.result;
}

