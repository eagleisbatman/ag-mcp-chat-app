/**
 * Chat Route
 * Handles chat requests with MCP context and AI Services integration
 */

import { Router, Request, Response } from 'express';
import { logger } from '../../utils/logger';
import { asyncHandler } from '../../middleware/error-handler';
import { validate, chatRequestSchema } from '../../middleware/validation';
import {
  getActiveMcpServersForLocation,
  callMcpServersForIntent,
  callAgriVisionDiagnosis,
} from '../../services/mcp';
import { sendChatRequest } from '../../services/ai-services';
import { ChatRequest } from '../../types';

const router = Router();

/**
 * POST /api/chat
 * Main chat endpoint with MCP context
 */
router.post(
  '/chat',
  validate(chatRequestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();
    const { latitude, longitude, language, location, message, history, image } = req.body as ChatRequest & { image?: string };

    logger.info('[Chat] Request received', {
      hasLocation: !!(latitude && longitude),
      language: language || 'en',
      messageLength: message?.length || 0,
      hasImage: !!image,
    });

    // Get active MCP servers
    const mcpContext = await getActiveMcpServersForLocation(
      latitude ? parseFloat(String(latitude)) : null,
      longitude ? parseFloat(String(longitude)) : null
    );

    // Call MCP servers based on intents
    const { mcpResults, intentsDetected, classification, intentSource, noDataFallbacks } =
      await callMcpServersForIntent(
        message,
        latitude ? parseFloat(String(latitude)) : null,
        longitude ? parseFloat(String(longitude)) : null,
        mcpContext,
        language || 'en',
        mcpContext.detectedRegions
      );

    // Handle image with AgriVision
    if (image) {
      const expectedCrop = classification?.crops?.[0]?.canonical_name?.toLowerCase();
      const diagnosis = await callAgriVisionDiagnosis(image, expectedCrop || null);
      if (diagnosis && !(diagnosis as Record<string, unknown>).error) {
        (mcpResults as Record<string, unknown>).diagnosis = diagnosis;
        intentsDetected.push('diagnosis');
      }
    }

    // Call AI Services
    const enhancedBody = {
      message,
      language: language || 'en',
      history,
      latitude,
      longitude,
      mcpServers: {
        global: mcpContext.global,
        regional: mcpContext.regional,
        allTools: [
          ...mcpContext.global.flatMap((s) => s.tools || []),
          ...mcpContext.regional.flatMap((s) => s.tools || []),
        ],
      },
      mcpResults,
      intentsDetected,
      detectedRegions: mcpContext.detectedRegions,
      locationContext: location || undefined,
      noDataFallbacks: Object.keys(noDataFallbacks).length > 0 ? noDataFallbacks : undefined,
    };

    const result = await sendChatRequest(enhancedBody);

    if (!result.success || !result.data) {
      logger.error('[Chat] AI Services error', { error: result.error });
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to process request',
        response: 'I apologize, but I encountered an error. Please try again.',
      });
      return;
    }

    const duration = Date.now() - startTime;
    logger.info('[Chat] Response sent', { duration: `${duration}ms`, success: true });

    // Extract entities for analytics
    const extractedEntities = classification
      ? {
          crops: (classification.crops || []).map((c) => c.canonical_name || c.name),
          livestock: (classification.livestock || []).map((l) => l.canonical_name || l.name),
          practices: (classification.practices || []).map((p) => p.name),
          mainIntent: classification.main_intent,
          confidence: classification.confidence,
        }
      : null;

    res.json({
      ...result.data,
      mcpToolsUsed: Object.keys(mcpResults),
      intentsDetected,
      extractedEntities,
      _meta: {
        duration,
        mcpServersUsed: mcpContext.global.length + mcpContext.regional.length,
        regions: mcpContext.detectedRegions.map((r) => r.name),
        intentSource,
      },
    });
  })
);

export default router;
