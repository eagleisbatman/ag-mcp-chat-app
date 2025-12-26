// AgriVision MCP Service - Plant disease diagnosis via image analysis

// AgriVision URL - should match database seed (agrivision.up.railway.app)
const AGRIVISION_URL = process.env.EXPO_PUBLIC_AGRIVISION_URL || 'https://agrivision.up.railway.app/mcp';
const AGRIVISION_TIMEOUT_MS = 45000; // 45s for image analysis

/**
 * Read SSE stream completely using fetch + ReadableStream or XHR fallback
 * The MCP server sends SSE responses that need to be fully consumed
 */
const fetchSSEResponse = async (url, body, timeout) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // Try to use ReadableStream if available (React Native 0.71+)
    if (response.body && typeof response.body.getReader === 'function') {
      console.log('[SSE] Using ReadableStream');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        console.log('[SSE] Chunk received, total length:', fullText.length);
      }

      console.log('[SSE] Stream complete, total length:', fullText.length);
      return fullText;
    }

    // Fallback: use response.text() and hope it waits for completion
    console.log('[SSE] Using response.text() fallback');
    const text = await response.text();
    console.log('[SSE] Text response length:', text.length);
    return text;

  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * XHR-based SSE reader with progress monitoring
 * Waits for the complete response by checking for SSE message terminator
 */
const fetchWithXHR = (url, body, timeout) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let resolved = false;

    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'text/event-stream');
    xhr.timeout = timeout;

    // Check for complete SSE message periodically
    const checkForComplete = () => {
      if (resolved) return;

      const text = xhr.responseText || '';
      // SSE messages end with \n\n, and we expect JSON with closing braces
      // Look for the pattern that indicates a complete response
      if (text.includes('"}\n\n') || text.includes('"}}\n\n')) {
        console.log('[XHR] Complete SSE message detected, length:', text.length);
        resolved = true;
        xhr.abort();
        resolve(text);
      }
    };

    // Monitor progress
    xhr.onprogress = () => {
      console.log('[XHR] Progress, current length:', xhr.responseText?.length || 0);
      checkForComplete();
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState === 3) {
        checkForComplete();
      } else if (xhr.readyState === 4 && !resolved) {
        // Request finished
        console.log('[XHR] Finished, length:', xhr.responseText?.length || 0);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.responseText || '');
        } else if (xhr.status !== 0) {
          reject(new Error(`HTTP ${xhr.status}`));
        }
      }
    };

    xhr.onerror = () => {
      if (!resolved) reject(new Error('Network request failed'));
    };

    xhr.ontimeout = () => {
      if (!resolved) reject(new Error('Request timeout'));
    };

    xhr.send(body);
  });
};

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

    const body = JSON.stringify(mcpRequest);
    console.log('[diagnosePlantHealth] Sending request, body length:', body.length);

    // Try multiple approaches to get the SSE response
    let text;
    try {
      // First try fetch with ReadableStream
      text = await fetchSSEResponse(AGRIVISION_URL, body, AGRIVISION_TIMEOUT_MS);
    } catch (e) {
      console.log('[diagnosePlantHealth] fetchSSEResponse failed:', e.message, '- trying XHR');
      // Fallback to XHR with progress monitoring
      text = await fetchWithXHR(AGRIVISION_URL, body, AGRIVISION_TIMEOUT_MS);
    }

    console.log('[diagnosePlantHealth] Raw response length:', text.length);
    console.log('[diagnosePlantHealth] Raw response first 300 chars:', text.substring(0, 300));

    // Extract JSON-RPC response from SSE format
    // Format: "event: message\ndata: {json}\n\n"
    let jsonData = text;

    // Remove event line if present
    if (text.startsWith('event:')) {
      const dataIndex = text.indexOf('\ndata: ');
      if (dataIndex !== -1) {
        jsonData = text.slice(dataIndex + 7); // Skip "\ndata: "
      }
    } else if (text.startsWith('data: ')) {
      jsonData = text.slice(6);
    }

    // Remove trailing newlines
    jsonData = jsonData.replace(/\n+$/, '');

    console.log('[diagnosePlantHealth] JSON data length after SSE strip:', jsonData.length);

    // Parse the JSON-RPC response
    let parsed;
    try {
      parsed = JSON.parse(jsonData);
      console.log('[diagnosePlantHealth] JSON-RPC parsed successfully');
    } catch (e) {
      console.error('[diagnosePlantHealth] JSON-RPC parse failed:', e.message);
      console.log('[diagnosePlantHealth] Trying to find JSON object in response...');

      // Try to extract JSON object from anywhere in the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
          console.log('[diagnosePlantHealth] Extracted and parsed JSON object');
        } catch (e2) {
          console.error('[diagnosePlantHealth] Extracted JSON parse also failed');
          throw new Error('Could not parse response: ' + e.message);
        }
      } else {
        throw new Error('No JSON found in response');
      }
    }

    // Check for JSON-RPC error
    if (parsed.error) {
      throw new Error(parsed.error.message || 'Diagnosis failed');
    }

    // Extract diagnosis text from JSON-RPC result
    const diagnosisText = parsed.result?.content?.[0]?.text;
    if (!diagnosisText) {
      console.error('[diagnosePlantHealth] No diagnosis text in response:', JSON.stringify(parsed).substring(0, 200));
      throw new Error('No diagnosis result in response');
    }

    console.log('[diagnosePlantHealth] Diagnosis text length:', diagnosisText.length);
    console.log('[diagnosePlantHealth] Diagnosis text preview:', diagnosisText.substring(0, 150));

    // The diagnosis text is JSON - parse it
    try {
      const diagnosis = JSON.parse(diagnosisText);
      console.log('[diagnosePlantHealth] Diagnosis parsed, keys:', Object.keys(diagnosis));
      return {
        success: true,
        diagnosis,
      };
    } catch (e) {
      console.log('[diagnosePlantHealth] Diagnosis JSON parse failed:', e.message);
      // Return as text - formatDiagnosis will handle display
      return {
        success: true,
        diagnosis: diagnosisText,
      };
    }
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
 * @param {object} diagnosis - Raw diagnosis from AgriVision (object or JSON string)
 * @returns {string} Formatted text for chat
 */
export const formatDiagnosis = (diagnosis) => {
  // Handle string input - try to parse as JSON
  if (typeof diagnosis === 'string') {
    try {
      diagnosis = JSON.parse(diagnosis);
    } catch (e1) {
      // JSON might have actual newlines - try to fix them
      try {
        const fixedJson = diagnosis
          .replace(/\r\n/g, '\\n')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\n')
          .replace(/\t/g, '\\t');
        diagnosis = JSON.parse(fixedJson);
      } catch (e2) {
        // Last resort - return raw string
        console.warn('[formatDiagnosis] Could not parse diagnosis string');
        return diagnosis;
      }
    }
  }

  // Safety check - if still not an object, return as string
  if (!diagnosis || typeof diagnosis !== 'object') {
    return String(diagnosis || 'Unable to analyze image');
  }

  // Check for guardrails failure or error stubs
  // If the image was rejected or we have an error stub, we don't want to show 
  // a confusing "Diagnosis Card" with "Unknown Crop" and "Critical Health". 
  // The chat bubble (friendly_response) already explains the situation.
  if (
    diagnosis._meta?.guardrails?.passed === false || 
    diagnosis._error || 
    (diagnosis.friendly_response && (!diagnosis.issues || diagnosis.issues.length === 0) && (diagnosis.crop === 'Unknown' || !diagnosis.crop))
  ) {
    return null;
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
    parts.push(`📋 **General Advice**\n${diagnosis.general_recommendations}`);
  }

  if (diagnosis.diagnostic_notes) {
    parts.push(`🔬 **Expert Analysis**\n${diagnosis.diagnostic_notes}`);
  }

  // Lab test recommendation
  if (diagnosis.requires_lab_test) {
    parts.push('\n🧫 _Laboratory testing recommended for confirmation_');
  }

  // Add guardrails info if available
  if (diagnosis._meta?.guardrails) {
    const gr = diagnosis._meta.guardrails;
    if (gr.imageQualityFromGuardrails && gr.imageQualityFromGuardrails !== 'good') {
      parts.push(`\n📷 _Note: Image quality was rated as ${gr.imageQualityFromGuardrails}_`);
    }
  }

  return parts.join('\n');
};

export default { diagnosePlantHealth, formatDiagnosis };

