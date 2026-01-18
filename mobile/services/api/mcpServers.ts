import { fetchWithTimeout, parseErrorMessage } from '../../utils/apiHelpers';
import type { McpServerResult, McpServersResult, McpServersStatusResult } from '../../types';
import { API_BASE_URL, API_KEY, DEFAULT_TIMEOUT_MS } from './core';

/**
 * Get active MCP servers for user's location
 */
export const getActiveMcpServers = async ({ lat, lon }: { lat?: number; lon?: number } = {}): Promise<McpServersResult> => {
  try {
    const queryParams = new URLSearchParams();
    if (lat !== undefined) queryParams.append('lat', lat.toString());
    if (lon !== undefined) queryParams.append('lon', lon.toString());

    const url = `${API_BASE_URL}/api/mcp-servers/active${queryParams.toString() ? `?${queryParams}` : ''}`;
    const response = await fetchWithTimeout(url, {
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    }, DEFAULT_TIMEOUT_MS);

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();

    return {
      success: true,
      global: data.global || [],
      regional: data.regional || [],
      detectedRegions: data.detectedRegions || [],
      totalActive: data.totalActive || 0,
    };
  } catch (error) {
    return {
      success: false,
      error: parseErrorMessage(error),
      global: [],
      regional: [],
      detectedRegions: [],
      totalActive: 0,
    };
  }
};

/**
 * Get ALL MCP servers with active/inactive status
 */
export const getAllMcpServersWithStatus = async ({ lat, lon }: { lat?: number; lon?: number } = {}): Promise<McpServersStatusResult> => {
  try {
    const queryParams = new URLSearchParams();
    if (lat !== undefined) queryParams.append('lat', lat.toString());
    if (lon !== undefined) queryParams.append('lon', lon.toString());

    const url = `${API_BASE_URL}/api/mcp-servers/all-with-status?${queryParams}`;
    const response = await fetchWithTimeout(url, {
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    }, DEFAULT_TIMEOUT_MS);

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    return { success: false, error: parseErrorMessage(error) };
  }
};

/**
 * Get LIVE status of all MCP servers
 */
export const getMcpServersLiveStatus = async ({ lat, lon }: { lat?: number; lon?: number } = {}): Promise<McpServersStatusResult> => {
  try {
    const queryParams = new URLSearchParams();
    if (lat !== undefined) queryParams.append('lat', lat.toString());
    if (lon !== undefined) queryParams.append('lon', lon.toString());

    const url = `${API_BASE_URL}/api/mcp-servers/live-status?${queryParams}`;
    const response = await fetchWithTimeout(url, {
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    }, DEFAULT_TIMEOUT_MS);

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();

    // Debug: Log weather-related servers
    const weatherServers = data.servers?.filter((s: any) => ['accuweather', 'tomorrow-io', 'google-weather'].includes(s.slug));
    console.log('[API] getMcpServersLiveStatus - weather servers:', weatherServers?.map((s: any) => ({
      slug: s.slug,
      status: s.status,
      healthStatus: s.healthStatus,
      isActive: s.isActive,
      isActiveForRegion: s.isActiveForRegion,
    })));

    return { success: true, ...data };
  } catch (error) {
    return {
      success: false,
      error: parseErrorMessage(error),
      servers: [],
      grouped: { active: [], degraded: [], inactive: [], comingSoon: [] },
      counts: { total: 0, active: 0, degraded: 0, inactive: 0, comingSoon: 0 },
    };
  }
};

/**
 * Get a specific MCP server by slug
 */
export const getMcpServer = async (slug: string): Promise<McpServerResult> => {
  try {
    const url = `${API_BASE_URL}/api/mcp-servers/${slug}`;
    const response = await fetchWithTimeout(url, {
      headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    }, DEFAULT_TIMEOUT_MS);

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();

    return { success: true, server: data.server };
  } catch (error) {
    return { success: false, error: parseErrorMessage(error), server: null };
  }
};
