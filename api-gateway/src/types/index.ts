/**
 * Types Index
 * Re-exports all types from the types directory
 */

export * from './mcp.types';
export * from './intent.types';

// Common Express types
import { Request, Response, NextFunction } from 'express';

export interface ApiRequest<T = unknown> extends Request {
  body: T;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export type RouteHandler<TReq = unknown, TRes = unknown> = (
  req: ApiRequest<TReq>,
  res: Response<ApiResponse<TRes>>,
  next: NextFunction
) => Promise<void> | void;

// Chat types
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  language?: string;
  history?: ChatMessage[];
  latitude?: number;
  longitude?: number;
  location?: {
    city?: string;
    country?: string;
  };
  image?: string;
  sessionId?: string;
}

export interface ChatResponse {
  response: string;
  followUpQuestions?: string[];
  language: string;
  location?: string;
  mcpToolsUsed?: string[];
  widgets?: unknown[];
}

// TTS types
export interface TtsRequest {
  text: string;
  language: string;
  voice?: string;
}

export interface TtsResponse {
  audioUrl?: string;
  audioBase64?: string;
  duration?: number;
  mimeType?: string;
}

// Transcription types
export interface TranscribeRequest {
  audio: string;
  language: string;
  mimeType?: string;
}

export interface TranscribeResponse {
  text: string;
  transcription?: string;
  language: string;
  detected_language?: string;
}

// Location types
export interface GeocodingResult {
  city?: string;
  country?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
}

export interface IpGeoResult {
  city?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  lat?: number;
  lon?: number;
}
