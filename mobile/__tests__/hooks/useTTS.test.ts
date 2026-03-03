/**
 * Tests for hooks/useTTS.ts
 * Covers: initial state, handleSpeak (cached/generate/error), stopSpeaking,
 * cancel generation, unmount cleanup, diagnosis text generation.
 */

jest.mock('../../services/tts', () => ({
  textToSpeech: jest.fn(),
}));

jest.mock('../../utils/audioPlayer', () => ({
  playAudio: jest.fn(),
  stopAudio: jest.fn(),
}));

jest.mock('../../utils/diagnosisNormalizer', () => ({
  generateDiagnosisTTSBrief: jest.fn(() => null),
  generateDiagnosisTTSText: jest.fn(() => ''),
}));

jest.mock('../../services/diagnosisSummary', () => ({
  getDiagnosisTtsSummary: jest.fn(),
}));

jest.mock('../../utils/logger', () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../../constants/strings', () => ({
  t: jest.fn((key: string) => {
    const map: Record<string, string> = {
      'voice.voiceUnavailable': 'Voice not available',
      'voice.voiceUnavailableLater': 'Try again later',
      'voice.audioPlaybackFailed': 'Playback failed',
    };
    return map[key] || key;
  }),
}));

import { renderHook, act } from '@testing-library/react-native';
import useTTS from '../../hooks/useTTS';
import { textToSpeech } from '../../services/tts';
import { playAudio, stopAudio } from '../../utils/audioPlayer';

const makeMessage = (overrides: Record<string, unknown> = {}) => ({
  _id: 'msg-1',
  text: 'Hello, this is a test message.',
  isBot: true,
  createdAt: new Date(),
  ...overrides,
});

describe('useTTS', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with isSpeaking=false and isLoading=false', () => {
      const { result } = renderHook(() =>
        useTTS({ message: makeMessage() as any, language: 'en', locationDetails: null })
      );

      expect(result.current.isSpeaking).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('handleSpeak with cached audio', () => {
    it('plays from cached ttsAudioUrl', async () => {
      (playAudio as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() =>
        useTTS({
          message: makeMessage({ ttsAudioUrl: 'https://cached.audio/file.mp3' }) as any,
          language: 'en',
          locationDetails: null,
        })
      );

      await act(async () => {
        await result.current.handleSpeak();
      });

      expect(playAudio).toHaveBeenCalledWith(
        'https://cached.audio/file.mp3',
        expect.any(Function)
      );
      expect(result.current.isSpeaking).toBe(true);
      expect(textToSpeech).not.toHaveBeenCalled();
    });

    it('sets isSpeaking=false when cached playback fails', async () => {
      (playAudio as jest.Mock).mockResolvedValue(false);

      const { result } = renderHook(() =>
        useTTS({
          message: makeMessage({ ttsAudioUrl: 'https://bad.url' }) as any,
          language: 'en',
          locationDetails: null,
        })
      );

      await act(async () => {
        await result.current.handleSpeak();
      });

      expect(result.current.isSpeaking).toBe(false);
    });
  });

  describe('handleSpeak with TTS generation', () => {
    it('generates TTS and plays the audio', async () => {
      (textToSpeech as jest.Mock).mockResolvedValue({
        success: true,
        audioUrl: 'https://generated.audio/tts.mp3',
      });
      (playAudio as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() =>
        useTTS({
          message: makeMessage() as any,
          language: 'en',
          locationDetails: null,
        })
      );

      await act(async () => {
        await result.current.handleSpeak();
      });

      expect(textToSpeech).toHaveBeenCalledWith(
        'Hello, this is a test message.',
        'en',
        null,
        expect.any(Object) // AbortSignal
      );
      expect(playAudio).toHaveBeenCalled();
    });

    it('calls onError when TTS fails', async () => {
      (textToSpeech as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Service unavailable',
      });

      const onError = jest.fn();
      const { result } = renderHook(() =>
        useTTS({
          message: makeMessage() as any,
          language: 'en',
          locationDetails: null,
          onError,
        })
      );

      await act(async () => {
        await result.current.handleSpeak();
      });

      expect(onError).toHaveBeenCalledWith('Try again later');
    });

    it('calls onError when no text is available', async () => {
      const onError = jest.fn();
      const { result } = renderHook(() =>
        useTTS({
          message: makeMessage({ text: '' }) as any,
          language: 'en',
          locationDetails: null,
          onError,
        })
      );

      await act(async () => {
        await result.current.handleSpeak();
      });

      expect(onError).toHaveBeenCalledWith('Voice not available');
    });

    it('does not play when generation is cancelled', async () => {
      (textToSpeech as jest.Mock).mockResolvedValue({
        success: true,
        cancelled: true,
      });

      const { result } = renderHook(() =>
        useTTS({
          message: makeMessage() as any,
          language: 'en',
          locationDetails: null,
        })
      );

      await act(async () => {
        await result.current.handleSpeak();
      });

      expect(playAudio).not.toHaveBeenCalled();
    });

    it('handles playback failure after successful generation', async () => {
      (textToSpeech as jest.Mock).mockResolvedValue({
        success: true,
        audioUrl: 'https://generated.audio/tts.mp3',
      });
      (playAudio as jest.Mock).mockResolvedValue(false);

      const onError = jest.fn();
      const { result } = renderHook(() =>
        useTTS({
          message: makeMessage() as any,
          language: 'en',
          locationDetails: null,
          onError,
        })
      );

      await act(async () => {
        await result.current.handleSpeak();
      });

      expect(onError).toHaveBeenCalledWith('Playback failed');
    });
  });

  describe('stop when already speaking', () => {
    it('stops audio when handleSpeak is called while speaking', async () => {
      (playAudio as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() =>
        useTTS({
          message: makeMessage({ ttsAudioUrl: 'https://cached.mp3' }) as any,
          language: 'en',
          locationDetails: null,
        })
      );

      // Start speaking
      await act(async () => {
        await result.current.handleSpeak();
      });

      expect(result.current.isSpeaking).toBe(true);

      // Call again while speaking - should stop
      await act(async () => {
        await result.current.handleSpeak();
      });

      expect(stopAudio).toHaveBeenCalled();
    });
  });

  describe('stopSpeaking', () => {
    it('stops playback and sets state', async () => {
      (playAudio as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() =>
        useTTS({
          message: makeMessage({ ttsAudioUrl: 'https://cached.mp3' }) as any,
          language: 'en',
          locationDetails: null,
        })
      );

      await act(async () => {
        await result.current.handleSpeak();
      });

      act(() => {
        result.current.stopSpeaking();
      });

      expect(stopAudio).toHaveBeenCalled();
      expect(result.current.isSpeaking).toBe(false);
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('location conversion', () => {
    it('converts locationDetails to TTSLocation format', async () => {
      (textToSpeech as jest.Mock).mockResolvedValue({
        success: true,
        audioUrl: 'https://tts.mp3',
      });
      (playAudio as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() =>
        useTTS({
          message: makeMessage() as any,
          language: 'en',
          locationDetails: {
            level1Country: 'Kenya',
            level2State: 'Nairobi',
            level5City: 'Westlands',
            displayName: 'Westlands, Nairobi',
          } as any,
        })
      );

      await act(async () => {
        await result.current.handleSpeak();
      });

      expect(textToSpeech).toHaveBeenCalledWith(
        expect.any(String),
        'en',
        { country: 'Kenya', state: 'Nairobi', city: 'Westlands' },
        expect.any(Object)
      );
    });

    it('passes null location when locationDetails is null', async () => {
      (textToSpeech as jest.Mock).mockResolvedValue({
        success: true,
        audioUrl: 'https://tts.mp3',
      });
      (playAudio as jest.Mock).mockResolvedValue(true);

      const { result } = renderHook(() =>
        useTTS({
          message: makeMessage() as any,
          language: 'en',
          locationDetails: null,
        })
      );

      await act(async () => {
        await result.current.handleSpeak();
      });

      expect(textToSpeech).toHaveBeenCalledWith(
        expect.any(String),
        'en',
        null,
        expect.any(Object)
      );
    });
  });

  describe('exception handling', () => {
    it('calls onError when textToSpeech throws', async () => {
      (textToSpeech as jest.Mock).mockRejectedValue(new Error('Network fail'));

      const onError = jest.fn();
      const { result } = renderHook(() =>
        useTTS({
          message: makeMessage() as any,
          language: 'en',
          locationDetails: null,
          onError,
        })
      );

      await act(async () => {
        await result.current.handleSpeak();
      });

      expect(onError).toHaveBeenCalledWith('Voice not available');
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('unmount cleanup', () => {
    it('stops audio on unmount', () => {
      const { unmount } = renderHook(() =>
        useTTS({
          message: makeMessage() as any,
          language: 'en',
          locationDetails: null,
        })
      );

      unmount();
      expect(stopAudio).toHaveBeenCalled();
    });
  });
});
