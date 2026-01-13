/**
 * API Helper utilities - standardized error handling, retry logic, etc.
 */

import type { ApiResponse } from '../types';

// Standard error messages for common HTTP status codes
// These are user-friendly and never expose technical details
const HTTP_ERROR_MESSAGES: Record<number, string> = {
  400: 'Something went wrong. Please try again.',
  401: 'Please restart the app to reconnect.',
  403: 'Access denied. Please try again later.',
  404: 'Service not available. Please try again.',
  408: 'Request took too long. Check your connection.',
  429: 'Too many requests. Please wait a moment.',
  500: 'Our servers are busy. Please try again.',
  502: 'Service temporarily unavailable. Please try again.',
  503: 'Service is busy. Please try again shortly.',
};

// Known error type messages (NOT including TypeError - it's too broad)
const ERROR_TYPE_MESSAGES: Record<string, string> = {
  AbortError: 'Request was cancelled.',
  TimeoutError: 'Request timed out.',
};

interface ErrorWithStatus {
  status?: number;
  error?: string;
  response?: { status?: number };
  message?: string;
  name?: string;
}

/**
 * Parse error from various sources into a user-friendly message
 * Never returns raw technical errors - always user-friendly
 * @param error - Error from fetch or service
 * @returns User-friendly error message
 */
export function parseErrorMessage(error: ErrorWithStatus | Error | unknown): string {
  const err = error as ErrorWithStatus;

  // HTTP Response object with status
  if (err?.status) {
    return HTTP_ERROR_MESSAGES[err.status] || 'Something went wrong. Please try again.';
  }

  // Standard Error object
  if (error instanceof Error) {
    const msg = error.message?.toLowerCase() || '';

    // Check for known error types (AbortError, TimeoutError)
    if (error.name in ERROR_TYPE_MESSAGES) {
      return ERROR_TYPE_MESSAGES[error.name];
    }

    // TypeError needs message inspection - not all TypeErrors are network errors
    if (error.name === 'TypeError') {
      // Only show network message if it's actually a network error
      if (msg.includes('network') || msg.includes('fetch')) {
        return 'Network error. Check your internet connection.';
      }
      // Other TypeErrors are likely coding issues - show generic message
      return 'Something went wrong. Please try again.';
    }

    // If message is a JSON string (sometimes happens with API errors), try to parse it
    if (error.message?.includes('{')) {
      try {
        const parsed = JSON.parse(error.message.substring(error.message.indexOf('{')));
        if (parsed.error?.message) return parsed.error.message;
        if (parsed.message) return parsed.message;
      } catch {
        // Fallback to standard check
      }
    }

    // Network/fetch errors (explicit message patterns)
    if (msg.includes('network request failed') || msg.includes('failed to fetch')) {
      return 'Network error. Check your internet connection.';
    }
    if (msg.includes('timeout') || msg.includes('aborted')) {
      return 'Request took too long. Check your connection.';
    }

    // Handle "API error: XXX" format from our API calls
    const statusMatch = error.message?.match(/API error:\s*(\d+)/i);
    if (statusMatch) {
      const status = parseInt(statusMatch[1], 10);
      return HTTP_ERROR_MESSAGES[status] || 'Something went wrong. Please try again.';
    }

    // Never return raw error messages to user
    return 'Something went wrong. Please try again.';
  }

  // Service response with error field - also sanitize
  if (err?.error) {
    // Don't expose validation errors or technical details
    if (err.error.includes('Validation') || err.error.includes('API')) {
      return 'Something went wrong. Please try again.';
    }
    return err.error;
  }

  // Fallback
  return 'Something went wrong. Please try again.';
}

/**
 * Fetch with timeout support
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param timeout - Timeout in ms (default 30s)
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = 30000
): Promise<Response> {
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

interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  timeout?: number;
}

interface ErrorWithStatusCode extends Error {
  status?: number;
}

/**
 * Fetch with retry logic (exponential backoff)
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param config - Retry configuration
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  { maxRetries = 2, baseDelay = 1000, timeout = 30000 }: RetryConfig = {}
): Promise<Response> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options, timeout);

      // Don't retry client errors (4xx), only server errors (5xx)
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // Server error - will retry
      const error = new Error(`HTTP ${response.status}`) as ErrorWithStatusCode;
      error.status = response.status;
      lastError = error;
    } catch (error) {
      lastError = error as Error;

      // Don't retry abort errors
      if ((error as Error).name === 'AbortError') {
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

interface SafeApiCallOptions {
  logError?: boolean;
}

/**
 * Standard API call wrapper with error handling
 * @param apiCall - Async function that makes the API call
 * @param options - Options for error handling
 * @returns { success: true, data } or { success: false, error }
 */
export async function safeApiCall<T>(
  apiCall: () => Promise<T>,
  { logError = true }: SafeApiCallOptions = {}
): Promise<ApiResponse<T>> {
  try {
    const result = await apiCall();
    return { success: true, data: result };
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
 * Must be specific to avoid false positives from coding errors (TypeErrors)
 */
export function isNetworkError(error: Error | unknown): boolean {
  if (!error) return false;
  
  const err = error as Error;
  const msg = err.message?.toLowerCase() || '';

  // AbortError is definitely a cancellation/timeout
  if (err.name === 'AbortError') return true;

  // Check for specific network-related error messages
  // These are the actual messages from fetch/XHR when network fails
  const networkErrorPatterns = [
    'network request failed',  // React Native fetch network error
    'failed to fetch',         // Browser fetch network error
    'networkerror',            // Generic network error
    'net::err_',               // Chrome network errors
    'network error',           // Generic
    'no internet',             // Custom
    'offline',                 // Custom
  ];

  for (const pattern of networkErrorPatterns) {
    if (msg.includes(pattern)) return true;
  }

  // TypeError alone is NOT enough - it must have network-related message
  // This prevents false positives from coding errors like "Cannot read property of undefined"
  if (err.name === 'TypeError') {
    // Only treat TypeError as network error if message indicates network issue
    return msg.includes('network') || msg.includes('fetch');
  }

  // Timeout messages
  if (msg.includes('timeout') || msg.includes('aborted')) return true;

  return false;
}

/**
 * Check if an error is a server error (5xx)
 */
export function isServerError(error: ErrorWithStatus | Error | unknown): boolean {
  if (!error) return false;
  
  const err = error as ErrorWithStatus;
  
  // Check error.status directly (from our custom errors)
  const status = err?.status || err?.response?.status;
  if (status && status >= 500 && status < 600) return true;
  
  // Check error message for HTTP status codes
  const msg = err?.message || '';
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
