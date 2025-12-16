// User management routes
const express = require('express');
const { prisma } = require('../db');

const router = express.Router();

// IP-API for IP geolocation (replaces n8n)
const IP_API_URL = 'http://ip-api.com/json';

/**
 * Helper: Lookup IP geolocation via IP-API (direct call)
 */
async function lookupIpLocation(ipAddress) {
  try {
    // Skip for local addresses
    if (ipAddress === '127.0.0.1' || ipAddress === '::1' || ipAddress.startsWith('192.168.')) {
      return null;
    }

    const url = `${IP_API_URL}/${ipAddress}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp`;

    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.error('[IP Lookup] API error:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.status !== 'success') {
      console.error('[IP Lookup] API returned error:', data.message);
      return null;
    }

    // Map to expected format
    return {
      success: true,
      level1Country: data.country,
      level1CountryCode: data.countryCode,
      level2State: data.regionName,
      level5City: data.city,
      isp: data.isp,
      timezone: data.timezone,
      displayName: data.city ? `${data.city}, ${data.country}` : data.country,
      formattedAddress: [data.city, data.regionName, data.country].filter(Boolean).join(', '),
    };
  } catch (error) {
    console.error('[IP Lookup] Error:', error.message);
    return null;
  }
}

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

    // Check if user exists (to decide if we need IP lookup)
    const existingUser = await prisma.user.findUnique({ where: { deviceId } });
    const needsIpLookup = !existingUser || !existingUser.ipCountry;

    // Upsert user
    let user = await prisma.user.upsert({
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

    // Perform IP lookup if needed (async, don't block response)
    if (needsIpLookup && ipAddress && ipAddress !== '127.0.0.1' && ipAddress !== '::1') {
      lookupIpLocation(ipAddress).then(async (ipData) => {
        if (ipData) {
          console.log(`IP lookup for ${ipAddress}:`, ipData.level1Country, ipData.level5City);
          // Update user with IP geolocation
          await prisma.user.update({
            where: { id: user.id },
            data: {
              ipCountry: ipData.level1Country,
              ipRegion: ipData.level2State,
              ipCity: ipData.level5City,
              ipIsp: ipData.isp,
              ipTimezone: ipData.timezone,
            },
          });
          // Also save as a location record
          await prisma.userLocation.create({
            data: {
              userId: user.id,
              source: 'ip',
              level1Country: ipData.level1Country,
              level1CountryCode: ipData.level1CountryCode,
              level2State: ipData.level2State,
              level3District: ipData.level3District,
              level5City: ipData.level5City,
              displayName: ipData.displayName,
              formattedAddress: ipData.formattedAddress,
              timezone: ipData.timezone,
              isPrimary: false, // GPS location will be primary
            },
          });
        }
      }).catch(err => console.error('IP lookup save error:', err));
    }

    // Re-fetch user with all data
    user = await prisma.user.findUnique({
      where: { id: user.id },
      include: { preferences: true },
    });

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

