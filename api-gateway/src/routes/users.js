// User management routes
const express = require('express');
const { prisma } = require('../db');

const router = express.Router();

/**
 * Register a device / get existing user
 * POST /api/users/register
 */
router.post('/register', async (req, res) => {
  try {
    const { 
      deviceId, deviceName, deviceBrand, deviceModel, 
      deviceOs, deviceOsVersion, appVersion, appBuildNumber 
    } = req.body;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    // Get client IP
    const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
      || req.headers['x-real-ip'] 
      || req.ip;

    // Upsert user
    const user = await prisma.user.upsert({
      where: { deviceId },
      update: {
        deviceName, deviceBrand, deviceModel,
        deviceOs, deviceOsVersion, appVersion, appBuildNumber,
        ipAddress,
        lastActiveAt: new Date(),
      },
      create: {
        deviceId, deviceName, deviceBrand, deviceModel,
        deviceOs, deviceOsVersion, appVersion, appBuildNumber,
        ipAddress,
      },
      include: { preferences: true },
    });

    // Create preferences if not exists
    if (!user.preferences) {
      await prisma.userPreference.create({
        data: { userId: user.id },
      });
    }

    res.json({ success: true, userId: user.id, user });
  } catch (error) {
    console.error('User registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

/**
 * Get current user with preferences
 * GET /api/users/me?deviceId=xxx
 */
router.get('/me', async (req, res) => {
  try {
    const { deviceId } = req.query;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const user = await prisma.user.findUnique({
      where: { deviceId },
      include: { 
        preferences: true,
        locations: { where: { isPrimary: true }, take: 1 },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update last active
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    res.json({ success: true, user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * Update user preferences
 * PUT /api/users/preferences
 */
router.put('/preferences', async (req, res) => {
  try {
    const { deviceId, ...preferences } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const user = await prisma.user.findUnique({ where: { deviceId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updated = await prisma.userPreference.upsert({
      where: { userId: user.id },
      update: preferences,
      create: { userId: user.id, ...preferences },
    });

    res.json({ success: true, preferences: updated });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

/**
 * Save user location (GPS or IP-based)
 * POST /api/users/location
 */
router.post('/location', async (req, res) => {
  try {
    const { deviceId, ...locationData } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const user = await prisma.user.findUnique({ where: { deviceId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Set all existing locations to non-primary
    if (locationData.isPrimary) {
      await prisma.userLocation.updateMany({
        where: { userId: user.id },
        data: { isPrimary: false },
      });
    }

    const location = await prisma.userLocation.create({
      data: {
        userId: user.id,
        isPrimary: true,
        ...locationData,
      },
    });

    // Update preferences with GPS coords if provided
    if (locationData.latitude && locationData.longitude) {
      await prisma.userPreference.update({
        where: { userId: user.id },
        data: {
          gpsLatitude: locationData.latitude,
          gpsLongitude: locationData.longitude,
          gpsStatus: 'granted',
        },
      });
    }

    res.json({ success: true, location });
  } catch (error) {
    console.error('Save location error:', error);
    res.status(500).json({ error: 'Failed to save location' });
  }
});

module.exports = router;

