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
  followUpQuestions?: string[];
  // Message status for thinking/streaming states
  status?: 'thinking' | 'streaming' | 'complete';
  thinkingText?: string; // Text to show during thinking state
  // A2UI widgets attached to this message (from AI)
  a2uiWidgets?: A2UIPayload[];
  a2uiResponseData?: Record<string, unknown>;
  // RationSmart flow step (structured data for localized rendering)
  flowStep?: RationFlowStep;
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
  followUpQuestions?: string[];
  a2uiWidgets?: A2UIPayload[];
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
  weatherIcon?: number | string; // Google Weather uses URL strings
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
  dayIcon?: number | string; // Google Weather uses URL strings
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
  // Profile fields
  name?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  profilePictureUrl?: string;
  role?: UserRole;
  profileCompleteness?: number;
  farmingTypes?: FarmingType[];
  createdAt?: Date | string;
  updatedAt?: Date | string;
  // Backend-returned preferences (from registration)
  preferences?: {
    servicePreferences?: Record<string, unknown>;
    [key: string]: unknown;
  };
}

// ============================================
// Profile & Role Types
// ============================================

export type UserRole = 'farmer' | 'extension_worker' | 'admin';

export type FarmingType =
  | 'agriculture'
  | 'horticulture'
  | 'poultry'
  | 'livestock'
  | 'dairy'
  | 'aquaculture';

/**
 * Full user profile (returned from /api/users/:deviceId/profile)
 */
export interface UserProfile {
  id: string;
  deviceId: string;
  name?: string;
  phone?: string;
  gender?: 'male' | 'female' | 'other';
  profilePictureUrl?: string;
  role: UserRole;
  profileCompleteness: number;
  farmingTypes: FarmingType[];
  farms: Farm[];
  animals: Animal[];
  organizationMemberships: OrganizationMembership[];
}

// ============================================
// Master Data Types (Crops & Livestock reference)
// ============================================

export interface MasterCrop {
  id: string;
  name: string;
  scientificName?: string;
  category?: string;
  growingSeason?: string;
  growthDays?: number;
  cropKey: string;
  translatedName?: string | null;
  aliases?: string[];
}

export interface MasterLivestock {
  id: string;
  name: string;
  scientificName?: string;
  category?: string;
  commonBreeds?: Breed[];
  livestockKey: string;
  translatedName?: string | null;
  aliases?: string[];
}

export interface Breed {
  name: string;
  purpose?: string;
  sourceId?: string;
}

// ============================================
// Farm & Plot Types
// ============================================

export interface Farm {
  id: string;
  userId: string;
  name: string;
  latitude?: number;
  longitude?: number;
  totalAreaHectares?: number;
  dataSource?: 'manual' | 'ai_conversation' | 'extension_worker';
  plots: Plot[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Plot {
  id: string;
  farmId: string;
  name: string;
  areaHectares?: number;
  soilType?: string;
  irrigationType?: 'rainfed' | 'irrigated' | 'mixed';
  cropAllocations: CropAllocation[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CropAllocation {
  id: string;
  plotId: string;
  cropId: string;
  cropName?: string;
  percentageArea?: number;
  season?: string;
  plantingDate?: Date | string;
  expectedHarvestDate?: Date | string;
  status: 'active' | 'planned' | 'planted' | 'growing' | 'flowering' | 'harvested';
}

// ============================================
// Animal & Livestock Types
// ============================================

export type TrackingMode = 'individual' | 'herd';
export type AnimalStatus = 'active' | 'sold' | 'deceased' | 'transferred';
export type LactationStatus = 'lactating' | 'dry' | 'not_applicable';

export interface Animal {
  id: string;
  userId: string;
  livestockId?: string;
  livestockName?: string;
  name?: string;
  tagId?: string;
  trackingMode: TrackingMode;
  herdSize?: number;
  breed?: string;
  gender?: 'male' | 'female';
  dateOfBirth?: Date | string;
  weightKg?: number;
  lactationStatus?: LactationStatus;
  status: AnimalStatus;
  events?: AnimalEvent[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type AnimalEventType =
  | 'vaccination'
  | 'calving'
  | 'health_issue'
  | 'treatment'
  | 'sale'
  | 'death'
  | 'weight_record'
  | 'milk_record'
  | 'breeding'
  | 'deworming';

export interface AnimalEvent {
  id: string;
  animalId: string;
  eventType: AnimalEventType;
  eventDate: Date | string;
  eventData?: Record<string, unknown>;
  notes?: string;
  recordedBy?: string;
  createdAt: Date | string;
}

// ============================================
// Organization Types
// ============================================

export type OrgType =
  | 'cooperative'
  | 'fpo'
  | 'ngo'
  | 'government'
  | 'private'
  | 'research';

export type MemberRole = 'admin' | 'manager' | 'extension_worker' | 'member';
export type MemberStatus = 'pending' | 'approved' | 'rejected';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  orgType: OrgType;
  capabilities: string[];
  phone?: string;
  logoUrl?: string;
  isVerified: boolean;
}

export interface OrganizationMembership {
  id: string;
  organizationId: string;
  organization?: Organization;
  memberRole: MemberRole;
  status: MemberStatus;
  joinedAt?: Date | string;
}

// ============================================
// Farmer-EW Mapping Types
// ============================================

export type MappingStatus = 'pending' | 'approved' | 'rejected' | 'revoked';

export interface FarmerEwMapping {
  id: string;
  farmerId: string;
  ewId: string;
  farmerName?: string;
  ewName?: string;
  status: MappingStatus;
  organizationId?: string;
  createdAt: Date | string;
  farmer?: {
    id: string;
    deviceId: string;
    name?: string;
    phone?: string;
    isProxy?: boolean;
    profileCompleteness?: number;
  };
  ew?: {
    id: string;
    name?: string;
    phone?: string;
  };
  organization?: {
    name: string;
  };
}

// ============================================
// A2UI (Agent-to-UI) Types
// ============================================

export type A2UIWidgetType =
  | 'crop_picker'
  | 'livestock_picker'
  | 'plot_selector'
  | 'farmer_picker'
  | 'number_input'
  | 'date_picker'
  | 'multi_select'
  | 'confirmation'
  | 'form'
  | 'profile_prompt';

export type A2UIStatus = 'pending' | 'responded' | 'expired';

/**
 * A2UI payload sent from AI to trigger structured UI widgets.
 * Supports two purposes:
 * - 'clarify': disambiguation among existing profile entities (e.g. "which crop?")
 * - 'collect': save new data to the farmer's profile (e.g. "add your crops")
 */
export interface A2UIPayload {
  widgetId: string;
  widgetType: A2UIWidgetType;
  title?: string;
  description?: string;
  context?: Record<string, unknown>;
  required?: boolean;
  responseKey?: string;
  /** 'clarify' = disambiguation; 'collect' = save new data to profile */
  purpose?: 'clarify' | 'collect';
  /** DB interaction ID for audit logging — provided by gateway when message is returned */
  interactionId?: string;
}

/**
 * User's structured response to an A2UI widget
 */
export interface A2UIResponse {
  widgetId: string;
  widgetType: A2UIWidgetType;
  responseData: Record<string, unknown>;
  displayText: string; // Human-readable text sent as chat message
}

/**
 * Structured payload from RationSmart conversational flow.
 * Received as 'flow_step' SSE chunks — rendered using i18n keys + data.
 */
export interface RationFlowStep {
  step: string;
  messageKey: string;
  data?: Record<string, unknown>;
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
  status?: 'active' | 'degraded' | 'inactive' | 'coming_soon' | 'online' | 'offline' | 'unknown' | string;
  displayStatus?: 'active' | 'degraded' | 'inactive' | 'coming_soon' | string;
  healthStatus?: 'healthy' | 'unhealthy' | 'unknown' | 'not_deployed' | string;
  tagline?: string;
  category?: string;
  regions?: string[];
  tools?: McpTool[];
  isActive?: boolean;
  isActiveForRegion?: boolean;
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
  onBehalfOfFarmerUserId?: string;
  a2uiResponse?: A2UIResponse;
  connectedFarmerProfileId?: string;
  onChunk?: (text: string) => void;
  onThinking?: (thinking: string) => void;
  onA2UI?: (payload: A2UIPayload) => void;
  onFlowStep?: (flowStep: RationFlowStep) => void;
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
  followUpQuestions?: string[];
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
  followUpQuestions?: string[];
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
  Chat: { sessionId?: string; newSession?: boolean; openCamera?: boolean; onBehalfOfFarmerUserId?: string; onBehalfOfFarmerName?: string; nudgeMessage?: string } | undefined;
  History: undefined;
  Settings: undefined;
  LanguageSelect: undefined;
  McpServers: undefined;
  McpServerDetail: { serverId: string };
  Home: undefined;
  ContentDetail: { contentId: string };
  // Profile & Farm Management
  Profile: undefined;
  FarmList: undefined;
  FarmDetail: { farmId: string };
  FarmEdit: { farmId?: string }; // undefined = new farm
  PlotEdit: { farmId: string; plotId?: string }; // undefined plotId = new plot
  // Livestock Management
  LivestockList: undefined;
  LivestockDetail: { animalId: string };
  LivestockEdit: { animalId?: string }; // undefined = new animal
  LivestockEvent: { animalId: string; eventType?: AnimalEventType };
  // EW Features
  MyFarmers: undefined;
  ConnectFarmer: undefined;
  PendingRequests: undefined;
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
