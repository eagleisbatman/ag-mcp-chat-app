import { t } from '../../constants/strings';
import type { DiagnosisData, DiagnosisIssue, Treatment } from '../../types';

interface ImageQualityObject {
  focus?: string;
  distance?: string;
  quality_warning?: string;
}

interface PlantixDiagnosis {
  disease_name?: string;
  name?: string;
  scientific_name?: string;
  likelihood?: string;
  severity?: string;
  symptoms?: string[];
  treatments?: Array<{ type?: string; description?: string }>;
  prevention?: Array<{ action?: string } | string>;
}

interface PlantixCrop {
  name?: string;
  confidence_percent?: number;
}

interface PlantixFormat {
  health_assessment?: {
    status?: string;
    summary?: string;
  };
  diagnoses?: PlantixDiagnosis[];
  identified_crops?: PlantixCrop[];
  growth_stage?: string;
  image_quality?: string | ImageQualityObject;
}

export interface NormalizedDiagnosis {
  _provider: 'plantix' | 'agrivision';
  health_status: string;
  health_summary?: string;
  image_quality: string;
  diagnostic_notes?: string;
  crop?: {
    name: string;
    confidence?: string | null;
    scientific_name?: string;
  } | string | null;
  growth_stage?: string | null;
  issues?: Array<{
    name: string;
    confidence?: string;
    scientific_name?: string;
    severity?: string | null;
    likelihood?: string;
    symptoms?: string[];
    _treatments?: Array<{ type?: string; description?: string }>;
    _prevention?: Array<{ action?: string } | string>;
  }>;
  treatment_recommendations?: Array<{
    issue_name: string;
    organic_options?: Array<{ name: string; description?: string }>;
    chemical_options?: Array<{ name?: string; description?: string; active_ingredient?: string }>;
    preventive_measures?: string[];
  }>;
  _raw?: unknown;
  isNetworkError?: boolean;
  isTimeout?: boolean;
  overall?: string;
  health_confidence?: string;
}

/**
 * Helper to normalize image quality from different provider formats
 */
export function normalizeImageQuality(imgQuality: string | ImageQualityObject | null | undefined): string {
  if (!imgQuality) return '';
  if (typeof imgQuality === 'string') return imgQuality.toLowerCase();
  if (typeof imgQuality === 'object') {
    const parts: string[] = [];
    if (imgQuality.focus) parts.push(`focus: ${imgQuality.focus}`);
    if (imgQuality.distance) parts.push(`distance: ${imgQuality.distance}`);
    if (imgQuality.quality_warning) parts.push(imgQuality.quality_warning);
    return parts.length > 0 ? parts.join(', ').toLowerCase() : 'analyzed';
  }
  return '';
}

/**
 * Convert Plantix likelihood to display-friendly severity
 */
export function normalizeLikelihood(likelihood: string | null | undefined): string | null {
  if (!likelihood) return null;
  const l = likelihood.toLowerCase();
  if (l === 'likely' || l === 'very_likely') return 'High';
  if (l === 'possible') return 'Moderate';
  if (l === 'unlikely' || l === 'very_unlikely') return 'Low';
  return likelihood;
}

/**
 * Normalize diagnosis data from different providers (AgriVision vs Plantix)
 * Returns a unified format that works for both display and TTS
 */
export function normalizeDiagnosis(data: DiagnosisData | string | null | undefined): NormalizedDiagnosis | null {
  if (!data) return null;

  let parsed: PlantixFormat | DiagnosisData = data as PlantixFormat | DiagnosisData;
  if (typeof data === 'string') {
    try {
      parsed = JSON.parse(data);
    } catch {
      return null;
    }
  }

  const parsedAny = parsed as Record<string, unknown>;
  if (parsedAny.error) {
    const isNetworkError = parsedAny.error === 'connection_error' || parsedAny.error === 'http_error';
    const isTimeout = parsedAny.error === 'timeout';
    const fallbackMessage = isTimeout
      ? t('diagnosis.timeoutMessage')
      : (isNetworkError ? t('diagnosis.networkErrorMessage') : t('chat.imageAnalysisFailed'));

    return {
      _provider: 'agrivision',
      health_status: 'Error',
      health_summary: fallbackMessage,
      image_quality: '',
      diagnostic_notes: fallbackMessage,
      isNetworkError,
      isTimeout,
      issues: [],
      treatment_recommendations: [],
    } as NormalizedDiagnosis;
  }

  const explicitProvider = parsedAny._provider as string | undefined;
  const plantixData = parsed as PlantixFormat;
  const isPlantix = explicitProvider === 'plantix'
    || (!explicitProvider && !!(plantixData.health_assessment || plantixData.diagnoses));

  if (isPlantix) {
    const allDiagnoses = plantixData.diagnoses || [];
    const actualIssues = allDiagnoses.filter(d => {
      const name = (d.disease_name || d.name || '').toLowerCase();
      return name !== 'healthy';
    });

    let healthStatus = plantixData.health_assessment?.status || 'Analyzed';
    if (actualIssues.length > 0 && healthStatus.toLowerCase() === 'healthy') {
      healthStatus = 'Issue Detected';
    }

    return {
      _provider: 'plantix',
      health_status: healthStatus,
      health_summary: plantixData.health_assessment?.summary || '',
      image_quality: normalizeImageQuality(plantixData.image_quality),
      diagnostic_notes: plantixData.health_assessment?.summary || '',
      crop: plantixData.identified_crops?.[0]?.name ? {
        name: plantixData.identified_crops[0].name,
        confidence: plantixData.identified_crops[0].confidence_percent
          ? `${plantixData.identified_crops[0].confidence_percent}%`
          : null,
      } : null,
      growth_stage: plantixData.growth_stage || null,
      issues: actualIssues.map(d => ({
        name: d.disease_name || d.name || '',
        scientific_name: d.scientific_name,
        severity: normalizeLikelihood(d.likelihood) || d.severity,
        likelihood: d.likelihood,
        symptoms: d.symptoms || [],
        _treatments: d.treatments || [],
        _prevention: d.prevention || [],
      })),
      treatment_recommendations: actualIssues.length > 0 ? actualIssues.map(d => ({
        issue_name: d.disease_name || d.name || '',
        organic_options: (d.treatments || [])
          .filter(t => t.type === 'organic')
          .map(t => ({ name: t.description || 'See details', description: t.description })),
        chemical_options: (d.treatments || [])
          .filter(t => t.type === 'chemical')
          .map(t => ({ name: t.description || 'See details', description: t.description })),
        preventive_measures: (d.prevention || []).map(p =>
          typeof p === 'string' ? p : p.action || ''
        ),
      })) : [],
      _raw: parsed,
    };
  }

  const agrivisionData = parsed as DiagnosisData & { image_quality?: string };
  return {
    ...agrivisionData,
    _provider: 'agrivision',
    health_status: agrivisionData.status || 'unknown',
    image_quality: normalizeImageQuality(agrivisionData.image_quality),
  } as NormalizedDiagnosis;
}
