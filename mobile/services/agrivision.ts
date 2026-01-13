// AgriVision MCP Service - Plant disease diagnosis via image analysis
import { log, error as logError } from '../utils/logger';

// AgriVision URL - should match database seed (agrivision.up.railway.app)
const AGRIVISION_URL = process.env.EXPO_PUBLIC_AGRIVISION_URL || 'https://agrivision.up.railway.app/mcp';
const AGRIVISION_TIMEOUT_MS = 45000; // 45s for image analysis

// Type definitions
export interface DiagnosisIssue {
  name?: string;
  severity?: string;
  symptoms?: string[];
}

export interface TreatmentOption {
  name?: string;
  active_ingredient?: string;
}

export interface TreatmentRecommendation {
  organic_options?: TreatmentOption[];
  chemical_options?: TreatmentOption[];
}

export interface DiagnosisData {
  crop?: { name?: string } | string;
  health_status?: { overall?: string } | string;
  issues?: DiagnosisIssue[];
  treatment_recommendations?: TreatmentRecommendation[];
  diagnostic_notes?: string;
  general_recommendations?: string;
  isNetworkError?: boolean;
  isTimeout?: boolean;
}

export interface DiagnosisResult {
  success: boolean;
  diagnosis?: DiagnosisData | string;
  error?: string;
}

/**
 * Read SSE stream completely using fetch + ReadableStream or XHR fallback
 * The MCP server sends SSE responses that need to be fully consumed
 */
const fetchSSEResponse = async (url: string, body: string, timeout: number): Promise<string> => {
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
      log('[SSE] Using ReadableStream');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
        log('[SSE] Chunk received, total length:', fullText.length);
      }

      log('[SSE] Stream complete, total length:', fullText.length);
      return fullText;
    }

    // Fallback: use response.text() and hope it waits for completion
    log('[SSE] Using response.text() fallback');
    const text = await response.text();
    log('[SSE] Text response length:', text.length);
    return text;

  } finally {
    clearTimeout(timeoutId);
  }
};

/**
 * XHR-based SSE reader with progress monitoring
 * Waits for the complete response by checking for SSE message terminator
 */
const fetchWithXHR = (url: string, body: string, timeout: number): Promise<string> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let resolved = false;

    xhr.open('POST', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Accept', 'text/event-stream');
    xhr.timeout = timeout;

    // Check for complete SSE message periodically
    const checkForComplete = (): void => {
      if (resolved) return;

      const text = xhr.responseText || '';
      // SSE messages end with \n\n, and we expect JSON with closing braces
      // Look for the pattern that indicates a complete response
      if (text.includes('"}\n\n') || text.includes('"}}\n\n')) {
        log('[XHR] Complete SSE message detected, length:', text.length);
        resolved = true;
        xhr.abort();
        resolve(text);
      }
    };

    // Monitor progress
    xhr.onprogress = (): void => {
      log('[XHR] Progress, current length:', xhr.responseText?.length || 0);
      checkForComplete();
    };

    xhr.onreadystatechange = (): void => {
      if (xhr.readyState === 3) {
        checkForComplete();
      } else if (xhr.readyState === 4 && !resolved) {
        // Request finished
        log('[XHR] Finished, length:', xhr.responseText?.length || 0);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(xhr.responseText || '');
        } else if (xhr.status !== 0) {
          reject(new Error(`HTTP ${xhr.status}`));
        }
      }
    };

    xhr.onerror = (): void => {
      if (!resolved) reject(new Error('Network request failed'));
    };

    xhr.ontimeout = (): void => {
      if (!resolved) reject(new Error('Request timeout'));
    };

    xhr.send(body);
  });
};

/**
 * Diagnose plant health from an image using AgriVision MCP
 * @param imageBase64 - Base64 encoded image (with or without data: prefix)
 * @param crop - Optional crop type hint (e.g., 'maize', 'tomato')
 * @returns Promise with diagnosis result
 */
export const diagnosePlantHealth = async (
  imageBase64: string,
  crop: string | null = null
): Promise<DiagnosisResult> => {
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
    log('[diagnosePlantHealth] Sending request, body length:', body.length);

    // Try multiple approaches to get the SSE response
    let text: string;
    try {
      // First try fetch with ReadableStream
      text = await fetchSSEResponse(AGRIVISION_URL, body, AGRIVISION_TIMEOUT_MS);
    } catch (e) {
      const err = e as Error;
      log('[diagnosePlantHealth] fetchSSEResponse failed:', err.message, '- trying XHR');
      // Fallback to XHR with progress monitoring
      text = await fetchWithXHR(AGRIVISION_URL, body, AGRIVISION_TIMEOUT_MS);
    }

    log('[diagnosePlantHealth] Raw response length:', text.length);
    log('[diagnosePlantHealth] Raw response first 300 chars:', text.substring(0, 300));

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

    log('[diagnosePlantHealth] JSON data length after SSE strip:', jsonData.length);

    // Parse the JSON-RPC response
    let parsed: { error?: { message?: string }; result?: { content?: Array<{ text?: string }> } };
    try {
      parsed = JSON.parse(jsonData);
      log('[diagnosePlantHealth] JSON-RPC parsed successfully');
    } catch (e) {
      const err = e as Error;
      logError('[diagnosePlantHealth] JSON-RPC parse failed:', err.message);
      log('[diagnosePlantHealth] Trying to find JSON object in response...');

      // Try to extract JSON object from anywhere in the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          parsed = JSON.parse(jsonMatch[0]);
          log('[diagnosePlantHealth] Extracted and parsed JSON object');
        } catch (e2) {
          logError('[diagnosePlantHealth] Extracted JSON parse also failed');
          throw new Error('Could not parse response: ' + err.message);
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
      logError('[diagnosePlantHealth] No diagnosis text in response:', JSON.stringify(parsed).substring(0, 200));
      throw new Error('No diagnosis result in response');
    }

    log('[diagnosePlantHealth] Diagnosis text length:', diagnosisText.length);
    log('[diagnosePlantHealth] Diagnosis text preview:', diagnosisText.substring(0, 150));

    // The diagnosis text is JSON - parse it
    try {
      const diagnosis = JSON.parse(diagnosisText) as DiagnosisData;
      log('[diagnosePlantHealth] Diagnosis parsed, keys:', Object.keys(diagnosis));
      return {
        success: true,
        diagnosis,
      };
    } catch (e) {
      const err = e as Error;
      log('[diagnosePlantHealth] Diagnosis JSON parse failed:', err.message);
      // Return as text - formatDiagnosis will handle display
      return {
        success: true,
        diagnosis: diagnosisText,
      };
    }
  } catch (error) {
    const err = error as Error;
    logError('AgriVision error:', err);
    return {
      success: false,
      error: err.message || 'Failed to analyze image',
    };
  }
};

/**
 * Format diagnosis result for display
 * Creates a minimalist markdown representation of the aggregation data
 * @param diagnosis - Raw diagnosis from AgriVision
 * @returns Formatted markdown
 */
export const formatDiagnosis = (diagnosis: DiagnosisData | string | null | undefined): string => {
  if (typeof diagnosis === 'string') {
    try {
      diagnosis = JSON.parse(diagnosis) as DiagnosisData;
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

  const parts: string[] = [];

  // 1. Primary Identification & Status
  const cropRaw = typeof diagnosis.crop === 'object' ? diagnosis.crop?.name : diagnosis.crop;
  const cropName = (cropRaw && cropRaw.toLowerCase() !== 'unknown') ? cropRaw : null;
  const status = (typeof diagnosis.health_status === 'object' ? diagnosis.health_status?.overall : diagnosis.health_status) || 'Analyzed';
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
      const issueName = issue.name || (issue as unknown as string);
      const severity = issue.severity ? ` (${issue.severity})` : '';
      parts.push(`\n**${issueName}${severity}**`);
      
      if (issue.symptoms?.length && issue.symptoms.length > 0) {
        parts.push(`_${issue.symptoms.join(', ')}_`);
      }
    });
  }

  // 3. Simple Recommendations
  if (diagnosis.treatment_recommendations && diagnosis.treatment_recommendations.length > 0) {
    parts.push('\n---');
    diagnosis.treatment_recommendations.forEach((treatment) => {
      if (treatment.organic_options?.length && treatment.organic_options.length > 0) {
        parts.push(`🌿 **Organic**: ${treatment.organic_options.map(o => o.name).join(', ')}`);
      }
      if (treatment.chemical_options?.length && treatment.chemical_options.length > 0) {
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
