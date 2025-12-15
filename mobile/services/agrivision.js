// AgriVision MCP Service - Plant disease diagnosis via image analysis
import { fetchWithTimeout } from '../utils/apiHelpers';

const AGRIVISION_URL = process.env.EXPO_PUBLIC_AGRIVISION_URL || 'https://agrivision-mcp.up.railway.app/mcp';
const AGRIVISION_TIMEOUT_MS = 45000; // 45s for image analysis

/**
 * Diagnose plant health from an image using AgriVision MCP
 * @param {string} imageBase64 - Base64 encoded image (with or without data: prefix)
 * @param {string} crop - Optional crop type hint (e.g., 'maize', 'tomato')
 * @returns {Promise<object>} Diagnosis result
 */
export const diagnosePlantHealth = async (imageBase64, crop = null) => {
  try {
    // Ensure image has proper data URL format
    let imageData = imageBase64;
    if (!imageBase64.startsWith('data:')) {
      imageData = `data:image/jpeg;base64,${imageBase64}`;
    }

    // Build MCP request
    const mcpRequest = {
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name: 'diagnose_plant_health',
        arguments: {
          image: imageData,
          ...(crop && { crop }),
        },
      },
    };

    const response = await fetchWithTimeout(AGRIVISION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify(mcpRequest),
    }, AGRIVISION_TIMEOUT_MS);

    if (!response.ok) {
      throw new Error(`AgriVision error: ${response.status}`);
    }

    // Parse SSE response
    const text = await response.text();
    const lines = text.split('\n');
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6));
        if (data.result?.content?.[0]?.text) {
          try {
            const diagnosis = JSON.parse(data.result.content[0].text);
            return {
              success: true,
              diagnosis,
            };
          } catch {
            // Return as text if not JSON
            return {
              success: true,
              diagnosis: data.result.content[0].text,
            };
          }
        }
        if (data.error) {
          throw new Error(data.error.message || 'Diagnosis failed');
        }
      }
    }

    throw new Error('No diagnosis result received');
  } catch (error) {
    console.error('AgriVision error:', error);
    return {
      success: false,
      error: error.message || 'Failed to analyze image',
    };
  }
};

/**
 * Format diagnosis result for display
 * @param {object} diagnosis - Raw diagnosis from AgriVision
 * @returns {string} Formatted text for chat
 */
export const formatDiagnosis = (diagnosis) => {
  if (typeof diagnosis === 'string') {
    return diagnosis;
  }

  const parts = [];

  // Crop info
  if (diagnosis.crop) {
    parts.push(`🌱 **Crop**: ${diagnosis.crop.name || diagnosis.crop}`);
    if (diagnosis.crop.scientific_name) {
      parts.push(`   _${diagnosis.crop.scientific_name}_`);
    }
  }

  // Health status
  if (diagnosis.health_status) {
    const status = diagnosis.health_status.overall || diagnosis.health_status;
    const emoji = status.toLowerCase().includes('healthy') ? '✅' : '⚠️';
    parts.push(`${emoji} **Status**: ${status}`);
  }

  // Issues
  if (diagnosis.issues && diagnosis.issues.length > 0) {
    parts.push('\n**Issues Detected**:');
    diagnosis.issues.forEach((issue, i) => {
      parts.push(`${i + 1}. **${issue.name || issue}**`);
      if (issue.category) parts.push(`   Category: ${issue.category}`);
      if (issue.severity) parts.push(`   Severity: ${issue.severity}`);
      if (issue.symptoms) {
        parts.push(`   Symptoms: ${issue.symptoms.join(', ')}`);
      }
    });
  }

  // Growth stage
  if (diagnosis.growth_stage) {
    parts.push(`\n📈 **Growth Stage**: ${diagnosis.growth_stage}`);
  }

  return parts.join('\n');
};

export default { diagnosePlantHealth, formatDiagnosis };

