/**
 * MCP Registry Service
 * Handles MCP server queries and location-based server selection
 */

import { prisma } from '../../db';
import {
  McpServer,
  McpServersForLocation,
  DetectedRegion,
} from '../../types';

interface ServerSelectFields {
  id?: boolean;
  name?: boolean;
  slug?: boolean;
  description?: boolean;
  category?: boolean;
  isGlobal?: boolean;
  tools?: boolean;
  capabilities?: boolean;
  icon?: boolean;
  color?: boolean;
  isActive?: boolean;
  isDeployed?: boolean;
  healthStatus?: boolean;
  endpointEnvVar?: boolean;
}

const DEFAULT_SERVER_FIELDS: ServerSelectFields = {
  slug: true,
  name: true,
  category: true,
  tools: true,
  capabilities: true,
  endpointEnvVar: true,
};

const EXTENDED_SERVER_FIELDS: ServerSelectFields = {
  ...DEFAULT_SERVER_FIELDS,
  id: true,
  description: true,
  icon: true,
  color: true,
  isActive: true,
  isDeployed: true,
  healthStatus: true,
};

/**
 * Build region hierarchy - traverses parent regions
 */
async function buildRegionHierarchy(regionIds: string[]): Promise<string[]> {
  const allIds = new Set<string>(regionIds);

  for (const regionId of regionIds) {
    let currentId: string | null = regionId;

    while (currentId) {
      const parentResult: { parentRegionId: string | null } | null =
        await prisma.region.findUnique({
          where: { id: currentId },
          select: { parentRegionId: true },
        });

      if (!parentResult?.parentRegionId) break;

      allIds.add(parentResult.parentRegionId);
      currentId = parentResult.parentRegionId;
    }
  }

  return Array.from(allIds);
}

/**
 * Find regions containing a geographic point
 */
async function findRegionsForCoordinates(
  latitude: number,
  longitude: number
): Promise<DetectedRegion[]> {
  const regions = await prisma.region.findMany({
    where: {
      isActive: true,
      boundsMinLat: { lte: latitude },
      boundsMaxLat: { gte: latitude },
      boundsMinLon: { lte: longitude },
      boundsMaxLon: { gte: longitude },
    },
    select: {
      id: true,
      name: true,
      code: true,
      level: true,
      parentRegionId: true,
    },
    orderBy: { level: 'desc' },
  });

  return regions.map((r) => ({
    name: r.name,
    code: r.code,
    level: r.level,
  }));
}

/**
 * Format server with endpoint URL
 */
function formatServerWithEndpoint(server: Record<string, unknown>): McpServer {
  const endpointEnvVar = server.endpointEnvVar as string | undefined;

  return {
    slug: server.slug as string,
    name: server.name as string,
    category: server.category as McpServer['category'],
    tools: (server.tools as string[]) || [],
    capabilities: (server.capabilities as string[]) || [],
    endpoint: endpointEnvVar ? process.env[endpointEnvVar] || null : null,
    sourceRegion: server.sourceRegion as string | undefined,
  };
}

/**
 * Get active MCP servers for a location
 * This is the core function used by both ai.js and mcp-servers.js
 */
export async function getActiveMcpServersForLocation(
  latitude: number | null,
  longitude: number | null
): Promise<McpServersForLocation> {
  try {
    // 1. Get all global servers (must be active AND deployed)
    const globalServers = await prisma.mcpServerRegistry.findMany({
      where: { isGlobal: true, isActive: true, isDeployed: true },
      select: DEFAULT_SERVER_FIELDS,
    });

    let regionalServers: McpServer[] = [];
    let detectedRegions: DetectedRegion[] = [];

    // 2. If location provided, find matching regions and their servers
    if (latitude !== null && longitude !== null) {
      // Find regions containing this point
      const matchingRegions = await prisma.region.findMany({
        where: {
          isActive: true,
          boundsMinLat: { lte: latitude },
          boundsMaxLat: { gte: latitude },
          boundsMinLon: { lte: longitude },
          boundsMaxLon: { gte: longitude },
        },
        orderBy: { level: 'desc' },
      });

      detectedRegions = matchingRegions.map((r) => ({
        name: r.name,
        code: r.code,
        level: r.level,
      }));

      if (matchingRegions.length > 0) {
        // Build full region hierarchy
        const regionIds = matchingRegions.map((r) => r.id);
        const uniqueRegionIds = await buildRegionHierarchy(regionIds);

        // Get regional MCP servers via mappings
        const mappings = await prisma.regionMcpMapping.findMany({
          where: {
            regionId: { in: uniqueRegionIds },
            isActive: true,
          },
          include: {
            region: { select: { name: true, code: true } },
            mcpServer: {
              select: {
                ...DEFAULT_SERVER_FIELDS,
                isActive: true,
                isDeployed: true,
              },
            },
          },
          orderBy: { priority: 'asc' },
        });

        // Deduplicate and filter (must be active AND deployed)
        const seenSlugs = new Set<string>();
        for (const m of mappings) {
          const server = m.mcpServer as Record<string, unknown>;
          const slug = server.slug as string;

          if (!seenSlugs.has(slug) && server.isActive && server.isDeployed) {
            seenSlugs.add(slug);
            regionalServers.push(formatServerWithEndpoint({
              ...server,
              sourceRegion: m.region.name,
            }));
          }
        }
      }
    }

    // 3. Format global servers with endpoints
    const formattedGlobal = globalServers
      .map((s) => formatServerWithEndpoint(s as Record<string, unknown>))
      .filter((s) => s.endpoint);

    const formattedRegional = regionalServers.filter((s) => s.endpoint);

    return {
      global: formattedGlobal,
      regional: formattedRegional,
      detectedRegions,
    };
  } catch (error) {
    console.error('[MCP Registry] Error getting servers for location:', error);
    return { global: [], regional: [], detectedRegions: [] };
  }
}

/**
 * Get all MCP servers (for admin/listing)
 */
export async function getAllMcpServers(filters?: {
  category?: string;
  isGlobal?: boolean;
  isActive?: boolean;
  isDeployed?: boolean;
}) {
  const where: Record<string, unknown> = {};

  if (filters?.category) where.category = filters.category;
  if (filters?.isGlobal !== undefined) where.isGlobal = filters.isGlobal;
  if (filters?.isActive !== undefined) where.isActive = filters.isActive;
  if (filters?.isDeployed !== undefined) where.isDeployed = filters.isDeployed;

  return prisma.mcpServerRegistry.findMany({
    where,
    orderBy: [{ isGlobal: 'desc' }, { category: 'asc' }, { name: 'asc' }],
    select: EXTENDED_SERVER_FIELDS,
  });
}

/**
 * Get MCP server by slug
 */
export async function getMcpServerBySlug(slug: string) {
  return prisma.mcpServerRegistry.findUnique({
    where: { slug },
    include: {
      regionMappings: {
        include: {
          region: { select: { name: true, code: true, level: true } },
        },
      },
    },
  });
}

export { buildRegionHierarchy, findRegionsForCoordinates };
