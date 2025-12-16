/**
 * AG MCP API Gateway
 * Main entry point for the TypeScript application
 */

import express from 'express';
import cloudinary from 'cloudinary';
import { config } from './config';
import { logger } from './utils/logger';
import { prisma } from './db';
import { apiKeyAuth, authenticate } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/error-handler';

// TypeScript Routes
import aiRouter from './routes/ai';
import mcpServersRouter from './routes/mcp-servers';

// TypeScript Routes (converted)
import uploadRoutes from './routes/uploads';
const userRoutes = require('./routes/users');
const sessionRoutes = require('./routes/sessions');
const messageRoutes = require('./routes/messages');
const mcpRoutes = require('./routes/mcp');
const analyticsRoutes = require('./routes/analytics');
const languagesRoutes = require('./routes/languages');
const regionsRoutes = require('./routes/regions');

const app = express();
app.use(express.json({ limit: '50mb' }));

// Configure Cloudinary
if (config.cloudinary.isConfigured) {
  cloudinary.v2.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  });
}

// Health check (public)
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    cloudinary: config.cloudinary.isConfigured,
    database: !!config.database.url,
    version: '3.0.0',
  });
});

// Debug: Get database stats (requires API key)
app.get('/api/debug/stats', authenticate, async (_req, res) => {
  try {
    const [userCount, sessionCount, messageCount, locationCount] = await Promise.all([
      prisma.user.count(),
      prisma.chatSession.count(),
      prisma.message.count(),
      prisma.userLocation.count(),
    ]);

    const recentUsers = await prisma.user.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        deviceId: true,
        deviceName: true,
        deviceOs: true,
        createdAt: true,
        lastActiveAt: true,
        locations: { take: 1, orderBy: { createdAt: 'desc' } },
        preferences: true,
      },
    });

    res.json({
      success: true,
      stats: { userCount, sessionCount, messageCount, locationCount },
      recentUsers,
    });
  } catch (error) {
    logger.error('Debug stats error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Debug: Clear all test data (requires API key)
app.delete('/api/debug/clear-all', authenticate, async (_req, res) => {
  try {
    const deleted = await prisma.$transaction([
      prisma.analyticsEvent.deleteMany(),
      prisma.mcpCall.deleteMany(),
      prisma.mediaUpload.deleteMany(),
      prisma.message.deleteMany(),
      prisma.chatSession.deleteMany(),
      prisma.userLocation.deleteMany(),
      prisma.userPreference.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    res.json({
      success: true,
      message: 'All data cleared',
      deleted: {
        analyticsEvents: deleted[0].count,
        mcpCalls: deleted[1].count,
        mediaUploads: deleted[2].count,
        messages: deleted[3].count,
        sessions: deleted[4].count,
        locations: deleted[5].count,
        preferences: deleted[6].count,
        users: deleted[7].count,
      },
    });
  } catch (error) {
    logger.error('Clear all error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to clear data' });
  }
});

// Mount routes (all authenticated)
// TypeScript routes
app.use('/api', authenticate, aiRouter);
app.use('/api/mcp-servers', authenticate, mcpServersRouter);

// JavaScript routes (to be converted to TypeScript)
app.use('/api/upload', authenticate, uploadRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/sessions', authenticate, sessionRoutes);
app.use('/api/messages', authenticate, messageRoutes);
app.use('/api/mcp', authenticate, mcpRoutes);
app.use('/api/analytics', authenticate, analyticsRoutes);
app.use('/api/languages', authenticate, languagesRoutes);
app.use('/api/regions', authenticate, regionsRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`API Gateway v3.0 running on port ${PORT}`);
  logger.info(`Database: ${config.database.url ? 'Connected' : 'Not configured'}`);
  logger.info(`Cloudinary: ${config.cloudinary.isConfigured ? 'Configured' : 'Not configured'}`);
});

export default app;
