import { fetchWithTimeout } from '../utils/apiHelpers';
import { API_BASE_URL, API_KEY, TIMEOUTS } from '../utils/config';

const SUMMARY_URL = `${API_BASE_URL}/api/diagnosis/tts-summary`;

interface DiagnosisSummaryResponse {
  success: boolean;
  summary?: string;
  error?: string;
}

export async function getDiagnosisTtsSummary(
  diagnosisData: unknown,
  language: string
): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(
      SUMMARY_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY,
        },
        body: JSON.stringify({
          diagnosisData,
          language,
        }),
      },
      TIMEOUTS.DEFAULT
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as DiagnosisSummaryResponse;
    if (!data.success || !data.summary) return null;
    return data.summary;
  } catch {
    return null;
  }
}
