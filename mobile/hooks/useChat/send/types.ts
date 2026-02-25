import type { Message, LocationDetails } from '../../../types';

export interface UseChatSendOptions {
  messages: Message[];
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Record<string, unknown>) => void;
  ensureSession: () => Promise<string | null>;
  persistMessage: (message: Message & { cloudinaryUrl?: string }, sessionId: string | null, extra?: Record<string, unknown>) => Promise<string | null>;
  maybeGenerateTitle: (sessionId: string | null, allMessages: Message[]) => Promise<void>;
  onBehalfOfFarmerUserId?: string;
}

export interface ImageData {
  uri: string;
  base64: string;
  text?: string;
}

export interface AudioData {
  base64: string;
  language?: string;
}

export interface TranscribeResult {
  success: boolean;
  transcription?: string;
  error?: string;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

export interface UseChatSendReturn {
  isTyping: boolean;
  thinkingText: string | null;
  handleSendText: (text: string, isRetry?: boolean) => Promise<void>;
  handleSendImage: (imageData: ImageData) => Promise<void>;
  transcribeAudioForInput: (audioData: AudioData) => Promise<TranscribeResult>;
  uploadAudioInBackground: (audioData: AudioData | null) => Promise<UploadResult>;
}

export interface LocationState {
  latitude: number | null;
  longitude: number | null;
}

export interface LocationContextDeps {
  location: LocationState;
  locationDetails: LocationDetails | null;
  languageCode?: string;
}
