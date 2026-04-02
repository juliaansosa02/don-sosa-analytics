export function classifyComparativeEvidence({ leftSample, rightSample, signalScore, contextScore = 0 }) {
    const minSide = Math.min(leftSample, rightSample);
    const total = leftSample + rightSample;
    const combinedScore = signalScore + contextScore;
    if (minSide >= 5 && total >= 14 && combinedScore >= 1.2)
        return 'strong';
    if (minSide >= 2 && total >= 8 && combinedScore >= 0.55)
        return 'weak';
    return 'hypothesis';
}
export function evidenceBadgeLabel(tier, locale) {
    if (tier === 'strong')
        return locale === 'en' ? 'Strong evidence' : 'Evidencia fuerte';
    if (tier === 'weak')
        return locale === 'en' ? 'Weak evidence' : 'Evidencia débil';
    return locale === 'en' ? 'Hypothesis' : 'Hipótesis';
}
export function evidenceTone(tier) {
    if (tier === 'strong')
        return 'low';
    if (tier === 'weak')
        return 'medium';
    return 'default';
}
export function evidenceExplanation(tier, locale, totalSample, constraint) {
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
