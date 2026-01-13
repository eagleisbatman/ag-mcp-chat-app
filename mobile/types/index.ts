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
  status?: 'healthy' | 'unhealthy' | 'unknown' | string;
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
  // Additional fields from providers
  image_quality?: string;
}

export interface DiagnosisIssue {
  name: string;
  description?: string;
  symptoms?: string[];
  severity?: 'low' | 'medium' | 'high' | string;
  scientific_name?: string;
  likelihood?: string;
}

export interface Treatment {
  type?: 'chemical' | 'biological' | 'cultural' | 'organic' | string;
  name: string;
  description?: string;
  dosage?: string;
  active_ingredient?: string;
}

/**
 * Chat message
 */
export interface Message {
  _id: string;
  id?: string;
  text: string | null;
  createdAt: Date | string;
  isBot: boolean;
  image?: string;
  diagnosisData?: DiagnosisData | string;
  ttsAudioUrl?: string;
  isStreaming?: boolean;
  sessionId?: string;
  role?: 'user' | 'assistant' | string;
  content?: string;
}

/**
 * Chat session
 * Note: All fields except id are optional to match db.ts API responses
 */
export interface Session {
  id: string;
  deviceId?: string;
  title?: string;
  status?: 'active' | 'archived' | string;
  messageCount?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  messages?: Message[];
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
  latitude?: number;
  longitude?: number;
  displayName?: string;
  formattedAddress?: string;
  level1Country?: string;
  level1CountryCode?: string;
  level2State?: string;
  level3District?: string;
  level4SubDistrict?: string;
  level5City?: string;
  level6Village?: string;
  level6Locality?: string;
  source?: 'gps' | 'ip' | 'manual' | string;
}

export interface LocationLookupResult {
  success: boolean;
  error?: string;
  latitude?: number;
  longitude?: number;
  source?: string;
  displayName?: string;
  formattedAddress?: string;
  level1Country?: string;
  level2State?: string;
  level3District?: string;
  level5City?: string;
  level6Locality?: string;
}

export interface LocationData {
  latitude?: number;
  longitude?: number;
  displayName?: string;
  level1Country?: string;
  level2State?: string;
  level3District?: string;
  level5City?: string;
  level6Locality?: string;
  source?: 'gps' | 'ip' | 'manual' | string;
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
  isRTL?: boolean;
  region?: string;
}

// ============================================
// Weather Types
// ============================================

export interface WeatherCondition {
  temperature?: number;
  temperatureUnit?: 'C' | 'F';
  condition?: string;
  conditionCode?: number;
  humidity?: number;
  windSpeed?: number;
  windDirection?: string;
  uvIndex?: number;
  feelsLike?: number;
  icon?: string;
  weatherText?: string;
  weatherIcon?: number;
  precipitation?: number;
}

export interface WeatherForecast {
  date: Date | string;
  high?: number;
  low?: number;
  tempMax?: number;
  tempMin?: number;
  condition?: string;
  conditions?: string;
  conditionCode?: number;
  precipProbability?: number;
  precipitationProbability?: number;
  icon?: string;
  dayIcon?: number;
}

export interface WeatherLocation {
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  displayName?: string;
  name?: string;
}

export interface WeatherData {
  current: WeatherCondition | null;
  forecast?: WeatherForecast[] | { daily: WeatherForecast[] } | null;
  alerts?: WeatherAlert[];
  provider?: string;
  lastUpdated?: Date | string;
  location?: WeatherLocation | null;
}

export interface WeatherAlert {
  id?: string;
  title: string;
  description: string;
  severity: 'minor' | 'moderate' | 'severe' | 'extreme' | string;
  type?: string;
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
  displayName?: string;
  description?: string;
  url: string;
  status: 'online' | 'offline' | 'unknown' | string;
  category?: string;
  regions?: string[];
  tools?: McpTool[];
  isActive?: boolean;
  lastChecked?: Date | string;
}

export interface McpTool {
  name: string;
  description?: string;
  inputSchema?: object;
}

export interface McpServersStatusResult {
  success: boolean;
  servers?: McpServer[];
  error?: string;
}

// ============================================
// Content Types
// ============================================

export interface ContentItem {
  id: string;
  title: string;
  description?: string;
  type: 'article' | 'video' | 'tip' | 'podcast';
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

export interface NotificationInfo {
  type: string;
  data?: Record<string, unknown>;
  openedAt?: Date | string;
}

export interface LastNotification {
  type: string;
  data?: Record<string, unknown>;
  openedAt: string;
}

// ============================================
// Audio Types
// ============================================

export interface AudioData {
  base64: string;
  format?: string;
  duration?: number;
}

export interface PlaybackStatus {
  isLoaded?: boolean;
  isPlaying?: boolean;
  didJustFinish?: boolean;
  positionMillis?: number;
  durationMillis?: number;
  isBuffering?: boolean;
  error?: string;
}

export interface TTSLocation {
  country?: string;
  state?: string;
  city?: string;
}

// ============================================
// Plant Diagnosis Types
// ============================================

export interface PlantDiagnosisParams {
  imageBase64: string;
  imageType?: string;
  question?: string;
  sessionId?: string;
  language?: string;
  latitude?: number;
  longitude?: number;
  locationDetails?: LocationDetails;
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
  Chat: { sessionId?: string } | undefined;
  History: undefined;
  Settings: undefined;
  LanguageSelect: undefined;
  McpServers: undefined;
  McpServerDetail: { serverId: string };
  Home: undefined;
  ContentDetail: { contentId: string };
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
