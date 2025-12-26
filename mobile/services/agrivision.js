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
 * Creates a minimalist markdown representation of the aggregation data
 * @param {object} diagnosis - Raw diagnosis from AgriVision
 * @returns {string} Formatted markdown
 */
export const formatDiagnosis = (diagnosis) => {
  if (typeof diagnosis === 'string') {
    try {
      diagnosis = JSON.parse(diagnosis);
    } catch (e) {
      return diagnosis;
    }
  }

  if (!diagnosis || typeof diagnosis !== 'object') {
    return String(diagnosis || 'Unable to analyze image');
  }

  // Handle specialized error states (Network/Timeout)
  if (diagnosis.isNetworkError) return `📡 **Connection Error**\n\n${diagnosis.diagnostic_notes || 'Please check your internet and try again.'}`;
  if (diagnosis.isTimeout) return `⏳ **Analysis Timed Out**\n\n${diagnosis.diagnostic_notes || 'The service is taking too long. Please try a clearer photo.'}`;

  const parts = [];

  // 1. Primary Identification & Status
  const cropRaw = diagnosis.crop?.name || diagnosis.crop;
  const cropName = (cropRaw && cropRaw.toLowerCase() !== 'unknown') ? cropRaw : null;
  const status = diagnosis.health_status?.overall || diagnosis.health_status || 'Analyzed';
  const isHealthy = status.toLowerCase().includes('healthy');
  const statusEmoji = isHealthy ? '✅' : '⚠️';

  if (cropName) {
    parts.push(`🌱 **${cropName}** · ${statusEmoji} **${status}**`);
  } else {
    parts.push(`${statusEmoji} **${status}**`);
  }

  // 2. Issues & Symptoms (Clean list)
  if (diagnosis.issues && diagnosis.issues.length > 0) {
    diagnosis.issues.forEach((issue) => {
      const issueName = issue.name || issue;
      const severity = issue.severity ? ` (${issue.severity})` : '';
      parts.push(`\n**${issueName}${severity}**`);
      
      if (issue.symptoms?.length > 0) {
        parts.push(`_${issue.symptoms.join(', ')}_`);
      }
    });
  }

  // 3. Simple Recommendations
  if (diagnosis.treatment_recommendations && diagnosis.treatment_recommendations.length > 0) {
    parts.push('\n---');
    diagnosis.treatment_recommendations.forEach((treatment) => {
      if (treatment.organic_options?.length > 0) {
        parts.push(`🌿 **Organic**: ${treatment.organic_options.map(o => o.name).join(', ')}`);
      }
      if (treatment.chemical_options?.length > 0) {
        parts.push(`🧪 **Chemical**: ${treatment.chemical_options.map(o => o.active_ingredient).join(', ')}`);
      }
    });
  }

  // 4. Expert Notes (if any)
  const notes = diagnosis.diagnostic_notes || diagnosis.general_recommendations;
  if (notes && !isHealthy) {
    parts.push(`\n📝 ${notes}`);
  }

  return parts.join('\n');
};

export default { diagnosePlantHealth, formatDiagnosis };

