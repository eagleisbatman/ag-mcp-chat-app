// Audio Player utility for TTS playback using expo-av

import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

// Global sound object for managing playback
let currentSound = null;
let isPlaying = false;

/**
 * Play audio from URL (Cloudinary) or base64
 * @param {string} source - URL or base64 encoded audio
 * @param {function} onPlaybackStatusUpdate - Callback for playback status updates
 * @returns {Promise<boolean>} - Success status
 */
export const playAudio = async (source, onPlaybackStatusUpdate = null) => {
  try {
    // Stop any currently playing audio
    await stopAudio();

    // Configure audio mode for playback
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    let audioSource;
    let tempFileUri = null;

    // Check if source is URL or base64
    if (source.startsWith('http://') || source.startsWith('https://')) {
      // Direct URL playback (Cloudinary)
      audioSource = { uri: source };
    } else {
      // Base64 - write to temp file first
      tempFileUri = `${FileSystem.cacheDirectory}tts_audio_${Date.now()}.wav`;
      await FileSystem.writeAsStringAsync(tempFileUri, source, {
        encoding: 'base64', // Use string literal instead of EncodingType
      });
      audioSource = { uri: tempFileUri };
    }

    // Create and load the sound
    const { sound } = await Audio.Sound.createAsync(
      audioSource,
      { shouldPlay: true },
      (status) => {
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
  } catch (error) {
    console.error('Audio playback error:', error);
    return false;
  }
};

/**
 * Play audio from URL (Cloudinary)
 * @param {string} url - Audio URL
 * @param {function} onPlaybackStatusUpdate - Callback for playback status updates
 * @returns {Promise<boolean>} - Success status
 */
export const playAudioFromUrl = async (url, onPlaybackStatusUpdate = null) => {
  return playAudio(url, onPlaybackStatusUpdate);
};

/**
 * Play audio from base64
 * @param {string} base64Audio - Base64 encoded WAV audio
 * @param {function} onPlaybackStatusUpdate - Callback for playback status updates
 * @returns {Promise<boolean>} - Success status
 */
export const playAudioFromBase64 = async (base64Audio, onPlaybackStatusUpdate = null) => {
  return playAudio(base64Audio, onPlaybackStatusUpdate);
};

/**
 * Stop currently playing audio
 * @returns {Promise<void>}
 */
export const stopAudio = async () => {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch (error) {
      // Ignore errors during cleanup
    }
    currentSound = null;
    isPlaying = false;
  }
};

/**
 * Pause currently playing audio
 * @returns {Promise<void>}
 */
export const pauseAudio = async () => {
  if (currentSound && isPlaying) {
    try {
      await currentSound.pauseAsync();
      isPlaying = false;
    } catch (error) {
      console.error('Pause error:', error);
    }
  }
};

/**
 * Resume paused audio
 * @returns {Promise<void>}
 */
export const resumeAudio = async () => {
  if (currentSound && !isPlaying) {
    try {
      await currentSound.playAsync();
      isPlaying = true;
    } catch (error) {
      console.error('Resume error:', error);
    }
  }
};

/**
 * Check if audio is currently playing
 * @returns {boolean}
 */
export const isAudioPlaying = () => isPlaying;

/**
 * Clean up sound and temporary file
 * @param {Audio.Sound} sound - Sound object to cleanup
 * @param {string} fileUri - File URI to delete (optional)
 */
const cleanupSound = async (sound, fileUri = null) => {
  try {
    await sound.unloadAsync();
    if (fileUri) {
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
  } catch (error) {
    // Ignore cleanup errors
  }
  
  if (currentSound === sound) {
    currentSound = null;
    isPlaying = false;
  }
};

export default {
  playAudio,
  playAudioFromUrl,
  playAudioFromBase64,
  stopAudio,
  pauseAudio,
  resumeAudio,
  isAudioPlaying,
};
