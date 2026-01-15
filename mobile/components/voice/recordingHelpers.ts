import type { RecordingConfig } from '@siteed/expo-audio-studio';
import { SILENCE_THRESHOLD_DB } from './recordingOptions';

type AudioAnalysisEvent = {
  dataPoint?: { rms?: number; energy?: number; silent?: boolean; dB?: number; features?: { rms?: number } };
  dataPoints?: Array<{ rms?: number; energy?: number; silent?: boolean; dB?: number; features?: { rms?: number } }>;
  analysisData?: { rms?: number; energy?: number; silent?: boolean };
  data?: { rms?: number; energy?: number; silent?: boolean };
};

type AudioStreamEvent = {
  data?: string;
  compression?: { data?: string };
};

export function buildRecordingConfig(
  onAudioStream: (event: AudioStreamEvent) => void,
  onAudioAnalysis: (event: AudioAnalysisEvent) => void
): RecordingConfig {
  return {
    interval: 120,
    enableProcessing: true,
    sampleRate: 16000,
    channels: 1,
    encoding: 'pcm_16bit',
    output: {
      primary: { enabled: true },
      compressed: { enabled: false },
    },
    onAudioStream,
    onAudioAnalysis,
  };
}

export function extractAudioLevel(
  event: AudioAnalysisEvent | undefined,
  lastLevel: number
): { level: number; isSpeaking: boolean } {
  const point =
    event?.dataPoint
    || event?.dataPoints?.[0]
    || event?.analysisData
    || event?.data
    || {};

  const rms = point.rms ?? point.features?.rms ?? point.energy ?? 0;
  const db = typeof point.dB === 'number' ? point.dB : null;
  const levelFromDb = db == null ? null : Math.max(0, Math.min(1, (db + 60) / 60));
  const level = levelFromDb ?? Math.max(0, Math.min(1, rms * 4));
  const smoothed = lastLevel * 0.65 + level * 0.35;
  const isSilent = point.silent === true;
  const isSpeaking = !isSilent && (point.dB ? point.dB > SILENCE_THRESHOLD_DB : smoothed > 0.02);

  return { level: smoothed, isSpeaking };
}

export function extractBase64Chunk(event: AudioStreamEvent | undefined): string | null {
  if (!event) return null;
  if (typeof event.data === 'string') return event.data;
  if (typeof event.compression?.data === 'string') return event.compression.data;
  return null;
}
