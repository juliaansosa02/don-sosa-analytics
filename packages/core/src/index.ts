export type MatchOutcome = 'WIN' | 'LOSS';

export interface RuneSelection {
  perk: number;
  var1?: number;
  var2?: number;
  var3?: number;
  name?: string;
  icon?: string;
  longDesc?: string;
}

export interface ParticipantSnapshot {
  matchId: string;
  championName: string;
  opponentChampionName?: string;
  opponentRole?: string;
  isRemake: boolean;
  role: string;
  lane: string;
  queueId: number;
  gameCreation: number;
  gameDurationSeconds: number;
  win: boolean;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  csPerMinute: number;
  goldEarned: number;
  goldPerMinute: number;
  damageToChampions: number;
  damageTaken: number;
  visionScore: number;
  killParticipation: number;
  doubleKills: number;
  tripleKills: number;
  quadraKills: number;
  pentaKills: number;
  soloKills?: number;
  turretKills?: number;
  dragonKills?: number;
  baronKills?: number;
  firstBloodKill?: boolean;
  firstTowerKill?: boolean;
  item0?: number;
  item1?: number;
  item2?: number;
  item3?: number;
  item4?: number;
  item5?: number;
  item6?: number;
  primaryRunes: RuneSelection[];
  secondaryRunes: RuneSelection[];
  statRunes: number[];
  runeStats: {
    totalDamageFromRunes: number;
    totalHealingFromRunes: number;
    totalShieldingFromRunes: number;
    keystoneValue: number;
  };
  timeline: {
    csAt10: number;
    csAt15: number;
    goldAt10: number;
    goldAt15: number;
    goldDiffAt15: number;
    xpAt10: number;
    xpAt15: number;
    levelAt15: number;
    levelDiffAt15: number;
    laneDeathsPre10: number;
    deathsPre14: number;
    firstMoveMinute?: number | null;
    objectiveFightDeaths: number;
  };
  score: {
    lane: number;
    economy: number;
    fighting: number;
    macro: number;
    consistency: number;
    total: number;
  };
}

export interface ChampionAggregate {
  championName: string;
  games: number;
  wins: number;
  winRate: number;
  avgScore: number;
  avgCsAt15: number;
  avgGoldAt15: number;
  avgDeathsPre14: number;
  avgRuneDamage: number;
  avgRuneHealing: number;
  classification: 'CORE_PICK' | 'COMFORT_TRAP' | 'POCKET_PICK' | 'UNSTABLE';
}

export interface CoachInsight {
  id: string;
  title: string;
  problem: string;
  category: 'early' | 'macro' | 'consistency' | 'champion-pool' | 'fighting' | 'positive';
  severity: 'high' | 'medium' | 'low';
  priority: 'high' | 'medium' | 'low';
  evidence: string[];
  impact: string;
  cause: string;
  actions: string[];
  metricValue?: number;
  winRateDelta?: number;
  focusMetric?: string;
}

export interface ImprovementCycle {
  focus: string;
  objective: string;
  targetGames: number;
  completedGames: number;
  progressPercent: number;
  successLabel: string;
}

export interface PerformanceTrend {
  baselineScore: number;
  recentScore: number;
  scoreDelta: number;
  baselineWinRate: number;
  recentWinRate: number;
  winRateDelta: number;
}

export interface CoachingSummary {
  headline: string;
  subheadline: string;
  topProblems: CoachInsight[];
  activePlan: ImprovementCycle | null;
  trend: PerformanceTrend;
}

export interface AggregateSummary {
  player: string;
  tagLine: string;
  region: string;
  platform: string;
  matches: number;
  wins: number;
  losses: number;
  winRate: number;
  avgKda: number;
  avgCsPerMinute: number;
  avgGoldPerMinute: number;
  avgVisionScore: number;
  avgKillParticipation: number;
  avgCsAt15: number;
  avgGoldAt15: number;
  avgDeathsPre14: number;
  avgPerformanceScore: number;
  consistencyIndex: number;
  remakesExcluded: number;
  championPool: ChampionAggregate[];
  insights: CoachInsight[];
  coaching: CoachingSummary;
}

export {
  getMembershipPlan,
  isPaidMembershipPlan,
  membershipPlanCatalog,
  membershipPlanOrder
} from './plans.js';
export type {
  MembershipPlanDefinition,
  MembershipPlanId,
  MembershipStatus,
  PlanEntitlements
} from './plans.js';

export type SummaryLocale = 'es' | 'en';

const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const round = (value: number, digits = 2) => Number(value.toFixed(digits));
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const formatSigned = (value: number, digits = 1) => `${value >= 0 ? '+' : ''}${round(value, digits)}`;
const percent = (wins: number, total: number) => (total ? (wins / total) * 100 : 0);
const text = (locale: SummaryLocale, es: string, en: string) => (locale === 'en' ? en : es);

interface RoleCoachingProfile {
  role: string;
  label: string;
  csAt15Target: number;
  stableDeathsPre14: number;
  farmCause: string;
  farmActions: string[];
  disciplineCause: string;
  disciplineActions: string[];
  macroCause: string;
  macroActions: string[];
}

const roleProfiles: Record<string, RoleCoachingProfile> = {
  ALL: {
    role: 'ALL',
    label: 'tu rol principal',
    csAt15Target: 100,
    stableDeathsPre14: 1,
    farmCause: 'Estás cediendo recursos en tramos donde la partida todavía se define por tempo y eficiencia.',
    farmActions: [
      'Marcá un objetivo simple de economía para tus próximas rankeds y revisá la primera decisión que te saca de ese plan.',
      'Antes de pelear, preguntate si la jugada mejora tu estado de oro, experiencia o prioridad real.',
      'Separá las reviews por rol para no mezclar patrones que piden soluciones distintas.'
    ],
    disciplineCause: 'Tu muestra pierde demasiadas partidas por errores encadenados antes de que la composición pueda respirar.',
    disciplineActions: [
      'Después del primer error, jugá el siguiente minuto para estabilizar recursos en lugar de forzar compensación inmediata.',
      'Revisá cada partida con dos o más muertes tempranas y marcá la primera decisión evitable.',
      'Medí tu mejora por cantidad de partidas limpias, no por highlights.'
    ],
    macroCause: 'Estás llegando tarde o desordenado a las ventanas donde la partida se convierte en objetivos.',
    macroActions: [
      'Si el objetivo aparece en menos de 70 segundos, priorizá reset, visión y posición sobre una jugada extra.',
      'Separá las peleas que nacen por tempo real de las que arrancan por ansiedad de forzar.',
      'Usá tus reviews para detectar si tu último minuto antes de cada objetivo suma o resta control.'
    ]
  },
  JUNGLE: {
    role: 'JUNGLE',
    label: 'jungla',
    csAt15Target: 95,
    stableDeathsPre14: 1,
    farmCause: 'Estás rompiendo demasiado seguido tu secuencia de campamentos por ganks o skirmishes de bajo porcentaje.',
    farmActions: [
      'Protegé tu primera y segunda rotación: no cortes campamentos por una jugada sin prioridad real de líneas.',
      'Si una ventana de gank no te da kill, flash o wave rota, volvé rápido a tu ruta.',
      'Revisá cada partida por debajo del objetivo y encontrá el primer desvío que te rompe el tempo.'
    ],
    disciplineCause: 'Tus primeras decisiones de mapa están regalando tempo, oro y control de objetivos antes del minuto 14.',
    disciplineActions: [
      'No pelees cangrejo, invade o dragón sin confirmar prioridad de al menos una línea cercana.',
      'Después de una jugada fallida, priorizá recuperar campamentos antes de forzar una segunda acción dudosa.',
      'Tomá como KPI bajar a una o menos muertes antes del 14 en tu muestra de práctica.'
    ],
    macroCause: 'Estás entrando a dragón, heraldo o torres sin reset ni setup, y eso te obliga a pelear desde atrás.',
    macroActions: [
      'Si el objetivo sale en menos de 70 segundos, pensá primero en reset, visión y posición.',
      'No inviertas una side play más si eso te hace llegar tarde al setup del objetivo.',
      'Revisá si tus derrotas nacen por pelear el objetivo o por llegar mal preparado a él.'
    ]
  },
  TOP: {
    role: 'TOP',
    label: 'top',
    csAt15Target: 102,
    stableDeathsPre14: 1,
    farmCause: 'Estás sacrificando demasiadas waves por trades o resets que no dejan la línea en estado sano.',
    farmActions: [
      'No cambies una wave completa por un trade que no te da placa, kill ni crash limpio.',
      'Baseá solo cuando la wave quede empujada o congelada a tu favor.',
      'En cada partida floja, detectá el primer recall o trade que te rompe el patrón de farmeo.'
    ],
    disciplineCause: 'Las primeras muertes te están dejando sin control de wave y sin margen para jugar side lane después.',
    disciplineActions: [
      'No pelees olas largas sin información del jungla rival.',
      'Si perdiste el primer trade fuerte, jugá por reset y wave estable antes de volver a forzar.',
      'Marcá como review obligatoria toda partida con dos o más muertes tempranas.'
    ],
    macroCause: 'Estás saliendo tarde de side o con mala wave a los momentos donde el mapa pide presencia.',
    macroActions: [
      'Cuando el objetivo se acerca, prepará la wave antes de ir por una placa extra.',
      'No pidas pelea si tu lane state te obliga a llegar perdiendo recursos.',
      'Revisá si tus teleports o rotaciones llegan a tiempo o llegan a apagar incendios.'
    ]
  },
  MIDDLE: {
    role: 'MIDDLE',
    label: 'mid',
    csAt15Target: 105,
    stableDeathsPre14: 1,
    farmCause: 'Estás dejando oro y experiencia por rotaciones o trades que no terminan generando ventaja real.',
    farmActions: [
      'No abandones wave por una jugada lateral si no llegás con prioridad clara.',
      'Antes de rotar, confirmá si la wave queda segura o si el costo en placas y cs es demasiado alto.',
      'Revisá la primera rotación de cada partida por debajo del objetivo de farm.'
    ],
    disciplineCause: 'Tus errores de posicionamiento temprano están abriendo mapa al rival demasiado pronto.',
    disciplineActions: [
      'No pelees prio ni visión lateral si tu jungla no puede acompañar.',
      'Después del primer error, jugá por control de wave y visión antes de volver a exponerte.',
      'Buscá que tus próximas rankeds queden en una o menos muertes antes del 14.'
    ],
    macroCause: 'Estás llegando a dragones y heraldos sin la prioridad de medio que debería ordenar la jugada.',
    macroActions: [
      'Usá la wave de medio para condicionar cuándo rotás al objetivo.',
      'Si no podés mover primero, evitá empezar una pelea que te obliga a entrar tarde.',
      'En review, marcá si perdiste el objetivo por ejecución o por no tener prioridad previa.'
    ]
  },
  BOTTOM: {
    role: 'BOTTOM',
    label: 'ADC',
    csAt15Target: 108,
    stableDeathsPre14: 1,
    farmCause: 'Tu curva de oro está sufriendo por trades y resets que te sacan de wave sin una ventaja equivalente.',
    farmActions: [
      'No entregues waves completas por perseguir una kill si no asegurás crash o placas.',
      'Sin ventaja de minions o información del jungla rival, jugá el trade corto o soltá la ventana.',
      'Revisá cada partida por debajo del objetivo y detectá qué reset o pelea te corta el ingreso de oro.'
    ],
    disciplineCause: 'Las primeras muertes están retrasando demasiado tu segundo item y tu entrada al mid game.',
    disciplineActions: [
      'No extiendas trades sin wave a favor ni cobertura en río.',
      'Después de perder summoners o trade fuerte, priorizá estabilizar wave antes que volver a forzar.',
      'Tomá como objetivo bajar a una o menos muertes antes del 14.'
    ],
    macroCause: 'Estás llegando a dragones y swaps sin el oro, la posición o los tiempos de reset que necesita un ADC.',
    macroActions: [
      'No llegues a objetivo con compras pendientes si podés resetear antes.',
      'Evitá la wave extra si te obliga a entrar tarde a una pelea frontal.',
      'Revisá si tus derrotas nacen por ejecución mecánica o por entrar tarde y con bajo tempo.'
    ]
  },
  UTILITY: {
    role: 'UTILITY',
    label: 'support',
    csAt15Target: 22,
    stableDeathsPre14: 2,
    farmCause: 'No es un problema de último golpe: la señal está en cuánto valor de mapa generás sin regalar tempo ni muertes.',
    farmActions: [
      'Medí tus primeros 15 minutos por presencia útil: visión, resets a tiempo y acompañamiento correcto.',
      'No abandones la lane o el río por una roam que no tenga prioridad real.',
      'Usá tus reviews para separar roams que crean ventaja de roams que solo te sacan del mapa.'
    ],
    disciplineCause: 'Tus muertes tempranas están cortando visión, tempo de roams y setup de objetivos.',
    disciplineActions: [
      'No entres primero a limpiar visión sin saber quién puede responder.',
      'Después de una mala pelea, priorizá reset y control de visión antes de volver a forzar.',
      'Tomá como meta sostener partidas con dos o menos muertes antes del 14.'
    ],
    macroCause: 'El problema no es llegar a la pelea: es llegar con la visión, el reset y la posición correctos.',
    macroActions: [
      'Usá la ventana previa al objetivo para resetear y plantar visión profunda con compañía.',
      'No gastes tu tiempo en una roam extra si eso te deja fuera del setup importante.',
      'Revisá qué porcentaje de tus derrotas llega con visión tardía al primer gran objetivo.'
    ]
  }
};

function getRoleProfile(role: string, locale: SummaryLocale = 'es'): RoleCoachingProfile {
  const profile = roleProfiles[role] ?? roleProfiles.ALL;
  if (locale === 'es') return profile;

  switch (profile.role) {
    case 'JUNGLE':
      return {
        ...profile,
        label: 'jungle',
        farmCause: 'You are breaking your camp sequence too often for low-percentage ganks or skirmishes.',
        farmActions: [
          'Protect your first and second clears: do not cut camps for a play with no real lane priority behind it.',
          'If a gank window does not give you a kill, flash or wave state, snap back into your route quickly.',
          'Review every low-farm game and find the first detour that breaks your tempo.'
        ],
        disciplineCause: 'Your early map decisions are leaking tempo, gold and objective control before minute 14.',
        disciplineActions: [
          'Do not fight for crab, invade or dragon without confirming priority from at least one nearby lane.',
          'After a failed play, recover camps first instead of forcing a second low-quality action.',
          'Use one or fewer deaths before minute 14 as a KPI inside your practice block.'
        ],
        macroCause: 'You are entering dragon, Herald or tower windows without reset or setup, which forces you to fight from behind.',
        macroActions: [
          'If the objective spawns in less than 70 seconds, think reset, vision and position before anything else.',
          'Do not take one more side play if it makes you late to objective setup.',
          'Review whether your losses come from the objective fight itself or from arriving badly prepared.'
        ]
      };
    case 'TOP':
      return {
        ...profile,
        label: 'top',
        farmCause: 'You are sacrificing too many waves for trades or resets that do not leave lane in a healthy state.',
        farmActions: [
          'Do not trade away a full wave unless the play gives you a plate, a kill or a clean crash.',
          'Base only when the wave is pushed or frozen in your favor.',
          'In every weak game, find the first recall or trade that breaks your farm pattern.'
        ],
        disciplineCause: 'Your first deaths are taking away wave control and shrinking your side-lane margin later on.',
        disciplineActions: [
          'Do not fight long waves without jungle information.',
          'If you lose the first big trade, play for reset and a stable wave before forcing again.',
          'Mark every game with two or more early deaths as mandatory review.'
        ],
        macroCause: 'You are leaving side lane too late or with a bad wave state when the map actually needs your presence.',
        macroActions: [
          'When an objective is coming, prepare the wave before you go for one more plate.',
          'Do not call for a fight if your lane state makes you arrive while bleeding resources.',
          'Review whether your teleports and rotations arrive on time or only to put out fires.'
        ]
      };
    case 'MIDDLE':
      return {
        ...profile,
        label: 'mid',
        farmCause: 'You are dropping gold and experience for rotations or trades that do not end up creating real advantage.',
        farmActions: [
          'Do not leave wave for a side play unless you can move with clear priority.',
          'Before rotating, confirm the wave is safe or the cost in plates and CS is acceptable.',
          'Review the first roam in every game that misses the farm target.'
        ],
        disciplineCause: 'Your early positioning errors are opening the map for the enemy too soon.',
        disciplineActions: [
          'Do not fight for prio or side vision if your jungler cannot support the play.',
          'After the first mistake, return to wave control and vision before exposing yourself again.',
          'Aim for one or fewer deaths before minute 14 in your next ranked block.'
        ],
        macroCause: 'You are reaching dragon and Herald windows without the mid priority that should structure the play.',
        macroActions: [
          'Use the mid wave to decide when you are allowed to rotate to the objective.',
          'If you cannot move first, do not start a fight that forces you to enter late.',
          'In review, mark whether you lost the objective because of execution or because you lacked prior priority.'
        ]
      };
    case 'BOTTOM':
      return {
        ...profile,
        label: 'ADC',
        farmCause: 'Your gold curve is suffering from trades and resets that pull you off wave without an equivalent payoff.',
        farmActions: [
          'Do not give up full waves chasing a kill unless you secure the crash or plates behind it.',
          'Without minion advantage or jungle information, keep the trade short or let the window go.',
          'Review every low-economy game and find the reset or fight that cuts your income.'
        ],
        disciplineCause: 'Your early deaths are delaying second item timing and your entry into mid game too heavily.',
        disciplineActions: [
          'Do not extend trades without wave advantage or river coverage.',
          'After losing summoners or a heavy trade, stabilize wave first instead of forcing back in.',
          'Set one or fewer deaths before minute 14 as the habit target.'
        ],
        macroCause: 'You are arriving to dragons and swaps without the gold, position or reset timing an ADC needs.',
        macroActions: [
          'Do not enter an objective window with unspent gold if you have time to reset first.',
          'Skip the extra wave if it makes you late to a front-to-back fight.',
          'Review whether your losses come from mechanics or from entering late with low tempo.'
        ]
      };
    case 'UTILITY':
      return {
        ...profile,
        label: 'support',
        farmCause: 'This is not a last-hit problem: the signal is how much map value you create without giving away tempo or deaths.',
        farmActions: [
          'Measure your first 15 minutes by useful presence: vision, timely resets and correct support windows.',
          'Do not leave lane or river for a roam that has no real priority behind it.',
          'Use reviews to separate roams that create advantage from roams that simply pull you off the map.'
        ],
        disciplineCause: 'Your early deaths are cutting vision control, roam tempo and objective setup.',
        disciplineActions: [
          'Do not walk in first to clear vision if you do not know who can answer.',
          'After a bad fight, reset and rebuild vision before forcing again.',
          'Use two or fewer deaths before minute 14 as the stability target.'
        ],
        macroCause: 'The issue is not reaching the fight. It is reaching it with the right vision, reset and position.',
        macroActions: [
          'Use the pre-objective window to reset and place deep vision with help.',
          'Do not spend your time on one more roam if it removes you from the important setup.',
          'Review how often your losses arrive with late vision at the first major objective.'
        ]
      };
    case 'ALL':
      return {
        ...profile,
        label: 'your main role',
        farmCause: 'You are giving away resources in windows where the game is still defined by tempo and efficiency.',
        farmActions: [
          'Set one simple economy target for your next ranked block and review the first decision that pulls you off it.',
          'Before fighting, ask whether the play improves your gold, experience or real priority state.',
          'Split reviews by role so you do not mix patterns that need different fixes.'
        ],
        disciplineCause: 'Too many games in the sample are being lost through chained mistakes before your comp can breathe.',
        disciplineActions: [
          'After the first mistake, play the next minute to stabilize resources instead of forcing instant compensation.',
          'Review every game with two or more early deaths and mark the first avoidable decision.',
          'Measure improvement by clean games, not by highlights.'
        ],
        macroCause: 'You are reaching the windows where the game converts into objectives either late or disorganized.',
        macroActions: [
          'If an objective is spawning in less than 70 seconds, prioritize reset, vision and position over one more play.',
          'Separate fights that come from real tempo from fights that start from anxiety to force.',
          'Use reviews to detect whether your last minute before each objective adds control or removes it.'
        ]
      };
    default:
      return profile;
  }
}

function findPrimaryRole(matches: ParticipantSnapshot[]) {
  const counts = new Map<string, number>();
  for (const match of matches) {
    const role = match.role || 'ALL';
    counts.set(role, (counts.get(role) ?? 0) + 1);
  }

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'ALL';
}

function recordLabel(wins: number, total: number, locale: SummaryLocale = 'es') {
  return locale === 'en'
    ? `${wins} out of ${total} (${round(percent(wins, total), 1)}% WR)`
    : `${wins} de ${total} (${round(percent(wins, total), 1)}% WR)`;
}

function formatChampionShare(games: number, total: number, locale: SummaryLocale = 'es') {
  return locale === 'en'
    ? `${games} out of ${total} matches (${round(percent(games, total), 1)}%)`
    : `${games} de ${total} partidas (${round(percent(games, total), 1)}%)`;
}

function sampleDifferenceLabel(leftWins: number, leftTotal: number, rightWins: number, rightTotal: number, locale: SummaryLocale = 'es') {
  return `${recordLabel(leftWins, leftTotal, locale)} vs ${recordLabel(rightWins, rightTotal, locale)}`;
}

export function calculateScore(participant: Omit<ParticipantSnapshot, 'score'>): ParticipantSnapshot['score'] {
  const lane = clamp(40 + participant.timeline.csAt10 * 0.5 + (participant.timeline.goldAt10 / 100) - participant.timeline.laneDeathsPre10 * 12);
  const economy = clamp(30 + participant.csPerMinute * 8 + participant.goldPerMinute * 0.08 + (participant.timeline.goldAt15 / 150));
  const fighting = clamp(35 + (participant.kills + participant.assists) * 2 - participant.deaths * 6 + participant.killParticipation * 0.35);
  const macro = clamp(35 + (participant.dragonKills ?? 0) * 10 + (participant.baronKills ?? 0) * 16 + (participant.turretKills ?? 0) * 7 - participant.timeline.objectiveFightDeaths * 9);
  const consistency = clamp(60 - participant.timeline.deathsPre14 * 10 + participant.timeline.csAt15 * 0.25 + participant.visionScore * 0.1);
  const total = clamp(lane * 0.22 + economy * 0.22 + fighting * 0.22 + macro * 0.17 + consistency * 0.17);
  return {
    lane: round(lane),
    economy: round(economy),
    fighting: round(fighting),
    macro: round(macro),
    consistency: round(consistency),
    total: round(total)
  };
}

export function buildChampionPool(matches: ParticipantSnapshot[]): ChampionAggregate[] {
  const grouped = new Map<string, ParticipantSnapshot[]>();
  for (const match of matches) {
    const list = grouped.get(match.championName) ?? [];
    list.push(match);
    grouped.set(match.championName, list);
  }

  return Array.from(grouped.entries()).map(([championName, list]) => {
    const games = list.length;
    const wins = list.filter((match) => match.win).length;
    const winRate = games ? (wins / games) * 100 : 0;
    const avgScore = avg(list.map((match) => match.score.total));
    const avgCsAt15 = avg(list.map((match) => match.timeline.csAt15));
    const avgGoldAt15 = avg(list.map((match) => match.timeline.goldAt15));
    const avgDeathsPre14 = avg(list.map((match) => match.timeline.deathsPre14));
    const avgRuneDamage = avg(list.map((match) => match.runeStats.totalDamageFromRunes));
    const avgRuneHealing = avg(list.map((match) => match.runeStats.totalHealingFromRunes));

    let classification: ChampionAggregate['classification'] = 'UNSTABLE';
    if (games >= 8 && winRate >= 55 && avgScore >= 68) classification = 'CORE_PICK';
    else if (games >= 8 && winRate < 50) classification = 'COMFORT_TRAP';
    else if (games <= 5 && winRate >= 60 && avgScore >= 70) classification = 'POCKET_PICK';

    return {
      championName,
      games,
      wins,
      winRate: round(winRate),
      avgScore: round(avgScore),
      avgCsAt15: round(avgCsAt15),
      avgGoldAt15: round(avgGoldAt15),
      avgDeathsPre14: round(avgDeathsPre14),
      avgRuneDamage: round(avgRuneDamage),
      avgRuneHealing: round(avgRuneHealing),
      classification
    };
  }).sort((a, b) => b.games - a.games);
}

export function buildInsights(matches: ParticipantSnapshot[], championPool: ChampionAggregate[], locale: SummaryLocale = 'es'): CoachInsight[] {
  const insights: CoachInsight[] = [];
  if (!matches.length) return insights;

  const primaryRole = findPrimaryRole(matches);
  const roleProfile = getRoleProfile(primaryRole, locale);
  const stableLimit = roleProfile.stableDeathsPre14;
  const targetCsAt15 = roleProfile.csAt15Target;

  const belowFarmTarget = matches.filter((match) => match.timeline.csAt15 < targetCsAt15);
  const onFarmTarget = matches.filter((match) => match.timeline.csAt15 >= targetCsAt15);
  const disciplinedGames = matches.filter((match) => match.timeline.deathsPre14 <= stableLimit);
  const volatileGames = matches.filter((match) => match.timeline.deathsPre14 >= stableLimit + 2);
  const earlyDeathGames = matches.filter((match) => match.timeline.laneDeathsPre10 > 0);
  const objectiveDeaths = avg(matches.map((match) => match.timeline.objectiveFightDeaths));
  const avgPre14Deaths = avg(matches.map((match) => match.timeline.deathsPre14));
  const avgCsAt15 = avg(matches.map((match) => match.timeline.csAt15));
  const topChampion = championPool[0];
  const topChampionMatches = topChampion ? matches.filter((match) => match.championName === topChampion.championName) : [];
  const otherChampionMatches = topChampion ? matches.filter((match) => match.championName !== topChampion.championName) : [];

  if (matches.length >= 8 && belowFarmTarget.length >= Math.max(4, Math.floor(matches.length * 0.35))) {
    insights.push({
      id: 'farm-threshold',
      title: text(locale, `Tu economía temprana en ${roleProfile.label} todavía no te deja entrar al mid game con el margen correcto.`, `Your early economy in ${roleProfile.label} still is not giving you the margin you need to enter mid game cleanly.`),
      problem: text(locale, 'El piso de farm a los 15 minutos sigue demasiado bajo', 'Your farming floor at 15 minutes is still too low'),
      category: 'early',
      severity: avgCsAt15 < targetCsAt15 - 8 ? 'high' : 'medium',
      priority: avgCsAt15 < targetCsAt15 - 8 ? 'high' : 'medium',
      evidence: [
        text(locale, `Promediás ${round(avgCsAt15, 1)} CS al 15; para ${roleProfile.label} estamos usando ${targetCsAt15} como referencia operativa.`, `You average ${round(avgCsAt15, 1)} CS at 15; for ${roleProfile.label} we are using ${targetCsAt15} as the operating benchmark.`),
        text(locale, `${round(percent(belowFarmTarget.length, matches.length), 1)}% de tu muestra queda por debajo de ese objetivo.`, `${round(percent(belowFarmTarget.length, matches.length), 1)}% of your sample lands below that target.`),
        text(locale,
          `Cuando llegás al objetivo, cerrás ${recordLabel(onFarmTarget.filter((match) => match.win).length, onFarmTarget.length, locale)}; cuando no llegás, bajás a ${recordLabel(belowFarmTarget.filter((match) => match.win).length, belowFarmTarget.length, locale)}.`,
          `When you reach the target, you finish at ${recordLabel(onFarmTarget.filter((match) => match.win).length, onFarmTarget.length, locale)}; when you do not, you drop to ${recordLabel(belowFarmTarget.filter((match) => match.win).length, belowFarmTarget.length, locale)}.`
        )
      ],
      impact: text(
        locale,
        `La diferencia entre tus partidas con economía estable y tus partidas cortas de recursos es clara: ${sampleDifferenceLabel(onFarmTarget.filter((match) => match.win).length, onFarmTarget.length, belowFarmTarget.filter((match) => match.win).length, belowFarmTarget.length, locale)}.`,
        `The split between your stable-economy games and your resource-starved games is clear: ${sampleDifferenceLabel(onFarmTarget.filter((match) => match.win).length, onFarmTarget.length, belowFarmTarget.filter((match) => match.win).length, belowFarmTarget.length, locale)}.`
      ),
      cause: roleProfile.farmCause,
      actions: roleProfile.farmActions,
      metricValue: round(avgCsAt15, 1),
      winRateDelta: round(percent(onFarmTarget.filter((match) => match.win).length, onFarmTarget.length) - percent(belowFarmTarget.filter((match) => match.win).length, belowFarmTarget.length), 1),
      focusMetric: 'cs_at_15'
    });
  }

  if (matches.length >= 8 && (avgPre14Deaths > stableLimit + 0.4 || volatileGames.length >= Math.max(3, Math.floor(matches.length * 0.2)))) {
    insights.push({
      id: 'consistency-floor',
      title: text(locale, 'El problema hoy no es tu techo mecánico: es cuántas partidas se rompen demasiado pronto.', 'The issue right now is not your ceiling. It is how many games break too early.'),
      problem: text(locale, 'Tu piso de partida sigue siendo inestable', 'Your game floor is still unstable'),
      category: 'consistency',
      severity: avgPre14Deaths >= stableLimit + 1 ? 'high' : 'medium',
      priority: 'high',
      evidence: [
        text(locale, `Promediás ${round(avgPre14Deaths, 1)} muertes antes del 14; para ${roleProfile.label} el objetivo es sostener ${stableLimit} o menos.`, `You average ${round(avgPre14Deaths, 1)} deaths before minute 14; for ${roleProfile.label} the target is ${stableLimit} or fewer.`),
        text(locale, `Tus partidas limpias cierran ${recordLabel(disciplinedGames.filter((match) => match.win).length, disciplinedGames.length, locale)}.`, `Your clean games finish at ${recordLabel(disciplinedGames.filter((match) => match.win).length, disciplinedGames.length, locale)}.`),
        text(locale, `Cuando la partida se vuelve volátil temprano, bajás a ${recordLabel(volatileGames.filter((match) => match.win).length, volatileGames.length, locale)}.`, `When the game turns volatile early, you drop to ${recordLabel(volatileGames.filter((match) => match.win).length, volatileGames.length, locale)}.`)
      ],
      impact: text(locale, 'La calidad de tus primeras decisiones está separando con bastante nitidez tus partidas jugables de tus partidas que se derrumban antes del mid game.', 'The quality of your first decisions is separating your playable games from the ones that collapse before mid game.'),
      cause: roleProfile.disciplineCause,
      actions: roleProfile.disciplineActions,
      metricValue: round(avgPre14Deaths, 1),
      winRateDelta: round(percent(disciplinedGames.filter((match) => match.win).length, disciplinedGames.length) - percent(volatileGames.filter((match) => match.win).length, volatileGames.length), 1),
      focusMetric: 'deaths_pre_14'
    });
  }

  if (matches.length >= 8 && objectiveDeaths >= 1) {
    insights.push({
      id: 'objective-discipline',
      title: text(locale, 'Tus resultados caen cuando llegás tarde o mal preparado a las ventanas de objetivo.', 'Your results dip when you arrive late or unprepared to objective windows.'),
      problem: text(locale, 'El setup de objetivos está cediendo demasiado valor', 'Your objective setup is giving away too much value'),
      category: 'macro',
      severity: objectiveDeaths >= 1.5 ? 'high' : 'medium',
      priority: 'medium',
      evidence: [
        text(locale, `Promediás ${round(objectiveDeaths, 1)} muertes en peleas cercanas a dragón, heraldo o barón.`, `You average ${round(objectiveDeaths, 1)} deaths in fights around dragon, Herald or Baron.`),
        text(locale, `${round(percent(matches.filter((match) => match.timeline.objectiveFightDeaths > 0).length, matches.length), 1)}% de tu muestra pierde al menos una vida en estas ventanas.`, `${round(percent(matches.filter((match) => match.timeline.objectiveFightDeaths > 0).length, matches.length), 1)}% of the sample loses at least one life in these windows.`)
      ],
      impact: text(locale, 'Cuando regalás una muerte antes o durante el setup, la partida deja de jugarse desde prioridad y empieza a jugarse desde desventaja de tempo.', 'When you give away a death before or during setup, the game stops being played from priority and starts being played from a tempo deficit.'),
      cause: roleProfile.macroCause,
      actions: roleProfile.macroActions,
      metricValue: round(objectiveDeaths, 1),
      focusMetric: 'objective_fight_deaths'
    });
  }

  if (topChampion && topChampionMatches.length >= 8 && topChampionMatches.length >= Math.ceil(matches.length * 0.45)) {
    const topChampionWins = topChampionMatches.filter((match) => match.win).length;
    const topChampionPre14Deaths = avg(topChampionMatches.map((match) => match.timeline.deathsPre14));
    const topChampionCsAt15 = avg(topChampionMatches.map((match) => match.timeline.csAt15));
    const otherWins = otherChampionMatches.filter((match) => match.win).length;
    const topChampionWinRate = percent(topChampionWins, topChampionMatches.length);
    const otherWinRate = percent(otherWins, otherChampionMatches.length);

    if (!otherChampionMatches.length || topChampionWinRate >= otherWinRate + 8 || topChampion.avgScore >= avg(championPool.map((entry) => entry.avgScore)) + 3) {
      insights.push({
        id: 'primary-champion-anchor',
        title: text(locale, `${topChampion.championName} ya te está marcando una forma de jugar más sólida que el resto de tu pool.`, `${topChampion.championName} is already showing you a more stable way to play than the rest of your pool.`),
        problem: text(locale, `${topChampion.championName} es tu referencia de juego más confiable`, `${topChampion.championName} is your most reliable game reference`),
        category: 'positive',
        severity: 'low',
        priority: 'low',
        evidence: [
          text(locale, `Lo usaste en ${formatChampionShare(topChampionMatches.length, matches.length, locale)} de la muestra.`, `You used it in ${formatChampionShare(topChampionMatches.length, matches.length, locale)} of the sample.`),
          text(locale, `Con ${topChampion.championName} cerrás ${recordLabel(topChampionWins, topChampionMatches.length, locale)}.`, `With ${topChampion.championName} you finish at ${recordLabel(topChampionWins, topChampionMatches.length, locale)}.`),
          text(locale, `Su línea media está en ${round(topChampionCsAt15, 1)} CS al 15 y ${round(topChampionPre14Deaths, 1)} muertes antes del 14.`, `Its average line is ${round(topChampionCsAt15, 1)} CS at 15 and ${round(topChampionPre14Deaths, 1)} deaths before 14.`)
        ],
        impact: text(locale, 'No hace falta inventar un plan nuevo desde cero: ya existe una versión tuya que está resolviendo mejor los primeros 15 minutos.', 'You do not need to invent a new plan from scratch: there is already a version of your play that is handling the first 15 minutes better.'),
        cause: text(locale, 'Con ese campeón tus ventanas de tempo, daño y toma de riesgo parecen estar más alineadas con cómo querés jugar.', 'With that champion, your tempo windows, damage profile and risk-taking seem better aligned with how you want to play.'),
        actions: [
          text(locale, `Usá tus mejores partidas de ${topChampion.championName} como referencia de review para recalls, primeras rotaciones y setup de objetivos.`, `Use your best ${topChampion.championName} games as review material for recalls, first rotations and objective setup.`),
          text(locale, 'Compará esas decisiones contra tus picks más flojos antes de abrir nuevas variables.', 'Compare those decisions against your weaker picks before adding new variables.')
        ]
      });
    } else if (topChampionWinRate <= otherWinRate - 6 || topChampion.avgScore < avg(championPool.map((entry) => entry.avgScore)) - 4) {
      insights.push({
        id: 'primary-champion-review',
        title: text(locale, `${topChampion.championName} concentra mucho volumen, pero hoy no está devolviendo suficiente valor competitivo.`, `${topChampion.championName} carries a lot of volume, but right now it is not giving enough competitive return.`),
        problem: text(locale, `${topChampion.championName} necesita un plan más preciso, no solo más partidas`, `${topChampion.championName} needs a sharper plan, not just more games`),
        category: 'champion-pool',
        severity: 'medium',
        priority: 'medium',
        evidence: [
          text(locale, `Lo usaste en ${formatChampionShare(topChampionMatches.length, matches.length, locale)} de la muestra.`, `You used it in ${formatChampionShare(topChampionMatches.length, matches.length, locale)} of the sample.`),
          text(locale, `Con ${topChampion.championName} estás en ${recordLabel(topChampionWins, topChampionMatches.length, locale)}.`, `With ${topChampion.championName} you are at ${recordLabel(topChampionWins, topChampionMatches.length, locale)}.`),
          otherChampionMatches.length ? text(locale, `El resto del pool queda en ${recordLabel(otherWins, otherChampionMatches.length, locale)}.`, `The rest of the pool lands at ${recordLabel(otherWins, otherChampionMatches.length, locale)}.`) : text(locale, 'No hay suficiente volumen en otros picks para compararlo con justicia.', 'There is not enough volume on other picks to compare it fairly.')
        ],
        impact: text(locale, 'Si tu pick principal concentra la mayor parte de la muestra, cualquier fuga estructural ahí se transforma rápido en techo de elo.', 'If your main pick carries most of the sample, any structural leak there quickly becomes an elo ceiling.'),
        cause: text(locale, 'La comodidad con el campeón no siempre está traduciéndose en mejores tiempos de mapa, economía o disciplina temprana.', 'Comfort on the champion is not necessarily translating into better map timings, economy or early discipline.'),
        actions: [
          text(locale, `Separá tres partidas de ${topChampion.championName}: una buena, una media y una mala, y compará el primer error que cambia el tempo.`, `Pull three ${topChampion.championName} games: one good, one average and one bad, then compare the first mistake that changes the tempo.`),
          text(locale, `Hasta corregir eso, evitá usar ${topChampion.championName} en matchups o drafts donde ya sabés que te cuesta entrar cómodo.`, `Until that is fixed, avoid using ${topChampion.championName} in matchups or drafts where you already know you struggle to get comfortable.`)
        ],
        focusMetric: 'primary_pick'
      });
    }

    const matchupGroups = new Map<string, ParticipantSnapshot[]>();
    for (const match of topChampionMatches) {
      if (!match.opponentChampionName) continue;
      const list = matchupGroups.get(match.opponentChampionName) ?? [];
      list.push(match);
      matchupGroups.set(match.opponentChampionName, list);
    }

    const riskyMatchup = Array.from(matchupGroups.entries())
      .map(([opponentChampionName, list]) => ({
        opponentChampionName,
        games: list.length,
        wins: list.filter((match) => match.win).length,
        avgCsAt15: avg(list.map((match) => match.timeline.csAt15)),
        avgDeathsPre14: avg(list.map((match) => match.timeline.deathsPre14))
      }))
      .filter((entry) => entry.games >= 3)
      .sort((a, b) => percent(a.wins, a.games) - percent(b.wins, b.games) || b.games - a.games)[0];

    if (riskyMatchup && percent(riskyMatchup.wins, riskyMatchup.games) <= 35) {
      insights.push({
        id: 'matchup-alert',
        title: text(locale, `Hay un matchup recurrente que merece preparación explícita con ${topChampion.championName}.`, `There is a recurring matchup that deserves explicit preparation with ${topChampion.championName}.`),
        problem: text(locale, `${riskyMatchup.opponentChampionName} está castigando demasiado tu pick principal`, `${riskyMatchup.opponentChampionName} is punishing your main pick too hard`),
        category: 'champion-pool',
        severity: 'medium',
        priority: 'medium',
        evidence: [
          text(locale, `Con ${topChampion.championName} contra ${riskyMatchup.opponentChampionName} estás en ${recordLabel(riskyMatchup.wins, riskyMatchup.games, locale)}.`, `With ${topChampion.championName} into ${riskyMatchup.opponentChampionName}, you are at ${recordLabel(riskyMatchup.wins, riskyMatchup.games, locale)}.`),
          text(locale, `En ese cruce promediás ${round(riskyMatchup.avgCsAt15, 1)} CS al 15 y ${round(riskyMatchup.avgDeathsPre14, 1)} muertes antes del 14.`, `In that matchup you average ${round(riskyMatchup.avgCsAt15, 1)} CS at 15 and ${round(riskyMatchup.avgDeathsPre14, 1)} deaths before 14.`)
        ],
        impact: text(locale, 'No parece un problema aislado: el patrón se repite lo suficiente como para justificar un plan de matchup en vez de seguir improvisándolo.', 'This does not look isolated. The pattern repeats enough to justify a matchup plan instead of continuing to improvise it.'),
        cause: text(locale, `Ese cruce probablemente te está forzando decisiones incómodas de tempo, pathing o ventanas de trade antes de llegar a tu zona fuerte.`, `That matchup is probably forcing awkward tempo, pathing or trade-window decisions before you reach your strong zone.`),
        actions: [
          text(locale, `Armá una review específica de ${topChampion.championName} vs ${riskyMatchup.opponentChampionName}: primer clear o primeros 8 minutos, primer reset y primera pelea por objetivo.`, `Build a specific review for ${topChampion.championName} vs ${riskyMatchup.opponentChampionName}: first clear or first 8 minutes, first reset and first objective fight.`),
          text(locale, 'Hasta entender el patrón, jugá ese cruce con un plan más conservador y una ruta de recursos más estable.', 'Until you understand the pattern, play that matchup with a more conservative plan and a steadier resource route.')
        ],
        focusMetric: 'matchup_review'
      });
    }
  }

  return insights
    .sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    })
    .slice(0, 6);
}

export function buildCoachingSummary(matches: ParticipantSnapshot[], insights: CoachInsight[], locale: SummaryLocale = 'es'): CoachingSummary {
  const sortedByDate = [...matches].sort((a, b) => a.gameCreation - b.gameCreation);
  const recentCount = Math.min(8, sortedByDate.length);
  const splitIndex = Math.max(1, sortedByDate.length - recentCount);
  const baselineWindow = sortedByDate.slice(0, splitIndex);
  const recentWindow = sortedByDate.slice(splitIndex);
  const topProblem = insights[0] ?? null;
  const measurableProblem = insights.find((insight) => ['deaths_pre_10', 'cs_at_15', 'deaths_pre_14', 'objective_fight_deaths'].includes(insight.focusMetric ?? '')) ?? null;
  const baselineScore = round(avg(baselineWindow.map((match) => match.score.total)));
  const recentScore = round(avg(recentWindow.map((match) => match.score.total)));
  const baselineWinRate = round((baselineWindow.filter((match) => match.win).length / Math.max(baselineWindow.length, 1)) * 100);
  const recentWinRate = round((recentWindow.filter((match) => match.win).length / Math.max(recentWindow.length, 1)) * 100);
  const scoreDelta = round(recentScore - baselineScore, 1);
  const winRateDelta = round(recentWinRate - baselineWinRate, 1);

  let activePlan: ImprovementCycle | null = null;
  if (measurableProblem) {
    const focusMatches = [...sortedByDate].reverse().slice(0, 5);
    const completedGames = focusMatches.filter((match) => {
      switch (measurableProblem.focusMetric) {
        case 'deaths_pre_10':
          return match.timeline.laneDeathsPre10 === 0;
        case 'cs_at_15':
          return match.timeline.csAt15 >= getRoleProfile(findPrimaryRole(matches), locale).csAt15Target;
        case 'deaths_pre_14':
          return match.timeline.deathsPre14 <= getRoleProfile(findPrimaryRole(matches), locale).stableDeathsPre14;
        case 'objective_fight_deaths':
          return match.timeline.objectiveFightDeaths === 0;
        default:
          return false;
      }
    }).length;

    const objectiveByMetric: Record<string, string> = {
      deaths_pre_10: text(locale, 'No morir antes del minuto 10', 'Do not die before minute 10'),
      cs_at_15: text(locale, `Sostener ${getRoleProfile(findPrimaryRole(matches), locale).csAt15Target}+ CS al minuto 15`, `Hold ${getRoleProfile(findPrimaryRole(matches), locale).csAt15Target}+ CS by minute 15`),
      deaths_pre_14: text(locale, `Mantener ${getRoleProfile(findPrimaryRole(matches), locale).stableDeathsPre14} o menos muertes antes del 14`, `Hold ${getRoleProfile(findPrimaryRole(matches), locale).stableDeathsPre14} or fewer deaths before minute 14`),
      objective_fight_deaths: text(locale, 'Llegar vivo a las ventanas de objetivo', 'Arrive alive to objective windows')
    };

    activePlan = {
      focus: measurableProblem.problem,
      objective: objectiveByMetric[measurableProblem.focusMetric ?? ''] ?? measurableProblem.actions[0] ?? measurableProblem.problem,
      targetGames: 5,
      completedGames,
      progressPercent: round((completedGames / 5) * 100, 0),
      successLabel: text(locale, `${completedGames}/5 partidas recientes cumplieron el objetivo`, `${completedGames}/5 recent games met the target`)
    };
  }

  const headline = topProblem
    ? topProblem.problem
    : text(locale, 'Tu perfil ya tiene una base estable de mejora', 'Your profile already has a stable improvement baseline');
  const subheadline = topProblem
    ? text(locale, `${topProblem.impact} La prioridad del bloque actual es corregir esto antes de abrir nuevas variables.`, `${topProblem.impact} The priority of the current block is to correct this before adding new variables.`)
    : text(locale, 'El siguiente paso es sostener consistencia y revisar tus picks con mejor retorno.', 'The next step is to hold consistency and review the picks that give you the best return.');

  return {
    headline,
    subheadline,
    topProblems: insights.filter((insight) => insight.category !== 'positive').slice(0, 3),
    activePlan,
    trend: {
      baselineScore,
      recentScore,
      scoreDelta,
      baselineWinRate,
      recentWinRate,
      winRateDelta
    }
  };
}

export function buildAggregateSummary(player: string, tagLine: string, region: string, platform: string, matches: ParticipantSnapshot[], locale: SummaryLocale = 'es'): AggregateSummary {
  const eligibleMatches = matches.filter((match) => !match.isRemake);
  const wins = eligibleMatches.filter((match) => match.win).length;
  const losses = eligibleMatches.length - wins;
  const championPool = buildChampionPool(eligibleMatches);
  const insights = buildInsights(eligibleMatches, championPool, locale);
  const coaching = buildCoachingSummary(eligibleMatches, insights, locale);

  return {
    player,
    tagLine,
    region,
    platform,
    matches: eligibleMatches.length,
    wins,
    losses,
    winRate: round((wins / Math.max(eligibleMatches.length, 1)) * 100),
    avgKda: round(avg(eligibleMatches.map((match) => (match.kills + match.assists) / Math.max(match.deaths, 1)))),
    avgCsPerMinute: round(avg(eligibleMatches.map((match) => match.csPerMinute))),
    avgGoldPerMinute: round(avg(eligibleMatches.map((match) => match.goldPerMinute))),
    avgVisionScore: round(avg(eligibleMatches.map((match) => match.visionScore))),
    avgKillParticipation: round(avg(eligibleMatches.map((match) => match.killParticipation))),
    avgCsAt15: round(avg(eligibleMatches.map((match) => match.timeline.csAt15))),
    avgGoldAt15: round(avg(eligibleMatches.map((match) => match.timeline.goldAt15))),
    avgDeathsPre14: round(avg(eligibleMatches.map((match) => match.timeline.deathsPre14))),
    avgPerformanceScore: round(avg(eligibleMatches.map((match) => match.score.total))),
    consistencyIndex: round(100 - avg(eligibleMatches.map((match) => Math.abs(match.score.total - avg(eligibleMatches.map((innerMatch) => innerMatch.score.total))))), 1),
    remakesExcluded: matches.length - eligibleMatches.length,
    championPool,
    insights,
    coaching
  };
}
