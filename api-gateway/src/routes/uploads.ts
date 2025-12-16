/**
 * Cloudinary upload routes
 */
import { Router, Request, Response } from 'express';
import cloudinary from 'cloudinary';
import { logger } from '../utils/logger';

const router = Router();

interface ImageUploadBody {
  image?: string;
  folder?: string;
}

interface AudioUploadBody {
  audio?: string;
  folder?: string;
  format?: string;
}

/**
 * Upload image to Cloudinary
 * POST /api/upload/image
 */
router.post('/image', async (req: Request<object, object, ImageUploadBody>, res: Response) => {
  try {
    const { image, folder = 'ag-mcp/images' } = req.body;

    if (!image) {
      res.status(400).json({ error: 'No image provided' });
      return;
    }

    const result = await cloudinary.v2.uploader.upload(`data:image/jpeg;base64,${image}`, {
      folder,
      resource_type: 'image',
      transformation: [{ quality: 'auto:good' }, { fetch_format: 'auto' }],
    });

    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      thumbnailUrl: cloudinary.v2.url(result.public_id, { width: 200, height: 200, crop: 'fill' }),
      mediumUrl: cloudinary.v2.url(result.public_id, { width: 800, crop: 'scale' }),
    });
  } catch (error) {
    logger.error('Image upload error', { error: (error as Error).message });
    res.status(500).json({ error: 'Failed to upload image', details: (error as Error).message });
  }
});

/**
 * Upload audio to Cloudinary
 * POST /api/upload/audio
 * Supports: m4a (iOS default), wav, mp3, webm, ogg
 */
router.post('/audio', async (req: Request<object, object, AudioUploadBody>, res: Response) => {
  try {
    const { audio, folder = 'ag-mcp/voice', format = 'm4a' } = req.body;

    if (!audio) {
      res.status(400).json({ success: false, error: 'No audio provided' });
      return;
    }

    logger.info(`Audio upload request`, { format, folder, length: audio?.length });

    // Map audio format to MIME type
    const mimeTypes: Record<string, string> = {
      m4a: 'audio/mp4',
      mp4: 'audio/mp4',
      wav: 'audio/wav',
      mp3: 'audio/mpeg',
      webm: 'audio/webm',
      ogg: 'audio/ogg',
      '3gp': 'audio/3gpp',
    };
    const mimeType = mimeTypes[format] || `audio/${format}`;

    const result = await cloudinary.v2.uploader.upload(`data:${mimeType};base64,${audio}`, {
      folder,
      resource_type: 'video', // Cloudinary uses 'video' for audio files
      format: format === 'm4a' ? 'mp4' : format, // Cloudinary stores m4a as mp4
    });

    logger.info(`Audio uploaded successfully`, { publicId: result.public_id });

    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration,
      format: result.format,
      bytes: result.bytes,
    });
  } catch (error) {
    logger.error('Audio upload error', { error: (error as Error).message });
    res.status(500).json({ success: false, error: 'Failed to upload audio', details: (error as Error).message });
  }
});

export default router;
