/**
 * Voice Routes
 * Handles TTS and transcription endpoints
 */

import { Router, Request, Response } from 'express';
import cloudinary from 'cloudinary';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { asyncHandler } from '../../middleware/error-handler';
import { validate, ttsRequestSchema, transcriptionRequestSchema } from '../../middleware/validation';
import { generateTts, transcribeAudio } from '../../services/ai-services';

const router = Router();
const cloudinaryV2 = cloudinary.v2;

/**
 * POST /api/transcribe
 * Voice transcription endpoint
 */
router.post(
  '/transcribe',
  validate(transcriptionRequestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { audio, language, mimeType, saveAudio = false } = req.body;

    // Extract base64 from data URI if present
    let audioBase64 = audio;
    let detectedMimeType = mimeType || 'audio/m4a';

    if (audio.startsWith('data:')) {
      const matches = audio.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        detectedMimeType = matches[1];
        audioBase64 = matches[2];
      }
    }

    logger.info('[Transcribe] Request', {
      language,
      mimeType: detectedMimeType,
      audioLength: audioBase64.length,
    });

    // Optionally save audio to Cloudinary
    let audioUrl: string | null = null;
    if (saveAudio && audioBase64 && config.cloudinary.isConfigured) {
      try {
        const uploadResult = await cloudinaryV2.uploader.upload(
          `data:${detectedMimeType};base64,${audioBase64}`,
          { folder: 'ag-mcp/voice-recordings', resource_type: 'video' }
        );
        audioUrl = uploadResult.secure_url;
      } catch (uploadError) {
        logger.error('[Transcribe] Audio upload failed', { error: (uploadError as Error).message });
      }
    }

    const result = await transcribeAudio({
      audio: audioBase64,
      language: language || 'en',
      mimeType: detectedMimeType,
    });

    if (!result.success || !result.data) {
      res.json({
        success: false,
        error: result.error || 'No transcription returned',
        audioUrl,
      });
      return;
    }

    res.json({
      success: true,
      text: result.data.text || result.data.transcription,
      language: result.data.detected_language || language,
      audioUrl,
    });
  })
);

/**
 * POST /api/tts
 * Text-to-speech endpoint - uploads to Cloudinary
 */
router.post(
  '/tts',
  validate(ttsRequestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { text, language, voice } = req.body;

    logger.info('[TTS] Request', { language, textLength: text.length });

    const result = await generateTts({ text, language: language || 'en', voice });

    if (!result.success || !result.data) {
      res.json({
        success: false,
        error: result.error || 'Failed to generate speech',
      });
      return;
    }

    // Upload to Cloudinary if audio was generated
    if (result.data.audioBase64 && config.cloudinary.isConfigured) {
      try {
        const uploadResult = await cloudinaryV2.uploader.upload(
          `data:audio/wav;base64,${result.data.audioBase64}`,
          { folder: 'ag-mcp/tts', resource_type: 'video', format: 'wav' }
        );

        res.json({
          success: true,
          audioUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          duration: result.data.duration || uploadResult.duration,
          mimeType: 'audio/wav',
        });
        return;
      } catch (uploadError) {
        logger.error('[TTS] Upload failed', { error: (uploadError as Error).message });
      }
    }

    // Return raw response if no upload
    res.json(result.data);
  })
);

export default router;
