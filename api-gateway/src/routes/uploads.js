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
 */
router.post('/audio', async (req, res) => {
  try {
    const { audio, folder = 'ag-mcp/audio', format = 'wav' } = req.body;
    
    if (!audio) {
      return res.status(400).json({ error: 'No audio provided' });
    }

    const result = await cloudinary.uploader.upload(
      `data:audio/${format};base64,${audio}`,
      { folder, resource_type: 'video', format }
    );

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
    res.status(500).json({ error: 'Failed to upload audio', details: error.message });
  }
});

module.exports = router;

