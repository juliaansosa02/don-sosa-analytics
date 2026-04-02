import type { Locale } from '../../lib/i18n';

export type EvidenceTier = 'strong' | 'weak' | 'hypothesis';

export function classifyComparativeEvidence({
  leftSample,
  rightSample,
  signalScore,
  contextScore = 0
}: {
  leftSample: number;
  rightSample: number;
  signalScore: number;
  contextScore?: number;
}): EvidenceTier {
  const minSide = Math.min(leftSample, rightSample);
  const total = leftSample + rightSample;
  const combinedScore = signalScore + contextScore;

  if (minSide >= 5 && total >= 14 && combinedScore >= 1.2) return 'strong';
  if (minSide >= 2 && total >= 8 && combinedScore >= 0.55) return 'weak';
  return 'hypothesis';
}

export function evidenceBadgeLabel(tier: EvidenceTier, locale: Locale) {
  if (tier === 'strong') return locale === 'en' ? 'Strong evidence' : 'Evidencia fuerte';
  if (tier === 'weak') return locale === 'en' ? 'Weak evidence' : 'Evidencia débil';
  return locale === 'en' ? 'Hypothesis' : 'Hipótesis';
}

export function evidenceTone(tier: EvidenceTier): 'low' | 'medium' | 'default' {
  if (tier === 'strong') return 'low';
  if (tier === 'weak') return 'medium';
  return 'default';
}

export function evidenceExplanation(tier: EvidenceTier, locale: Locale, totalSample: number, constraint?: string | null) {
  const sampleLabel = locale === 'en'
    ? `${totalSample} games in the comparison`
    : `${totalSample} partidas en la comparación`;

  if (tier === 'strong') {
    return constraint
      ? `${sampleLabel}. ${constraint}`
      : sampleLabel;
  }

  if (tier === 'weak') {
    return locale === 'en'
      ? `${sampleLabel}. Read it as directional, not definitive${constraint ? `. ${constraint}` : ''}.`
      : `${sampleLabel}. Leelo como direccional, no definitivo${constraint ? `. ${constraint}` : ''}.`;
  }

  return locale === 'en'
    ? `${sampleLabel}. This is still more useful as a watchpoint than as a conclusion${constraint ? `. ${constraint}` : ''}.`
    : `${sampleLabel}. Por ahora sirve más como foco de seguimiento que como conclusión${constraint ? `. ${constraint}` : ''}.`;
}
