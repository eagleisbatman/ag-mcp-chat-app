const express = require('express');
const cloudinary = require('cloudinary').v2;

const app = express();
app.use(express.json({ limit: '50mb' }));

// Environment variables
const API_KEY = process.env.API_KEY;
const PORT = process.env.PORT || 3000;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Auth middleware
const authenticate = (req, res, next) => {
  const providedKey = req.headers['x-api-key'];
  if (!providedKey || providedKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }
  next();
};

// Health check (public)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    cloudinary: !!process.env.CLOUDINARY_CLOUD_NAME,
    database: !!process.env.DATABASE_URL,
    version: '2.0.0',
  });
});

// Debug: Get database stats (requires API key)
app.get('/api/debug/stats', authenticate, async (req, res) => {
  try {
    const { prisma } = require('./src/db');
    const [userCount, sessionCount, messageCount, locationCount] = await Promise.all([
      prisma.user.count(),
      prisma.chatSession.count(),
      prisma.message.count(),
      prisma.userLocation.count(),
    ]);
    
    // Get recent users
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
      },
    });
    
    res.json({
      success: true,
      stats: { userCount, sessionCount, messageCount, locationCount },
      recentUsers,
    });
  } catch (error) {
    console.error('Debug stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// Import routes
const uploadRoutes = require('./src/routes/uploads');
const n8nRoutes = require('./src/routes/n8n');
const userRoutes = require('./src/routes/users');
const sessionRoutes = require('./src/routes/sessions');
const messageRoutes = require('./src/routes/messages');
const mcpRoutes = require('./src/routes/mcp');
const analyticsRoutes = require('./src/routes/analytics');

// Mount routes (all authenticated)
app.use('/api/upload', authenticate, uploadRoutes);
app.use('/api', authenticate, n8nRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/sessions', authenticate, sessionRoutes);
app.use('/api/messages', authenticate, messageRoutes);
app.use('/api/mcp', authenticate, mcpRoutes);
app.use('/api/analytics', authenticate, analyticsRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`API Gateway v2.0 running on port ${PORT}`);
  console.log(`Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME ? 'Configured' : 'Not configured'}`);
});
