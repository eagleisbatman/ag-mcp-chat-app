/**
 * Fetch with timeout support
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

      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      const error = new Error(`HTTP ${response.status}`) as ErrorWithStatusCode;
      error.status = response.status;
      lastError = error;
    } catch (error) {
      lastError = error as Error;
      if ((error as Error).name === 'AbortError') {
        throw error;
      }
    }

    if (attempt < maxRetries) {
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
