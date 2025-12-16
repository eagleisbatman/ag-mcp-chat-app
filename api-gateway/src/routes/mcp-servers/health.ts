/**
 * MCP Server Health Routes
 * Handles health status checking for MCP servers
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../../db';
import { logger } from '../../utils/logger';
import { asyncHandler } from '../../middleware/error-handler';

const router = Router();

const HEALTH_CHECK_TIMEOUT = 10000; // 10 seconds

interface HealthCheckResult {
  slug: string;
  name: string;
  status: 'healthy' | 'unhealthy' | 'unavailable';
  responseTime?: number;
  error?: string;
  lastCheck: Date;
}

/**
 * Check health of a single MCP server
 */
async function checkServerHealth(
  server: { slug: string; name: string; endpointEnvVar: string | null }
): Promise<HealthCheckResult> {
  const startTime = Date.now();

  if (!server.endpointEnvVar) {
    return {
      slug: server.slug,
      name: server.name,
      status: 'unavailable',
      error: 'No endpoint configured',
      lastCheck: new Date(),
    };
  }

  const endpoint = process.env[server.endpointEnvVar];
  if (!endpoint) {
    return {
      slug: server.slug,
      name: server.name,
      status: 'unavailable',
      error: 'Endpoint environment variable not set',
      lastCheck: new Date(),
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

    const response = await fetch(`${endpoint}/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        slug: server.slug,
        name: server.name,
        status: 'healthy',
        responseTime,
        lastCheck: new Date(),
      };
    }

    return {
      slug: server.slug,
      name: server.name,
      status: 'unhealthy',
      responseTime,
      error: `HTTP ${response.status}`,
      lastCheck: new Date(),
    };
  } catch (error) {
    const err = error as Error;
    return {
      slug: server.slug,
      name: server.name,
      status: 'unhealthy',
      error: err.name === 'AbortError' ? 'Timeout' : err.message,
      lastCheck: new Date(),
    };
  }
}

/**
 * GET /api/mcp-servers/health
 * Get health status of all deployed servers
 */
router.get(
  '/health',
  asyncHandler(async (req: Request, res: Response) => {
    const servers = await prisma.mcpServerRegistry.findMany({
      where: { isDeployed: true },
      select: {
        slug: true,
        name: true,
        endpointEnvVar: true,
        healthStatus: true,
        lastHealthCheck: true,
      },
    });

    const results = await Promise.all(
      servers.map((server) => checkServerHealth(server))
    );

    // Update health status in database
    for (const result of results) {
      await prisma.mcpServerRegistry.update({
        where: { slug: result.slug },
        data: {
          healthStatus: result.status,
          lastHealthCheck: result.lastCheck,
        },
      }).catch((err) => {
        logger.warn('[Health] Failed to update status', { slug: result.slug, error: err.message });
      });
    }

    const healthy = results.filter((r) => r.status === 'healthy').length;
    const unhealthy = results.filter((r) => r.status === 'unhealthy').length;
    const unavailable = results.filter((r) => r.status === 'unavailable').length;

    res.json({
      success: true,
      results,
      summary: {
        total: results.length,
        healthy,
        unhealthy,
        unavailable,
        healthPercentage: results.length > 0 ? Math.round((healthy / results.length) * 100) : 0,
      },
    });
  })
);

/**
 * GET /api/mcp-servers/:slug/health
 * Get health status of a specific server
 */
router.get(
  '/:slug/health',
  asyncHandler(async (req: Request, res: Response) => {
    const { slug } = req.params;

    const server = await prisma.mcpServerRegistry.findUnique({
      where: { slug },
      select: {
        slug: true,
        name: true,
        endpointEnvVar: true,
      },
    });

    if (!server) {
      res.status(404).json({ success: false, error: 'Server not found' });
      return;
    }

    const result = await checkServerHealth(server);

    // Update in database
    await prisma.mcpServerRegistry.update({
      where: { slug },
      data: {
        healthStatus: result.status,
        lastHealthCheck: result.lastCheck,
      },
    }).catch(() => {});

    res.json({ success: true, ...result });
  })
);

export default router;
