const express = require('express');
const router = express.Router();
const { prisma } = require('../db');

// GET /api/mcp-servers - List all MCP servers
router.get('/', async (req, res) => {
  try {
    const { category, isGlobal, isActive, isDeployed } = req.query;
    
    const where = {};
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
    const byCategory = {};
    for (const server of servers) {
      if (!byCategory[server.category]) {
        byCategory[server.category] = [];
      }
      byCategory[server.category].push(server);
    }

    res.json({ 
      success: true, 
      servers,
      byCategory,
      counts: {
        total: servers.length,
        global: servers.filter(s => s.isGlobal).length,
        regional: servers.filter(s => !s.isGlobal).length,
        active: servers.filter(s => s.isActive).length,
        deployed: servers.filter(s => s.isDeployed).length,
      },
    });
  } catch (error) {
    console.error('Get MCP servers error:', error);
    res.status(500).json({ error: 'Failed to get MCP servers' });
  }
});

// GET /api/mcp-servers/all-with-status - Get ALL servers with active/inactive status for user's location
router.get('/all-with-status', async (req, res) => {
  try {
    const { lat, lon, countryCode } = req.query;
    
    // 1. Get ALL servers (active or not)
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

    // 2. Determine which regional servers are active for user's location
    let activeRegionalSlugs = new Set();
    let detectedRegions = [];
    
    if (lat && lon) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);
      
      // Find regions containing this point
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
      
      // Get MCP servers mapped to these regions
      if (matchingRegions.length > 0) {
        const regionIds = matchingRegions.map(r => r.id);
        const mappings = await prisma.regionMcpMapping.findMany({
          where: { regionId: { in: regionIds } },
          include: { mcpServer: { select: { slug: true } } },
        });
        mappings.forEach(m => activeRegionalSlugs.add(m.mcpServer.slug));
      }
    }

    // 3. Build response with isActiveForUser flag
    const serversWithStatus = allServers.map(server => ({
      ...server,
      isActiveForUser: server.isGlobal ? server.isActive : activeRegionalSlugs.has(server.slug),
      availabilityReason: server.isGlobal 
        ? 'Available globally' 
        : activeRegionalSlugs.has(server.slug)
          ? `Available in your region`
          : 'Not available in your region',
    }));

    // 4. Group servers
    const activeServers = serversWithStatus.filter(s => s.isActiveForUser);
    const inactiveServers = serversWithStatus.filter(s => !s.isActiveForUser);

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
        global: serversWithStatus.filter(s => s.isGlobal).length,
        regional: serversWithStatus.filter(s => !s.isGlobal).length,
      },
    });
  } catch (error) {
    console.error('Get all MCP servers with status error:', error);
    res.status(500).json({ error: 'Failed to get MCP servers' });
  }
});

// GET /api/mcp-servers/active - Get active servers for user's location
router.get('/active', async (req, res) => {
  try {
    const { lat, lon, countryCode } = req.query;
    
    // 1. Get all global servers
    const globalServers = await prisma.mcpServerRegistry.findMany({
      where: { isGlobal: true, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        category: true,
        tools: true,
        capabilities: true,
        icon: true,
        color: true,
        healthStatus: true,
        endpointEnvVar: true,
      },
    });

    // 2. If location provided, find matching regions
    let regionalServers = [];
    let detectedRegions = [];
    
    if (lat && lon) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lon);
      
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

      detectedRegions = matchingRegions.map(r => ({
        name: r.name,
        code: r.code,
        level: r.level,
      }));

      if (matchingRegions.length > 0) {
        // Build full hierarchy
        const regionIds = [];
        for (const region of matchingRegions) {
          regionIds.push(region.id);
          // Add parent regions
          let currentId = region.parentRegionId;
          while (currentId) {
            regionIds.push(currentId);
            const parent = await prisma.region.findUnique({
              where: { id: currentId },
              select: { parentRegionId: true },
            });
            currentId = parent?.parentRegionId;
          }
        }

        // Get unique region IDs
        const uniqueRegionIds = [...new Set(regionIds)];

        // Get regional MCP servers
        const mappings = await prisma.regionMcpMapping.findMany({
          where: {
            regionId: { in: uniqueRegionIds },
            isActive: true,
          },
          include: {
            region: { select: { name: true, code: true } },
            mcpServer: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                category: true,
                tools: true,
                capabilities: true,
                icon: true,
                color: true,
                healthStatus: true,
                endpointEnvVar: true,
                isActive: true,
              },
            },
          },
          orderBy: { priority: 'asc' },
        });

        // Deduplicate and format
        const seenSlugs = new Set();
        for (const m of mappings) {
          if (!seenSlugs.has(m.mcpServer.slug) && m.mcpServer.isActive) {
            seenSlugs.add(m.mcpServer.slug);
            regionalServers.push({
              ...m.mcpServer,
              sourceRegion: m.region.name,
              sourceRegionCode: m.region.code,
            });
          }
        }
      }
    }

    // 3. Build response with endpoint URLs (from env vars)
    const formatServer = (server) => ({
      ...server,
      endpointUrl: process.env[server.endpointEnvVar] || null,
      endpointEnvVar: undefined, // Don't expose env var name
    });

    res.json({
      success: true,
      location: lat && lon ? { latitude: parseFloat(lat), longitude: parseFloat(lon) } : null,
      detectedRegions,
      global: globalServers.map(formatServer),
      regional: regionalServers.map(formatServer),
      totalActive: globalServers.length + regionalServers.length,
    });
  } catch (error) {
    console.error('Get active MCP servers error:', error);
    res.status(500).json({ error: 'Failed to get active MCP servers' });
  }
});

// GET /api/mcp-servers/by-location - Combined detection + servers
router.get('/by-location', async (req, res) => {
  try {
    const { lat, lon } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'lat and lon are required' });
    }

    // Redirect to /active with same params
    const url = `/api/mcp-servers/active?lat=${lat}&lon=${lon}`;
    res.redirect(307, url);
  } catch (error) {
    console.error('Get MCP servers by location error:', error);
    res.status(500).json({ error: 'Failed to get MCP servers' });
  }
});

// GET /api/mcp-servers/:slug - Get specific MCP server
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const server = await prisma.mcpServerRegistry.findUnique({
      where: { slug },
      include: {
        regionMappings: {
          where: { isActive: true },
          include: {
            region: {
              select: { name: true, code: true, level: true },
            },
          },
        },
      },
    });

    if (!server) {
      return res.status(404).json({ error: 'MCP server not found' });
    }

    // Format regions
    const activeRegions = server.regionMappings.map(m => m.region);

    res.json({
      success: true,
      server: {
        ...server,
        endpointUrl: process.env[server.endpointEnvVar] || null,
        endpointEnvVar: undefined,
        regionMappings: undefined,
        activeRegions,
      },
    });
  } catch (error) {
    console.error('Get MCP server error:', error);
    res.status(500).json({ error: 'Failed to get MCP server' });
  }
});

// POST /api/mcp-servers/:slug/health - Update health status
router.post('/:slug/health', async (req, res) => {
  try {
    const { slug } = req.params;
    const { status } = req.body;

    if (!['healthy', 'unhealthy', 'unknown'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const server = await prisma.mcpServerRegistry.update({
      where: { slug },
      data: {
        healthStatus: status,
        lastHealthCheck: new Date(),
      },
    });

    res.json({ success: true, server: { slug: server.slug, healthStatus: server.healthStatus } });
  } catch (error) {
    console.error('Update MCP server health error:', error);
    res.status(500).json({ error: 'Failed to update health status' });
  }
});

// GET /api/mcp-servers/categories/list - Get all categories
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await prisma.mcpServerRegistry.groupBy({
      by: ['category'],
      _count: true,
    });

    res.json({
      success: true,
      categories: categories.map(c => ({
        name: c.category,
        count: c._count,
      })),
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Failed to get categories' });
  }
});

// GET /api/mcp-servers/health - Aggregated health check for all deployed MCP servers
router.get('/health', async (req, res) => {
  try {
    // Get all deployed MCP servers
    const servers = await prisma.mcpServerRegistry.findMany({
      where: { isActive: true, isDeployed: true },
      select: {
        id: true,
        name: true,
        slug: true,
        endpointEnvVar: true,
        healthStatus: true,
        lastHealthCheck: true,
      },
    });

    const healthResults = [];
    const checkPromises = servers.map(async (server) => {
      const endpoint = process.env[server.endpointEnvVar];
      if (!endpoint) {
        return {
          slug: server.slug,
          name: server.name,
          status: 'unconfigured',
          error: 'Endpoint not configured',
          responseTime: null,
        };
      }

      const startTime = Date.now();
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
        
        const response = await fetch(`${endpoint}/health`, {
          method: 'GET',
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        
        if (response.ok) {
          const data = await response.json().catch(() => ({}));
          return {
            slug: server.slug,
            name: server.name,
            status: 'healthy',
            responseTime,
            details: data,
          };
        } else {
          return {
            slug: server.slug,
            name: server.name,
            status: 'unhealthy',
            responseTime,
            error: `HTTP ${response.status}`,
          };
        }
      } catch (error) {
        return {
          slug: server.slug,
          name: server.name,
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          error: error.name === 'AbortError' ? 'Timeout' : error.message,
        };
      }
    });

    const results = await Promise.all(checkPromises);
    
    // Update health status in database (non-blocking)
    for (const result of results) {
      prisma.mcpServerRegistry.update({
        where: { slug: result.slug },
        data: {
          healthStatus: result.status === 'healthy' ? 'healthy' : 'unhealthy',
          lastHealthCheck: new Date(),
        },
      }).catch(() => {}); // Fire and forget
    }

    const healthy = results.filter(r => r.status === 'healthy').length;
    const unhealthy = results.filter(r => r.status === 'unhealthy').length;
    const unconfigured = results.filter(r => r.status === 'unconfigured').length;

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        total: results.length,
        healthy,
        unhealthy,
        unconfigured,
        healthPercentage: results.length > 0 ? Math.round((healthy / results.length) * 100) : 0,
      },
      servers: results,
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ error: 'Failed to check MCP server health' });
  }
});

module.exports = router;

