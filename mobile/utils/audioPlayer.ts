/**
 * Audio Player utility for TTS playback using expo-av
 */

import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { error as logError } from './logger';

// Global sound object for managing playback
let currentSound: Audio.Sound | null = null;
let isPlaying = false;

type PlaybackStatusCallback = (status: AVPlaybackStatus) => void;

/**
 * Clean up sound and temporary file
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
      // Base64 - write to temp file first
      tempFileUri = `${FileSystem.cacheDirectory}tts_audio_${Date.now()}.wav`;
      await FileSystem.writeAsStringAsync(tempFileUri, source, {
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
};
