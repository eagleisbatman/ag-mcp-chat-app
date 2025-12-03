// MCP call logging routes
const express = require('express');
const { prisma } = require('../db');

const router = express.Router();

/**
 * Log an MCP call
 * POST /api/mcp/log
 */
router.post('/log', async (req, res) => {
  try {
    const {
      deviceId, messageId, sessionId,
      mcpServerName, mcpServerUrl, mcpServerVersion,
      toolName, toolDescription, requestId, requestParams,
      requestLanguage, requestLatitude, requestLongitude, requestLocationName,
      responseData, responseStatus, responseErrorCode, responseErrorMessage,
      latencyMs,
    } = req.body;

    if (!deviceId || !mcpServerName || !toolName) {
      return res.status(400).json({ error: 'deviceId, mcpServerName, and toolName are required' });
    }

    const user = await prisma.user.findUnique({ where: { deviceId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const mcpCall = await prisma.mcpCall.create({
      data: {
        userId: user.id, messageId, sessionId,
        mcpServerName, mcpServerUrl, mcpServerVersion,
        toolName, toolDescription, requestId, requestParams: requestParams || {},
        requestLanguage, requestLatitude, requestLongitude, requestLocationName,
        responseData, responseStatus, responseErrorCode, responseErrorMessage,
        latencyMs,
        completedAt: responseStatus ? new Date() : null,
      },
    });

    res.json({ success: true, mcpCallId: mcpCall.id });
  } catch (error) {
    console.error('Log MCP call error:', error);
    res.status(500).json({ error: 'Failed to log MCP call' });
  }
});

/**
 * Get MCP calls for a user/session
 * GET /api/mcp/calls?deviceId=xxx&sessionId=xxx&limit=50
 */
router.get('/calls', async (req, res) => {
  try {
    const { deviceId, sessionId, mcpServerName, limit = 50, offset = 0 } = req.query;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const user = await prisma.user.findUnique({ where: { deviceId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const whereClause = { userId: user.id };
    if (sessionId) whereClause.sessionId = sessionId;
    if (mcpServerName) whereClause.mcpServerName = mcpServerName;

    const calls = await prisma.mcpCall.findMany({
      where: whereClause,
      orderBy: { calledAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
    });

    res.json({ success: true, calls });
  } catch (error) {
    console.error('Get MCP calls error:', error);
    res.status(500).json({ error: 'Failed to get MCP calls' });
  }
});

module.exports = router;

