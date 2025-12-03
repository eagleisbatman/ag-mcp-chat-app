const express = require('express');
const cloudinary = require('cloudinary').v2;

const app = express();
app.use(express.json({ limit: '50mb' })); // Increased for audio/images

// Environment variables
const API_KEY = process.env.API_KEY;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://ag-mcp-app.up.railway.app/webhook/api/chat';
const N8N_WHISPER_URL = process.env.N8N_WHISPER_URL || 'https://ag-mcp-app.up.railway.app/webhook/api/transcribe';
const N8N_TTS_URL = process.env.N8N_TTS_URL || 'https://ag-mcp-app.up.railway.app/webhook/api/tts';
const PORT = process.env.PORT || 3000;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Auth middleware
const authenticate = (req, res, next) => {
  const providedKey = req.headers['x-api-key'];
  if (!providedKey || providedKey !== API_KEY) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }
  next();
};

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', cloudinary: !!process.env.CLOUDINARY_CLOUD_NAME });
});

// ============================================
// CLOUDINARY UPLOAD ENDPOINTS
// ============================================

/**
 * Upload image to Cloudinary
 * POST /api/upload/image
 * Body: { image: "base64string", folder?: "plants" }
 * Returns: { success, url, publicId, width, height }
 */
app.post('/api/upload/image', authenticate, async (req, res) => {
  try {
    const { image, folder = 'ag-mcp/images' } = req.body;
    
    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Upload to Cloudinary
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
      // Useful transformed URLs
      thumbnailUrl: cloudinary.url(result.public_id, { 
        width: 200, height: 200, crop: 'fill' 
      }),
      mediumUrl: cloudinary.url(result.public_id, { 
        width: 800, crop: 'scale' 
      }),
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ error: 'Failed to upload image', details: error.message });
  }
});

/**
 * Upload audio to Cloudinary
 * POST /api/upload/audio
 * Body: { audio: "base64string", folder?: "voice", format?: "wav" }
 * Returns: { success, url, publicId, duration }
 */
app.post('/api/upload/audio', authenticate, async (req, res) => {
  try {
    const { audio, folder = 'ag-mcp/audio', format = 'wav' } = req.body;
    
    if (!audio) {
      return res.status(400).json({ error: 'No audio provided' });
    }

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(
      `data:audio/${format};base64,${audio}`,
      {
        folder,
        resource_type: 'video', // Cloudinary uses 'video' for audio
        format: format,
      }
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

// ============================================
// N8N WORKFLOW ENDPOINTS
// ============================================

/**
 * Chat endpoint - routes to n8n Gemini chat workflow
 */
app.post('/api/chat', authenticate, async (req, res) => {
  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error calling n8n chat:', error);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

/**
 * Voice transcription endpoint
 * Optionally uploads audio to Cloudinary before transcription
 */
app.post('/api/transcribe', authenticate, async (req, res) => {
  try {
    const { audio, language, mimeType, saveAudio = false } = req.body;
    
    let audioUrl = null;
    
    // Optionally save audio to Cloudinary
    if (saveAudio && audio) {
      try {
        const uploadResult = await cloudinary.uploader.upload(
          `data:${mimeType || 'audio/wav'};base64,${audio}`,
          {
            folder: 'ag-mcp/voice-recordings',
            resource_type: 'video',
          }
        );
        audioUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Audio upload failed, continuing with transcription:', uploadError);
      }
    }

    // Send to n8n for transcription
    const response = await fetch(N8N_WHISPER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio, language, mimeType }),
    });

    const data = await response.json();
    
    // Include audio URL if saved
    if (audioUrl) {
      data.audioUrl = audioUrl;
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error calling n8n transcribe:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

/**
 * Text-to-Speech endpoint
 * Gets audio from n8n, uploads to Cloudinary, returns URL
 */
app.post('/api/tts', authenticate, async (req, res) => {
  try {
    // Get TTS audio from n8n workflow
    const response = await fetch(N8N_TTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    // If TTS successful, upload to Cloudinary
    if (data.success && data.audioBase64) {
      try {
        const uploadResult = await cloudinary.uploader.upload(
          `data:audio/wav;base64,${data.audioBase64}`,
          {
            folder: 'ag-mcp/tts',
            resource_type: 'video',
            format: 'wav',
          }
        );

        // Return Cloudinary URL instead of base64
        res.json({
          success: true,
          audioUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          duration: data.duration || uploadResult.duration,
          mimeType: 'audio/wav',
        });
      } catch (uploadError) {
        console.error('TTS upload to Cloudinary failed, returning base64:', uploadError);
        // Fallback to base64 if upload fails
        res.json(data);
      }
    } else {
      res.json(data);
    }
  } catch (error) {
    console.error('Error calling n8n TTS:', error);
    res.status(500).json({ error: 'Failed to generate speech' });
  }
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Cloudinary configured: ${!!process.env.CLOUDINARY_CLOUD_NAME}`);
});
