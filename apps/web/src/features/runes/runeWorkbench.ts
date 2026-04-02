import type { Locale } from '../../lib/i18n';
import type { MatchSnapshot, Dataset } from '../../types';
import { classifyComparativeEvidence, type EvidenceTier } from '../premium-analysis/evidence';

type DurationBucket = 'short' | 'standard' | 'long';

export interface RuneVariantAggregate {
  key: string;
  keystone: string;
  label: string;
  compactLabel: string;
  primaryMinor: string[];
  secondaryMinor: string[];
  games: number;
  wins: number;
  winRate: number;
  avgScore: number;
  avgDamageToChampions: number;
  avgCsAt15: number;
  avgDurationMinutes: number;
  avgDeathsPre14: number;
  avgFirstMoveMinute: number | null;
  avgRuneValue: number;
  topMatchups: Array<{ championName: string; games: number; share: number }>;
  durationProfile: Record<DurationBucket, number>;
}

export interface RuneComparison {
  baseline: RuneVariantAggregate;
  variant: RuneVariantAggregate;
  evidenceTier: EvidenceTier;
  differenceLabel: string;
  summary: string;
  contextNote: string | null;
  signalNote: string;
  constraint: string | null;
  deltas: {
    winRate: number;
    score: number;
    damageToChampions: number;
    csAt15: number;
    durationMinutes: number;
    deathsPre14: number;
  };
}

export interface KeystoneWorkbench {
  keystone: string;
  totalGames: number;
  baseline: RuneVariantAggregate;
  variants: RuneVariantAggregate[];
  comparisons: RuneComparison[];
}

export interface ChampionRuneWorkbench {
  championName: string;
  games: number;
  strongReads: number;
  weakReads: number;
  hypothesisReads: number;
  keystones: KeystoneWorkbench[];
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function averageNullable(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return valid.length ? average(valid) : null;
}

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

function copy(locale: Locale, es: string, en: string) {
  return locale === 'en' ? en : es;
}

function bucketDuration(durationMinutes: number): DurationBucket {
  if (durationMinutes < 25) return 'short';
  if (durationMinutes <= 33) return 'standard';
  return 'long';
}

function runeName(name?: string, perk?: number) {
  return name?.trim() || `Perk ${perk ?? 'unknown'}`;
}

function buildVariantDescriptor(match: MatchSnapshot) {
  const keystone = runeName(match.primaryRunes[0]?.name, match.primaryRunes[0]?.perk);
  const primaryMinor = match.primaryRunes.slice(1).map((rune) => runeName(rune.name, rune.perk));
  const secondaryMinor = match.secondaryRunes.map((rune) => runeName(rune.name, rune.perk));
  const key = [keystone, ...primaryMinor, '::', ...secondaryMinor].join('|');
  const compactLabel = secondaryMinor.length
    ? `${secondaryMinor.join(' + ')}`
    : primaryMinor.length
      ? primaryMinor.join(' + ')
      : keystone;

  return {
    key,
    keystone,
    label: `${keystone} | ${primaryMinor.join(' / ')} + ${secondaryMinor.join(' / ')}`,
    compactLabel,
    primaryMinor,
    secondaryMinor
  };
}

function buildTopMatchups(matches: MatchSnapshot[]) {
  const counts = new Map<string, number>();

  for (const match of matches) {
    if (!match.opponentChampionName) continue;
    counts.set(match.opponentChampionName, (counts.get(match.opponentChampionName) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([championName, games]) => ({
      championName,
      games,
      share: round((games / Math.max(matches.length, 1)) * 100, 1)
    }))
    .sort((left, right) => right.games - left.games)
    .slice(0, 3);
}

function aggregateVariant(matches: MatchSnapshot[]) {
  const descriptor = buildVariantDescriptor(matches[0]);
  const wins = matches.filter((match) => match.win).length;
  const durationProfile: Record<DurationBucket, number> = {
    short: 0,
    standard: 0,
    long: 0
  };

  for (const match of matches) {
    const durationBucket = bucketDuration(match.gameDurationSeconds / 60);
    durationProfile[durationBucket] += 1;
  }

  return {
    ...descriptor,
    games: matches.length,
    wins,
    winRate: round((wins / Math.max(matches.length, 1)) * 100, 1),
    avgScore: round(average(matches.map((match) => match.score.total)), 1),
    avgDamageToChampions: round(average(matches.map((match) => match.damageToChampions)), 0),
    avgCsAt15: round(average(matches.map((match) => match.timeline.csAt15)), 1),
    avgDurationMinutes: round(average(matches.map((match) => match.gameDurationSeconds / 60)), 1),
    avgDeathsPre14: round(average(matches.map((match) => match.timeline.deathsPre14)), 1),
    avgFirstMoveMinute: averageNullable(matches.map((match) => match.timeline.firstMoveMinute)),
    avgRuneValue: round(average(matches.map((match) => match.runeStats.keystoneValue)), 0),
    topMatchups: buildTopMatchups(matches),
    durationProfile: {
      short: round((durationProfile.short / Math.max(matches.length, 1)) * 100, 0),
      standard: round((durationProfile.standard / Math.max(matches.length, 1)) * 100, 0),
      long: round((durationProfile.long / Math.max(matches.length, 1)) * 100, 0)
    }
  } satisfies RuneVariantAggregate;
}

function describeDifferences(baseline: RuneVariantAggregate, variant: RuneVariantAggregate) {
  const changes: string[] = [];

  baseline.primaryMinor.forEach((name, index) => {
    const next = variant.primaryMinor[index];
    if (next && next !== name) {
      changes.push(`${name} -> ${next}`);
    }
  });

  baseline.secondaryMinor.forEach((name, index) => {
    const next = variant.secondaryMinor[index];
    if (next && next !== name) {
      changes.push(`${name} -> ${next}`);
    }
  });

  if (!changes.length && baseline.compactLabel !== variant.compactLabel) {
    changes.push(variant.compactLabel);
  }

  if (!changes.length) {
    return baseline.compactLabel === variant.compactLabel
      ? 'Misma página, mismo árbol'
      : `${baseline.compactLabel} -> ${variant.compactLabel}`;
  }

  return changes.slice(0, 2).join(' · ');
}

function buildContextNote(baseline: RuneVariantAggregate, variant: RuneVariantAggregate, locale: Locale) {
  const baselineTop = baseline.topMatchups[0];
  const variantTop = variant.topMatchups[0];
  const durationGap = round(variant.avgDurationMinutes - baseline.avgDurationMinutes, 1);

  if (variantTop && (!baselineTop || variantTop.championName !== baselineTop.championName) && variantTop.share >= 35) {
    return copy(locale, `La variante está más cargada hacia ${variantTop.championName} (${variantTop.share}% de la muestra).`, `The variant is more skewed toward ${variantTop.championName} (${variantTop.share}% of the sample).`);
  }

  if (Math.abs(durationGap) >= 3.5) {
    return durationGap > 0
      ? copy(locale, 'Esta variante está apareciendo en partidas más largas que el baseline.', 'This variant is showing up in longer games than the baseline.')
      : copy(locale, 'Esta variante está apareciendo en partidas más cortas que el baseline.', 'This variant is showing up in shorter games than the baseline.');
  }

  if (variant.durationProfile.long - baseline.durationProfile.long >= 20) {
    return copy(locale, 'La página alternativa está sobrerrepresentada en juegos largos.', 'The alternative page is overrepresented in long games.');
  }

  if (variant.durationProfile.short - baseline.durationProfile.short >= 20) {
    return copy(locale, 'La página alternativa está sobrerrepresentada en juegos cortos.', 'The alternative page is overrepresented in short games.');
  }

  return null;
}

function buildSignalNote(baseline: RuneVariantAggregate, variant: RuneVariantAggregate, locale: Locale) {
  const scoreDelta = round(variant.avgScore - baseline.avgScore, 1);
  const damageDelta = round((variant.avgDamageToChampions - baseline.avgDamageToChampions) / 1000, 1);
  const csDelta = round(variant.avgCsAt15 - baseline.avgCsAt15, 1);
  const firstMoveDelta = baseline.avgFirstMoveMinute !== null && variant.avgFirstMoveMinute !== null
    ? round(variant.avgFirstMoveMinute - baseline.avgFirstMoveMinute, 1)
    : null;

  if (scoreDelta >= 2.5 && damageDelta >= 1.5) {
    return copy(locale, 'La diferencia no vive solo en WR: también mueve score y presión real sobre campeones.', 'The difference does not live only in WR: it also moves score and real champion pressure.');
  }

  if (scoreDelta >= 2 && csDelta >= 4) {
    return copy(locale, 'La señal se apoya en una partida más limpia de economía y ejecución, no solo en resultados finales.', 'The signal is supported by cleaner economy and execution, not just final results.');
  }

  if (firstMoveDelta !== null && firstMoveDelta <= -1 && damageDelta >= 1) {
    return copy(locale, 'La página parece empujar una versión más activa y de mayor tempo temprano.', 'The page seems to push a more active, earlier-tempo version of the champion.');
  }

  if (variant.avgDeathsPre14 <= baseline.avgDeathsPre14 - 0.7) {
    return copy(locale, 'La mejora aparece más por limpieza de early que por explosión de daño.', 'The improvement looks more like cleaner early game than raw damage explosion.');
  }

  return copy(locale, 'La lectura principal está en si el swap cambia tu ejecución, no solo el pick rate.', 'The main read is whether the swap changes your execution, not just pick rate.');
}

function buildConstraint(baseline: RuneVariantAggregate, variant: RuneVariantAggregate, locale: Locale) {
  const minSample = Math.min(baseline.games, variant.games);
  const sameTopMatchup = baseline.topMatchups[0]?.championName && baseline.topMatchups[0]?.championName === variant.topMatchups[0]?.championName;

  if (minSample < 4) {
    return copy(locale, 'Todavía no hay suficiente muestra pareja entre ambos lados.', 'There is not enough balanced sample on both sides yet.');
  }

  if (!sameTopMatchup && (variant.topMatchups[0]?.share ?? 0) >= 35) {
    return copy(locale, 'Parte de la diferencia puede venir del matchup y no solo de la runa.', 'Part of the difference may come from matchup allocation, not only the rune page.');
  }

  if (Math.abs(variant.avgDurationMinutes - baseline.avgDurationMinutes) >= 4) {
    return copy(locale, 'La duración media entre páginas cambió bastante, así que conviene leer el edge con cuidado.', 'Average game length changed a lot between pages, so the edge needs a careful read.');
  }

  return null;
}

function buildComparison(baseline: RuneVariantAggregate, variant: RuneVariantAggregate, locale: Locale): RuneComparison {
  const deltas = {
    winRate: round(variant.winRate - baseline.winRate, 1),
    score: round(variant.avgScore - baseline.avgScore, 1),
    damageToChampions: round(variant.avgDamageToChampions - baseline.avgDamageToChampions, 0),
    csAt15: round(variant.avgCsAt15 - baseline.avgCsAt15, 1),
    durationMinutes: round(variant.avgDurationMinutes - baseline.avgDurationMinutes, 1),
    deathsPre14: round(variant.avgDeathsPre14 - baseline.avgDeathsPre14, 1)
  };

  const signalScore = Math.max(
    Math.abs(deltas.winRate) / 12,
    Math.abs(deltas.score) / 4,
    Math.abs(deltas.damageToChampions) / 3000,
    Math.abs(deltas.csAt15) / 8,
    Math.abs(deltas.deathsPre14) / 1.3
  );
  const contextScore = (
    (buildContextNote(baseline, variant, locale) ? 0 : 0.2)
    + (Math.abs(deltas.durationMinutes) <= 2.5 ? 0.15 : 0)
    + (Math.min(baseline.games, variant.games) >= 6 ? 0.2 : 0)
  );
  const constraint = buildConstraint(baseline, variant, locale);
  const evidenceTier = classifyComparativeEvidence({
    leftSample: baseline.games,
    rightSample: variant.games,
    signalScore,
    contextScore: constraint ? contextScore - 0.25 : contextScore
  });

  const summary = deltas.winRate >= 0
    ? copy(locale, `${variant.compactLabel} está ${Math.abs(deltas.winRate).toFixed(1)} pts arriba en WR y ${Math.abs(deltas.score).toFixed(1)} arriba en score.`, `${variant.compactLabel} is ${Math.abs(deltas.winRate).toFixed(1)} pts up in WR and ${Math.abs(deltas.score).toFixed(1)} up in score.`)
    : copy(locale, `${variant.compactLabel} está ${Math.abs(deltas.winRate).toFixed(1)} pts abajo en WR y ${Math.abs(deltas.score).toFixed(1)} abajo en score.`, `${variant.compactLabel} is ${Math.abs(deltas.winRate).toFixed(1)} pts down in WR and ${Math.abs(deltas.score).toFixed(1)} down in score.`);

  return {
    baseline,
    variant,
    evidenceTier,
    differenceLabel: describeDifferences(baseline, variant),
    summary,
    contextNote: buildContextNote(baseline, variant, locale),
    signalNote: buildSignalNote(baseline, variant, locale),
    constraint,
    deltas
  };
}

function buildKeystoneWorkbench(matches: MatchSnapshot[], locale: Locale) {
  const byVariant = new Map<string, MatchSnapshot[]>();

  for (const match of matches) {
    const descriptor = buildVariantDescriptor(match);
    const current = byVariant.get(descriptor.key) ?? [];
    current.push(match);
    byVariant.set(descriptor.key, current);
  }

  const variants = Array.from(byVariant.values())
    .map((groupedMatches) => aggregateVariant(groupedMatches))
    .sort((left, right) => right.games - left.games || right.winRate - left.winRate);

  const baseline = variants[0];
  const comparisons = variants
    .slice(1)
    .filter((variant) => variant.games >= 2)
    .map((variant) => buildComparison(baseline, variant, locale))
    .sort((left, right) => {
      const tierWeight = { strong: 3, weak: 2, hypothesis: 1 };
      return tierWeight[right.evidenceTier] - tierWeight[left.evidenceTier]
        || right.variant.games - left.variant.games
        || Math.abs(right.deltas.score) - Math.abs(left.deltas.score);
    });

  return {
    keystone: baseline.keystone,
    totalGames: matches.length,
    baseline,
    variants,
    comparisons
  } satisfies KeystoneWorkbench;
}

export function buildChampionRuneWorkbench(dataset: Dataset, locale: Locale = 'es') {
  const byChampion = new Map<string, MatchSnapshot[]>();

  for (const match of dataset.matches) {
    const current = byChampion.get(match.championName) ?? [];
    current.push(match);
    byChampion.set(match.championName, current);
  }

  return Array.from(byChampion.entries())
    .map(([championName, championMatches]) => {
      const byKeystone = new Map<string, MatchSnapshot[]>();

      for (const match of championMatches) {
        const descriptor = buildVariantDescriptor(match);
        const current = byKeystone.get(descriptor.keystone) ?? [];
        current.push(match);
        byKeystone.set(descriptor.keystone, current);
      }

      const keystones = Array.from(byKeystone.values())
        .filter((matches) => matches.length >= 2)
        .map((matches) => buildKeystoneWorkbench(matches, locale))
        .sort((left, right) => right.totalGames - left.totalGames);
      const allComparisons = keystones.flatMap((keystone) => keystone.comparisons);

      return {
        championName,
        games: championMatches.length,
        strongReads: allComparisons.filter((comparison) => comparison.evidenceTier === 'strong').length,
        weakReads: allComparisons.filter((comparison) => comparison.evidenceTier === 'weak').length,
        hypothesisReads: allComparisons.filter((comparison) => comparison.evidenceTier === 'hypothesis').length,
        keystones
      } satisfies ChampionRuneWorkbench;
    })
    .filter((champion) => champion.games >= 3 && champion.keystones.length)
    .sort((left, right) => right.games - left.games);
}
