// Message CRUD routes
const express = require('express');
const { prisma } = require('../db');

const router = express.Router();

/**
 * Get messages for a session
 * GET /api/messages/:sessionId?deviceId=xxx&limit=50&before=messageId
 */
router.get('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { deviceId, limit = 50, before } = req.query;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const user = await prisma.user.findUnique({ where: { deviceId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const whereClause = { sessionId, userId: user.id };
    if (before) {
      const beforeMsg = await prisma.message.findUnique({ where: { id: before } });
      if (beforeMsg) {
        whereClause.sequenceNumber = { lt: beforeMsg.sequenceNumber };
      }
    }

    const messages = await prisma.message.findMany({
      where: whereClause,
      orderBy: { sequenceNumber: 'desc' },
      take: parseInt(limit),
    });

    res.json({ success: true, messages: messages.reverse() });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

/**
 * Save a message (user or bot)
 * POST /api/messages
 */
router.post('/', async (req, res) => {
  try {
    const { 
      deviceId, sessionId, role, content, contentType = 'text',
      inputMethod, queryLanguageCode, queryLanguageName,
      responseLanguageCode, responseLanguageName,
      // ASR data
      asrInputAudioUrl, asrInputDurationSec, asrTranscription, asrConfidence, asrModel, asrProcessingMs,
      // Image data
      imageLocalUri, imageCloudinaryUrl, imageThumbnailUrl, imageMediumUrl, imageWidth, imageHeight,
      // TTS data
      ttsAudioUrl, ttsDurationSec, ttsLanguageCode, ttsModel, ttsProcessingMs,
      // Diagnosis data
      diagnosisCrop, diagnosisHealthStatus, diagnosisIssues, diagnosisConfidence,
      // Follow-up questions (for bot messages)
      followUpQuestions,
      // Processing
      processingDurationMs,
      // Metadata
      metadata,
    } = req.body;

    if (!deviceId || !sessionId || !role || !content) {
      return res.status(400).json({ error: 'deviceId, sessionId, role, and content are required' });
    }

    const user = await prisma.user.findUnique({ where: { deviceId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get next sequence number
    const lastMessage = await prisma.message.findFirst({
      where: { sessionId },
      orderBy: { sequenceNumber: 'desc' },
    });
    const sequenceNumber = (lastMessage?.sequenceNumber || 0) + 1;

    // Create message
    const message = await prisma.message.create({
      data: {
        sessionId, userId: user.id, sequenceNumber, role, content, contentType,
        inputMethod, queryLanguageCode, queryLanguageName,
        responseLanguageCode, responseLanguageName,
        asrInputAudioUrl, asrInputDurationSec, asrTranscription, asrConfidence, asrModel, asrProcessingMs,
        imageLocalUri, imageCloudinaryUrl, imageThumbnailUrl, imageMediumUrl, imageWidth, imageHeight,
        ttsAudioUrl, ttsDurationSec, ttsLanguageCode, ttsModel, ttsProcessingMs,
        diagnosisCrop, diagnosisHealthStatus, diagnosisIssues, diagnosisConfidence,
        followUpQuestions: followUpQuestions || [],
        processingDurationMs, metadata,
      },
    });

    // Update session stats
    const updateData = {
      messageCount: { increment: 1 },
      lastMessageAt: new Date(),
    };
    if (role === 'user') updateData.userMessageCount = { increment: 1 };
    if (role === 'assistant') updateData.botMessageCount = { increment: 1 };
    if (imageCloudinaryUrl) updateData.imageCount = { increment: 1 };
    if (asrInputAudioUrl) updateData.voiceCount = { increment: 1 };

    // Track languages used
    const langCode = queryLanguageCode || responseLanguageCode;
    if (langCode) {
      const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
      if (session && !session.languagesUsed.includes(langCode)) {
        updateData.languagesUsed = { push: langCode };
      }
    }

    await prisma.chatSession.update({
      where: { id: sessionId },
      data: updateData,
    });

    res.json({ success: true, message });
  } catch (error) {
    console.error('Save message error:', error);
    res.status(500).json({ error: 'Failed to save message' });
  }
});

/**
 * Update message (feedback, TTS played, etc)
 * PATCH /api/messages/:id
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { deviceId, userRating, userFeedback, wasHelpful, ttsWasPlayed } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const user = await prisma.user.findUnique({ where: { deviceId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updateData = {};
    if (userRating !== undefined) updateData.userRating = userRating;
    if (userFeedback !== undefined) updateData.userFeedback = userFeedback;
    if (wasHelpful !== undefined) updateData.wasHelpful = wasHelpful;
    if (ttsWasPlayed) {
      updateData.ttsWasPlayed = true;
      updateData.ttsPlayCount = { increment: 1 };
    }

    const message = await prisma.message.updateMany({
      where: { id, userId: user.id },
      data: updateData,
    });

    if (message.count === 0) {
      return res.status(404).json({ error: 'Message not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({ error: 'Failed to update message' });
  }
});

module.exports = router;

