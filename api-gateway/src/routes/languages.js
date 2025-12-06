const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

/**
 * GET /api/languages
 * Returns all supported languages with TTS voice mappings
 */
router.get('/', async (req, res) => {
  try {
    const languages = await prisma.language.findMany({
      include: {
        ttsVoice: true,
      },
      orderBy: [
        { region: 'asc' },
        { name: 'asc' },
      ],
    });
    
    res.json({
      success: true,
      languages,
      count: languages.length,
    });
  } catch (error) {
    console.error('Error fetching languages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch languages',
    });
  }
});

/**
 * GET /api/languages/tts-mapping
 * Returns a simple language code -> TTS voice mapping
 * Used by the n8n TTS workflow
 */
router.get('/tts-mapping', async (req, res) => {
  try {
    const languages = await prisma.language.findMany({
      select: {
        code: true,
        name: true,
        ttsVoiceId: true,
      },
    });
    
    // Convert to a simple object for easy lookup
    const mapping = {};
    languages.forEach(lang => {
      mapping[lang.code] = {
        voiceId: lang.ttsVoiceId || 'Puck', // Default to Puck
        languageName: lang.name,
      };
    });
    
    // Get default voice
    const defaultVoice = await prisma.ttsVoice.findFirst({
      where: { isDefault: true },
    });
    
    res.json({
      success: true,
      mapping,
      defaultVoice: defaultVoice?.id || 'Puck',
      count: Object.keys(mapping).length,
    });
  } catch (error) {
    console.error('Error fetching TTS mapping:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch TTS mapping',
    });
  }
});

/**
 * GET /api/languages/voices
 * Returns all available TTS voices
 */
router.get('/voices', async (req, res) => {
  try {
    const voices = await prisma.ttsVoice.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
    
    res.json({
      success: true,
      voices,
      count: voices.length,
    });
  } catch (error) {
    console.error('Error fetching voices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch voices',
    });
  }
});

/**
 * GET /api/languages/:code
 * Returns a specific language with its TTS voice
 */
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;
    
    const language = await prisma.language.findUnique({
      where: { code },
      include: { ttsVoice: true },
    });
    
    if (!language) {
      return res.status(404).json({
        success: false,
        error: `Language not found: ${code}`,
      });
    }
    
    res.json({
      success: true,
      language,
    });
  } catch (error) {
    console.error('Error fetching language:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch language',
    });
  }
});

/**
 * PUT /api/languages/:code/voice
 * Update the TTS voice for a language (admin only)
 */
router.put('/:code/voice', async (req, res) => {
  try {
    const { code } = req.params;
    const { voiceId } = req.body;
    
    if (!voiceId) {
      return res.status(400).json({
        success: false,
        error: 'voiceId is required',
      });
    }
    
    // Verify voice exists
    const voice = await prisma.ttsVoice.findUnique({
      where: { id: voiceId },
    });
    
    if (!voice) {
      return res.status(404).json({
        success: false,
        error: `Voice not found: ${voiceId}`,
      });
    }
    
    // Update language
    const updated = await prisma.language.update({
      where: { code },
      data: { ttsVoiceId: voiceId },
      include: { ttsVoice: true },
    });
    
    res.json({
      success: true,
      message: `Updated ${code} to use voice: ${voiceId}`,
      language: updated,
    });
  } catch (error) {
    console.error('Error updating language voice:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update language voice',
    });
  }
});

module.exports = router;

