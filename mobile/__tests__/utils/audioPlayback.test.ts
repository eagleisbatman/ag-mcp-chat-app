/**
 * Tests for utils/audioPlayback.ts
 * Covers: playAudioWithTimeout — completed, timeout, failed, error scenarios.
 */

jest.mock('../../utils/audioPlayer', () => ({
  playAudio: jest.fn(),
  stopAudio: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

import { playAudioWithTimeout } from '../../utils/audioPlayback';
import { playAudio } from '../../utils/audioPlayer';

describe('playAudioWithTimeout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('resolves true when playback completes', async () => {
    (playAudio as jest.Mock).mockImplementation(
      (source: string, callback: Function) => {
        // Simulate immediate completion
        setTimeout(() => {
          callback({ isLoaded: true, didJustFinish: true });
        }, 10);
        return Promise.resolve(true);
      }
    );

    const promise = playAudioWithTimeout('https://example.com/audio.mp3', 5000);
    jest.advanceTimersByTime(20);
    const result = await promise;
    expect(result).toBe(true);
  });

  it('resolves true on timeout (audio may have finished)', async () => {
    (playAudio as jest.Mock).mockImplementation(() => {
      // Never calls the callback - simulates timeout
      return Promise.resolve(true);
    });

    const promise = playAudioWithTimeout('https://example.com/audio.mp3', 1000);
    // Flush microtask queue to let the .then handler register the setTimeout
    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(1100);
    const result = await promise;
    expect(result).toBe(true);
  });

  it('resolves false when playAudio returns false', async () => {
    (playAudio as jest.Mock).mockResolvedValue(false);

    const promise = playAudioWithTimeout('https://bad.mp3', 5000);
    jest.advanceTimersByTime(10);
    const result = await promise;
    expect(result).toBe(false);
  });

  it('resolves false on error status callback', async () => {
    (playAudio as jest.Mock).mockImplementation(
      (source: string, callback: Function) => {
        setTimeout(() => {
          callback({ isLoaded: false, error: 'Decode error' });
        }, 10);
        return Promise.resolve(true);
      }
    );

    const promise = playAudioWithTimeout('https://example.com/bad.mp3', 5000);
    jest.advanceTimersByTime(20);
    const result = await promise;
    expect(result).toBe(false);
  });

  it('resolves false when playAudio throws', async () => {
    (playAudio as jest.Mock).mockRejectedValue(new Error('Audio crash'));

    const promise = playAudioWithTimeout('https://broken.mp3', 5000);
    jest.advanceTimersByTime(10);
    const result = await promise;
    expect(result).toBe(false);
  });

  it('uses minimum timeout of 500ms', async () => {
    (playAudio as jest.Mock).mockImplementation(() => Promise.resolve(true));

    const promise = playAudioWithTimeout('https://example.com/short.mp3', 100);
    // Flush microtask queue to let the .then handler register the setTimeout
    await Promise.resolve();
    await Promise.resolve();
    jest.advanceTimersByTime(600);
    const result = await promise;
    expect(result).toBe(true);
  });

  it('only resolves once even with multiple callbacks', async () => {
    let statusCb: Function;
    (playAudio as jest.Mock).mockImplementation(
      (source: string, callback: Function) => {
        statusCb = callback;
        return Promise.resolve(true);
      }
    );

    const promise = playAudioWithTimeout('https://example.com/a.mp3', 5000);

    // Simulate completion callback fired twice
    jest.advanceTimersByTime(10);
    statusCb!({ isLoaded: true, didJustFinish: true });
    statusCb!({ isLoaded: true, didJustFinish: true });

    const result = await promise;
    expect(result).toBe(true);
  });
});
