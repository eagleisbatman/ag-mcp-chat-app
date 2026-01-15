import { playAudio } from './audioPlayer';

/**
 * Play audio and resolve when playback is expected to finish.
 * Uses a timeout fallback to avoid hanging if status events are missed.
 */
export async function playAudioWithTimeout(
  source: string,
  timeoutMs: number
): Promise<boolean> {
  return new Promise(async (resolve) => {
    let resolved = false;
    const resolveOnce = (value: boolean) => {
      if (resolved) return;
      resolved = true;
      resolve(value);
    };

    const success = await playAudio(source, (status) => {
      if (status.isLoaded && status.didJustFinish) {
        resolveOnce(true);
      }
    });

    if (!success) {
      resolveOnce(false);
      return;
    }

    setTimeout(() => resolveOnce(true), Math.max(500, timeoutMs));
  });
}
