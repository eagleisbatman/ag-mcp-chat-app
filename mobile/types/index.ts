/**
 * Core type definitions for FarmerChat mobile app
 */

// ============================================
// API Response Types
// ============================================

/**
 * Generic result type for API operations
 */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * API response with optional success flag
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================
// Message Types
// ============================================

/**
 * Diagnosis data from plant image analysis
 */
export interface DiagnosisData {
  crop?: string;
  status?: 'healthy' | 'unhealthy' | 'unknown';
  disease?: string;
  confidence?: number;
  issues?: DiagnosisIssue[];
  treatments?: Treatment[];
  source?: 'agrivision' | 'plantix' | string;
  // Error states
  errorType?: 'timeout' | 'network' | 'not_plant' | 'poor_quality' | 'screenshot' | 'text_image' | 'guardrail_rejection';
  errorMessage?: string;
  // Raw data
  rawData?: unknown;
}

export interface DiagnosisIssue {
  name: string;
  description?: string;
  symptoms?: string[];
  severity?: 'low' | 'medium' | 'high';
}

export interface Treatment {
  type?: 'chemical' | 'biological' | 'cultural' | string;
  name: string;
  description?: string;
  dosage?: string;
}

/**
 * Chat message
 */
export interface Message {
  _id: string;
  text: string;
  createdAt: Date | string;
  isBot: boolean;
  image?: string;
  diagnosisData?: DiagnosisData;
  ttsAudioUrl?: string;
  isStreaming?: boolean;
  sessionId?: string;
}

/**
 * Chat session
 */
export interface Session {
  id: string;
  deviceId: string;
  title?: string;
  status: 'active' | 'archived';
  messageCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ============================================
// Theme Types
// ============================================

export type ThemeMode = 'light' | 'dark' | 'system';

// Re-export ThemeColors from themes.ts as Theme for convenience
export { ThemeColors as Theme } from '../constants/themes';

// ============================================
// Location Types
// ============================================

export interface LocationCoords {
  latitude: number;
  longitude: number;
}

export interface LocationDetails {
  latitude: number;
  longitude: number;
  displayName?: string;
  level1Country?: string;
  level2State?: string;
  level3District?: string;
  level4SubDistrict?: string;
  level5City?: string;
  level6Village?: string;
  source?: 'gps' | 'ip' | 'manual';
}

export type LocationPermissionStatus = 'granted' | 'denied' | 'undetermined';

// ============================================
// Language Types
// ============================================

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag?: string;
  rtl?: boolean;
}

// ============================================
// Weather Types
// ============================================

export interface WeatherCondition {
  temperature: number;
  temperatureUnit: 'C' | 'F';
  condition: string;
  conditionCode?: number;
  humidity?: number;
  windSpeed?: number;
  windDirection?: string;
  uvIndex?: number;
  feelsLike?: number;
  icon?: string;
}

export interface WeatherForecast {
  date: Date | string;
  high: number;
  low: number;
  condition: string;
  conditionCode?: number;
  precipProbability?: number;
  icon?: string;
}

export interface WeatherData {
  current: WeatherCondition;
  forecast?: WeatherForecast[];
  alerts?: WeatherAlert[];
  provider?: string;
  lastUpdated?: Date | string;
}

export interface WeatherAlert {
  title: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme';
  startTime?: Date | string;
  endTime?: Date | string;
}

// ============================================
// Device Types
// ============================================

export type DeviceType = 'phone' | 'tablet' | 'desktop' | 'tv' | 'unknown';

export interface DeviceInfo {
  deviceId: string;
  platform: 'ios' | 'android' | 'web';
  osVersion?: string;
  appVersion?: string;
  modelName?: string;
  brand?: string;
  deviceType?: DeviceType;
}

// ============================================
// User Types
// ============================================

export interface User {
  id: string;
  deviceId: string;
  preferredLanguage?: string;
  location?: LocationDetails;
  themeMode?: ThemeMode;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface UserPreferences {
  language?: string;
  themeMode?: ThemeMode;
  notificationsEnabled?: boolean;
}

// ============================================
// MCP Server Types
// ============================================

export interface McpServer {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  url: string;
  status: 'online' | 'offline' | 'unknown';
  category?: string;
  regions?: string[];
  tools?: McpTool[];
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: object;
}

// ============================================
// Content Types
// ============================================

export interface ContentItem {
  id: string;
  title: string;
  description?: string;
  type: 'article' | 'video' | 'tip';
  thumbnailUrl?: string;
  contentUrl?: string;
  duration?: number;
  category?: string;
  tags?: string[];
  language?: string;
  createdAt: Date | string;
}

// ============================================
// Notification Types
// ============================================

export interface Notification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: Date | string;
}

// ============================================
// Navigation Types
// ============================================

export type RootStackParamList = {
  // Onboarding
  Welcome: undefined;
  Location: undefined;
  Language: undefined;
  // Main
  Chat: { sessionId?: string };
  History: undefined;
  Settings: undefined;
  LanguageSelect: undefined;
  McpServers: undefined;
  McpServerDetail: { serverId: string };
};

// ============================================
// Utility Types
// ============================================

/**
 * Makes all properties in T optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extracts the success data type from a Result
 */
export type ResultData<T extends Result<unknown>> = T extends { success: true; data: infer D } ? D : never;
