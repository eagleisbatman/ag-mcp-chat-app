// AgriVision MCP Service - Plant disease diagnosis via image analysis
import { fetchWithTimeout } from '../utils/apiHelpers';

// AgriVision URL - should match database seed (agrivision.up.railway.app)
const AGRIVISION_URL = process.env.EXPO_PUBLIC_AGRIVISION_URL || 'https://agrivision.up.railway.app/mcp';
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
        let data;
        try {
          data = JSON.parse(line.slice(6));
        } catch (parseError) {
          console.warn('Failed to parse SSE line:', line.slice(0, 100));
          continue; // Skip malformed lines
        }

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
 * Creates a clean, aesthetic layout using markdown
 * @param {object} diagnosis - Raw diagnosis from AgriVision
 * @returns {string} Formatted text for chat
 */
export const formatDiagnosis = (diagnosis) => {
  if (typeof diagnosis === 'string') {
    return diagnosis;
  }

  const parts = [];

  // ═══════════════════════════════════════
  // SECTION 1: Quick Summary (compact header)
  // ═══════════════════════════════════════
  const cropName = diagnosis.crop?.name || diagnosis.crop || 'Unknown';
  const scientificName = diagnosis.crop?.scientific_name;
  const status = diagnosis.health_status?.overall || diagnosis.health_status || 'Unknown';
  const isHealthy = status.toLowerCase().includes('healthy');
  const statusEmoji = isHealthy ? '✅' : '⚠️';
  const growthStage = diagnosis.growth_stage;

  // Compact header line
  parts.push(`🌱 **${cropName}**${scientificName ? ` · _${scientificName}_` : ''}`);
  parts.push(`${statusEmoji} ${status}${growthStage ? ` · 📈 ${growthStage}` : ''}`);

  // ═══════════════════════════════════════
  // SECTION 2: Issues Detected
  // ═══════════════════════════════════════
  if (diagnosis.issues && diagnosis.issues.length > 0) {
    parts.push('\n---');
    parts.push('**🔍 Issues Found**\n');

    diagnosis.issues.forEach((issue, i) => {
      const issueName = issue.name || issue;
      const severity = issue.severity;
      const category = issue.category;

      // Issue header with severity badge
      const severityBadge = severity ? ` · _${severity}_` : '';
      parts.push(`**${i + 1}. ${issueName}**${severityBadge}`);

      // Compact details on same conceptual "row"
      const details = [];
      if (category) details.push(category);
      if (issue.stage) details.push(`Stage: ${issue.stage}`);
      if (issue.causal_agent) details.push(issue.causal_agent);
      if (details.length > 0) {
        parts.push(`   ${details.join(' · ')}`);
      }

      // Symptoms as inline list
      if (issue.symptoms && issue.symptoms.length > 0) {
        parts.push(`   _Symptoms:_ ${issue.symptoms.join(', ')}`);
      }

      // Affected parts
      if (issue.affected_parts && issue.affected_parts.length > 0) {
        parts.push(`   _Affected:_ ${issue.affected_parts.join(', ')}`);
      }
    });
  }

  // ═══════════════════════════════════════
  // SECTION 3: Treatment Recommendations
  // ═══════════════════════════════════════
  if (diagnosis.treatment_recommendations && diagnosis.treatment_recommendations.length > 0) {
    parts.push('\n---');
    parts.push('**💊 Treatment Options**\n');

    diagnosis.treatment_recommendations.forEach((treatment) => {
      if (treatment.issue_name && diagnosis.treatment_recommendations.length > 1) {
        parts.push(`**For ${treatment.issue_name}:**\n`);
      }

      // Organic options - compact format
      if (treatment.organic_options && treatment.organic_options.length > 0) {
        parts.push('🌿 **Natural**');
        treatment.organic_options.forEach((opt) => {
          const timing = opt.timing ? ` (${opt.timing})` : '';
          const freq = opt.frequency ? ` · ${opt.frequency}` : '';
          parts.push(`• **${opt.name}**${timing}${freq}`);
          if (opt.application) {
            parts.push(`  _${opt.application}_`);
          }
        });
      }

      // Chemical options - compact format
      if (treatment.chemical_options && treatment.chemical_options.length > 0) {
        parts.push('\n🧪 **Chemical**');
        treatment.chemical_options.forEach((opt) => {
          const dosage = opt.dosage ? ` · ${opt.dosage}` : '';
          parts.push(`• **${opt.active_ingredient}**${dosage}`);
          if (opt.application) {
            parts.push(`  _${opt.application}_`);
          }
          if (opt.safety_notes) {
            parts.push(`  ⚠️ ${opt.safety_notes}`);
          }
        });
      }

      // Preventive measures - bullet list
      if (treatment.preventive_measures && treatment.preventive_measures.length > 0) {
        parts.push('\n🛡️ **Prevention**');
        treatment.preventive_measures.forEach((measure) => {
          parts.push(`• ${measure}`);
        });
      }
    });
  }

  // ═══════════════════════════════════════
  // SECTION 4: Additional Notes
  // ═══════════════════════════════════════
  const hasNotes = diagnosis.general_recommendations || diagnosis.diagnostic_notes;
  if (hasNotes) {
    parts.push('\n---');
  }

  if (diagnosis.general_recommendations) {
    parts.push(`📋 ${diagnosis.general_recommendations}`);
  }

  if (diagnosis.diagnostic_notes) {
    parts.push(`🔬 _${diagnosis.diagnostic_notes}_`);
  }

  // Lab test recommendation
  if (diagnosis.requires_lab_test) {
    parts.push('\n🧫 _Laboratory testing recommended for confirmation_');
  }

  return parts.join('\n');
};

export default { diagnosePlantHealth, formatDiagnosis };

