import { t } from '../../constants/strings';
import type { DiagnosisData } from '../../types';
import { normalizeDiagnosis } from './normalize';

/**
 * Generate comprehensive TTS text from diagnosis data
 * Uses localized labels and messages
 */
export function generateDiagnosisTTSText(diagnosisData: DiagnosisData | string | null | undefined): string {
  if (!diagnosisData) return '';

  if (typeof diagnosisData === 'string') {
    return diagnosisData.trim();
  }

  const data = normalizeDiagnosis(diagnosisData);
  if (!data) return '';

  const rawText = (data as { rawText?: string }).rawText;
  if (rawText && !data.issues?.length && !data.health_status && !data.treatment_recommendations?.length) {
    return rawText;
  }

  const parts: string[] = [];
  const cropName = typeof data.crop === 'object' ? data.crop?.name : data.crop || t('diagnosis.plant');
  const growthStage = data.growth_stage;
  const status = data.health_status || t('diagnosis.analyzed');
  const isHealthy = status.toLowerCase().includes('healthy');

  parts.push(`${t('diagnosis.crop')}: ${cropName}.`);
  if (growthStage) parts.push(`${t('diagnosis.stage')}: ${growthStage}.`);
  parts.push(`${t('diagnosis.status')}: ${status}.`);

  if (isHealthy && (!data.issues || data.issues.length === 0)) {
    parts.push(t('diagnosis.healthyMessage'));
    parts.push(t('diagnosis.healthyTips'));
    parts.push(t('diagnosis.healthyTipMonitor'));
    parts.push(t('diagnosis.healthyTipWater'));
    return parts.join(' ');
  }

  if (data.issues && data.issues.length > 0) {
    const issueNames = data.issues.map(i => i.name || String(i)).join(', ');
    parts.push(`${t('diagnosis.issueDetected')}: ${issueNames}.`);

    data.issues.forEach(issue => {
      if (issue.symptoms && issue.symptoms.length > 0) {
        const symptomsText = issue.symptoms.slice(0, 3).join(', ');
        parts.push(`${t('diagnosis.symptoms')}: ${symptomsText}.`);
      }
      if (issue.severity) {
        parts.push(`${t('diagnosis.severity')}: ${issue.severity}.`);
      }
    });
  }

  if (data.treatment_recommendations && data.treatment_recommendations.length > 0) {
    parts.push(`${t('diagnosis.treatment')}:`);

    data.treatment_recommendations.forEach(treatment => {
      if (treatment.organic_options && treatment.organic_options.length > 0) {
        const organicNames = treatment.organic_options
          .map(o => o.name || o.description || String(o))
          .filter(Boolean)
          .slice(0, 2)
          .join(', ');
        if (organicNames) {
          parts.push(`${t('diagnosis.organic')}: ${organicNames}.`);
        }
      }

      if (treatment.chemical_options && treatment.chemical_options.length > 0) {
        const chemicalNames = treatment.chemical_options
          .map(o => o.active_ingredient || o.name || o.description || String(o))
          .filter(Boolean)
          .slice(0, 2)
          .join(', ');
        if (chemicalNames) {
          parts.push(`${t('diagnosis.chemical')}: ${chemicalNames}.`);
        }
      }

      if (treatment.preventive_measures && treatment.preventive_measures.length > 0) {
        const preventionText = treatment.preventive_measures.slice(0, 2).join('. ');
        if (preventionText) {
          parts.push(`${t('diagnosis.tipsToTry')} ${preventionText}.`);
        }
      }
    });
  }

  if (data.diagnostic_notes && (!data.issues || data.issues.length === 0)) {
    parts.push(data.diagnostic_notes);
  }

  return parts.join(' ');
}

/**
 * Generate a brief TTS summary (for previews or quick reads)
 */
export function generateDiagnosisTTSBrief(diagnosisData: DiagnosisData | string | null | undefined): string {
  if (!diagnosisData) return '';

  if (typeof diagnosisData === 'string') {
    return diagnosisData.trim();
  }

  const data = normalizeDiagnosis(diagnosisData);
  if (!data) return '';

  const cropName = typeof data.crop === 'object' ? data.crop?.name : data.crop || t('diagnosis.plant');
  const status = data.health_status || t('diagnosis.analyzed');
  const stage = data.growth_stage ? ` ${t('diagnosis.stage')}: ${data.growth_stage}.` : '';
  const issues = data.issues && data.issues.length > 0
    ? ` ${t('diagnosis.issueDetected')}: ${data.issues.map(i => i.name || String(i)).join(', ')}.`
    : '';

  return `${t('diagnosis.crop')}: ${cropName}. ${t('diagnosis.status')}: ${status}.${stage}${issues}`;
}
