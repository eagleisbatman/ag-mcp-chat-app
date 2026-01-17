import { playAudio } from './audioPlayer';
import { log } from './logger';

/**
 * Result of audio playback with timeout
 */
export interface PlaybackResult {
  success: boolean;
  reason: 'completed' | 'timeout' | 'failed' | 'error';
}

/**
 * Play audio and resolve when playback finishes or times out.
 *
 * Note: Timeout resolves as { success: true, reason: 'timeout' } because
 * we can't distinguish between "audio finished before status event" and
 * "audio is still playing". For TTS segments, timeout usually means the
 * segment finished but the status callback was missed.
 *
 * @param source - Audio source URL or base64
 * @param timeoutMs - Maximum time to wait for playback completion
 * @returns PlaybackResult with success status and reason
 */
export async function playAudioWithTimeout(
  source: string,
  timeoutMs: number
): Promise<boolean> {
  return new Promise((resolve) => {
    let resolved = false;
    let playbackFailed = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const resolveOnce = (success: boolean, reason: PlaybackResult['reason']) => {
      if (resolved) return;
      resolved = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (reason === 'timeout' && playbackFailed) {
        // Timeout after failure means the audio actually failed, not just slow status
        log('Audio playback: timeout after failure detected');
        resolve(false);
      } else {
        log(`Audio playback: ${reason}`);
        resolve(success);
      }
    };

    // Start playback
    playAudio(source, (status) => {
      if (status.isLoaded && status.didJustFinish) {
        resolveOnce(true, 'completed');
      }
      // Track if playback encountered an error (error only exists on AVPlaybackStatusError)
      if (!status.isLoaded && 'error' in status && status.error) {
        playbackFailed = true;
        log('Audio playback error:', status.error);
        resolveOnce(false, 'error');
      }
    })
      .then((success) => {
        if (!success) {
          playbackFailed = true;
          resolveOnce(false, 'failed');
        } else {
          // Start timeout only after successful playback start
          timeoutId = setTimeout(() => {
            resolveOnce(true, 'timeout');
          }, Math.max(500, timeoutMs));
        }
      })
      .catch((error) => {
        playbackFailed = true;
        log('Audio playback exception:', error);
        resolveOnce(false, 'error');
      });
  });
}
