import { championIntelligenceCatalog, type ChampionIntelligenceProfile, type ChampionMatchupPlan, type ChampionReadAtom, type ChampionReviewTrigger, type ChampionSetupVariant } from '../../../../../packages/core/src/championIntelligence';
import type { Locale } from '../../lib/i18n';
import type { Dataset, MatchSnapshot } from '../../types';
import { formatChampionName } from '../../lib/lol';
import { buildChampionBuildWorkbench } from '../builds/buildWorkbench';
import { buildChampionRuneWorkbench } from '../runes/runeWorkbench';

export interface ChampionPlayerProof {
  games: number;
  winRate: number;
  avgScore: number;
  avgGoldDiffAt15: number;
  avgDeathsPre14: number;
  avgKillParticipation: number;
  avgLaneVolatility: number;
  recentTrendLabel: string;
  bestMatchup: { championName: string; games: number; winRate: number } | null;
  hardestMatchup: { championName: string; games: number; winRate: number } | null;
  playerFitLabel: string;
  playerFitReason: string;
}

export interface ChampionIntelligenceViewModel {
  championName: string;
  role: string;
  games: number;
  profile: ChampionIntelligenceProfile | null;
  headline: string;
  subheadline: string;
  setupVariants: ChampionSetupVariant[];
  matchupPlans: ChampionMatchupPlan[];
  highEloReads: ChampionReadAtom[];
  reviewTriggers: ChampionReviewTrigger[];
  playerProof: ChampionPlayerProof;
  recommendedRuneLabel: string | null;
  recommendedBuildLabel: string | null;
}

export interface ChampionIntelligenceWorkbench {
  selectedChampionName: string | null;
  champions: ChampionIntelligenceViewModel[];
}

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

function percent(wins: number, games: number) {
  return games ? round((wins / games) * 100, 1) : 0;
}

function copy(locale: Locale, es: string, en: string) {
  return locale === 'en' ? en : es;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function matchupSummary(matches: MatchSnapshot[]) {
  const byOpponent = new Map<string, MatchSnapshot[]>();

  for (const match of matches) {
    if (!match.opponentChampionName) continue;
    const current = byOpponent.get(match.opponentChampionName) ?? [];
    current.push(match);
    byOpponent.set(match.opponentChampionName, current);
  }

  const reliable = Array.from(byOpponent.entries())
    .map(([championName, list]) => ({
      championName,
      games: list.length,
      winRate: percent(list.filter((entry) => entry.win).length, list.length)
    }))
    .filter((entry) => entry.games >= 2)
    .sort((left, right) => right.games - left.games);

  const hardest = [...reliable]
    .sort((left, right) => left.winRate - right.winRate || right.games - left.games)[0] ?? null;
  const best = [...reliable]
    .sort((left, right) => right.winRate - left.winRate || right.games - left.games)[0] ?? null;

  return { hardest, best };
}

function buildRecentTrendLabel(matches: MatchSnapshot[], locale: Locale) {
  const recent = [...matches].sort((a, b) => b.gameCreation - a.gameCreation).slice(0, Math.min(6, matches.length));
  if (!recent.length) {
    return copy(locale, 'Sin tramo reciente suficiente', 'No recent stretch available');
  }

  const recentWinRate = percent(recent.filter((match) => match.win).length, recent.length);
  const recentScore = round(average(recent.map((match) => match.score.total)), 1);
  const recentVolatility = round(average(recent.map((match) => match.timeline.laneVolatilityScore ?? 0)), 1);

  if (recentWinRate >= 60 && recentVolatility <= 42) {
    return copy(locale, `Tramo reciente estable: ${recentWinRate}% WR y ${recentScore} de score medio.`, `Stable recent stretch: ${recentWinRate}% WR and ${recentScore} average score.`);
  }

  if (recentVolatility >= 52) {
    return copy(locale, `Tramo reciente volátil: ${recentVolatility} de volatility y demasiadas ventanas rotas.`, `Recent stretch is volatile: ${recentVolatility} volatility and too many broken windows.`);
  }

  return copy(locale, `Tramo reciente mixto: ${recentWinRate}% WR con ${recentScore} de score medio.`, `Recent stretch is mixed: ${recentWinRate}% WR with ${recentScore} average score.`);
}

function buildPlayerFit(matches: MatchSnapshot[], profile: ChampionIntelligenceProfile | null, locale: Locale) {
  const avgDeathsPre14 = round(average(matches.map((match) => match.timeline.deathsPre14)), 1);
  const avgGoldDiffAt15 = round(average(matches.map((match) => match.timeline.goldDiffAt15 ?? 0)), 0);
  const avgVolatility = round(average(matches.map((match) => match.timeline.laneVolatilityScore ?? 0)), 1);

  if (!profile) {
    return {
      label: copy(locale, 'Lectura todavía genérica', 'Still a generic read'),
      reason: copy(locale, 'Todavía no hay una capa curada por campeón para este pick, así que la lectura se apoya más en tus datos que en una identidad editorial.', 'There is no curated champion layer for this pick yet, so the read leans more on your data than on editorial identity.')
    };
  }

  if (avgDeathsPre14 <= 1 && avgGoldDiffAt15 >= 0 && avgVolatility <= 44) {
    return {
      label: copy(locale, 'Tu muestra ya habilita la versión premium del pick', 'Your sample already unlocks the premium version of the pick'),
      reason: copy(locale, 'Tu early reciente no está destruyendo tempo, así que podés jugar esta identidad desde ventanas reales y no sólo desde teoría.', 'Your recent early game is not destroying tempo, so you can pilot this identity through real windows instead of theory only.')
    };
  }

  if (avgDeathsPre14 >= 1.8 || avgVolatility >= 52) {
    return {
      label: copy(locale, 'Primero hay que estabilizar la base', 'The baseline needs stabilizing first'),
      reason: copy(locale, 'Hoy la mejor versión del campeón no depende tanto de “tech”, sino de llegar vivo y ordenado a su primera ventana real.', 'Right now the champion does not mainly need more tech; it needs you to arrive alive and organized to the first real window.')
    };
  }

  return {
    label: copy(locale, 'El pick ya tiene valor, pero todavía no su mejor versión', 'The pick already has value, but not its cleanest version yet'),
    reason: copy(locale, 'Tu muestra ya muestra partes sanas del plan, aunque todavía hay partidas donde el campeón entra tarde o desde un estado demasiado frágil.', 'Your sample already shows healthy pieces of the plan, although there are still games where the champion enters late or from a state that is too fragile.')
  };
}

function fallbackProfile(championName: string, role: string, locale: Locale): ChampionIntelligenceProfile {
  return {
    championName,
    role,
    patchStatus: 'patch_sensitive',
    identitySummary: copy(locale, `${formatChampionName(championName)} ya tiene suficiente muestra para leer su patrón, pero todavía no una capa curada propia.`, `${formatChampionName(championName)} has enough sample to read its pattern, but not yet its own curated layer.`),
    identityBullets: [
      copy(locale, 'La siguiente iteración debería sumar identity, setup reads y matchup notes específicas.', 'The next iteration should add identity, setup reads and specific matchup notes.'),
      copy(locale, 'Mientras tanto, la vista se apoya en runas, builds y tus propias partidas.', 'Meanwhile, the view leans on runes, builds and your own matches.')
    ],
    setupVariants: [],
    matchupPlans: [],
    highEloReads: [],
    reviewTriggers: [],
    sourceLabel: 'Player sample + internal heuristics'
  };
}

export function buildChampionIntelligenceWorkbench(dataset: Dataset, locale: Locale = 'es'): ChampionIntelligenceWorkbench {
  const byChampion = new Map<string, MatchSnapshot[]>();
  for (const match of dataset.matches) {
    const current = byChampion.get(match.championName) ?? [];
    current.push(match);
    byChampion.set(match.championName, current);
  }

  const runeWorkbench = buildChampionRuneWorkbench(dataset, locale);
  const buildWorkbench = buildChampionBuildWorkbench(dataset, locale);
  const runeMap = new Map(runeWorkbench.map((entry) => [entry.championName, entry]));
  const buildMap = new Map((buildWorkbench.ready ? buildWorkbench.champions : []).map((entry) => [entry.championName, entry]));

  const champions = Array.from(byChampion.entries())
    .map(([championName, matches]) => {
      const sortedMatches = [...matches].sort((a, b) => b.gameCreation - a.gameCreation);
      const role = sortedMatches[0]?.role ?? 'ALL';
      const curated = championIntelligenceCatalog.find((entry) => entry.championName === championName && entry.role === role)
        ?? championIntelligenceCatalog.find((entry) => entry.championName === championName)
        ?? null;
      const profile = curated ?? fallbackProfile(championName, role, locale);
      const buildEntry = buildMap.get(championName) ?? null;
      const runeEntry = runeMap.get(championName) ?? null;
      const matchup = matchupSummary(matches);
      const avgScore = round(average(matches.map((match) => match.score.total)), 1);
      const playerFit = buildPlayerFit(matches, curated, locale);

      return {
        championName,
        role,
        games: matches.length,
        profile,
        headline: profile.identitySummary,
        subheadline: copy(locale, `${matches.length} partidas visibles. ${playerFit.label}.`, `${matches.length} visible games. ${playerFit.label}.`),
        setupVariants: profile.setupVariants.length
          ? profile.setupVariants
          : [
              {
                id: `${championName}-fallback`,
                label: copy(locale, 'Lectura base actual', 'Current baseline read'),
                role,
                stance: 'default' as const,
                summary: copy(locale, 'Todavía no hay una variante curada; usá el baseline medido de tus runas y builds actuales.', 'There is no curated variant yet; use the measured baseline from your current runes and builds.'),
                keystone: runeEntry?.keystones[0]?.baseline.keystone ?? null,
                skillOrder: [],
                itemPath: buildEntry?.baseline?.label ? [buildEntry.baseline.label] : [],
                bestWhen: copy(locale, 'Querés una lectura honesta del baseline actual.', 'You want an honest read of the current baseline.'),
                avoidWhen: copy(locale, 'Buscás una guía editorial específica que todavía no existe para este campeón.', 'You need a specific editorial guide that does not exist for this champion yet.'),
                playPatternShift: playerFit.reason,
                confidence: 'inferred' as const
              }
            ],
        matchupPlans: profile.matchupPlans,
        highEloReads: profile.highEloReads,
        reviewTriggers: profile.reviewTriggers,
        recommendedRuneLabel: runeEntry?.keystones[0]?.baseline.compactLabel ?? null,
        recommendedBuildLabel: buildEntry?.baseline?.label ?? null,
        playerProof: {
          games: matches.length,
          winRate: percent(matches.filter((match) => match.win).length, matches.length),
          avgScore,
          avgGoldDiffAt15: round(average(matches.map((match) => match.timeline.goldDiffAt15 ?? 0)), 0),
          avgDeathsPre14: round(average(matches.map((match) => match.timeline.deathsPre14)), 1),
          avgKillParticipation: round(average(matches.map((match) => match.killParticipation)), 1),
          avgLaneVolatility: round(average(matches.map((match) => match.timeline.laneVolatilityScore ?? 0)), 1),
          recentTrendLabel: buildRecentTrendLabel(matches, locale),
          bestMatchup: matchup.best,
          hardestMatchup: matchup.hardest,
          playerFitLabel: playerFit.label,
          playerFitReason: playerFit.reason
        }
      } satisfies ChampionIntelligenceViewModel;
    })
    .sort((left, right) => right.games - left.games || right.playerProof.avgScore - left.playerProof.avgScore);

  return {
    selectedChampionName: champions[0]?.championName ?? null,
    champions
  };
}
