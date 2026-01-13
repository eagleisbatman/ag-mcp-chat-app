/**
 * Shared diagnosis normalization utilities
 * Used by DiagnosisCard (display) and TTS (audio)
 */

/**
 * Helper to normalize image quality from different provider formats
 * AgriVision returns string: "good"
 * Plantix returns object: {focus: "good", distance: "good"}
 */
export function normalizeImageQuality(imgQuality) {
  if (!imgQuality) return '';
  if (typeof imgQuality === 'string') return imgQuality.toLowerCase();
  if (typeof imgQuality === 'object') {
    const parts = [];
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
export function normalizeLikelihood(likelihood) {
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
export function normalizeDiagnosis(data) {
  if (!data) return null;

  // Handle string input (JSON)
  let parsed = data;
  if (typeof data === 'string') {
    try { parsed = JSON.parse(data); } catch (e) { return null; }
  }

  // Detect provider format
  const isPlantix = !!(parsed.health_assessment || parsed.diagnoses);

  if (isPlantix) {
    const allDiagnoses = parsed.diagnoses || [];

    // Filter out "Healthy" from issues
    const actualIssues = allDiagnoses.filter(d => {
      const name = (d.disease_name || d.name || '').toLowerCase();
      return name !== 'healthy';
    });

    // Adjust status if issues exist but status says "Healthy"
    let healthStatus = parsed.health_assessment?.status || 'Analyzed';
    if (actualIssues.length > 0 && healthStatus.toLowerCase() === 'healthy') {
      healthStatus = 'Issue Detected';
    }

    return {
      _provider: 'plantix',
      health_status: healthStatus,
      health_summary: parsed.health_assessment?.summary || '',
      image_quality: normalizeImageQuality(parsed.image_quality),
      diagnostic_notes: parsed.health_assessment?.summary || '',
      crop: parsed.identified_crops?.[0]?.name ? {
        name: parsed.identified_crops[0].name,
        confidence: parsed.identified_crops[0].confidence_percent ? `${parsed.identified_crops[0].confidence_percent}%` : null
      } : null,
      growth_stage: parsed.growth_stage || null,
      issues: actualIssues.map(d => ({
        name: d.disease_name || d.name,
        scientific_name: d.scientific_name,
        severity: normalizeLikelihood(d.likelihood) || d.severity,
        likelihood: d.likelihood,
        symptoms: d.symptoms || [],
        _treatments: d.treatments || [],
        _prevention: d.prevention || []
      })),
      treatment_recommendations: actualIssues.length > 0 ? actualIssues.map(d => ({
        issue_name: d.disease_name || d.name,
        organic_options: (d.treatments || [])
          .filter(t => t.type === 'organic')
          .map(t => ({ name: t.description || 'See details', description: t.description })),
        chemical_options: (d.treatments || [])
          .filter(t => t.type === 'chemical')
          .map(t => ({ name: t.description || 'See details', description: t.description })),
        preventive_measures: (d.prevention || []).map(p => p.action || p)
      })) : [],
      _raw: parsed
    };
  }

  // AgriVision format - already normalized
  return {
    ...parsed,
    _provider: 'agrivision',
    image_quality: normalizeImageQuality(parsed.image_quality)
  };
}

/**
 * Generate comprehensive TTS text from diagnosis data
 * Creates natural, spoken sentences for audio playback
 * Includes: crop, status, issues, symptoms, treatments, prevention
 */
export function generateDiagnosisTTSText(diagnosisData) {
  if (!diagnosisData) return '';

  const data = normalizeDiagnosis(diagnosisData);
  if (!data) return '';

  const parts = [];

  // 1. Crop identification
  const cropName = data.crop?.name || data.crop || 'Plant';
  const growthStage = data.growth_stage;
  
  if (growthStage) {
    parts.push(`This is a ${cropName} in the ${growthStage} growth stage.`);
  } else {
    parts.push(`This is a ${cropName}.`);
  }

  // 2. Health status
  const status = data.health_status?.overall || data.health_status || 'analyzed';
  const isHealthy = status.toLowerCase().includes('healthy');

  if (isHealthy && (!data.issues || data.issues.length === 0)) {
    parts.push(`The plant appears healthy with no visible issues detected.`);
    parts.push(`Continue monitoring regularly and maintain good growing practices.`);
    return parts.join(' ');
  }

  parts.push(`Health status: ${status}.`);

  // 3. Issues detected
  if (data.issues?.length > 0) {
    const issueNames = data.issues.map(i => i.name || i).join(', ');
    parts.push(`Issues detected: ${issueNames}.`);

    // Add symptoms for each issue
    data.issues.forEach(issue => {
      if (issue.symptoms?.length > 0) {
        const symptomsText = issue.symptoms.slice(0, 3).join(', ');
        parts.push(`Symptoms of ${issue.name || 'this issue'} include: ${symptomsText}.`);
      }
      if (issue.severity) {
        parts.push(`Severity: ${issue.severity}.`);
      }
    });
  }

  // 4. Treatment recommendations
  if (data.treatment_recommendations?.length > 0) {
    parts.push(`Treatment recommendations:`);

    data.treatment_recommendations.forEach(treatment => {
      // Organic options
      if (treatment.organic_options?.length > 0) {
        const organicNames = treatment.organic_options
          .map(o => o.name || o.description || o)
          .filter(Boolean)
          .slice(0, 2)
          .join(', ');
        if (organicNames) {
          parts.push(`Organic options: ${organicNames}.`);
        }
      }

      // Chemical options
      if (treatment.chemical_options?.length > 0) {
        const chemicalNames = treatment.chemical_options
          .map(o => o.active_ingredient || o.name || o.description || o)
          .filter(Boolean)
          .slice(0, 2)
          .join(', ');
        if (chemicalNames) {
          parts.push(`Chemical options: ${chemicalNames}.`);
        }
      }

      // Prevention measures
      if (treatment.preventive_measures?.length > 0) {
        const preventionText = treatment.preventive_measures
          .slice(0, 2)
          .join('. ');
        if (preventionText) {
          parts.push(`To prevent this in the future: ${preventionText}.`);
        }
      }
    });
  }

  // 5. Diagnostic notes (if no issues but has notes)
  if (data.diagnostic_notes && (!data.issues || data.issues.length === 0)) {
    parts.push(data.diagnostic_notes);
  }

  return parts.join(' ');
}

/**
 * Generate a brief TTS summary (for previews or quick reads)
 * Shorter version with just crop, status, and issue names
 */
export function generateDiagnosisTTSBrief(diagnosisData) {
  if (!diagnosisData) return '';

  const data = normalizeDiagnosis(diagnosisData);
  if (!data) return '';

  const cropName = data.crop?.name || data.crop || 'Plant';
  const status = data.health_status?.overall || data.health_status || 'analyzed';
  const stage = data.growth_stage ? `, ${data.growth_stage} stage` : '';
  const issues = data.issues?.length > 0
    ? `. Issues: ${data.issues.map(i => i.name || i).join(', ')}`
    : '';

  return `${cropName}${stage}. Status: ${status}${issues}`;
}
