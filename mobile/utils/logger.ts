/**
 * Logger utility - conditional logging based on environment
 * In production builds, debug logs are suppressed
 */

declare const __DEV__: boolean;

const isDev = __DEV__;

/**
 * Log debug messages (only in development)
 */
export const log = (...args: unknown[]): void => {
  if (isDev) {
    console.log(...args);
  }
};

/**
 * Log warning messages (only in development)
 */
export const warn = (...args: unknown[]): void => {
  if (isDev) {
    console.warn(...args);
  }
};

/**
 * Log error messages (always, even in production)
 * Errors should always be logged for debugging critical issues
 */
export const error = (...args: unknown[]): void => {
  console.error(...args);
};

/**
 * Log debug messages with a specific tag (only in development)
 * @param tag - Log tag/category
 */
export const logTagged = (tag: string, ...args: unknown[]): void => {
  if (isDev) {
    console.log(`[${tag}]`, ...args);
  }
};

export default {
  log,
  warn,
  error,
  logTagged,
};
