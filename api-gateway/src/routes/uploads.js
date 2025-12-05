// Cloudinary upload routes
const express = require('express');
const cloudinary = require('cloudinary').v2;

const router = express.Router();

/**
 * Upload image to Cloudinary
 * POST /api/upload/image
 */
router.post('/image', async (req, res) => {
  try {
    const { image, folder = 'ag-mcp/images' } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const result = await cloudinary.uploader.upload(
      `data:image/jpeg;base64,${image}`,
      {
        folder,
        resource_type: 'image',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' }
        ]
      }
    );

    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      bytes: result.bytes,
      thumbnailUrl: cloudinary.url(result.public_id, { width: 200, height: 200, crop: 'fill' }),
      mediumUrl: cloudinary.url(result.public_id, { width: 800, crop: 'scale' }),
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image', details: error.message });
  }
});

/**
 * Upload audio to Cloudinary
 * POST /api/upload/audio
 * Supports: m4a (iOS default), wav, mp3, webm, ogg
 */
router.post('/audio', async (req, res) => {
  try {
    const { audio, folder = 'ag-mcp/voice', format = 'm4a' } = req.body;
    
    if (!audio) {
      return res.status(400).json({ success: false, error: 'No audio provided' });
    }

    console.log(`Audio upload request: format=${format}, folder=${folder}, length=${audio?.length}`);

    // Map audio format to MIME type
    const mimeTypes = {
      'm4a': 'audio/mp4',
      'mp4': 'audio/mp4',
      'wav': 'audio/wav',
      'mp3': 'audio/mpeg',
      'webm': 'audio/webm',
      'ogg': 'audio/ogg',
      '3gp': 'audio/3gpp',
    };
    const mimeType = mimeTypes[format] || `audio/${format}`;

    const result = await cloudinary.uploader.upload(
      `data:${mimeType};base64,${audio}`,
      { 
        folder, 
        resource_type: 'video',  // Cloudinary uses 'video' for audio files
        format: format === 'm4a' ? 'mp4' : format,  // Cloudinary stores m4a as mp4
      }
    );

    console.log(`Audio uploaded successfully: ${result.public_id}`);

    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      duration: result.duration,
      format: result.format,
      bytes: result.bytes,
    });
  } catch (error) {
    console.error('Audio upload error:', error);
    res.status(500).json({ success: false, error: 'Failed to upload audio', details: error.message });
  }
});

module.exports = router;

