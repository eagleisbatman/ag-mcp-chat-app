/**
 * MCP Servers List Routes
 * Handles listing and filtering MCP servers
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../db';
import { logger } from '../../utils/logger';
import { asyncHandler } from '../../middleware/error-handler';

const router = Router();

interface McpServer {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category: string;
  isGlobal: boolean;
  tools: string[];
  capabilities: string[];
  icon?: string;
  color?: string;
  isActive: boolean;
  isDeployed: boolean;
  healthStatus?: string;
  lastHealthCheck?: Date;
}

/**
 * GET /api/mcp-servers
 * List all MCP servers with optional filtering
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { category, isGlobal, isActive, isDeployed } = req.query;

    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (isGlobal !== undefined) where.isGlobal = isGlobal === 'true';
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (isDeployed !== undefined) where.isDeployed = isDeployed === 'true';

    const servers = await prisma.mcpServerRegistry.findMany({
      where,
      orderBy: [{ isGlobal: 'desc' }, { category: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        category: true,
        isGlobal: true,
        tools: true,
        capabilities: true,
        icon: true,
        color: true,
        isActive: true,
        isDeployed: true,
        healthStatus: true,
        lastHealthCheck: true,
      },
    });

    // Group by category
    const byCategory: Record<string, McpServer[]> = {};
    for (const server of servers) {
      const cat = server.category;
      if (!byCategory[cat]) {
        byCategory[cat] = [];
      }
      byCategory[cat].push(server as unknown as McpServer);
    }

    res.json({
      success: true,
      servers,
      byCategory,
      counts: {
        total: servers.length,
        global: servers.filter((s) => s.isGlobal).length,
        regional: servers.filter((s) => !s.isGlobal).length,
        active: servers.filter((s) => s.isActive).length,
        deployed: servers.filter((s) => s.isDeployed).length,
      },
    });
  })
);

/**
 * GET /api/mcp-servers/all-with-status
 * Get all servers with active/inactive status for user's location
 */
router.get(
  '/all-with-status',
  asyncHandler(async (req: Request, res: Response) => {
    const { lat, lon } = req.query;

    // Get all servers
    const allServers = await prisma.mcpServerRegistry.findMany({
      orderBy: [{ isGlobal: 'desc' }, { category: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        category: true,
        isGlobal: true,
        tools: true,
        capabilities: true,
        icon: true,
        color: true,
        isActive: true,
        isDeployed: true,
        healthStatus: true,
      },
    });

    // Determine which regional servers are active for user's location
    let activeRegionalSlugs = new Set<string>();
    let detectedRegions: Array<{ id: string; name: string; code: string; level: number }> = [];

    if (lat && lon) {
      const latitude = parseFloat(String(lat));
      const longitude = parseFloat(String(lon));

      const matchingRegions = await prisma.region.findMany({
        where: {
          isActive: true,
          boundsMinLat: { lte: latitude },
          boundsMaxLat: { gte: latitude },
          boundsMinLon: { lte: longitude },
          boundsMaxLon: { gte: longitude },
        },
        select: { id: true, name: true, code: true, level: true },
        orderBy: { level: 'desc' },
      });

      detectedRegions = matchingRegions;

      if (matchingRegions.length > 0) {
        const regionIds = matchingRegions.map((r) => r.id);
        const mappings = await prisma.regionMcpMapping.findMany({
          where: { regionId: { in: regionIds } },
          include: { mcpServer: { select: { slug: true } } },
        });
        mappings.forEach((m) => activeRegionalSlugs.add(m.mcpServer.slug));
      }
    }

    // Build response with isActiveForUser flag
    const serversWithStatus = allServers.map((server) => ({
      ...server,
      isActiveForUser: server.isGlobal ? server.isActive : activeRegionalSlugs.has(server.slug),
      availabilityReason: server.isGlobal
        ? 'Available globally'
        : activeRegionalSlugs.has(server.slug)
          ? 'Available in your region'
          : 'Not available in your region',
    }));

    const activeServers = serversWithStatus.filter((s) => s.isActiveForUser);
    const inactiveServers = serversWithStatus.filter((s) => !s.isActiveForUser);

    res.json({
      success: true,
      allServers: serversWithStatus,
      activeServers,
      inactiveServers,
      detectedRegions,
      counts: {
        total: serversWithStatus.length,
        activeForUser: activeServers.length,
        inactiveForUser: inactiveServers.length,
        global: serversWithStatus.filter((s) => s.isGlobal).length,
        regional: serversWithStatus.filter((s) => !s.isGlobal).length,
      },
    });
  })
);

export default router;
