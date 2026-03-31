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

const avg = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);
const round = (value: number, digits = 2) => Number(value.toFixed(digits));
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const formatSigned = (value: number, digits = 1) => `${value >= 0 ? '+' : ''}${round(value, digits)}`;
const percent = (wins: number, total: number) => (total ? (wins / total) * 100 : 0);

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

function getRoleProfile(role: string): RoleCoachingProfile {
  return roleProfiles[role] ?? roleProfiles.ALL;
}

function findPrimaryRole(matches: ParticipantSnapshot[]) {
  const counts = new Map<string, number>();
  for (const match of matches) {
    const role = match.role || 'ALL';
    counts.set(role, (counts.get(role) ?? 0) + 1);
  }

  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'ALL';
}

function recordLabel(wins: number, total: number) {
  return `${wins} de ${total} (${round(percent(wins, total), 1)}% WR)`;
}

function formatChampionShare(games: number, total: number) {
  return `${games} de ${total} partidas (${round(percent(games, total), 1)}%)`;
}

function sampleDifferenceLabel(leftWins: number, leftTotal: number, rightWins: number, rightTotal: number) {
  return `${recordLabel(leftWins, leftTotal)} vs ${recordLabel(rightWins, rightTotal)}`;
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

export function buildInsights(matches: ParticipantSnapshot[], championPool: ChampionAggregate[]): CoachInsight[] {
  const insights: CoachInsight[] = [];
  if (!matches.length) return insights;

  const primaryRole = findPrimaryRole(matches);
  const roleProfile = getRoleProfile(primaryRole);
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
      title: `Tu economía temprana en ${roleProfile.label} todavía no te deja entrar al mid game con el margen correcto.`,
      problem: 'El piso de farm a los 15 minutos sigue demasiado bajo',
      category: 'early',
      severity: avgCsAt15 < targetCsAt15 - 8 ? 'high' : 'medium',
      priority: avgCsAt15 < targetCsAt15 - 8 ? 'high' : 'medium',
      evidence: [
        `Promediás ${round(avgCsAt15, 1)} CS al 15; para ${roleProfile.label} estamos usando ${targetCsAt15} como referencia operativa.`,
        `${round(percent(belowFarmTarget.length, matches.length), 1)}% de tu muestra queda por debajo de ese objetivo.`,
        `Cuando llegás al objetivo, cerrás ${recordLabel(onFarmTarget.filter((match) => match.win).length, onFarmTarget.length)}; cuando no llegás, bajás a ${recordLabel(belowFarmTarget.filter((match) => match.win).length, belowFarmTarget.length)}.`
      ],
      impact: `La diferencia entre tus partidas con economía estable y tus partidas cortas de recursos es clara: ${sampleDifferenceLabel(onFarmTarget.filter((match) => match.win).length, onFarmTarget.length, belowFarmTarget.filter((match) => match.win).length, belowFarmTarget.length)}.`,
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
      title: 'El problema hoy no es tu techo mecánico: es cuántas partidas se rompen demasiado pronto.',
      problem: 'Tu piso de partida sigue siendo inestable',
      category: 'consistency',
      severity: avgPre14Deaths >= stableLimit + 1 ? 'high' : 'medium',
      priority: 'high',
      evidence: [
        `Promediás ${round(avgPre14Deaths, 1)} muertes antes del 14; para ${roleProfile.label} el objetivo es sostener ${stableLimit} o menos.`,
        `Tus partidas limpias cierran ${recordLabel(disciplinedGames.filter((match) => match.win).length, disciplinedGames.length)}.`,
        `Cuando la partida se vuelve volátil temprano, bajás a ${recordLabel(volatileGames.filter((match) => match.win).length, volatileGames.length)}.`
      ],
      impact: 'La calidad de tus primeras decisiones está separando con bastante nitidez tus partidas jugables de tus partidas que se derrumban antes del mid game.',
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
      title: 'Tus resultados caen cuando llegás tarde o mal preparado a las ventanas de objetivo.',
      problem: 'El setup de objetivos está cediendo demasiado valor',
      category: 'macro',
      severity: objectiveDeaths >= 1.5 ? 'high' : 'medium',
      priority: 'medium',
      evidence: [
        `Promediás ${round(objectiveDeaths, 1)} muertes en peleas cercanas a dragón, heraldo o barón.`,
        `${round(percent(matches.filter((match) => match.timeline.objectiveFightDeaths > 0).length, matches.length), 1)}% de tu muestra pierde al menos una vida en estas ventanas.`
      ],
      impact: 'Cuando regalás una muerte antes o durante el setup, la partida deja de jugarse desde prioridad y empieza a jugarse desde desventaja de tempo.',
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
        title: `${topChampion.championName} ya te está marcando una forma de jugar más sólida que el resto de tu pool.`,
        problem: `${topChampion.championName} es tu referencia de juego más confiable`,
        category: 'positive',
        severity: 'low',
        priority: 'low',
        evidence: [
          `Lo usaste en ${formatChampionShare(topChampionMatches.length, matches.length)} de la muestra.`,
          `Con ${topChampion.championName} cerrás ${recordLabel(topChampionWins, topChampionMatches.length)}.`,
          `Su línea media está en ${round(topChampionCsAt15, 1)} CS al 15 y ${round(topChampionPre14Deaths, 1)} muertes antes del 14.`
        ],
        impact: 'No hace falta inventar un plan nuevo desde cero: ya existe una versión tuya que está resolviendo mejor los primeros 15 minutos.',
        cause: 'Con ese campeón tus ventanas de tempo, daño y toma de riesgo parecen estar más alineadas con cómo querés jugar.',
        actions: [
          `Usá tus mejores partidas de ${topChampion.championName} como referencia de review para recalls, primeras rotaciones y setup de objetivos.`,
          'Compará esas decisiones contra tus picks más flojos antes de abrir nuevas variables.'
        ]
      });
    } else if (topChampionWinRate <= otherWinRate - 6 || topChampion.avgScore < avg(championPool.map((entry) => entry.avgScore)) - 4) {
      insights.push({
        id: 'primary-champion-review',
        title: `${topChampion.championName} concentra mucho volumen, pero hoy no está devolviendo suficiente valor competitivo.`,
        problem: `${topChampion.championName} necesita un plan más preciso, no solo más partidas`,
        category: 'champion-pool',
        severity: 'medium',
        priority: 'medium',
        evidence: [
          `Lo usaste en ${formatChampionShare(topChampionMatches.length, matches.length)} de la muestra.`,
          `Con ${topChampion.championName} estás en ${recordLabel(topChampionWins, topChampionMatches.length)}.`,
          otherChampionMatches.length ? `El resto del pool queda en ${recordLabel(otherWins, otherChampionMatches.length)}.` : 'No hay suficiente volumen en otros picks para compararlo con justicia.'
        ],
        impact: 'Si tu pick principal concentra la mayor parte de la muestra, cualquier fuga estructural ahí se transforma rápido en techo de elo.',
        cause: 'La comodidad con el campeón no siempre está traduciéndose en mejores tiempos de mapa, economía o disciplina temprana.',
        actions: [
          `Separá tres partidas de ${topChampion.championName}: una buena, una media y una mala, y compará el primer error que cambia el tempo.`,
          `Hasta corregir eso, evitá usar ${topChampion.championName} en matchups o drafts donde ya sabés que te cuesta entrar cómodo.`
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
        title: `Hay un matchup recurrente que merece preparación explícita con ${topChampion.championName}.`,
        problem: `${riskyMatchup.opponentChampionName} está castigando demasiado tu pick principal`,
        category: 'champion-pool',
        severity: 'medium',
        priority: 'medium',
        evidence: [
          `Con ${topChampion.championName} contra ${riskyMatchup.opponentChampionName} estás en ${recordLabel(riskyMatchup.wins, riskyMatchup.games)}.`,
          `En ese cruce promediás ${round(riskyMatchup.avgCsAt15, 1)} CS al 15 y ${round(riskyMatchup.avgDeathsPre14, 1)} muertes antes del 14.`
        ],
        impact: 'No parece un problema aislado: el patrón se repite lo suficiente como para justificar un plan de matchup en vez de seguir improvisándolo.',
        cause: `Ese cruce probablemente te está forzando decisiones incómodas de tempo, pathing o ventanas de trade antes de llegar a tu zona fuerte.`,
        actions: [
          `Armá una review específica de ${topChampion.championName} vs ${riskyMatchup.opponentChampionName}: primer clear o primeros 8 minutos, primer reset y primera pelea por objetivo.`,
          'Hasta entender el patrón, jugá ese cruce con un plan más conservador y una ruta de recursos más estable.'
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

export function buildCoachingSummary(matches: ParticipantSnapshot[], insights: CoachInsight[]): CoachingSummary {
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
          return match.timeline.csAt15 >= getRoleProfile(findPrimaryRole(matches)).csAt15Target;
        case 'deaths_pre_14':
          return match.timeline.deathsPre14 <= getRoleProfile(findPrimaryRole(matches)).stableDeathsPre14;
        case 'objective_fight_deaths':
          return match.timeline.objectiveFightDeaths === 0;
        default:
          return false;
      }
    }).length;

    const objectiveByMetric: Record<string, string> = {
      deaths_pre_10: 'No morir antes del minuto 10',
      cs_at_15: `Sostener ${getRoleProfile(findPrimaryRole(matches)).csAt15Target}+ CS al minuto 15`,
      deaths_pre_14: `Mantener ${getRoleProfile(findPrimaryRole(matches)).stableDeathsPre14} o menos muertes antes del 14`,
      objective_fight_deaths: 'Llegar vivo a las ventanas de objetivo'
    };

    activePlan = {
      focus: measurableProblem.problem,
      objective: objectiveByMetric[measurableProblem.focusMetric ?? ''] ?? measurableProblem.actions[0] ?? measurableProblem.problem,
      targetGames: 5,
      completedGames,
      progressPercent: round((completedGames / 5) * 100, 0),
      successLabel: `${completedGames}/5 partidas recientes cumplieron el objetivo`
    };
  }

  const headline = topProblem
    ? topProblem.problem
    : 'Tu perfil ya tiene una base estable de mejora';
  const subheadline = topProblem
    ? `${topProblem.impact} La prioridad del bloque actual es corregir esto antes de abrir nuevas variables.`
    : 'El siguiente paso es sostener consistencia y revisar tus picks con mejor retorno.';

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

export function buildAggregateSummary(player: string, tagLine: string, region: string, platform: string, matches: ParticipantSnapshot[]): AggregateSummary {
  const eligibleMatches = matches.filter((match) => !match.isRemake);
  const wins = eligibleMatches.filter((match) => match.win).length;
  const losses = eligibleMatches.length - wins;
  const championPool = buildChampionPool(eligibleMatches);
  const insights = buildInsights(eligibleMatches, championPool);
  const coaching = buildCoachingSummary(eligibleMatches, insights);

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
