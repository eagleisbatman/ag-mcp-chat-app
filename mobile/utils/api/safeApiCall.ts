import type { ApiResponse } from '../../types';
import { parseErrorMessage } from './parseErrorMessage';

interface SafeApiCallOptions {
  logError?: boolean;
}

/**
 * Standard API call wrapper with error handling
 */
export async function safeApiCall<T>(
  apiCall: () => Promise<T>,
  { logError = true }: SafeApiCallOptions = {}
): Promise<ApiResponse<T>> {
  try {
    const result = await apiCall();
    return { success: true, data: result };
  } catch (error) {
    if (logError) {
      console.error('API call failed:', error);
    }
    return {
      success: false,
      error: parseErrorMessage(error),
    };
  }
}
