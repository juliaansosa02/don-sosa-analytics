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
  baselineMatches: number;
  recentMatches: number;
  baselineScore: number;
  recentScore: number;
  scoreDelta: number;
  baselineWinRate: number;
  recentWinRate: number;
  winRateDelta: number;
  baselineConsistency: number;
  recentConsistency: number;
  consistencyDelta: number;
  baselineCsAt15: number;
  recentCsAt15: number;
  csAt15Delta: number;
  baselineGoldAt15: number;
  recentGoldAt15: number;
  goldAt15Delta: number;
  baselineKillParticipation: number;
  recentKillParticipation: number;
  killParticipationDelta: number;
  baselineDeathsPre14: number;
  recentDeathsPre14: number;
  deathsPre14Delta: number;
}

export interface ProblematicMatchupSummary {
  opponentChampionName: string;
  championName: string;
  recentGames: number;
  recentWins: number;
  recentLosses: number;
  recentWinRate: number;
  directGames: number;
  directWins: number;
  directLosses: number;
  directWinRate: number | null;
  avgCsAt15: number;
  avgGoldDiffAt15: number;
  avgLevelDiffAt15: number;
  avgDeathsPre14: number;
  summary: string;
  adjustments: string[];
}

export interface ReviewAgendaItem {
  matchId: string;
  championName: string;
  opponentChampionName?: string;
  gameCreation: number;
  win: boolean;
  title: string;
  reason: string;
  question: string;
  focus: string;
  tags: string[];
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
  primaryRole: string;
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
  avgGoldDiffAt15: number;
  avgLevelDiffAt15: number;
  avgDeathsPre14: number;
  avgPerformanceScore: number;
  consistencyIndex: number;
  remakesExcluded: number;
  championPool: ChampionAggregate[];
  insights: CoachInsight[];
  positiveSignals: CoachInsight[];
  reviewAgenda: ReviewAgendaItem[];
  coaching: CoachingSummary;
  problematicMatchup: ProblematicMatchupSummary | null;
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

function getKillParticipationTarget(role: string) {
  switch (role) {
    case 'JUNGLE':
      return 58;
    case 'UTILITY':
      return 60;
    case 'MIDDLE':
      return 52;
    case 'BOTTOM':
      return 50;
    case 'TOP':
      return 44;
    default:
      return 50;
  }
}

function getLeadMetricTarget(role: string) {
  switch (role) {
    case 'JUNGLE':
      return { goldDiffAt15: 150, levelDiffAt15: 0.2 };
    case 'TOP':
      return { goldDiffAt15: 50, levelDiffAt15: 0.1 };
    case 'MIDDLE':
      return { goldDiffAt15: 100, levelDiffAt15: 0.15 };
    case 'BOTTOM':
      return { goldDiffAt15: 120, levelDiffAt15: 0.1 };
    case 'UTILITY':
      return { goldDiffAt15: 0, levelDiffAt15: 0 };
    default:
      return { goldDiffAt15: 0, levelDiffAt15: 0 };
  }
}

function getChampionPoolShare(games: number, total: number) {
  return games / Math.max(total, 1);
}

function pickMostPlayedRecentChampion(matches: ParticipantSnapshot[]) {
  const recentWindow = [...matches]
    .sort((a, b) => b.gameCreation - a.gameCreation)
    .slice(0, Math.min(12, matches.length));

  const grouped = new Map<string, { games: number; latestGameCreation: number }>();
  for (const match of recentWindow) {
    const current = grouped.get(match.championName) ?? { games: 0, latestGameCreation: 0 };
    current.games += 1;
    current.latestGameCreation = Math.max(current.latestGameCreation, match.gameCreation);
    grouped.set(match.championName, current);
  }

  return Array.from(grouped.entries())
    .sort((a, b) => b[1].games - a[1].games || b[1].latestGameCreation - a[1].latestGameCreation)[0]?.[0] ?? null;
}

function calculateConsistencyIndex(matches: ParticipantSnapshot[]) {
  if (!matches.length) return 0;
  const averageScore = avg(matches.map((match) => match.score.total));
  return round(100 - avg(matches.map((match) => Math.abs(match.score.total - averageScore))), 1);
}

function buildProblematicMatchupSummary(matches: ParticipantSnapshot[], locale: SummaryLocale = 'es'): ProblematicMatchupSummary | null {
  if (!matches.length) return null;

  const primaryRole = findPrimaryRole(matches);
  const roleProfile = getRoleProfile(primaryRole, locale);
  const recentWindow = [...matches]
    .sort((a, b) => b.gameCreation - a.gameCreation)
    .slice(0, Math.min(20, matches.length));
  const championName = pickMostPlayedRecentChampion(matches);

  if (!championName) return null;

  const grouped = new Map<string, ParticipantSnapshot[]>();
  const recentGrouped = new Map<string, ParticipantSnapshot[]>();
  for (const match of matches) {
    if (!match.opponentChampionName) continue;
    const list = grouped.get(match.opponentChampionName) ?? [];
    list.push(match);
    grouped.set(match.opponentChampionName, list);
  }

  for (const match of recentWindow) {
    if (!match.opponentChampionName) continue;
    const list = recentGrouped.get(match.opponentChampionName) ?? [];
    list.push(match);
    recentGrouped.set(match.opponentChampionName, list);
  }

  const worstOpponent = Array.from(grouped.entries())
    .map(([opponentChampionName, list]) => ({
      opponentChampionName,
      list,
      overallGames: list.length,
      overallWins: list.filter((match) => match.win).length,
      overallLosses: list.filter((match) => !match.win).length,
      overallWinRate: round(percent(list.filter((match) => match.win).length, list.length), 1),
      recentList: recentGrouped.get(opponentChampionName) ?? [],
      avgGoldDiffAt15: avg(list.map((match) => match.timeline.goldDiffAt15 ?? 0)),
      avgLevelDiffAt15: avg(list.map((match) => match.timeline.levelDiffAt15 ?? 0))
    }))
    .map((entry) => {
      const recentWins = entry.recentList.filter((match) => match.win).length;
      const recentLosses = entry.recentList.filter((match) => !match.win).length;
      const recentWinRate = round(percent(recentWins, entry.recentList.length), 1);
      const directMatches = matches.filter((match) =>
        match.championName === championName &&
        match.opponentChampionName === entry.opponentChampionName
      );
      const directWins = directMatches.filter((match) => match.win).length;
      const directLosses = directMatches.length - directWins;
      const severityScore =
        (entry.overallLosses * 5) +
        (recentLosses * 6) +
        (directLosses * 7) +
        Math.max(0, 55 - entry.overallWinRate) * 0.7 +
        Math.max(0, -entry.avgGoldDiffAt15) / 110 +
        Math.max(0, -entry.avgLevelDiffAt15) * 8 +
        (directMatches.length >= 2 ? 3 : 0);

      return {
        ...entry,
        recentWins,
        recentLosses,
        recentWinRate,
        directMatches,
        directWins,
        directLosses,
        severityScore
      };
    })
    .filter((entry) =>
      entry.overallLosses >= 2 ||
      entry.recentLosses >= 2 ||
      entry.directLosses >= 2 ||
      entry.overallGames >= 4
    )
    .sort((a, b) =>
      b.severityScore - a.severityScore ||
      b.directLosses - a.directLosses ||
      b.overallLosses - a.overallLosses ||
      b.recentLosses - a.recentLosses ||
      b.overallGames - a.overallGames ||
      a.avgGoldDiffAt15 - b.avgGoldDiffAt15
    )[0]
    ?? Array.from(grouped.entries())
      .map(([opponentChampionName, list]) => ({
        opponentChampionName,
        list,
        recentList: recentGrouped.get(opponentChampionName) ?? [],
        overallGames: list.length,
        overallWins: list.filter((match) => match.win).length,
        overallLosses: list.filter((match) => !match.win).length,
        overallWinRate: round(percent(list.filter((match) => match.win).length, list.length), 1),
        avgGoldDiffAt15: avg(list.map((match) => match.timeline.goldDiffAt15 ?? 0)),
        avgLevelDiffAt15: avg(list.map((match) => match.timeline.levelDiffAt15 ?? 0)),
        recentWins: (recentGrouped.get(opponentChampionName) ?? []).filter((match) => match.win).length,
        recentLosses: (recentGrouped.get(opponentChampionName) ?? []).filter((match) => !match.win).length,
        recentWinRate: round(percent((recentGrouped.get(opponentChampionName) ?? []).filter((match) => match.win).length, (recentGrouped.get(opponentChampionName) ?? []).length), 1),
        directMatches: matches.filter((match) => match.championName === championName && match.opponentChampionName === opponentChampionName),
        directWins: matches.filter((match) => match.championName === championName && match.opponentChampionName === opponentChampionName && match.win).length,
        directLosses: matches.filter((match) => match.championName === championName && match.opponentChampionName === opponentChampionName && !match.win).length,
        severityScore: 0
      }))
      .sort((a, b) => b.recentLosses - a.recentLosses || b.overallLosses - a.overallLosses || b.overallGames - a.overallGames)[0];

  if (!worstOpponent) return null;

  const directMatches = worstOpponent.directMatches;
  const directWins = worstOpponent.directWins;
  const directWinRate = directMatches.length ? round(percent(directWins, directMatches.length), 1) : null;
  const guidanceSample = directMatches.length >= 2
    ? directMatches
    : (worstOpponent.recentList.length >= 2 ? worstOpponent.recentList : worstOpponent.list);
  const avgCsAt15 = round(avg(guidanceSample.map((match) => match.timeline.csAt15)), 1);
  const avgGoldDiffAt15 = round(avg(guidanceSample.map((match) => match.timeline.goldDiffAt15 ?? 0)), 0);
  const avgLevelDiffAt15 = round(avg(guidanceSample.map((match) => match.timeline.levelDiffAt15 ?? 0)), 1);
  const avgDeathsPre14 = round(avg(guidanceSample.map((match) => match.timeline.deathsPre14)), 1);

  let summary: string;
  if (locale === 'en') {
    summary = directMatches.length >= 2
      ? `${worstOpponent.opponentChampionName} is the recurring matchup doing the most damage in this scope. Across the full scoped sample it sits at ${recordLabel(worstOpponent.overallWins, worstOpponent.overallGames, locale)}, and the direct sample with ${championName} lands at ${recordLabel(directWins, directMatches.length, locale)}.`
      : `${worstOpponent.opponentChampionName} is the opponent that most consistently hurts this scope: ${recordLabel(worstOpponent.overallWins, worstOpponent.overallGames, locale)} overall. ${championName} is still your recent reference pick, but direct sample in this exact cross is still short, so treat this as a scoped pattern first and a champion-specific read second.`;
  } else {
    summary = directMatches.length >= 2
      ? `${worstOpponent.opponentChampionName} es el cruce recurrente que más te está lastimando en este scope. En la muestra completa del scope queda en ${recordLabel(worstOpponent.overallWins, worstOpponent.overallGames, locale)}, y la muestra directa con ${championName} hoy da ${recordLabel(directWins, directMatches.length, locale)}.`
      : `${worstOpponent.opponentChampionName} es el rival que más consistentemente te está castigando en este scope: ${recordLabel(worstOpponent.overallWins, worstOpponent.overallGames, locale)} en total. ${championName} sigue siendo tu pick reciente de referencia, pero la muestra directa de este cruce exacto todavía es corta, así que primero leelo como patrón del scope y recién después como lectura específica del campeón.`;
  }

  let adjustments: string[];
  if (avgDeathsPre14 > roleProfile.stableDeathsPre14 + 0.5) {
    adjustments = [
      locale === 'en'
        ? `With ${championName} into ${worstOpponent.opponentChampionName}, your first rule is to protect the early game: do not force the first contested window unless your setup is clearly winning.`
        : `Con ${championName} contra ${worstOpponent.opponentChampionName}, la primera regla es proteger el early: no fuerces la primera ventana peleada si tu setup no está claramente ganado.`,
      roleProfile.disciplineActions[0],
      locale === 'en'
        ? `Review the first death or failed contest in this matchup and ask what information or resource state was missing before you committed.`
        : `Revisá la primera muerte o pelea fallida de este cruce y marcá qué información o recurso te faltaba antes de comprometerte.`
    ];
  } else if (avgGoldDiffAt15 <= -250 || avgLevelDiffAt15 <= -0.5) {
    adjustments = [
      locale === 'en'
        ? `The matchup is putting you behind before minute 15, so play it to preserve tempo first and only open fights when the wave, camps or reset already work in your favor.`
        : `El cruce te está dejando atrás antes del 15, así que jugalo primero para preservar tempo y abrí peleas solo cuando la wave, los camps o el reset ya estén a tu favor.`,
      roleProfile.farmActions[0],
      locale === 'en'
        ? `Use ${championName} as the review lens: compare one playable game and one bad one into ${worstOpponent.opponentChampionName}, then isolate the first tempo break.`
        : `Usá a ${championName} como lente de review: compará una partida jugable y una mala contra ${worstOpponent.opponentChampionName}, y aislá el primer quiebre de tempo.`
    ];
  } else if (avgCsAt15 < roleProfile.csAt15Target - 8) {
    adjustments = [
      locale === 'en'
        ? `This cross is cutting your income too early. Prioritize the line that lets ${championName} reach minute 15 with gold instead of trading away full waves or camps for low-return pressure.`
        : `Este cruce te está cortando el ingreso demasiado temprano. Priorizá la línea que deja a ${championName} llegar al 15 con oro en vez de cambiar waves o camps completos por presión de poco retorno.`,
      roleProfile.farmActions[1],
      locale === 'en'
        ? `Review the first reset, detour or skirmish that drops your economy below the normal floor for this role.`
        : `Revisá el primer reset, desvío o escaramuza que te baja la economía por debajo del piso normal de este rol.`
    ];
  } else {
    adjustments = [
      locale === 'en'
        ? `Do not treat ${worstOpponent.opponentChampionName} as a random bad game. Queue this matchup with a simpler plan on ${championName}: cleaner entry, clearer reset timing and fewer low-certainty fights.`
        : `No trates a ${worstOpponent.opponentChampionName} como una mala partida random. Entrá a este cruce con un plan más simple sobre ${championName}: entrada más limpia, mejor timing de reset y menos peleas de baja certeza.`,
      roleProfile.macroActions[0],
      locale === 'en'
        ? `After each game into this pick, save one note about the first moment the matchup stopped feeling playable.`
        : `Después de cada partida contra este pick, guardá una nota sobre el primer momento en que el cruce dejó de sentirse jugable.`
    ];
  }

  return {
    opponentChampionName: worstOpponent.opponentChampionName,
    championName,
    recentGames: worstOpponent.recentList.length || worstOpponent.overallGames,
    recentWins: worstOpponent.recentWins,
    recentLosses: worstOpponent.recentLosses,
    recentWinRate: worstOpponent.recentWinRate,
    directGames: directMatches.length,
    directWins,
    directLosses: directMatches.length - directWins,
    directWinRate,
    avgCsAt15,
    avgGoldDiffAt15,
    avgLevelDiffAt15,
    avgDeathsPre14,
    summary,
    adjustments
  };
}

function buildPositiveSignals(matches: ParticipantSnapshot[], championPool: ChampionAggregate[], locale: SummaryLocale = 'es'): CoachInsight[] {
  if (!matches.length) return [];

  const primaryRole = findPrimaryRole(matches);
  const roleProfile = getRoleProfile(primaryRole, locale);
  const topChampion = championPool[0];
  const topChampionMatches = topChampion ? matches.filter((match) => match.championName === topChampion.championName) : [];
  const otherChampionMatches = topChampion ? matches.filter((match) => match.championName !== topChampion.championName) : [];
  const positives: CoachInsight[] = [];

  if (topChampion && topChampionMatches.length >= 5) {
    const topChampionWins = topChampionMatches.filter((match) => match.win).length;
    const otherWins = otherChampionMatches.filter((match) => match.win).length;
    const otherWinRate = percent(otherWins, otherChampionMatches.length);
    const referenceEdge = topChampion.winRate - (otherChampionMatches.length ? otherWinRate : Math.max(50, percent(topChampionWins, topChampionMatches.length) - 6));

    if (topChampion.winRate >= 55 && (referenceEdge >= 6 || topChampion.games >= Math.ceil(matches.length * 0.35))) {
      positives.push({
        id: 'reference-pick-positive',
        title: text(locale, `${topChampion.championName} ya te está dando una base bastante más limpia que el resto del scope.`, `${topChampion.championName} is already giving you a cleaner baseline than the rest of the scope.`),
        problem: text(locale, `${topChampion.championName} es hoy tu pick de referencia más útil`, `${topChampion.championName} is your clearest reference pick right now`),
        category: 'positive',
        severity: 'low',
        priority: 'low',
        evidence: [
          text(locale, `Lo jugaste en ${formatChampionShare(topChampion.games, matches.length, locale)} del bloque.`, `You played it in ${formatChampionShare(topChampion.games, matches.length, locale)} of the block.`),
          text(locale, `Con ${topChampion.championName} quedás en ${recordLabel(topChampionWins, topChampion.games, locale)}.`, `With ${topChampion.championName} you land at ${recordLabel(topChampionWins, topChampion.games, locale)}.`),
          text(locale, `Su promedio queda en ${round(topChampion.avgCsAt15, 1)} CS al 15, ${round(topChampion.avgDeathsPre14, 1)} muertes pre14 y score ${round(topChampion.avgScore, 1)}.`, `Its average sits at ${round(topChampion.avgCsAt15, 1)} CS at 15, ${round(topChampion.avgDeathsPre14, 1)} deaths pre14 and ${round(topChampion.avgScore, 1)} score.`)
        ],
        impact: text(locale, 'No hace falta inventar una versión nueva de tu juego: ya tenés un pick que ordena mejor tus tiempos y tu entrada al mid game.', 'You do not need to invent a new version of your game: you already have a pick that organizes your timings and your entry into mid game better.'),
        cause: text(locale, 'Con este campeón tu toma de riesgo, tu economía y tus ventanas de mapa están quedando más alineadas.', 'With this champion, your risk profile, economy and map windows are landing in better alignment.'),
        actions: [
          text(locale, `Usá tus mejores partidas de ${topChampion.championName} como review de referencia para recalls, primeras rotaciones y setup de objetivos.`, `Use your best ${topChampion.championName} games as your reference review for recalls, first rotations and objective setup.`),
          text(locale, `Si querés fijar hábitos rápido, este pick debería cargar más peso que el resto durante este bloque.`, `If you want to lock habits quickly, this pick should carry more weight than the rest during this block.`)
        ],
        focusMetric: 'reference_pick_positive'
      });
    }
  }

  const stableMatches = matches.filter((match) =>
    match.timeline.deathsPre14 <= roleProfile.stableDeathsPre14 &&
    match.timeline.csAt15 >= Math.max(roleProfile.csAt15Target - 5, 0) &&
    match.timeline.objectiveFightDeaths === 0
  );
  const stableWins = stableMatches.filter((match) => match.win).length;
  const stableWinRate = percent(stableWins, stableMatches.length);

  if (stableMatches.length >= Math.max(3, Math.floor(matches.length * 0.18)) && stableWinRate >= 55) {
    positives.push({
      id: 'stable-pattern-positive',
      title: text(locale, 'Ya hay un patrón estable en la muestra que conviene repetir casi sin tocarlo.', 'There is already a stable pattern in the sample that should be repeated with very little change.'),
      problem: text(locale, 'Cuando ordenás early, economía y setup, tu bloque sí convierte', 'When your early game, economy and setup are clean, your block does convert'),
      category: 'positive',
      severity: 'low',
      priority: 'low',
      evidence: [
        text(locale, `${stableMatches.length} partidas del bloque cumplen una versión más limpia del plan y ahí quedás en ${recordLabel(stableWins, stableMatches.length, locale)}.`, `${stableMatches.length} games in the block meet a cleaner version of the plan and there you land at ${recordLabel(stableWins, stableMatches.length, locale)}.`),
        text(locale, 'Esas partidas combinan menos muertes tempranas, economía más sana y mejor llegada a la primera ventana grande.', 'Those games combine fewer early deaths, healthier economy and cleaner arrival to the first big window.')
      ],
      impact: text(locale, 'Esto demuestra que no te falta “otra identidad”: te falta sostener más seguido la versión que ya funciona.', 'This proves you do not need a different identity: you need to hold the version that already works more often.'),
      cause: text(locale, 'Cuando el plan no se rompe temprano, tu ejecución se vuelve bastante más jugable y la partida deja de depender de compensaciones forzadas.', 'When the plan does not break early, your execution becomes much more playable and the game stops depending on forced compensation.'),
      actions: [
        text(locale, 'Tomá una de esas partidas limpias como partida espejo antes de cada sesión de ranked.', 'Use one of those clean games as a mirror review before each ranked session.'),
        text(locale, 'La pregunta no es “qué invento”, sino “qué hice ahí para entrar limpio al minuto 15 y cómo lo repito”.', 'The question is not “what do I invent,” but “what did I do there to enter minute 15 cleanly, and how do I repeat it?”')
      ],
      focusMetric: 'stable_pattern_positive'
    });
  }

  return positives.slice(0, 2);
}

function buildReviewAgenda(matches: ParticipantSnapshot[], locale: SummaryLocale = 'es'): ReviewAgendaItem[] {
  if (!matches.length) return [];

  const primaryRole = findPrimaryRole(matches);
  const roleProfile = getRoleProfile(primaryRole, locale);
  const leadTarget = getLeadMetricTarget(primaryRole);
  const sorted = [...matches].sort((a, b) => b.gameCreation - a.gameCreation);

  const stressed = sorted
    .filter((match) => !match.win || match.timeline.deathsPre14 >= 2 || match.timeline.objectiveFightDeaths > 0)
    .map((match) => {
      const csGap = roleProfile.csAt15Target - match.timeline.csAt15;
      const goldDiff = match.timeline.goldDiffAt15 ?? 0;
      const levelDiff = match.timeline.levelDiffAt15 ?? 0;
      const lostLead = !match.win && goldDiff >= leadTarget.goldDiffAt15;

      let title = text(locale, 'Revisá esta partida', 'Review this game');
      let reason = text(locale, 'Hay una fuga visible que conviene aislar.', 'There is a visible leak worth isolating.');
      let question = text(locale, '¿Cuál fue la primera decisión que volvió incómodo el mapa?', 'What was the first decision that made the map uncomfortable?');
      let focus = text(locale, 'Tempo y calidad de decisión antes de la jugada clave.', 'Tempo and decision quality before the key play.');
      const tags: string[] = [];
      let priorityScore = 0;

      if (match.timeline.objectiveFightDeaths > 0) {
        title = text(locale, 'Revisá el minuto previo al objetivo', 'Review the minute before the objective');
        reason = text(locale, 'La partida se rompe alrededor del setup, no solo durante la pelea.', 'The game breaks around the setup, not only during the fight.');
        question = text(locale, '¿Qué te faltó hacer 45-60 segundos antes para no llegar corriendo a la ventana?', 'What did you fail to do 45-60 seconds earlier so you would not arrive rushing the window?');
        focus = text(locale, 'Reset, visión, orden de llegada y quién tenía prioridad real.', 'Reset, vision, arrival order and who had real priority.');
        tags.push(text(locale, 'Objetivo', 'Objective setup'));
        priorityScore += 8 + match.timeline.objectiveFightDeaths * 3;
      }

      if (match.timeline.deathsPre14 >= roleProfile.stableDeathsPre14 + 1) {
        title = text(locale, 'Encontrá la primera muerte evitable', 'Find the first avoidable death');
        reason = text(locale, 'El early se desordenó demasiado pronto y eso achicó tu margen de juego.', 'The early game became unstable too soon and shrank your playable margin.');
        question = text(locale, '¿Qué información, recurso o cobertura faltaba antes de comprometerte?', 'What information, resource or coverage was missing before you committed?');
        focus = text(locale, 'Primera muerte, estado del mapa y qué te obligó a jugar desde atrás.', 'First death, map state and what forced you to play from behind.');
        tags.push(text(locale, 'Early', 'Early'));
        priorityScore += 7 + match.timeline.deathsPre14 * 2;
      }

      if (csGap >= 10 || goldDiff <= -250 || levelDiff <= -0.5) {
        title = text(locale, 'Aislá dónde se cortó tu economía', 'Isolate where your economy got cut');
        reason = text(locale, 'La partida ya llega más débil al 15 de lo que tu rol necesita.', 'The game is already reaching minute 15 weaker than your role needs.');
        question = text(locale, '¿Qué reset, desvío o pelea te sacó del piso económico normal del rol?', 'What reset, detour or fight pulled you off the normal economy floor for the role?');
        focus = text(locale, 'CS@15, diff. de oro, camps o waves que dejaste por una jugada de poco retorno.', 'CS@15, gold diff, camps or waves you dropped for a low-return play.');
        tags.push(text(locale, 'Economía', 'Economy'));
        priorityScore += 6 + Math.max(0, Math.ceil(csGap / 6));
      }

      if (lostLead) {
        title = text(locale, 'Marcá el momento donde dejaste de jugar desde ventaja', 'Mark the moment you stopped playing from advantage');
        reason = text(locale, 'Había una apertura favorable y aun así la partida no se convirtió.', 'There was a favorable opening and the game still failed to convert.');
        question = text(locale, '¿En qué minuto dejaste de jugar desde tempo/visión y empezaste a regalar reinicio al rival?', 'At which minute did you stop playing from tempo/vision and start giving free reset to the enemy?');
        focus = text(locale, 'Conversión de ventaja: reset, objetivo siguiente y pelea que nunca necesitabas tomar.', 'Lead conversion: reset, next objective and the fight you never actually needed to take.');
        tags.push(text(locale, 'Conversión', 'Conversion'));
        priorityScore += 7;
      }

      if (!tags.length) {
        tags.push(text(locale, 'Mapa', 'Map'));
        priorityScore += match.win ? 1 : 4;
      }

      return {
        matchId: match.matchId,
        championName: match.championName,
        opponentChampionName: match.opponentChampionName,
        gameCreation: match.gameCreation,
        win: match.win,
        title,
        reason,
        question,
        focus,
        tags,
        priorityScore
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore || b.gameCreation - a.gameCreation)
    .slice(0, 2);

  const referenceGame = sorted
    .filter((match) =>
      match.win &&
      match.timeline.deathsPre14 <= roleProfile.stableDeathsPre14 &&
      match.timeline.csAt15 >= Math.max(roleProfile.csAt15Target - 5, 0) &&
      match.timeline.objectiveFightDeaths === 0
    )
    .sort((a, b) => b.score.total - a.score.total || b.gameCreation - a.gameCreation)[0];

  const agenda: ReviewAgendaItem[] = [...stressed];

  if (referenceGame && !agenda.some((item) => item.matchId === referenceGame.matchId)) {
    agenda.push({
      matchId: referenceGame.matchId,
      championName: referenceGame.championName,
      opponentChampionName: referenceGame.opponentChampionName,
      gameCreation: referenceGame.gameCreation,
      win: referenceGame.win,
      title: text(locale, 'Usala como partida espejo', 'Use it as a mirror game'),
      reason: text(locale, 'Acá aparece una versión de tu plan que sí entra limpia al mid game.', 'This one shows a version of your plan that actually enters mid game cleanly.'),
      question: text(locale, '¿Qué hiciste antes del 14 para que esta partida llegara ordenada al primer objetivo?', 'What did you do before minute 14 that let this game reach the first objective in order?'),
      focus: text(locale, 'Ruta previa al objetivo, tempo de recall y qué decisiones evitaste forzar.', 'Pre-objective route, recall tempo and which decisions you avoided forcing.'),
      tags: [text(locale, 'Referencia', 'Reference game')]
    });
  }

  return agenda.slice(0, 3);
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
  const kpTarget = getKillParticipationTarget(primaryRole);
  const leadTargets = getLeadMetricTarget(primaryRole);

  const belowFarmTarget = matches.filter((match) => match.timeline.csAt15 < targetCsAt15);
  const onFarmTarget = matches.filter((match) => match.timeline.csAt15 >= targetCsAt15);
  const disciplinedGames = matches.filter((match) => match.timeline.deathsPre14 <= stableLimit);
  const volatileGames = matches.filter((match) => match.timeline.deathsPre14 >= stableLimit + 2);
  const objectiveDeaths = avg(matches.map((match) => match.timeline.objectiveFightDeaths));
  const avgPre14Deaths = avg(matches.map((match) => match.timeline.deathsPre14));
  const avgCsAt15 = avg(matches.map((match) => match.timeline.csAt15));
  const avgGoldDiffAt15 = avg(matches.map((match) => match.timeline.goldDiffAt15 ?? 0));
  const avgLevelDiffAt15 = avg(matches.map((match) => match.timeline.levelDiffAt15 ?? 0));
  const avgKillParticipation = avg(matches.map((match) => match.killParticipation));
  const disconnectedGames = matches.filter((match) => match.killParticipation < kpTarget);
  const connectedGames = matches.filter((match) => match.killParticipation >= kpTarget);
  const losingLaneGames = matches.filter((match) => (match.timeline.goldDiffAt15 ?? 0) <= -400 || (match.timeline.levelDiffAt15 ?? 0) <= -0.8);
  const stableLaneGames = matches.filter((match) => (match.timeline.goldDiffAt15 ?? 0) >= leadTargets.goldDiffAt15 && (match.timeline.levelDiffAt15 ?? 0) >= leadTargets.levelDiffAt15);
  const topChampion = championPool[0];
  const topChampionMatches = topChampion ? matches.filter((match) => match.championName === topChampion.championName) : [];
  const otherChampionMatches = topChampion ? matches.filter((match) => match.championName !== topChampion.championName) : [];
  const topChampionShare = topChampion ? getChampionPoolShare(topChampion.games, matches.length) : 0;
  const unstablePool = championPool.filter((entry) => entry.games >= 3).length >= 4 && topChampionShare < 0.36;
  const positiveLeadLosses = matches.filter((match) => (match.timeline.goldDiffAt15 ?? 0) >= 350 && !match.win);

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

  if (matches.length >= 8 && (avgGoldDiffAt15 <= -250 || losingLaneGames.length >= Math.max(3, Math.floor(matches.length * 0.22)))) {
    insights.push({
      id: 'lane-state-deficit',
      title: text(locale, 'Tus primeros 15 minutos están entrando demasiadas veces desde desventaja real de oro y nivel.', 'Too many of your first 15 minutes are starting from a real gold and level deficit.'),
      problem: text(locale, 'La línea o el primer tempo del mapa te está dejando atrás demasiado pronto', 'Your lane state or first map tempo is putting you behind too early'),
      category: 'early',
      severity: avgGoldDiffAt15 <= -550 || avgLevelDiffAt15 <= -1 ? 'high' : 'medium',
      priority: 'high',
      evidence: [
        text(locale, `Promediás ${round(avgGoldDiffAt15, 0)} de diferencia de oro al 15 y ${round(avgLevelDiffAt15, 1)} niveles de diferencia.`, `You average ${round(avgGoldDiffAt15, 0)} gold diff at 15 and ${round(avgLevelDiffAt15, 1)} levels of difference.`),
        text(locale, `${round(percent(losingLaneGames.length, matches.length), 1)}% de la muestra llega al 15 con una desventaja ya visible de lane o tempo.`, `${round(percent(losingLaneGames.length, matches.length), 1)}% of the sample reaches minute 15 with a visible lane or tempo deficit.`),
        stableLaneGames.length
          ? text(locale, `Cuando tu early llega estable o arriba, cerrás ${recordLabel(stableLaneGames.filter((match) => match.win).length, stableLaneGames.length, locale)}.`, `When your early reaches minute 15 stable or ahead, you finish at ${recordLabel(stableLaneGames.filter((match) => match.win).length, stableLaneGames.length, locale)}.`)
          : text(locale, 'Todavía no hay demasiadas partidas limpias de early para usar como referencia fuerte.', 'There are not many clean early games yet to use as a strong baseline.')
      ],
      impact: text(locale, 'No estás empezando las peleas importantes desde igualdad: muchas veces ya llegás con menos recursos, menos libertad y menos margen de error.', 'You are not starting important fights from parity. Many times you arrive with fewer resources, less freedom and less margin for error.'),
      cause: text(locale, `La fuga no parece solo mecánica: el patrón sugiere trades, pathing o resets que están entregando prioridad antes de que tu rol pueda estabilizarse.`, `The leak does not look purely mechanical. The pattern suggests trades, pathing or resets that are giving away priority before your role can stabilize.`),
      actions: [
        text(locale, 'Revisá los primeros 8 minutos y marcá la primera decisión que te deja sin prioridad real de wave, campamentos o reset.', 'Review the first 8 minutes and mark the first decision that leaves you without real wave, camp or reset priority.'),
        text(locale, 'No abras una segunda jugada dudosa si la primera ya te dejó abajo de tempo.', 'Do not open a second questionable play if the first one already put you behind on tempo.'),
        text(locale, 'Tomá oro y nivel al 15 como KPI duro del próximo bloque, no solo KDA o sensación de partida.', 'Use gold and level at 15 as a hard KPI for the next block, not just KDA or game feel.')
      ],
      metricValue: round(avgGoldDiffAt15, 0),
      focusMetric: 'gold_diff_at_15'
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

  if (matches.length >= 8 && avgKillParticipation < kpTarget - 5 && disconnectedGames.length >= Math.max(3, Math.floor(matches.length * 0.22))) {
    insights.push({
      id: 'map-connection',
      title: text(locale, 'Tu impacto no siempre está entrando donde la partida realmente se define.', 'Your impact is not always entering where the game is actually decided.'),
      problem: text(locale, 'Te estás conectando tarde o mal a las jugadas que mueven el mapa', 'You are joining the map too late or too poorly in the plays that move the game'),
      category: 'macro',
      severity: avgKillParticipation < kpTarget - 10 ? 'high' : 'medium',
      priority: 'medium',
      evidence: [
        text(locale, `Promediás ${round(avgKillParticipation, 1)}% de KP; para ${roleProfile.label} estamos usando ${kpTarget}% como referencia de presencia útil.`, `You average ${round(avgKillParticipation, 1)}% KP; for ${roleProfile.label} we are using ${kpTarget}% as the useful-presence benchmark.`),
        text(locale, `${round(percent(disconnectedGames.length, matches.length), 1)}% de la muestra queda por debajo de ese umbral.`, `${round(percent(disconnectedGames.length, matches.length), 1)}% of the sample lands below that threshold.`),
        connectedGames.length
          ? text(locale, `Cuando sí entrás más conectado al mapa, cerrás ${recordLabel(connectedGames.filter((match) => match.win).length, connectedGames.length, locale)}.`, `When you join the map more consistently, you finish at ${recordLabel(connectedGames.filter((match) => match.win).length, connectedGames.length, locale)}.`)
          : text(locale, 'Todavía no hay suficiente muestra de partidas realmente conectadas al mapa para usar como espejo limpio.', 'There is not enough sample of truly map-connected games yet to use as a clean mirror.')
      ],
      impact: text(locale, 'No se trata solo de “estar en la pelea”: se trata de llegar con el timing, la prioridad y la ruta correctos para que tu rol sí agregue valor.', 'This is not only about being present in a fight. It is about arriving with the right timing, priority and route so your role actually adds value.'),
      cause: text(locale, 'El patrón sugiere rotaciones tardías, pathings desconectados o exceso de foco en la línea propia cuando la jugada ya se mudó de lugar.', 'The pattern suggests late rotations, disconnected pathing or too much fixation on your own lane while the play has already moved elsewhere.'),
      actions: [
        text(locale, 'Revisá tus últimos 90 segundos antes de cada pelea grande: dónde estabas, qué estabas empujando y por qué llegaste tarde o sin prioridad.', 'Review your last 90 seconds before each major fight: where you were, what you were pushing and why you arrived late or without priority.'),
        text(locale, 'Marcá como error distinto no solo morir, sino llegar sin haber podido aportar daño, control o follow-up real.', 'Mark as a distinct error not only dying, but arriving without being able to add real damage, control or follow-up.'),
        text(locale, 'Buscá que tu próximo bloque suba presencia útil en mapa antes de abrir más variables mecánicas.', 'Push your next block toward more useful map presence before adding more mechanical variables.')
      ],
      metricValue: round(avgKillParticipation, 1),
      focusMetric: 'kill_participation'
    });
  }

  if (matches.length >= 8 && objectiveDeaths >= 1.2) {
    insights.push({
      id: 'objective-discipline',
      title: text(locale, 'Tus resultados caen cuando llegás tarde o mal preparado a las ventanas de objetivo.', 'Your results dip when you arrive late or unprepared to objective windows.'),
      problem: text(locale, 'El setup de objetivos está cediendo demasiado valor', 'Your objective setup is giving away too much value'),
      category: 'macro',
      severity: objectiveDeaths >= 1.5 ? 'high' : 'medium',
      priority: objectiveDeaths >= 1.7 ? 'high' : 'medium',
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

  if (matches.length >= 10 && unstablePool && championPool.length >= 4) {
    insights.push({
      id: 'pool-drift',
      title: text(locale, 'Tu muestra está demasiado repartida como para fijar hábitos competitivos con velocidad.', 'Your sample is spread too thin to lock competitive habits quickly.'),
      problem: text(locale, 'Tu pool todavía está demasiado abierto para el bloque actual', 'Your champion pool is still too open for the current block'),
      category: 'champion-pool',
      severity: 'medium',
      priority: 'medium',
      evidence: [
        text(locale, `${championPool.filter((entry) => entry.games >= 3).length} campeones ya tienen 3 o más partidas en la muestra.`, `${championPool.filter((entry) => entry.games >= 3).length} champions already have 3 or more games in the sample.`),
        text(locale, `${topChampion?.championName ?? 'Tu pick principal'} concentra solo ${round(topChampionShare * 100, 1)}% del bloque.`, `${topChampion?.championName ?? 'Your main pick'} only carries ${round(topChampionShare * 100, 1)}% of the block.`),
        text(locale, 'Cuando el bloque se reparte demasiado, cuesta más separar si el problema es del jugador, del campeón o del matchup.', 'When the block is spread too wide, it becomes harder to separate whether the issue belongs to the player, the champion or the matchup.')
      ],
      impact: text(locale, 'No necesariamente estás eligiendo mal picks, pero sí estás haciendo más lento el aprendizaje porque cada campeón te pide tiempos y riesgos distintos.', 'You are not necessarily choosing bad picks, but you are slowing the learning loop because each champion asks for different timings and risk profiles.'),
      cause: text(locale, 'Todavía no hay suficiente concentración de volumen en una referencia fuerte como para convertir hábitos en mejoras medibles rápido.', 'There is not enough volume concentrated in a strong reference yet to turn habits into measurable improvements quickly.'),
      actions: [
        text(locale, 'Definí un pick de referencia y un segundo pick funcional para este bloque, y evitá abrir más variables hasta estabilizar el problema principal.', 'Set one reference pick and one functional secondary pick for this block, and avoid opening more variables until the main issue is stabilized.'),
        text(locale, 'Usá el resto del pool solo si el draft realmente te lo exige, no como default de práctica.', 'Use the rest of the pool only if draft truly forces it, not as your default practice pattern.'),
        text(locale, 'Medí si la claridad del coaching mejora cuando el volumen deja de dispersarse tanto.', 'Measure whether coaching clarity improves once the volume stops being so dispersed.')
      ],
      focusMetric: 'champion_pool_stability'
    });
  }

  if (matches.length >= 8 && positiveLeadLosses.length >= Math.max(3, Math.floor(matches.length * 0.18))) {
    insights.push({
      id: 'lead-conversion',
      title: text(locale, 'Hay partidas donde entrás al mid game con ventaja y aun así no terminás convirtiéndola.', 'There are games where you enter mid game ahead and still fail to convert that lead.'),
      problem: text(locale, 'Tu ventaja temprana no siempre se está transformando en control real de partida', 'Your early lead is not always turning into real game control'),
      category: 'macro',
      severity: 'medium',
      priority: 'medium',
      evidence: [
        text(locale, `${positiveLeadLosses.length} partidas de la muestra terminan en derrota incluso después de llegar arriba en oro al 15.`, `${positiveLeadLosses.length} games in the sample still end in losses even after reaching minute 15 ahead in gold.`),
        text(locale, `Eso señala una fuga de conversión, no solo un problema de lane o mecánicas.`, `That points to a conversion leak, not only a lane or mechanics issue.`)
      ],
      impact: text(locale, 'No alcanza con “ganar la primera parte” si después el mapa se juega sin reset, sin tempo o sin target selection clara.', 'It is not enough to win the first part if the map is then played without reset, tempo or clear target selection.'),
      cause: text(locale, 'La ventaja temprana parece perderse entre resets malos, side plays extra o peleas donde no entrás con la posición correcta.', 'The early lead seems to get lost in bad resets, extra side plays or fights where you do not enter from the correct position.'),
      actions: [
        text(locale, 'Revisá específicamente derrotas con oro positivo al 15 y marcá la primera decisión donde dejaste de jugar desde ventaja.', 'Review losses with positive gold at 15 and mark the first decision where you stopped playing from advantage.'),
        text(locale, 'En tus próximas rankeds, si entrás arriba al mid game, priorizá convertir esa ventaja en visión, tempo y setup antes que en highlights.', 'In your next ranked games, if you enter mid game ahead, prioritize converting that edge into vision, tempo and setup before chasing highlights.'),
        text(locale, 'Medí conversión de ventaja como hábito aparte del farmeo o de la fase de línea.', 'Track lead conversion as a separate habit from farming or lane phase.')
      ],
      focusMetric: 'lead_conversion'
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
      const severityWeight = { high: 3, medium: 2, low: 1 };
      return (
        priorityWeight[b.priority] - priorityWeight[a.priority]
        || severityWeight[b.severity] - severityWeight[a.severity]
      );
    })
    .slice(0, 6);
}

export function buildCoachingSummary(matches: ParticipantSnapshot[], insights: CoachInsight[], locale: SummaryLocale = 'es'): CoachingSummary {
  const sortedByDate = [...matches].sort((a, b) => a.gameCreation - b.gameCreation);
  const suggestedRecentCount = Math.min(8, Math.max(3, Math.ceil(sortedByDate.length * 0.35)));
  let recentWindow = sortedByDate.slice(-Math.min(suggestedRecentCount, sortedByDate.length));
  let baselineWindow = sortedByDate.slice(0, Math.max(0, sortedByDate.length - recentWindow.length));
  if (!recentWindow.length) recentWindow = sortedByDate.slice(-1);
  if (!baselineWindow.length) baselineWindow = sortedByDate.slice(0, Math.max(1, sortedByDate.length - 1));
  if (!baselineWindow.length) baselineWindow = recentWindow;
  const topProblem = insights[0] ?? null;
  const measurableProblem = insights.find((insight) => ['deaths_pre_10', 'cs_at_15', 'deaths_pre_14', 'objective_fight_deaths'].includes(insight.focusMetric ?? '')) ?? null;
  const baselineScore = round(avg(baselineWindow.map((match) => match.score.total)));
  const recentScore = round(avg(recentWindow.map((match) => match.score.total)));
  const baselineWinRate = round((baselineWindow.filter((match) => match.win).length / Math.max(baselineWindow.length, 1)) * 100);
  const recentWinRate = round((recentWindow.filter((match) => match.win).length / Math.max(recentWindow.length, 1)) * 100);
  const scoreDelta = round(recentScore - baselineScore, 1);
  const winRateDelta = round(recentWinRate - baselineWinRate, 1);
  const baselineConsistency = calculateConsistencyIndex(baselineWindow);
  const recentConsistency = calculateConsistencyIndex(recentWindow);
  const consistencyDelta = round(recentConsistency - baselineConsistency, 1);
  const baselineCsAt15 = round(avg(baselineWindow.map((match) => match.timeline.csAt15)));
  const recentCsAt15 = round(avg(recentWindow.map((match) => match.timeline.csAt15)));
  const csAt15Delta = round(recentCsAt15 - baselineCsAt15, 1);
  const baselineGoldAt15 = round(avg(baselineWindow.map((match) => match.timeline.goldAt15)));
  const recentGoldAt15 = round(avg(recentWindow.map((match) => match.timeline.goldAt15)));
  const goldAt15Delta = round(recentGoldAt15 - baselineGoldAt15, 0);
  const baselineKillParticipation = round(avg(baselineWindow.map((match) => match.killParticipation)));
  const recentKillParticipation = round(avg(recentWindow.map((match) => match.killParticipation)));
  const killParticipationDelta = round(recentKillParticipation - baselineKillParticipation, 1);
  const baselineDeathsPre14 = round(avg(baselineWindow.map((match) => match.timeline.deathsPre14)));
  const recentDeathsPre14 = round(avg(recentWindow.map((match) => match.timeline.deathsPre14)));
  const deathsPre14Delta = round(recentDeathsPre14 - baselineDeathsPre14, 1);

  let activePlan: ImprovementCycle | null = null;
  if (measurableProblem) {
    const focusMatches = [...sortedByDate].reverse().slice(0, 5);
    const activeRoleProfile = getRoleProfile(findPrimaryRole(matches), locale);
    const completedGames = focusMatches.filter((match) => {
      switch (measurableProblem.focusMetric) {
        case 'deaths_pre_10':
          return match.timeline.laneDeathsPre10 === 0;
        case 'cs_at_15':
          return match.timeline.csAt15 >= activeRoleProfile.csAt15Target;
        case 'deaths_pre_14':
          return match.timeline.deathsPre14 <= activeRoleProfile.stableDeathsPre14;
        case 'objective_fight_deaths':
          return match.timeline.objectiveFightDeaths === 0;
        case 'gold_diff_at_15':
          return (match.timeline.goldDiffAt15 ?? 0) >= getLeadMetricTarget(findPrimaryRole(matches)).goldDiffAt15;
        case 'kill_participation':
          return match.killParticipation >= getKillParticipationTarget(findPrimaryRole(matches));
        default:
          return false;
      }
    }).length;

    const objectiveByMetric: Record<string, string> = {
      deaths_pre_10: text(locale, 'No morir antes del minuto 10', 'Do not die before minute 10'),
      cs_at_15: text(locale, `Sostener ${activeRoleProfile.csAt15Target}+ CS al minuto 15`, `Hold ${activeRoleProfile.csAt15Target}+ CS by minute 15`),
      deaths_pre_14: text(locale, `Mantener ${activeRoleProfile.stableDeathsPre14} o menos muertes antes del 14`, `Hold ${activeRoleProfile.stableDeathsPre14} or fewer deaths before minute 14`),
      objective_fight_deaths: text(locale, 'Llegar vivo a las ventanas de objetivo', 'Arrive alive to objective windows'),
      gold_diff_at_15: text(locale, 'Llegar al 15 sin ceder la primera ventaja de oro y nivel', 'Reach minute 15 without giving away the first gold and level edge'),
      kill_participation: text(locale, 'Entrar mejor conectado a las jugadas que mueven el mapa', 'Join the plays that move the map more consistently')
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
      baselineMatches: baselineWindow.length,
      recentMatches: recentWindow.length,
      baselineScore,
      recentScore,
      scoreDelta,
      baselineWinRate,
      recentWinRate,
      winRateDelta,
      baselineConsistency,
      recentConsistency,
      consistencyDelta,
      baselineCsAt15,
      recentCsAt15,
      csAt15Delta,
      baselineGoldAt15,
      recentGoldAt15,
      goldAt15Delta,
      baselineKillParticipation,
      recentKillParticipation,
      killParticipationDelta,
      baselineDeathsPre14,
      recentDeathsPre14,
      deathsPre14Delta
    }
  };
}

export function buildAggregateSummary(player: string, tagLine: string, region: string, platform: string, matches: ParticipantSnapshot[], locale: SummaryLocale = 'es'): AggregateSummary {
  const eligibleMatches = matches.filter((match) => !match.isRemake);
  const wins = eligibleMatches.filter((match) => match.win).length;
  const losses = eligibleMatches.length - wins;
  const championPool = buildChampionPool(eligibleMatches);
  const insights = buildInsights(eligibleMatches, championPool, locale);
  const positiveSignals = buildPositiveSignals(eligibleMatches, championPool, locale);
  const reviewAgenda = buildReviewAgenda(eligibleMatches, locale);
  const coaching = buildCoachingSummary(eligibleMatches, insights, locale);
  const problematicMatchup = buildProblematicMatchupSummary(eligibleMatches, locale);

  return {
    player,
    tagLine,
    region,
    platform,
    primaryRole: findPrimaryRole(eligibleMatches),
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
    avgGoldDiffAt15: round(avg(eligibleMatches.map((match) => match.timeline.goldDiffAt15 ?? 0))),
    avgLevelDiffAt15: round(avg(eligibleMatches.map((match) => match.timeline.levelDiffAt15 ?? 0))),
    avgDeathsPre14: round(avg(eligibleMatches.map((match) => match.timeline.deathsPre14))),
    avgPerformanceScore: round(avg(eligibleMatches.map((match) => match.score.total))),
    consistencyIndex: calculateConsistencyIndex(eligibleMatches),
    remakesExcluded: matches.length - eligibleMatches.length,
    championPool,
    insights,
    positiveSignals,
    reviewAgenda,
    coaching,
    problematicMatchup
  };
}
