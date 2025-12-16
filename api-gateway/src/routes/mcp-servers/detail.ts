/**
 * MCP Server Detail Routes
 * Handles individual server lookup and tools
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../db';
import { logger } from '../../utils/logger';
import { asyncHandler, Errors } from '../../middleware/error-handler';
import { getMcpServerBySlug } from '../../services/mcp';

const router = Router();

/**
 * GET /api/mcp-servers/:slug
 * Get a specific MCP server by slug
 */
router.get(
  '/:slug',
  asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;

    const server = await getMcpServerBySlug(slug);

    if (!server) {
      throw Errors.notFound('MCP server');
    }

    // Get regions where this server is available
    const regions = server.regionMappings?.map((m) => ({
      name: m.region.name,
      code: m.region.code,
      level: m.region.level,
    })) || [];

    res.json({
      success: true,
      server: {
        ...server,
        availableRegions: regions,
        regionMappings: undefined,
      },
    });
  })
);

/**
 * GET /api/mcp-servers/:slug/tools
 * Get tools available for a specific MCP server
 */
router.get(
  '/:slug/tools',
  asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;

    const server = await prisma.mcpServerRegistry.findUnique({
      where: { slug },
      select: {
        slug: true,
        name: true,
        tools: true,
        capabilities: true,
        endpointEnvVar: true,
        isActive: true,
        isDeployed: true,
      },
    });

    if (!server) {
      throw Errors.notFound('MCP server');
    }

    // If server has an endpoint and is active, try to get live tools
    const endpoint = server.endpointEnvVar
      ? process.env[server.endpointEnvVar]
      : null;

    let liveTools: unknown[] | null = null;

    if (endpoint && server.isActive && server.isDeployed) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(`${endpoint}/mcp`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json, text/event-stream',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/list',
            params: {},
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const text = await response.text();
        const dataLine = text.split('\n').find((l) => l.startsWith('data: '));
        if (dataLine) {
          const data = JSON.parse(dataLine.replace('data: ', ''));
          if (data.result?.tools) {
            liveTools = data.result.tools;
          }
        }
      } catch (err) {
        logger.warn('[MCP Tools] Failed to get live tools', {
          slug,
          error: (err as Error).message,
        });
      }
    }

    res.json({
      success: true,
      slug: server.slug,
      name: server.name,
      tools: liveTools || server.tools,
      capabilities: server.capabilities,
      isLive: !!liveTools,
    });
  })
);

export default router;
