/**
 * Title Generation Route
 * Generates conversation titles via AI Services
 */

import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { asyncHandler } from '../../middleware/error-handler';
import { validate, titleRequestSchema } from '../../middleware/validation';
import { generateTitle } from '../../services/ai-services';

const router = Router();

/**
 * POST /api/generate-title
 * Generate a title for a conversation based on message history
 */
router.post(
  '/generate-title',
  validate(titleRequestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { messages, language } = req.body;

    logger.info('[Title] Generating title', { messageCount: messages?.length || 0 });

    // Normalize messages format for AI Services
    const normalizedMessages = messages.map(
      (m: { role?: string; isBot?: boolean; content?: string; text?: string }) => ({
        role: m.role || (m.isBot ? 'assistant' : 'user'),
        content: m.content || m.text || '',
      })
    );

    const result = await generateTitle({
      messages: normalizedMessages,
      language: language || 'en',
    });

    if (!result.success || !result.data) {
      logger.warn('[Title] Generation failed', { error: result.error });
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to generate title',
        title: 'New Conversation',
      });
      return;
    }

    logger.info('[Title] Generated', { title: result.data.title });

    res.json({
      success: true,
      title: result.data.title,
      generatedAt: result.data.generatedAt,
    });
  })
);

export default router;
