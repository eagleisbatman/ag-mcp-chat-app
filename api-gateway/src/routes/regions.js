const express = require('express');
const router = express.Router();
const { prisma } = require('../db');

// GET /api/regions - List all regions
router.get('/', async (req, res) => {
  try {
    const { level, active } = req.query;
    
    const where = {};
    if (level !== undefined) where.level = parseInt(level);
    if (active !== undefined) where.isActive = active === 'true';

    const regions = await prisma.region.findMany({
      where,
      orderBy: [{ level: 'asc' }, { displayOrder: 'asc' }],
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        level: true,
        boundsMinLat: true,
        boundsMaxLat: true,
        boundsMinLon: true,
        boundsMaxLon: true,
        isActive: true,
        parentRegionId: true,
        parentRegion: { select: { name: true, code: true } },
      },
    });

    res.json({ success: true, regions });
  } catch (error) {
    console.error('Get regions error:', error);
    res.status(500).json({ error: 'Failed to get regions' });
  }
});

// GET /api/regions/detect - Detect region from lat/lon
router.get('/detect', async (req, res) => {
  try {
    const { lat, lon, countryCode } = req.query;
    
    if (!lat || !lon) {
      return res.status(400).json({ error: 'lat and lon are required' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lon);
    
    // Find regions that contain this point (check bounds)
    const matchingRegions = await prisma.region.findMany({
      where: {
        isActive: true,
        boundsMinLat: { lte: latitude },
        boundsMaxLat: { gte: latitude },
        boundsMinLon: { lte: longitude },
        boundsMaxLon: { gte: longitude },
      },
      orderBy: { level: 'desc' }, // Most specific first
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        level: true,
        parentRegionId: true,
      },
    });

    // Also get Global region
    const globalRegion = await prisma.region.findUnique({
      where: { code: 'GLOBAL' },
      select: { id: true, name: true, code: true, level: true },
    });

    // Build the region hierarchy
    const hierarchy = [];
    if (globalRegion) hierarchy.push(globalRegion);
    
    // Add matching regions from lowest level to highest
    const sortedMatches = matchingRegions.sort((a, b) => a.level - b.level);
    for (const region of sortedMatches) {
      hierarchy.push(region);
    }

    // Primary region is the most specific (highest level)
    const primaryRegion = matchingRegions[0] || globalRegion;

    res.json({
      success: true,
      location: { latitude, longitude },
      primaryRegion,
      regionHierarchy: hierarchy,
      allMatchingRegions: matchingRegions,
    });
  } catch (error) {
    console.error('Detect region error:', error);
    res.status(500).json({ error: 'Failed to detect region' });
  }
});

// GET /api/regions/:code - Get specific region by code
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const region = await prisma.region.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        parentRegion: { select: { name: true, code: true } },
        childRegions: { 
          where: { isActive: true },
          select: { name: true, code: true, level: true },
          orderBy: { displayOrder: 'asc' },
        },
        mcpMappings: {
          where: { isActive: true },
          include: {
            mcpServer: {
              select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                category: true,
                icon: true,
                color: true,
                isActive: true,
              },
            },
          },
          orderBy: { priority: 'asc' },
        },
      },
    });

    if (!region) {
      return res.status(404).json({ error: 'Region not found' });
    }

    // Format MCP servers for response
    const mcpServers = region.mcpMappings.map(m => ({
      ...m.mcpServer,
      priority: m.priority,
    }));

    res.json({
      success: true,
      region: {
        ...region,
        mcpMappings: undefined, // Remove raw mappings
        mcpServers,
      },
    });
  } catch (error) {
    console.error('Get region error:', error);
    res.status(500).json({ error: 'Failed to get region' });
  }
});

// GET /api/regions/:code/mcp-servers - Get MCP servers for a region (including inherited)
router.get('/:code/mcp-servers', async (req, res) => {
  try {
    const { code } = req.params;
    const { includeGlobal = 'true' } = req.query;

    const region = await prisma.region.findUnique({
      where: { code: code.toUpperCase() },
      include: { parentRegion: true },
    });

    if (!region) {
      return res.status(404).json({ error: 'Region not found' });
    }

    // Collect all region IDs in hierarchy
    const regionIds = [region.id];
    let currentRegion = region;
    while (currentRegion.parentRegionId) {
      regionIds.push(currentRegion.parentRegionId);
      currentRegion = await prisma.region.findUnique({
        where: { id: currentRegion.parentRegionId },
      });
      if (!currentRegion) break;
    }

    // Get MCP servers from all regions in hierarchy
    const regionalMappings = await prisma.regionMcpMapping.findMany({
      where: {
        regionId: { in: regionIds },
        isActive: true,
      },
      include: {
        region: { select: { name: true, code: true, level: true } },
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
            isActive: true,
            isDeployed: true,
            healthStatus: true,
          },
        },
      },
      orderBy: { priority: 'asc' },
    });

    // Get global MCP servers if requested
    let globalServers = [];
    if (includeGlobal === 'true') {
      globalServers = await prisma.mcpServerRegistry.findMany({
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
          isActive: true,
          isDeployed: true,
          healthStatus: true,
        },
      });
    }

    // Deduplicate (same server might be in multiple regions)
    const seenSlugs = new Set();
    const regionalServers = [];
    for (const mapping of regionalMappings) {
      if (!seenSlugs.has(mapping.mcpServer.slug)) {
        seenSlugs.add(mapping.mcpServer.slug);
        regionalServers.push({
          ...mapping.mcpServer,
          sourceRegion: mapping.region,
          priority: mapping.priority,
        });
      }
    }

    res.json({
      success: true,
      region: { name: region.name, code: region.code, level: region.level },
      globalServers,
      regionalServers,
      totalActive: globalServers.length + regionalServers.length,
    });
  } catch (error) {
    console.error('Get region MCP servers error:', error);
    res.status(500).json({ error: 'Failed to get MCP servers for region' });
  }
});

module.exports = router;

