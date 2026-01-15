import { getGenericErrorMessage, getHttpErrorMessage, getNetworkErrorMessage, getTimeoutErrorMessage } from './errorMessages';

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
 */
export function parseErrorMessage(error: ErrorWithStatus | Error | unknown): string {
  const err = error as ErrorWithStatus;

  if (err?.status) {
    return getHttpErrorMessage(err.status);
  }

  if (error instanceof Error) {
    const msg = error.message?.toLowerCase() || '';

    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      return getTimeoutErrorMessage();
    }

    if (error.name === 'TypeError') {
      if (msg.includes('network') || msg.includes('fetch')) {
        return getNetworkErrorMessage();
      }
      return getGenericErrorMessage();
    }

    if (msg.includes('network request failed') || msg.includes('failed to fetch')) {
      return getNetworkErrorMessage();
    }
    if (msg.includes('timeout') || msg.includes('aborted')) {
      return getTimeoutErrorMessage();
    }

    const statusMatch = error.message?.match(/API error:\s*(\d+)/i);
    if (statusMatch) {
      const status = parseInt(statusMatch[1], 10);
      return getHttpErrorMessage(status);
    }

    return getGenericErrorMessage();
  }

  if (err?.error) {
    if (err.error.includes('Validation') || err.error.includes('API')) {
      return getGenericErrorMessage();
    }
    return err.error;
  }

  return getGenericErrorMessage();
}
