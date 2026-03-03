/**
 * Tests for utils/audioPlayer.ts
 * Covers: playAudio, stopAudio, pauseAudio, resumeAudio, isAudioPlaying,
 * setRecordingActive, getRecordingActive, error handling.
 */

jest.mock('expo-av', () => {
  const mockSound = {
    unloadAsync: jest.fn().mockResolvedValue(undefined),
    stopAsync: jest.fn().mockResolvedValue(undefined),
    pauseAsync: jest.fn().mockResolvedValue(undefined),
    playAsync: jest.fn().mockResolvedValue(undefined),
  };
  return {
    Audio: {
      Sound: {
        createAsync: jest.fn().mockResolvedValue({ sound: mockSound }),
      },
      setAudioModeAsync: jest.fn().mockResolvedValue(undefined),
    },
  };
});

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/tmp/cache/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('../../utils/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import {
  playAudio,
  stopAudio,
  pauseAudio,
  resumeAudio,
  isAudioPlaying,
  setRecordingActive,
  getRecordingActive,
  playAudioFromUrl,
  playAudioFromBase64,
} from '../../utils/audioPlayer';

describe('audioPlayer', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // Reset module-level isPlaying state from previous tests
    await stopAudio();
  });

  describe('playAudio', () => {
    it('plays from URL successfully', async () => {
      const result = await playAudio('https://example.com/audio.mp3');
      expect(result).toBe(true);
      expect(Audio.setAudioModeAsync).toHaveBeenCalledWith(
        expect.objectContaining({ playsInSilentModeIOS: true })
      );
      expect(Audio.Sound.createAsync).toHaveBeenCalledWith(
        { uri: 'https://example.com/audio.mp3' },
        { shouldPlay: true },
        expect.any(Function)
      );
    });

    it('plays from base64 by writing to temp file', async () => {
      const result = await playAudio('SGVsbG8gV29ybGQ=');
      expect(result).toBe(true);
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();
    });

    it('handles data URL prefix for base64', async () => {
      const result = await playAudio('data:audio/wav;base64,SGVsbG8=');
      expect(result).toBe(true);
      expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith(
        expect.any(String),
        'SGVsbG8=',
        { encoding: 'base64' }
      );
    });

    it('returns false on error', async () => {
      (Audio.Sound.createAsync as jest.Mock).mockRejectedValueOnce(new Error('fail'));
      const result = await playAudio('https://example.com/bad.mp3');
      expect(result).toBe(false);
    });

    it('calls onPlaybackStatusUpdate callback', async () => {
      let statusCallback: ((status: any) => void) | null = null;
      (Audio.Sound.createAsync as jest.Mock).mockImplementationOnce(
        (source: any, opts: any, callback: any) => {
          statusCallback = callback;
          return Promise.resolve({
            sound: {
              unloadAsync: jest.fn(),
              stopAsync: jest.fn(),
            },
          });
        }
      );

      const onStatus = jest.fn();
      await playAudio('https://example.com/audio.mp3', onStatus);

      // Simulate status update (cast needed: TS can't track assignment inside mock callback)
      if (statusCallback) {
        (statusCallback as (status: any) => void)({ isLoaded: true, isPlaying: true });
        expect(onStatus).toHaveBeenCalledWith(
          expect.objectContaining({ isLoaded: true, isPlaying: true })
        );
      }
    });
  });

  describe('stopAudio', () => {
    it('stops and unloads current sound', async () => {
      await playAudio('https://example.com/audio.mp3');
      await stopAudio();
      // After stopping, no error should occur
    });

    it('handles no current sound gracefully', async () => {
      // Should not throw when nothing is playing
      await stopAudio();
    });
  });

  describe('playAudioFromUrl', () => {
    it('delegates to playAudio', async () => {
      const result = await playAudioFromUrl('https://example.com/audio.mp3');
      expect(result).toBe(true);
    });
  });

  describe('playAudioFromBase64', () => {
    it('delegates to playAudio', async () => {
      const result = await playAudioFromBase64('SGVsbG8=');
      expect(result).toBe(true);
    });
  });

  describe('pauseAudio / resumeAudio', () => {
    it('pause does not throw when nothing playing', async () => {
      await pauseAudio();
    });

    it('resume does not throw when nothing playing', async () => {
      await resumeAudio();
    });
  });

  describe('isAudioPlaying', () => {
    it('returns false initially', () => {
      expect(isAudioPlaying()).toBe(false);
    });
  });

  describe('recording lock', () => {
    it('setRecordingActive and getRecordingActive work', () => {
      expect(getRecordingActive()).toBe(false);
      setRecordingActive(true);
      expect(getRecordingActive()).toBe(true);
      setRecordingActive(false);
      expect(getRecordingActive()).toBe(false);
    });
  });
});
