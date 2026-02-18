/**
 * Audio Player utility for TTS playback
 * - Native: uses expo-av with file system
 * - Web: uses HTML5 Audio API with blob URLs
 */

import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { error as logError, log } from './logger';

// Global sound object for managing playback (native)
let currentSound: Audio.Sound | null = null;
// Global audio element for web playback
let currentWebAudio: HTMLAudioElement | null = null;
let currentWebBlobUrl: string | null = null;
let isPlaying = false;

// Global audio session lock to prevent TTS during recording and vice versa
let isRecordingActive = false;

/**
 * Mark recording session as active. TTS playback will be blocked.
 */
export const setRecordingActive = (active: boolean): void => {
  isRecordingActive = active;
};

/**
 * Check if a recording session is currently active.
 */
export const getRecordingActive = (): boolean => isRecordingActive;

type PlaybackStatusCallback = (status: AVPlaybackStatus) => void;

/**
 * Clean up web audio and blob URL
 */
const cleanupWebAudio = (): void => {
  if (currentWebAudio) {
    currentWebAudio.pause();
    currentWebAudio.src = '';
    currentWebAudio = null;
  }
  if (currentWebBlobUrl) {
    URL.revokeObjectURL(currentWebBlobUrl);
    currentWebBlobUrl = null;
  }
  isPlaying = false;
};

/**
 * Play audio on web using HTML5 Audio API
 */
const playAudioWeb = async (
  source: string,
  onPlaybackStatusUpdate: PlaybackStatusCallback | null = null
): Promise<boolean> => {
  try {
    // Stop any currently playing audio
    cleanupWebAudio();

    let audioUrl: string;

    if (source.startsWith('http://') || source.startsWith('https://')) {
      // Direct URL playback
      audioUrl = source;
    } else {
      // Base64 - convert to blob URL
      // Handle both raw base64 and data URL format
      let base64Data = source;
      let mimeType = 'audio/wav';

      const dataUrlMatch = source.match(/^data:([^;]+);base64,(.+)$/);
      if (dataUrlMatch) {
        mimeType = dataUrlMatch[1];
        base64Data = dataUrlMatch[2];
      }

      // Convert base64 to blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      audioUrl = URL.createObjectURL(blob);
      currentWebBlobUrl = audioUrl;
      log('[AudioPlayer] Created blob URL for web playback');
    }

    // Create and play audio
    const audio = new window.Audio(audioUrl);
    currentWebAudio = audio;

    // Set up event listeners
    audio.onplay = () => {
      isPlaying = true;
      onPlaybackStatusUpdate?.({ isLoaded: true, isPlaying: true } as AVPlaybackStatus);
    };

    audio.onended = () => {
      isPlaying = false;
      onPlaybackStatusUpdate?.({ isLoaded: true, isPlaying: false, didJustFinish: true } as AVPlaybackStatus);
      cleanupWebAudio();
    };

    audio.onerror = (e) => {
      logError('[AudioPlayer] Web audio error:', e);
      isPlaying = false;
      onPlaybackStatusUpdate?.({ isLoaded: false, error: 'Playback failed' } as AVPlaybackStatus);
      cleanupWebAudio();
    };

    // Start playback
    await audio.play();
    return true;
  } catch (err) {
    logError('[AudioPlayer] Web playback error:', err);
    cleanupWebAudio();
    return false;
  }
};

/**
 * Clean up sound and temporary file (native)
 * @param sound - Sound object to cleanup
 * @param fileUri - File URI to delete (optional)
 */
const cleanupSound = async (sound: Audio.Sound, fileUri: string | null = null): Promise<void> => {
  try {
    await sound.unloadAsync();
    if (fileUri) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
  } catch {
    // Ignore cleanup errors
  }

  if (currentSound === sound) {
    currentSound = null;
    isPlaying = false;
  }
};

/**
 * Play audio from URL (Cloudinary) or base64
 * @param source - URL or base64 encoded audio
 * @param onPlaybackStatusUpdate - Callback for playback status updates
 * @returns Success status
 */
export const playAudio = async (
  source: string,
  onPlaybackStatusUpdate: PlaybackStatusCallback | null = null
): Promise<boolean> => {
  // Use web-specific playback on web platform
  if (Platform.OS === 'web') {
    return playAudioWeb(source, onPlaybackStatusUpdate);
  }

  // Native playback using expo-av
  try {
    // Stop any currently playing audio
    await stopAudio();

    // Configure audio mode for playback
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    let audioSource: { uri: string };
    let tempFileUri: string | null = null;

    // Check if source is URL or base64
    if (source.startsWith('http://') || source.startsWith('https://')) {
      // Direct URL playback (Cloudinary)
      audioSource = { uri: source };
    } else {
      // Base64 - write to temp file first (strip data URL prefix if present)
      const dataUrlMatch = source.match(/^data:[^;]+;base64,(.+)$/s);
      const rawBase64 = dataUrlMatch ? dataUrlMatch[1] : source;
      tempFileUri = `${FileSystem.cacheDirectory}tts_audio_${Date.now()}.wav`;
      await FileSystem.writeAsStringAsync(tempFileUri, rawBase64, {
        encoding: 'base64',
      });
      audioSource = { uri: tempFileUri };
    }

    // Create and load the sound
    const { sound } = await Audio.Sound.createAsync(
      audioSource,
      { shouldPlay: true },
      (status: AVPlaybackStatus) => {
        if (status.isLoaded) {
          isPlaying = status.isPlaying;

          // Cleanup when playback finishes
          if (status.didJustFinish) {
            cleanupSound(sound, tempFileUri);
          }
        }

        // Forward status to callback
        if (onPlaybackStatusUpdate) {
          onPlaybackStatusUpdate(status);
        }
      }
    );

    currentSound = sound;
    return true;
  } catch (err) {
    logError('Audio playback error:', err);
    return false;
  }
};

/**
 * Play audio from URL (Cloudinary)
 * @param url - Audio URL
 * @param onPlaybackStatusUpdate - Callback for playback status updates
 * @returns Success status
 */
export const playAudioFromUrl = async (
  url: string,
  onPlaybackStatusUpdate: PlaybackStatusCallback | null = null
): Promise<boolean> => {
  return playAudio(url, onPlaybackStatusUpdate);
};

/**
 * Play audio from base64
 * @param base64Audio - Base64 encoded WAV audio
 * @param onPlaybackStatusUpdate - Callback for playback status updates
 * @returns Success status
 */
export const playAudioFromBase64 = async (
  base64Audio: string,
  onPlaybackStatusUpdate: PlaybackStatusCallback | null = null
): Promise<boolean> => {
  return playAudio(base64Audio, onPlaybackStatusUpdate);
};

/**
 * Stop currently playing audio
 */
export const stopAudio = async (): Promise<void> => {
  // Clean up web audio if on web
  if (Platform.OS === 'web') {
    cleanupWebAudio();
    return;
  }

  // Clean up native audio
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch {
      // Ignore errors during cleanup
    }
    currentSound = null;
    isPlaying = false;
  }
};

/**
 * Pause currently playing audio
 */
export const pauseAudio = async (): Promise<void> => {
  if (currentSound && isPlaying) {
    try {
      await currentSound.pauseAsync();
      isPlaying = false;
    } catch (err) {
      logError('Pause error:', err);
    }
  }
};

/**
 * Resume paused audio
 */
export const resumeAudio = async (): Promise<void> => {
  if (currentSound && !isPlaying) {
    try {
      await currentSound.playAsync();
      isPlaying = true;
    } catch (err) {
      logError('Resume error:', err);
    }
  }
};

/**
 * Check if audio is currently playing
 */
export const isAudioPlaying = (): boolean => isPlaying;

export default {
  playAudio,
  playAudioFromUrl,
  playAudioFromBase64,
  stopAudio,
  pauseAudio,
  resumeAudio,
  isAudioPlaying,
  setRecordingActive,
  getRecordingActive,
};
