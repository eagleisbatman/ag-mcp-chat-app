// File upload service - uploads images/audio to Cloudinary via API Gateway

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL?.replace('/api/chat', '') 
  || 'https://ag-mcp-api-gateway.up.railway.app';
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || 'dev-key';

/**
 * Upload image to Cloudinary
 * @param {string} base64Image - Base64 encoded image (without data: prefix)
 * @param {string} folder - Cloudinary folder (optional)
 * @returns {Promise<{success: boolean, url?: string, thumbnailUrl?: string, error?: string}>}
 */
export const uploadImage = async (base64Image, folder = 'ag-mcp/images') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/upload/image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify({
        image: base64Image,
        folder,
      }),
    });

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
 * @param {string} base64Audio - Base64 encoded audio
 * @param {string} format - Audio format (wav, mp3, etc.)
 * @param {string} folder - Cloudinary folder (optional)
 * @returns {Promise<{success: boolean, url?: string, duration?: number, error?: string}>}
 */
export const uploadAudio = async (base64Audio, format = 'wav', folder = 'ag-mcp/audio') => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/upload/audio`, {
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
    });

    if (!response.ok) {
      throw new Error(`Upload error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success) {
      return {
        success: true,
        url: data.url,
        publicId: data.publicId,
        duration: data.duration,
      };
    } else {
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

