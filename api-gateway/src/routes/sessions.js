// Chat session management routes
const express = require('express');
const { prisma } = require('../db');

const router = express.Router();

/**
 * List chat sessions for a user
 * GET /api/sessions?deviceId=xxx&limit=20&offset=0
 */
router.get('/', async (req, res) => {
  try {
    const { deviceId, limit = 20, offset = 0, status = 'active' } = req.query;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const user = await prisma.user.findUnique({ where: { deviceId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const sessions = await prisma.chatSession.findMany({
      where: { userId: user.id, status },
      orderBy: { lastMessageAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      select: {
        id: true, title: true, messageCount: true,
        startedAt: true, lastMessageAt: true, status: true, isStarred: true,
        primaryLanguageCode: true, locationDisplay: true,
      },
    });

    const total = await prisma.chatSession.count({
      where: { userId: user.id, status },
    });

    res.json({ success: true, sessions, total, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    console.error('List sessions error:', error);
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

/**
 * Create a new chat session
 * POST /api/sessions
 */
router.post('/', async (req, res) => {
  try {
    const { deviceId, locationId, primaryLanguageCode, locationDisplay } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const user = await prisma.user.findUnique({ where: { deviceId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const session = await prisma.chatSession.create({
      data: {
        userId: user.id,
        locationId,
        primaryLanguageCode,
        locationDisplay,
        languagesUsed: primaryLanguageCode ? [primaryLanguageCode] : [],
      },
    });

    res.json({ success: true, session });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

/**
 * Get a session with messages
 * GET /api/sessions/:id?deviceId=xxx
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { deviceId, messageLimit = 50 } = req.query;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const user = await prisma.user.findUnique({ where: { deviceId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const session = await prisma.chatSession.findFirst({
      where: { id, userId: user.id },
      include: {
        messages: {
          orderBy: { sequenceNumber: 'asc' },
          take: parseInt(messageLimit),
        },
        location: true,
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ success: true, session });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to get session' });
  }
});

/**
 * Update session (title, status, starred)
 * PATCH /api/sessions/:id
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { deviceId, title, status, isStarred, summary } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const user = await prisma.user.findUnique({ where: { deviceId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updateData = {};
    if (title !== undefined) {
      updateData.title = title;
      updateData.titleGeneratedAt = new Date();
    }
    if (status !== undefined) updateData.status = status;
    if (isStarred !== undefined) updateData.isStarred = isStarred;
    if (summary !== undefined) updateData.summary = summary;

    const session = await prisma.chatSession.updateMany({
      where: { id, userId: user.id },
      data: updateData,
    });

    if (session.count === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({ error: 'Failed to update session' });
  }
});

/**
 * Delete (archive) a session
 * DELETE /api/sessions/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { deviceId } = req.query;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const user = await prisma.user.findUnique({ where: { deviceId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const session = await prisma.chatSession.updateMany({
      where: { id, userId: user.id },
      data: { status: 'deleted' },
    });

    if (session.count === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

module.exports = router;

