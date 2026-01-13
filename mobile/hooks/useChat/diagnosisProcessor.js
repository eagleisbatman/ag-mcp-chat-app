/**
 * Diagnosis processing utilities
 * Extracts and normalizes diagnosis data from AgriVision/Plantix responses
 */
import { parseErrorMessage, isNetworkError } from '../../utils/apiHelpers';
import { t } from '../../constants/strings';

/**
 * Process failed diagnosis result into an error message
 */
export function processFailedDiagnosis(diagResult) {
  const isTimeout = diagResult.error?.includes('timeout') || diagResult.status === 408;
  const isNetError = isNetworkError(diagResult.error) || !diagResult.status;

  const errorBotMsg = {
    _id: (Date.now() + 1).toString(),
    text: t('chat.imageAnalysisFailedBot'),
    diagnosisData: {
      isNetworkError: isNetError,
      isTimeout: isTimeout,
      diagnostic_notes: parseErrorMessage(diagResult)
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
export function extractDiagnosisFields(diagnosisData) {
  // Extract crop name
  const cropName = typeof diagnosisData?.crop === 'object'
    ? diagnosisData.crop.name
    : diagnosisData?.crop
    || diagnosisData?.identified_crops?.[0]?.name
    || null;
  
  // Extract health status
  const healthStatus = diagnosisData?.health_status?.overall 
    || diagnosisData?.health_status 
    || diagnosisData?.health_assessment?.status
    || 'analyzed';
  
  // Extract issues list
  const issuesList = diagnosisData?.issues?.map(i => i.name || i)
    || diagnosisData?.diagnoses
        ?.filter(d => (d.disease_name || d.name || '').toLowerCase() !== 'healthy')
        ?.map(d => d.disease_name || d.name)
    || [];
  
  // Get health summary for context
  const healthSummary = diagnosisData?.health_assessment?.summary 
    || diagnosisData?.diagnostic_notes 
    || '';

  return { cropName, healthStatus, issuesList, healthSummary };
}

/**
 * Generate a summary text for database storage
 */
export function generateDiagnosisSummary(cropName, healthStatus, issuesList, healthSummary) {
  const issues = issuesList.join(', ');
  return `[Plant Diagnosis] ${cropName || 'Plant'}: ${healthStatus}${issues ? `. Issues: ${issues}` : ''}${healthSummary ? `. ${healthSummary}` : ''}`;
}

/**
 * Process successful diagnosis into a bot message
 */
export function processSuccessfulDiagnosis(diagResult) {
  const diagnosisData = diagResult.diagnosis && typeof diagResult.diagnosis === 'object' 
    ? diagResult.diagnosis 
    : {};

  const { cropName, healthStatus, issuesList, healthSummary } = extractDiagnosisFields(diagnosisData);
  const diagnosisSummary = generateDiagnosisSummary(cropName, healthStatus, issuesList, healthSummary);

  const botMsg = {
    _id: (Date.now() + 1).toString(),
    text: diagnosisSummary,
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
