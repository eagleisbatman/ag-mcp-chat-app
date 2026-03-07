/**
 * useStreamBuffer - Buffers streaming chunks and flushes to state at intervals.
 * Reduces React re-renders from per-chunk (~every few ms) to ~60ms intervals.
 */
import { useRef, useCallback, useEffect } from 'react';

interface UseStreamBufferOptions {
  flushIntervalMs?: number;
  onFlush: (text: string) => void;
}

interface UseStreamBufferReturn {
  /** Append a chunk to the buffer (does NOT trigger a re-render) */
  appendChunk: (chunk: string) => void;
  /** Immediately flush buffered text to onFlush callback */
  flush: () => void;
  /** Get current accumulated text (from ref, no re-render) */
  getText: () => string;
  /** Reset buffer for a new message */
  reset: () => void;
}

export function useStreamBuffer({
  flushIntervalMs = 60,
  onFlush,
}: UseStreamBufferOptions): UseStreamBufferReturn {
  const textRef = useRef('');
  const dirtyRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onFlushRef = useRef(onFlush);
  onFlushRef.current = onFlush;

  const flush = useCallback(() => {
    if (dirtyRef.current) {
      dirtyRef.current = false;
      onFlushRef.current(textRef.current);
    }
  }, []);

  const startInterval = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(flush, flushIntervalMs);
  }, [flush, flushIntervalMs]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const appendChunk = useCallback((chunk: string) => {
    textRef.current += chunk;
    dirtyRef.current = true;
    startInterval();
  }, [startInterval]);

  const reset = useCallback(() => {
    textRef.current = '';
    dirtyRef.current = false;
    stopInterval();
  }, [stopInterval]);

  const getText = useCallback(() => textRef.current, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => stopInterval();
  }, [stopInterval]);

  return { appendChunk, flush, getText, reset };
}
