/**
 * API Helper utilities - standardized error handling, retry logic, etc.
 */

// Standard error messages for common HTTP status codes
const HTTP_ERROR_MESSAGES = {
  400: 'Invalid request. Please try again.',
  401: 'Authentication failed. Please restart the app.',
  403: 'Access denied.',
  404: 'Service not found.',
  408: 'Request timed out. Check your connection.',
  429: 'Too many requests. Please wait a moment.',
  500: 'Server error. Please try again later.',
  502: 'Service temporarily unavailable.',
  503: 'Service is busy. Please try again.',
};

// Network error messages
const NETWORK_ERROR_MESSAGES = {
  TypeError: 'Network error. Check your internet connection.',
  AbortError: 'Request was cancelled.',
  TimeoutError: 'Request timed out.',
};

/**
 * Parse error from various sources into a user-friendly message
 * @param {Error|Response|object} error - Error from fetch or service
 * @returns {string} User-friendly error message
 */
export function parseErrorMessage(error) {
  // HTTP Response object
  if (error?.status) {
    return HTTP_ERROR_MESSAGES[error.status] || `Error ${error.status}`;
  }

  // Standard Error object
  if (error instanceof Error) {
    // Check for known error types
    if (error.name in NETWORK_ERROR_MESSAGES) {
      return NETWORK_ERROR_MESSAGES[error.name];
    }
    // Network/fetch errors
    if (error.message?.includes('Network request failed')) {
      return 'Network error. Check your internet connection.';
    }
    if (error.message?.includes('timeout')) {
      return 'Request timed out. Check your connection.';
    }
    return error.message || 'An unexpected error occurred';
  }

  // Service response with error field
  if (error?.error) {
    return error.error;
  }

  // Fallback
  return 'Something went wrong. Please try again.';
}

/**
 * Fetch with timeout support
 * @param {string} url - URL to fetch
 * @param {RequestInit} options - Fetch options
 * @param {number} timeout - Timeout in ms (default 30s)
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Fetch with retry logic (exponential backoff)
 * @param {string} url - URL to fetch
 * @param {RequestInit} options - Fetch options
 * @param {object} config - Retry configuration
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(
  url, 
  options = {}, 
  { maxRetries = 2, baseDelay = 1000, timeout = 30000 } = {}
) {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);
      
      // Don't retry client errors (4xx), only server errors (5xx)
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }
      
      // Server error - will retry
      lastError = new Error(`HTTP ${response.status}`);
      lastError.status = response.status;
    } catch (error) {
      lastError = error;
      
      // Don't retry abort errors
      if (error.name === 'AbortError') {
        throw error;
      }
    }

    // Wait before retrying (exponential backoff)
    if (attempt < maxRetries) {
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Standard API call wrapper with error handling
 * @param {function} apiCall - Async function that makes the API call
 * @param {object} options - Options for error handling
 * @returns {Promise<object>} - { success: true, data } or { success: false, error }
 */
export async function safeApiCall(apiCall, { logError = true } = {}) {
  try {
    const result = await apiCall();
    return result;
  } catch (error) {
    if (logError) {
      console.error('API call failed:', error);
    }
    return {
      success: false,
      error: parseErrorMessage(error),
    };
  }
}

/**
 * Check if an error is a network/connectivity error
 * @param {Error} error
 * @returns {boolean}
 */
export function isNetworkError(error) {
  if (!error) return false;
  const msg = error.message?.toLowerCase() || '';
  return (
    error.name === 'TypeError' ||
    error.name === 'AbortError' ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('aborted') ||
    msg.includes('failed to fetch')
  );
}

/**
 * Check if an error is a server error (5xx)
 * @param {Error|object} error
 * @returns {boolean}
 */
export function isServerError(error) {
  if (!error) return false;
  // Check error.status directly (from our custom errors)
  const status = error?.status || error?.response?.status;
  if (status >= 500 && status < 600) return true;
  // Check error message for HTTP status codes
  const msg = error.message || '';
  const match = msg.match(/API error:\s*(\d+)/);
  if (match) {
    const code = parseInt(match[1], 10);
    return code >= 500 && code < 600;
  }
  return false;
}

export default {
  parseErrorMessage,
  fetchWithTimeout,
  fetchWithRetry,
  safeApiCall,
  isNetworkError,
  isServerError,
};

