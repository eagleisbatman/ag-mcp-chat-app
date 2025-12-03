// Analytics event routes
const express = require('express');
const { prisma } = require('../db');

const router = express.Router();

/**
 * Log an analytics event
 * POST /api/analytics/event
 */
router.post('/event', async (req, res) => {
  try {
    const { deviceId, sessionId, eventName, eventCategory, eventData, screenName, appVersion } = req.body;

    if (!deviceId || !eventName) {
      return res.status(400).json({ error: 'deviceId and eventName are required' });
    }

    const user = await prisma.user.findUnique({ where: { deviceId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const event = await prisma.analyticsEvent.create({
      data: {
        userId: user.id,
        sessionId,
        eventName,
        eventCategory,
        eventData,
        screenName,
        deviceOs: user.deviceOs,
        appVersion: appVersion || user.appVersion,
      },
    });

    res.json({ success: true, eventId: event.id });
  } catch (error) {
    console.error('Log event error:', error);
    res.status(500).json({ error: 'Failed to log event' });
  }
});

/**
 * Batch log analytics events
 * POST /api/analytics/batch
 */
router.post('/batch', async (req, res) => {
  try {
    const { deviceId, events } = req.body;

    if (!deviceId || !events || !Array.isArray(events)) {
      return res.status(400).json({ error: 'deviceId and events array are required' });
    }

    const user = await prisma.user.findUnique({ where: { deviceId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const created = await prisma.analyticsEvent.createMany({
      data: events.map(e => ({
        userId: user.id,
        sessionId: e.sessionId,
        eventName: e.eventName,
        eventCategory: e.eventCategory,
        eventData: e.eventData,
        screenName: e.screenName,
        deviceOs: user.deviceOs,
        appVersion: e.appVersion || user.appVersion,
      })),
    });

    res.json({ success: true, count: created.count });
  } catch (error) {
    console.error('Batch log error:', error);
    res.status(500).json({ error: 'Failed to log events' });
  }
});

module.exports = router;

