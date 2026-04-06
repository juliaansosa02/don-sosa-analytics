import type { Dataset, MatchSnapshot } from '../../types';
import { formatDecimal, formatSignedNumber } from '../../lib/format';
import { formatChampionName, getQueueLabel, getRoleLabel } from '../../lib/lol';
import type { Locale } from '../../lib/i18n';

type MatchReadTone = 'reference' | 'stable' | 'volatile' | 'warning' | 'neutral';

export type ChampionAccent = {
  glow: string;
  border: string;
  panel: string;
  muted: string;
  text: string;
};

type MatchQuickRead = {
  tone: MatchReadTone;
  toneLabel: string;
  impactLabel: string;
  title: string;
  body: string;
  evidence: string[];
  reviewBullets: string[];
};

const accentPalettes: ChampionAccent[] = [
  {
    glow: 'rgba(110, 198, 255, 0.12)',
    border: 'rgba(110, 198, 255, 0.14)',
    panel: 'linear-gradient(180deg, rgba(11,17,28,0.98), rgba(7,11,18,0.99))',
    muted: '#8ccfff',
    text: '#e7f6ff'
  },
  {
    glow: 'rgba(255, 164, 102, 0.11)',
    border: 'rgba(255, 164, 102, 0.13)',
    panel: 'linear-gradient(180deg, rgba(14,17,25,0.98), rgba(7,11,18,0.99))',
    muted: '#ffc28e',
    text: '#fff0e2'
  },
  {
    glow: 'rgba(123, 239, 197, 0.11)',
    border: 'rgba(123, 239, 197, 0.13)',
    panel: 'linear-gradient(180deg, rgba(11,17,24,0.98), rgba(7,11,18,0.99))',
    muted: '#98f2d2',
    text: '#ebfff8'
  },
  {
    glow: 'rgba(255, 128, 149, 0.11)',
    border: 'rgba(255, 128, 149, 0.13)',
    panel: 'linear-gradient(180deg, rgba(12,16,24,0.98), rgba(7,11,18,0.99))',
    muted: '#ffb4c2',
    text: '#fff0f4'
  },
  {
    glow: 'rgba(208, 176, 96, 0.11)',
    border: 'rgba(208, 176, 96, 0.13)',
    panel: 'linear-gradient(180deg, rgba(13,17,24,0.98), rgba(7,11,18,0.99))',
    muted: '#f0d496',
    text: '#fff7e3'
  },
  {
    glow: 'rgba(155, 142, 255, 0.11)',
    border: 'rgba(155, 142, 255, 0.13)',
    panel: 'linear-gradient(180deg, rgba(12,16,26,0.98), rgba(7,11,18,0.99))',
    muted: '#c7bfff',
    text: '#f3f0ff'
  }
];

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function hashText(input: string) {
  return Array.from(input).reduce((hash, char) => ((hash * 31) + char.charCodeAt(0)) >>> 0, 7);
}

export function getChampionAccent(championName?: string | null): ChampionAccent {
  if (!championName) return accentPalettes[0];
  return accentPalettes[hashText(championName) % accentPalettes.length];
}

export function formatMatchDuration(gameDurationSeconds: number, locale: Locale) {
  const totalMinutes = Math.max(1, Math.round(gameDurationSeconds / 60));
  const minutes = Math.floor(totalMinutes);
  const seconds = Math.round(gameDurationSeconds % 60);
  const suffix = locale === 'en' ? 'min' : 'min';
  return `${minutes}:${String(seconds).padStart(2, '0')} ${suffix}`;
}

export function findAnchorChampion(matches: MatchSnapshot[]) {
  const counts = new Map<string, number>();
  for (const match of matches) {
    counts.set(match.championName, (counts.get(match.championName) ?? 0) + 1);
  }

  return Array.from(counts.entries()).sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
}

function toneLabel(tone: MatchReadTone, locale: Locale) {
  switch (tone) {
    case 'reference':
      return locale === 'en' ? 'Reference game' : 'Partida referencia';
    case 'stable':
      return locale === 'en' ? 'Stable game' : 'Partida estable';
    case 'volatile':
      return locale === 'en' ? 'Volatile game' : 'Partida volátil';
    case 'warning':
      return locale === 'en' ? 'Review priority' : 'Prioridad de review';
    default:
      return locale === 'en' ? 'Useful context' : 'Contexto útil';
  }
}

export function getImpactLabel(match: MatchSnapshot, locale: Locale) {
  if (match.win && match.score.total >= 88 && match.killParticipation >= 62) {
    return locale === 'en' ? 'Internal MVP signal' : 'Señal interna de MVP';
  }
  if (match.score.total >= 80) {
    return locale === 'en' ? 'High impact' : 'Impacto alto';
  }
  if (!match.win && match.score.total <= 58) {
    return locale === 'en' ? 'Hard review' : 'Review fuerte';
  }
  if (match.timeline.laneVolatilityScore >= 1.5 || match.timeline.deathsPre14 >= 2) {
    return locale === 'en' ? 'Volatile early' : 'Early volátil';
  }
  return locale === 'en' ? 'Playable read' : 'Lectura jugable';
}

export function buildMatchQuickRead(match: MatchSnapshot, dataset: Dataset, locale: Locale): MatchQuickRead {
  const championName = formatChampionName(match.championName);
  const opponentName = match.opponentChampionName ? formatChampionName(match.opponentChampionName) : null;
  const roleLabel = getRoleLabel((match.role || dataset.summary.primaryRole || 'ALL').toUpperCase());
  const sameChampionMatches = dataset.matches.filter((entry) => entry.championName === match.championName);
  const sameMatchupMatches = dataset.matches.filter((entry) =>
    entry.championName === match.championName &&
    entry.opponentChampionName === match.opponentChampionName
  );
  const sameMatchupLosses = sameMatchupMatches.filter((entry) => !entry.win).length;
  const sameMatchupWins = sameMatchupMatches.filter((entry) => entry.win).length;
  const championBaselineScore = average(sameChampionMatches.map((entry) => entry.score.total));
  const championBaselineWinRate = sameChampionMatches.length
    ? (sameChampionMatches.filter((entry) => entry.win).length / sameChampionMatches.length) * 100
    : dataset.summary.winRate;
  const objectivePressure = (match.timeline.objectiveSetupScore ?? 0) + (match.timeline.objectiveFightDeaths ?? 0) * 0.45;
  const earlyVolatility = (match.timeline.laneVolatilityScore ?? 0) + (match.timeline.deathsPre14 >= 2 ? 0.4 : 0);
  const resetDebt = match.timeline.resetTimingScore ?? 0;
  const leadAt15 = (match.timeline.goldDiffAt15 ?? 0) >= 150;
  const severeLaneDeficit = (match.timeline.goldDiffAt15 ?? 0) <= -350 || (match.timeline.levelDiffAt15 ?? 0) <= -0.8;
  const reviewVsBaseline = match.score.total - championBaselineScore;
  const repeatedToughMatchup = Boolean(opponentName && sameMatchupMatches.length >= 2 && sameMatchupLosses >= 2);
  const repeatedPlayableMatchup = Boolean(opponentName && sameMatchupMatches.length >= 2 && sameMatchupWins >= 2 && sameMatchupWins > sameMatchupLosses);

  if (match.win && match.score.total >= 86 && leadAt15 && objectivePressure <= 0.55) {
    return {
      tone: 'reference',
      toneLabel: toneLabel('reference', locale),
      impactLabel: getImpactLabel(match, locale),
      title: locale === 'en' ? 'Use this as your reference version' : 'Usá esta como tu versión referencia',
      body: locale === 'en'
        ? `${championName}${opponentName ? ` into ${opponentName}` : ''} played from early control into clean conversion. This is the kind of game you want to compare your next block against.`
        : `${championName}${opponentName ? ` contra ${opponentName}` : ''} jugó desde control temprano hacia una conversión limpia. Este es el tipo de partida contra la que conviene comparar tu próximo bloque.`,
      evidence: [
        locale === 'en'
          ? `Won from +${Math.round(match.timeline.goldDiffAt15 ?? 0)} gold at 15 with score ${Math.round(match.score.total)}.`
          : `La cerraste con +${Math.round(match.timeline.goldDiffAt15 ?? 0)} de oro al 15 y score ${Math.round(match.score.total)}.`,
        locale === 'en'
          ? `Objective setup stayed clean instead of reopening the map for free.`
          : 'El setup de objetivos se mantuvo limpio en vez de reabrirle el mapa gratis al rival.',
        locale === 'en'
          ? `${championName} ran ${formatSignedNumber(reviewVsBaseline, 0)} against your own champion baseline.`
          : `${championName} rindió ${formatSignedNumber(reviewVsBaseline, 0)} contra tu propia base del campeón.`
      ],
      reviewBullets: [
        locale === 'en' ? 'Save this replay for reset and objective setups.' : 'Guardá este replay para resets y setups de objetivo.',
        locale === 'en' ? 'Compare this against your next loss on the same pick.' : 'Comparala con tu próxima derrota en el mismo pick.'
      ]
    };
  }

  if (!match.win && objectivePressure >= 1.15) {
    return {
      tone: 'warning',
      toneLabel: toneLabel('warning', locale),
      impactLabel: getImpactLabel(match, locale),
      title: locale === 'en' ? 'The game broke before the fight really started' : 'La partida se rompió antes de que empezara la pelea',
      body: locale === 'en'
        ? `${championName}${opponentName ? ` into ${opponentName}` : ''} did not fail only inside the fight. The expensive leak was how this game arrived to dragon, Herald or Baron.`
        : `${championName}${opponentName ? ` contra ${opponentName}` : ''} no falló solo dentro de la pelea. La fuga cara estuvo en cómo esta partida llegó a dragón, Heraldo o Baron.`,
      evidence: [
        locale === 'en'
          ? `Setup score ${formatDecimal(match.timeline.objectiveSetupScore, 1)} with ${formatDecimal(match.timeline.objectiveSetupDeaths, 1)} deaths around objective setup.`
          : `Score de setup ${formatDecimal(match.timeline.objectiveSetupScore, 1)} con ${formatDecimal(match.timeline.objectiveSetupDeaths, 1)} muertes alrededor del setup.`,
        locale === 'en'
          ? `This is a route, reset and arrival-order review more than a pure mechanics review.`
          : 'Este review es más de ruta, reset y orden de llegada que de mecánica pura.'
      ],
      reviewBullets: [
        locale === 'en' ? 'Watch the 70 seconds before the key objective.' : 'Mirá los 70 segundos previos al objetivo clave.',
        locale === 'en' ? 'Mark which lane or camp held you too long.' : 'Marcá qué línea o campamento te retuvo de más.'
      ]
    };
  }

  if (!match.win && resetDebt >= 1) {
    return {
      tone: 'warning',
      toneLabel: toneLabel('warning', locale),
      impactLabel: getImpactLabel(match, locale),
      title: locale === 'en' ? 'Reset debt kept making the next play worse' : 'La deuda de reset fue empeorando cada jugada siguiente',
      body: locale === 'en'
        ? `${championName} kept arriving late to the next playable window. The issue here is less the last fight and more which base or extra wave created the debt.`
        : `${championName} fue llegando tarde a la siguiente ventana jugable. El problema acá es menos la última pelea y más qué base o wave de más creó la deuda.`,
      evidence: [
        locale === 'en'
          ? `First base landed around minute ${formatDecimal(match.timeline.firstBaseMinute, 1)} with reset score ${formatDecimal(match.timeline.resetTimingScore, 1)}.`
          : `La primera base cayó cerca del minuto ${formatDecimal(match.timeline.firstBaseMinute, 1)} con score de reset ${formatDecimal(match.timeline.resetTimingScore, 1)}.`,
        locale === 'en'
          ? `First completed item showed up around minute ${formatDecimal(match.items?.milestones.firstCompletedItemMinute, 1)}.`
          : `El primer item completo apareció cerca del minuto ${formatDecimal(match.items?.milestones.firstCompletedItemMinute, 1)}.`
      ],
      reviewBullets: [
        locale === 'en' ? 'Review the base that forced you to choose between map and spend timing.' : 'Revisá la base que te obligó a elegir entre timing de mapa y de compra.',
        locale === 'en' ? 'Compare this one against a cleaner game on the same pick.' : 'Compará esta contra una partida más limpia en el mismo pick.'
      ]
    };
  }

  if (!match.win && (earlyVolatility >= 1.6 || severeLaneDeficit)) {
    return {
      tone: 'volatile',
      toneLabel: toneLabel('volatile', locale),
      impactLabel: getImpactLabel(match, locale),
      title: locale === 'en' ? 'The early game never became stable enough' : 'El early nunca llegó a estabilizarse',
      body: locale === 'en'
        ? `${championName}${opponentName ? ` into ${opponentName}` : ''} entered minute 15 from a compromised state. This is the kind of loss where the first unstable mistake usually matters more than the last bad fight.`
        : `${championName}${opponentName ? ` contra ${opponentName}` : ''} entró al minuto 15 desde un estado comprometido. Este es el tipo de derrota donde suele pesar más el primer error inestable que la última pelea mala.`,
      evidence: [
        locale === 'en'
          ? `${formatDecimal(match.timeline.deathsPre14)} deaths before 14 with lane volatility ${formatDecimal(match.timeline.laneVolatilityScore, 1)}.`
          : `${formatDecimal(match.timeline.deathsPre14)} muertes antes del 14 con volatilidad de línea ${formatDecimal(match.timeline.laneVolatilityScore, 1)}.`,
        locale === 'en'
          ? `Minute 15 arrived at ${formatSignedNumber(match.timeline.goldDiffAt15, 0)} gold and ${formatSignedNumber(match.timeline.levelDiffAt15, 1)} levels.`
          : `El minuto 15 llegó con ${formatSignedNumber(match.timeline.goldDiffAt15, 0)} de oro y ${formatSignedNumber(match.timeline.levelDiffAt15, 1)} niveles.`
      ],
      reviewBullets: [
        locale === 'en' ? 'Pause on the first avoidable death and the next minute.' : 'Frená en la primera muerte evitable y el minuto siguiente.',
        locale === 'en' ? `Review the matchup from ${roleLabel}, not only the scoreboard.` : `Revisá el matchup desde ${roleLabel}, no solo desde el score final.`
      ]
    };
  }

  if (repeatedToughMatchup) {
    return {
      tone: 'warning',
      toneLabel: toneLabel('warning', locale),
      impactLabel: getImpactLabel(match, locale),
      title: locale === 'en' ? 'This matchup is still costing you real games' : 'Este matchup te sigue costando partidas de verdad',
      body: locale === 'en'
        ? `${championName} into ${opponentName} is already a repeated problem inside your own sample. The useful review is to isolate what keeps failing first in this exact cross, not to judge the game as a generic loss.`
        : `${championName} contra ${opponentName} ya es un problema repetido dentro de tu propia muestra. El review útil es aislar qué se rompe primero en este cruce exacto, no leerlo como una derrota genérica.`,
      evidence: [
        locale === 'en'
          ? `${sameMatchupMatches.length} visible games into ${opponentName}, with ${sameMatchupLosses} losses in the sample.`
          : `${sameMatchupMatches.length} partidas visibles contra ${opponentName}, con ${sameMatchupLosses} derrotas en la muestra.`,
        locale === 'en'
          ? `This game still landed ${formatSignedNumber(match.timeline.goldDiffAt15, 0)} gold and ${formatSignedNumber(match.timeline.levelDiffAt15, 1)} levels by minute 15.`
          : `Esta partida igual cayó en ${formatSignedNumber(match.timeline.goldDiffAt15, 0)} de oro y ${formatSignedNumber(match.timeline.levelDiffAt15, 1)} niveles al minuto 15.`
      ],
      reviewBullets: [
        locale === 'en' ? 'Compare only against your other games into the same opponent.' : 'Comparala solo contra tus otras partidas contra ese mismo rival.',
        locale === 'en' ? 'Mark whether the cross is breaking by lane state, reset or first map move.' : 'Marcá si el cruce se está rompiendo por lane state, reset o primer move al mapa.'
      ]
    };
  }

  if (match.win && match.killParticipation >= 60 && match.score.total >= championBaselineScore) {
    return {
      tone: 'stable',
      toneLabel: toneLabel('stable', locale),
      impactLabel: getImpactLabel(match, locale),
      title: locale === 'en' ? 'This game stayed connected to the live side' : 'Esta partida se mantuvo conectada al lado vivo',
      body: locale === 'en'
        ? `${championName} did not just win. It kept finding the plays that were actually moving the map and stayed above your usual baseline on this champion.`
        : `${championName} no solo ganó. Fue encontrando las jugadas que realmente movían el mapa y quedó por encima de tu línea habitual con este campeón.`,
      evidence: [
        locale === 'en'
          ? `${formatDecimal(match.killParticipation)}% KP with score ${Math.round(match.score.total)} on a ${Math.round(championBaselineWinRate)}% baseline pick.`
          : `${formatDecimal(match.killParticipation)}% de KP con score ${Math.round(match.score.total)} en un pick cuya base va en ${Math.round(championBaselineWinRate)}%.`,
        locale === 'en'
          ? `The read here is map connection and fight timing, not only KDA polish.`
          : 'La lectura acá es conexión al mapa y timing de pelea, no solo prolijidad de KDA.'
      ],
      reviewBullets: [
        locale === 'en' ? 'Use this one to compare your route into the first big fight.' : 'Usá esta para comparar tu ruta hacia la primera pelea grande.',
        locale === 'en' ? 'Keep the same map connection if the next game starts worse.' : 'Intentá sostener la misma conexión al mapa aunque la siguiente arranque peor.'
      ]
    };
  }

  if (repeatedPlayableMatchup && match.win) {
    return {
      tone: 'stable',
      toneLabel: toneLabel('stable', locale),
      impactLabel: getImpactLabel(match, locale),
      title: locale === 'en' ? 'You already have a playable answer in this matchup' : 'Ya tenés una respuesta jugable en este matchup',
      body: locale === 'en'
        ? `${championName} into ${opponentName} is not just a random win anymore. This cross is starting to show a repeatable version you can reuse when the same rival comes back.`
        : `${championName} contra ${opponentName} ya no es solo una victoria suelta. Este cruce empieza a mostrar una versión repetible que podés reutilizar cuando vuelva el mismo rival.`,
      evidence: [
        locale === 'en'
          ? `${sameMatchupMatches.length} visible games into ${opponentName}, with ${sameMatchupWins} wins in the sample.`
          : `${sameMatchupMatches.length} partidas visibles contra ${opponentName}, con ${sameMatchupWins} victorias en la muestra.`,
        locale === 'en'
          ? `This one stayed at score ${Math.round(match.score.total)} with ${formatDecimal(match.killParticipation)}% KP.`
          : `Esta quedó en score ${Math.round(match.score.total)} con ${formatDecimal(match.killParticipation)}% de KP.`
      ],
      reviewBullets: [
        locale === 'en' ? 'Use this cross as your first mirror before queueing back into it.' : 'Usá este cruce como primer espejo antes de volver a entrar en él.',
        locale === 'en' ? 'Hold the same reset and pressure pattern before changing runes or build.' : 'Sostené el mismo patrón de reset y presión antes de tocar runas o build.'
      ]
    };
  }

  return {
    tone: 'neutral',
    toneLabel: toneLabel('neutral', locale),
    impactLabel: getImpactLabel(match, locale),
    title: locale === 'en' ? 'Useful context game' : 'Partida útil para contexto',
    body: locale === 'en'
      ? `${championName}${opponentName ? ` into ${opponentName}` : ''} is useful because it shows exactly where tempo, map access or pressure stopped staying clean inside a still-playable game.`
      : `${championName}${opponentName ? ` contra ${opponentName}` : ''} sirve porque muestra exactamente dónde el tempo, el acceso al mapa o la presión dejaron de mantenerse limpios dentro de una partida todavía jugable.`,
    evidence: [
      locale === 'en'
        ? `${getQueueLabel(match.queueId)} · ${formatMatchDuration(match.gameDurationSeconds, locale)} · score ${Math.round(match.score.total)}.`
        : `${getQueueLabel(match.queueId)} · ${formatMatchDuration(match.gameDurationSeconds, locale)} · score ${Math.round(match.score.total)}.`,
      locale === 'en'
        ? `Champion baseline delta: ${formatSignedNumber(reviewVsBaseline, 0)}.`
        : `Delta contra tu base del campeón: ${formatSignedNumber(reviewVsBaseline, 0)}.`
    ],
    reviewBullets: [
      locale === 'en' ? 'Compare this with one cleaner and one dirtier game.' : 'Comparala con una partida más limpia y una más sucia.',
      locale === 'en' ? 'Mark where the game stopped giving you first move or pressure.' : 'Marcá dónde la partida dejó de darte primer move o presión.'
    ]
  };
}

export function findReferenceMatch(matches: MatchSnapshot[]) {
  return [...matches]
    .sort((left, right) => right.gameCreation - left.gameCreation)
    .slice(0, Math.min(7, matches.length))
    .filter((match) => match.win)
    .sort((left, right) =>
      (right.score.total + (right.timeline.goldDiffAt15 ?? 0) * 0.015 - (right.timeline.objectiveSetupScore ?? 0) * 8)
      - (left.score.total + (left.timeline.goldDiffAt15 ?? 0) * 0.015 - (left.timeline.objectiveSetupScore ?? 0) * 8)
    )[0] ?? null;
}

export function findReviewPriorityMatch(matches: MatchSnapshot[]) {
  return [...matches]
    .sort((left, right) => right.gameCreation - left.gameCreation)
    .slice(0, Math.min(7, matches.length))
    .filter((match) => !match.win)
    .sort((left, right) =>
      ((right.timeline.laneVolatilityScore ?? 0) * 18 + (right.timeline.objectiveSetupScore ?? 0) * 18 + Math.max(0, 64 - right.score.total))
      - ((left.timeline.laneVolatilityScore ?? 0) * 18 + (left.timeline.objectiveSetupScore ?? 0) * 18 + Math.max(0, 64 - left.score.total))
    )[0] ?? null;
}
