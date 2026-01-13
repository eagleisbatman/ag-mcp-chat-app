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

export interface ApiResult<T = unknown> {
  success: boolean;
  error?: string;
  data?: T;
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
  diagnosisData?: DiagnosisData | string | Record<string, unknown>;
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

export interface HistoryMessage {
  _id?: string;
  text: string;
  isBot: boolean;
}

export interface ChatMetadata {
  intentsDetected?: string[];
  mcpToolsUsed?: string[];
  extractedEntities?: Record<string, unknown> | null;
  intentSource?: string;
  [key: string]: unknown;
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
  latitude: number | null;
  longitude: number | null;
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
  isPrimary?: boolean;
  // Added fields for consistency with db.ts
  city?: string;
  district?: string;
  state?: string;
  regionName?: string;
  country?: string;
}

export interface LocationContext {
  country?: string;
  state?: string;
  district?: string;
  city?: string;
  locality?: string;
  displayName?: string;
}

export interface LocationLookupResult extends ApiResult {
  latitude?: number;
  longitude?: number;
  source?: string;
  displayName?: string;
  formattedAddress?: string;
  level1Country?: string;
  level1CountryCode?: string;
  level2State?: string;
  level3District?: string;
  level4SubDistrict?: string;
  level5City?: string;
  level6Locality?: string;
  city?: string;
  district?: string;
  state?: string;
  regionName?: string;
  country?: string;
}

export interface LocationData {
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
  level6Locality?: string;
  source?: 'gps' | 'ip' | 'manual' | string;
  isPrimary?: boolean;
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
  region: string; // Made required to match constants/languages.ts
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
  id?: string;
  userId?: string;
  deviceId?: string;
  preferredLanguage?: string;
  language?: string;
  location?: LocationData | LocationDetails;
  themeMode?: ThemeMode;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface UserPreferences {
  language?: string;
  themeMode?: ThemeMode;
  notificationsEnabled?: boolean;
}

export interface UserResult extends ApiResult {
  userId?: string;
  user?: User;
}

// ============================================
// MCP Server Types
// ============================================

export interface McpServer {
  id: string;
  slug: string;
  name: string;
  displayName?: string;
  description?: string;
  url?: string;
  status?: 'online' | 'offline' | 'unknown' | string;
  healthStatus?: string;
  tagline?: string;
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

export interface McpServersResult {
  success: boolean;
  global?: McpServer[];
  regional?: McpServer[];
  detectedRegions?: string[];
  totalActive?: number;
  error?: string;
}

export interface McpServersStatusResult {
  success: boolean;
  servers?: McpServer[];
  grouped?: {
    active: McpServer[];
    degraded: McpServer[];
    inactive: McpServer[];
    comingSoon: McpServer[];
  };
  counts?: {
    total: number;
    active: number;
    degraded: number;
    inactive: number;
    comingSoon: number;
  };
  error?: string;
}

export interface McpServerResult {
  success: boolean;
  server?: McpServer | null;
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
// Chat API Types
// ============================================

export interface ClientDateTime {
  isoDateTime: string;
  localDateTime: string;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  timezone: string;
  utcOffset: string;
}

export interface StreamingChatParams {
  message: string;
  latitude?: number;
  longitude?: number;
  language?: string;
  locationDetails?: LocationDetails;
  history?: HistoryMessage[];
  sessionId?: string;
  onChunk?: (text: string) => void;
  onThinking?: (thinking: string) => void;
  onComplete?: (fullResponse: string, metadata: ChatMetadata) => void;
  onError?: (error: Error) => void;
}

export interface ChatParams {
  message: string;
  latitude?: number;
  longitude?: number;
  language?: string;
  locationDetails?: LocationDetails;
  history?: HistoryMessage[];
  sessionId?: string;
}

export interface ChatResult {
  success: boolean;
  response?: string;
  region?: string;
  language?: string;
  error?: string;
}

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

export interface PlantDiagnosisResult {
  success: boolean;
  response?: string;
  diagnosis?: Record<string, unknown>;
  metadata?: ChatMetadata;
  error?: string;
}

export interface RegionsResult {
  success: boolean;
  regions?: string[];
  error?: string;
}

export interface SessionResult extends ApiResult {
  session?: Session;
  sessions?: Session[];
  messages?: Message[];
}

export interface MessageResult extends ApiResult {
  message?: Message;
  messages?: Message[];
}

export interface TitleResult extends ApiResult {
  title?: string;
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
  Chat: { sessionId?: string; newSession?: boolean; openCamera?: boolean } | undefined;
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
