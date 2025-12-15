// File upload service - uploads images/audio to Cloudinary via API Gateway
import { fetchWithTimeout } from '../utils/apiHelpers';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api/chat', '')
  || 'https://ag-mcp-api-gateway.up.railway.app';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'dev-key';
const UPLOAD_TIMEOUT_MS = 60000; // 60s for file uploads

/**
 * Upload image to Cloudinary
 * @param {string} base64Image - Base64 encoded image (without data: prefix)
 * @param {string} folder - Cloudinary folder (optional)
 * @returns {Promise<{success: boolean, url?: string, thumbnailUrl?: string, error?: string}>}
 */
export const uploadImage = async (base64Image, folder = 'ag-mcp/images') => {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/upload/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        image: base64Image,
        folder,
      }),
    }, UPLOAD_TIMEOUT_MS);

    if (!response.ok) {
      throw new Error(`Upload error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        url: data.url,
        thumbnailUrl: data.thumbnailUrl,
        mediumUrl: data.mediumUrl,
        publicId: data.publicId,
        width: data.width,
        height: data.height,
      };
    } else {
      return {
        success: false,
        error: data.error || 'Upload failed',
      };
    }
  } catch (error) {
    console.error('Image upload error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload image',
    };
  }
};

/**
 * Upload audio to Cloudinary
 * @param {string} base64Audio - Base64 encoded audio (without data: prefix)
 * @param {string} format - Audio format (m4a, wav, mp3, etc.) - defaults to m4a for mobile recordings
 * @param {string} folder - Cloudinary folder (optional)
 * @returns {Promise<{success: boolean, url?: string, duration?: number, error?: string}>}
 */
export const uploadAudio = async (base64Audio, format = 'm4a', folder = 'ag-mcp/voice') => {
  try {
    console.log('📤 [Upload] Uploading audio:', { format, folder, length: base64Audio?.length });
    
    const response = await fetchWithTimeout(`${API_BASE_URL}/api/upload/audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        audio: base64Audio,
        format,
        folder,
      }),
    }, UPLOAD_TIMEOUT_MS);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Audio upload HTTP error:', response.status, errorText);
      throw new Error(`Upload error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      console.log('✅ [Upload] Audio uploaded successfully:', data.url);
      return {
        success: true,
        url: data.url,
        publicId: data.publicId,
        duration: data.duration,
      };
    } else {
      console.error('Audio upload failed:', data.error);
      return {
        success: false,
        error: data.error || 'Upload failed',
      };
    }
  } catch (error) {
    console.error('Audio upload error:', error);
    return {
      success: false,
      error: error.message || 'Failed to upload audio',
    };
  }
};

export default { uploadImage, uploadAudio };

