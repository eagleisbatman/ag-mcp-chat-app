/**
 * Tests for API helper utilities
 */

import {
  parseErrorMessage,
  isNetworkError,
  isServerError,
} from '../../utils/apiHelpers';
import { t } from '../../constants/strings';

describe('parseErrorMessage', () => {
  describe('HTTP status codes', () => {
    it('returns user-friendly message for 500 status', () => {
      expect(parseErrorMessage({ status: 500 })).toBe(t('errors.serverError'));
    });

    it('returns user-friendly message for 401 status', () => {
      expect(parseErrorMessage({ status: 401 })).toBe(t('system.errorFallback'));
    });

    it('returns user-friendly message for 403 status', () => {
      expect(parseErrorMessage({ status: 403 })).toBe(t('system.errorFallback'));
    });

    it('returns user-friendly message for 404 status', () => {
      expect(parseErrorMessage({ status: 404 })).toBe(t('system.errorFallback'));
    });

    it('returns user-friendly message for 429 status', () => {
      expect(parseErrorMessage({ status: 429 })).toBe(t('system.errorFallback'));
    });

    it('returns generic message for unknown status codes', () => {
      expect(parseErrorMessage({ status: 418 })).toBe(t('system.errorFallback'));
    });
  });

  describe('Error objects', () => {
    it('handles AbortError', () => {
      const error = new Error('Request aborted');
      error.name = 'AbortError';
      expect(parseErrorMessage(error)).toBe(t('errors.requestTimeout'));
    });

    it('handles TimeoutError', () => {
      const error = new Error('Request timed out');
      error.name = 'TimeoutError';
      expect(parseErrorMessage(error)).toBe(t('errors.requestTimeout'));
    });

    it('handles network-related TypeError', () => {
      const error = new TypeError('Network request failed');
      expect(parseErrorMessage(error)).toBe(t('chat.noInternet'));
    });

    it('handles fetch-related TypeError', () => {
      const error = new TypeError('Failed to fetch');
      expect(parseErrorMessage(error)).toBe(t('chat.noInternet'));
    });

    it('returns generic message for non-network TypeError', () => {
      const error = new TypeError("Cannot read property 'x' of undefined");
      expect(parseErrorMessage(error)).toBe(t('system.errorFallback'));
    });

    it('handles timeout in message', () => {
      const error = new Error('Request timeout');
      expect(parseErrorMessage(error)).toBe(t('errors.requestTimeout'));
    });

    it('handles API error format', () => {
      const error = new Error('API error: 500');
      expect(parseErrorMessage(error)).toBe(t('errors.serverError'));
    });
  });

  describe('Service responses with error field', () => {
    it('returns error message from response', () => {
      expect(parseErrorMessage({ error: 'Custom error message' })).toBe('Custom error message');
    });

    it('sanitizes validation errors', () => {
      expect(parseErrorMessage({ error: 'Validation failed: email required' })).toBe(
        t('system.errorFallback')
      );
    });

    it('sanitizes API errors', () => {
      expect(parseErrorMessage({ error: 'API key invalid' })).toBe(
        t('system.errorFallback')
      );
    });
  });

  describe('Edge cases', () => {
    it('handles null input', () => {
      expect(parseErrorMessage(null)).toBe(t('system.errorFallback'));
    });

    it('handles undefined input', () => {
      expect(parseErrorMessage(undefined)).toBe(t('system.errorFallback'));
    });

    it('handles empty object', () => {
      expect(parseErrorMessage({})).toBe(t('system.errorFallback'));
    });
  });
});

describe('isNetworkError', () => {
  it('returns true for AbortError', () => {
    const error = new Error('Aborted');
    error.name = 'AbortError';
    expect(isNetworkError(error)).toBe(true);
  });

  it('returns true for network request failed', () => {
    const error = new Error('Network request failed');
    expect(isNetworkError(error)).toBe(true);
  });

  it('returns true for failed to fetch', () => {
    const error = new Error('Failed to fetch');
    expect(isNetworkError(error)).toBe(true);
  });

  it('returns true for timeout message', () => {
    const error = new Error('Request timeout');
    expect(isNetworkError(error)).toBe(true);
  });

  it('returns true for network-related TypeError', () => {
    const error = new TypeError('Network error');
    expect(isNetworkError(error)).toBe(true);
  });

  it('returns false for non-network TypeError', () => {
    const error = new TypeError("Cannot read property 'x' of undefined");
    expect(isNetworkError(error)).toBe(false);
  });

  it('returns false for regular Error', () => {
    const error = new Error('Something went wrong');
    expect(isNetworkError(error)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isNetworkError(null)).toBe(false);
  });
});

describe('isServerError', () => {
  it('returns true for 500 status', () => {
    expect(isServerError({ status: 500 })).toBe(true);
  });

  it('returns true for 502 status', () => {
    expect(isServerError({ status: 502 })).toBe(true);
  });

  it('returns true for 503 status', () => {
    expect(isServerError({ status: 503 })).toBe(true);
  });

  it('returns false for 400 status', () => {
    expect(isServerError({ status: 400 })).toBe(false);
  });

  it('returns false for 404 status', () => {
    expect(isServerError({ status: 404 })).toBe(false);
  });

  it('returns true for API error 500 in message', () => {
    const error = new Error('API error: 503');
    expect(isServerError(error)).toBe(true);
  });

  it('returns false for API error 400 in message', () => {
    const error = new Error('API error: 400');
    expect(isServerError(error)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isServerError(null)).toBe(false);
  });
});
