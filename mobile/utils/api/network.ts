interface ErrorWithStatus {
  status?: number;
  response?: { status?: number };
  message?: string;
  name?: string;
}

/**
 * Check if an error is a network/connectivity error
 * Must be specific to avoid false positives from coding errors (TypeErrors)
 */
export function isNetworkError(error: Error | unknown): boolean {
  if (!error) return false;

  const err = error as Error;
  const msg = err.message?.toLowerCase() || '';

  if (err.name === 'AbortError') return true;

  const networkErrorPatterns = [
    'network request failed',
    'failed to fetch',
    'networkerror',
    'net::err_',
    'network error',
    'no internet',
    'offline',
  ];

  for (const pattern of networkErrorPatterns) {
    if (msg.includes(pattern)) return true;
  }

  if (err.name === 'TypeError') {
    return msg.includes('network') || msg.includes('fetch');
  }

  if (msg.includes('timeout') || msg.includes('aborted')) return true;

  return false;
}

/**
 * Check if an error is a server error (5xx)
 */
export function isServerError(error: ErrorWithStatus | Error | unknown): boolean {
  if (!error) return false;

  const err = error as ErrorWithStatus;
  const status = err?.status || err?.response?.status;
  if (status && status >= 500 && status < 600) return true;

  const msg = err?.message || '';
  const match = msg.match(/API error:\s*(\d+)/);
  if (match) {
    const code = parseInt(match[1], 10);
    return code >= 500 && code < 600;
  }
  return false;
}
