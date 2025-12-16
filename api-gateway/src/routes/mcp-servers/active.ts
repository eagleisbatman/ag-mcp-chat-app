/**
 * Active MCP Servers Route
 * Returns active servers for a user's location
 */

import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { asyncHandler } from '../../middleware/error-handler';
import { getActiveMcpServersForLocation } from '../../services/mcp';

const router = Router();

/**
 * GET /api/mcp-servers/active
 * Get active servers for user's location
 */
router.get(
  '/active',
  asyncHandler(async (req: Request, res: Response) => {
    const { lat, lon } = req.query;

    const latitude = lat ? parseFloat(String(lat)) : null;
    const longitude = lon ? parseFloat(String(lon)) : null;

    logger.info('[MCP Servers] Getting active servers', { latitude, longitude });

    const result = await getActiveMcpServersForLocation(latitude, longitude);

    // Format servers for the response (hide internal fields)
    const formatServer = (server: { slug: string; name: string; category: string; tools: string[]; capabilities: string[]; sourceRegion?: string }) => ({
      slug: server.slug,
      name: server.name,
      category: server.category,
      tools: server.tools,
      capabilities: server.capabilities,
      sourceRegion: server.sourceRegion,
      // Omit endpoint URLs for security
    });

    res.json({
      success: true,
      global: result.global.map(formatServer),
      regional: result.regional.map(formatServer),
      detectedRegions: result.detectedRegions,
      counts: {
        global: result.global.length,
        regional: result.regional.length,
        total: result.global.length + result.regional.length,
      },
    });
  })
);

export default router;
