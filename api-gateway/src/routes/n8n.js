// n8n workflow proxy routes
const express = require('express');
const cloudinary = require('cloudinary').v2;

const router = express.Router();

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL || 'https://ag-mcp-app.up.railway.app/webhook/api/chat';
const N8N_WHISPER_URL = process.env.N8N_WHISPER_URL || 'https://ag-mcp-app.up.railway.app/webhook/api/transcribe';
const N8N_TTS_URL = process.env.N8N_TTS_URL || 'https://ag-mcp-app.up.railway.app/webhook/api/tts';
const N8N_TITLE_URL = process.env.N8N_TITLE_URL || 'https://ag-mcp-app.up.railway.app/webhook/generate-title';
const N8N_LOCATION_URL = process.env.N8N_LOCATION_URL || 'https://ag-mcp-app.up.railway.app/webhook/location-lookup';

/**
 * Chat endpoint - routes to n8n Gemini chat workflow
 */
router.post('/chat', async (req, res) => {
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
 */
router.post('/transcribe', async (req, res) => {
  try {
    const { audio, language, mimeType, saveAudio = false } = req.body;
    let audioUrl = null;
    
    if (saveAudio && audio) {
      try {
        const uploadResult = await cloudinary.uploader.upload(
          `data:${mimeType || 'audio/wav'};base64,${audio}`,
          { folder: 'ag-mcp/voice-recordings', resource_type: 'video' }
        );
        audioUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Audio upload failed:', uploadError);
      }
    }

    const response = await fetch(N8N_WHISPER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio, language, mimeType }),
    });

    const data = await response.json();
    if (audioUrl) data.audioUrl = audioUrl;
    res.json(data);
  } catch (error) {
    console.error('Error calling n8n transcribe:', error);
    res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

/**
 * Text-to-Speech endpoint - uploads to Cloudinary
 */
router.post('/tts', async (req, res) => {
  try {
    const response = await fetch(N8N_TTS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (data.success && data.audioBase64) {
      try {
        const uploadResult = await cloudinary.uploader.upload(
          `data:audio/wav;base64,${data.audioBase64}`,
          { folder: 'ag-mcp/tts', resource_type: 'video', format: 'wav' }
        );
        res.json({
          success: true,
          audioUrl: uploadResult.secure_url,
          publicId: uploadResult.public_id,
          duration: data.duration || uploadResult.duration,
          mimeType: 'audio/wav',
        });
      } catch (uploadError) {
        console.error('TTS upload failed:', uploadError);
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

/**
 * Generate session title via n8n workflow
 */
router.post('/generate-title', async (req, res) => {
  try {
    const response = await fetch(N8N_TITLE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error generating title:', error);
    res.status(500).json({ error: 'Failed to generate title', title: 'New Conversation' });
  }
});

/**
 * Location lookup via n8n workflow
 */
router.post('/location-lookup', async (req, res) => {
  try {
    const response = await fetch(N8N_LOCATION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error looking up location:', error);
    res.status(500).json({ error: 'Failed to lookup location', success: false });
  }
});

module.exports = router;

