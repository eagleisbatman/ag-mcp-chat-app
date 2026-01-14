/**
 * Diagnosis processing utilities
 * Extracts and normalizes diagnosis data from AgriVision/Plantix responses
 */
import { parseErrorMessage, isNetworkError } from '../../utils/apiHelpers';
import { t } from '../../constants/strings';
import { Message, DiagnosisData } from '../../types';

interface DiagnosisResult {
  success: boolean;
  error?: string;
  status?: number;
  diagnosis?: DiagnosisData;
  metadata?: Record<string, unknown>;
  response?: string; // Natural language response from LLM
}

interface FailedDiagnosisResult {
  errorBotMsg: Message;
  warningMessage: string;
}

interface ExtractedDiagnosisFields {
  cropName: string | null;
  healthStatus: string;
  issuesList: string[];
  healthSummary: string;
}

interface SuccessfulDiagnosisResult {
  botMsg: Message;
  persistData: {
    diagnosisCrop: string | null;
    diagnosisHealthStatus: string;
    diagnosisIssues: string[] | null;
    metadata: Record<string, unknown>;
  };
}

/**
 * Process failed diagnosis result into an error message
 */
export function processFailedDiagnosis(diagResult: DiagnosisResult): FailedDiagnosisResult {
  const isTimeout = diagResult.error?.includes('timeout') || diagResult.status === 408;
  const isNetError = isNetworkError(diagResult.error) || !diagResult.status;

  const errorBotMsg: Message = {
    _id: (Date.now() + 1).toString(),
    text: t('chat.imageAnalysisFailedBot'),
    diagnosisData: {
      errorType: isNetError ? 'network' : (isTimeout ? 'timeout' : undefined),
      errorMessage: parseErrorMessage(diagResult),
    },
    createdAt: new Date(),
    isBot: true
  };

  const warningMessage = isNetError ? t('chat.noInternet') : t('chat.imageAnalysisFailed');

  return { errorBotMsg, warningMessage };
}

/**
 * Extract normalized diagnosis fields from raw diagnosis data
 * Supports both AgriVision and Plantix response formats
 */
export function extractDiagnosisFields(diagnosisData: Record<string, unknown> | null | undefined): ExtractedDiagnosisFields {
  if (!diagnosisData) {
    return { cropName: null, healthStatus: 'analyzed', issuesList: [], healthSummary: '' };
  }

  // Extract crop name
  const crop = diagnosisData.crop as { name?: string } | string | undefined;
  const identifiedCrops = diagnosisData.identified_crops as Array<{ name?: string }> | undefined;
  
  const cropName = typeof crop === 'object' && crop
    ? crop.name || null
    : typeof crop === 'string'
    ? crop
    : identifiedCrops?.[0]?.name || null;
  
  // Extract health status
  const healthStatusObj = diagnosisData.health_status as { overall?: string } | string | undefined;
  const healthAssessment = diagnosisData.health_assessment as { status?: string } | undefined;
  
  const healthStatus = (typeof healthStatusObj === 'object' && healthStatusObj?.overall)
    || (typeof healthStatusObj === 'string' ? healthStatusObj : null)
    || healthAssessment?.status
    || 'analyzed';
  
  // Extract issues list
  const issues = diagnosisData.issues as Array<{ name?: string } | string> | undefined;
  const diagnoses = diagnosisData.diagnoses as Array<{ disease_name?: string; name?: string }> | undefined;
  
  const issuesList = issues?.map(i => typeof i === 'object' ? i.name || '' : i).filter(Boolean) as string[]
    || diagnoses
        ?.filter(d => (d.disease_name || d.name || '').toLowerCase() !== 'healthy')
        ?.map(d => d.disease_name || d.name || '')
        .filter(Boolean) as string[]
    || [];
  
  // Get health summary for context
  const assessmentSummary = diagnosisData.health_assessment as { summary?: string } | undefined;
  const healthSummary = assessmentSummary?.summary 
    || (diagnosisData.diagnostic_notes as string | undefined)
    || '';

  return { cropName, healthStatus, issuesList, healthSummary };
}

/**
 * Generate a summary text for database storage
 */
export function generateDiagnosisSummary(
  cropName: string | null, 
  healthStatus: string, 
  issuesList: string[], 
  healthSummary: string
): string {
  const issues = issuesList.join(', ');
  return `[Plant Diagnosis] ${cropName || 'Plant'}: ${healthStatus}${issues ? `. Issues: ${issues}` : ''}${healthSummary ? `. ${healthSummary}` : ''}`;
}

/**
 * Process successful diagnosis into a bot message
 */
export function processSuccessfulDiagnosis(diagResult: DiagnosisResult): SuccessfulDiagnosisResult {
  const diagnosisData = diagResult.diagnosis && typeof diagResult.diagnosis === 'object' 
    ? diagResult.diagnosis 
    : {};

  const { cropName, healthStatus, issuesList, healthSummary } = extractDiagnosisFields(diagnosisData as Record<string, unknown>);
  
  // CRITICAL FIX: Use the full LLM response if available, only fallback to generated summary
  const displayText = diagResult.response || generateDiagnosisSummary(cropName, healthStatus, issuesList, healthSummary);

  const botMsg: Message = {
    _id: (Date.now() + 1).toString(),
    text: displayText,
    diagnosisData: diagnosisData,
    createdAt: new Date(),
    isBot: true
  };

  const persistData = {
    diagnosisCrop: cropName,
    diagnosisHealthStatus: healthStatus,
    diagnosisIssues: issuesList.length > 0 ? issuesList : null,
    metadata: {
      ...(diagResult.metadata || {}),
      diagnosis: diagnosisData,
    },
  };

  return { botMsg, persistData };
}
