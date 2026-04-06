import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { AICoachContext } from './aiCoachSchemas.js';
import {
  championIdentitySchema,
  eloProfileSchema,
  metaPatchReferenceSchema,
  roleIdentitySchema,
  type ChampionIdentity,
  type CoachDiagnosisIssueSummary,
  type CoachDiagnosisSummary,
  type CoachKnowledgeContext,
  type DiagnosisFocusMetric,
  type EloProfile,
  type KnowledgeSignal,
  type MetaPatchReference,
  type RoleIdentity,
  type SkillBracket
} from './coachKnowledgeSchemas.js';

export type CoachContextWithKnowledge = Omit<AICoachContext, 'intelligence'>;
type CoachContextBeforeKnowledge = Omit<AICoachContext, 'knowledge' | 'diagnosis' | 'intelligence'>;
type CoachProblem = CoachContextBeforeKnowledge['coaching']['topProblems'][number];

const identitiesDir = fileURLToPath(new URL('../../data/coach-kb/identities', import.meta.url));
const championIdentitiesDir = fileURLToPath(new URL('../../data/coach-kb/identities/champions', import.meta.url));
const metaPatchReferencesDir = fileURLToPath(new URL('../../data/coach-kb/meta/patches', import.meta.url));
const KNOWLEDGE_VERSION = '2026-04-knowledge-v2';
const AVAILABLE_SIGNALS: KnowledgeSignal[] = ['match_summary', 'timeline_gold_xp', 'objective_windows', 'items_runes', 'rank_context'];

type KnowledgeCatalog = {
  roleIdentities: Map<string, RoleIdentity>;
  championIdentities: Map<string, ChampionIdentity>;
  eloProfiles: Map<SkillBracket, EloProfile>;
  metaPatchReferences: Map<string, MetaPatchReference>;
};

let knowledgeCatalogPromise: Promise<KnowledgeCatalog> | null = null;

function localize(locale: 'es' | 'en', value: { es: string; en: string }) {
  return value[locale];
}

function normalizeChampionKey(value?: string | null) {
  return (value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeRoleKey(value?: string | null) {
  return (value ?? 'ALL').trim().toUpperCase() || 'ALL';
}

async function walkJsonFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const fullPath = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return walkJsonFiles(fullPath);
    return entry.name.endsWith('.json') ? [fullPath] : [];
  }));

  return nested.flat();
}

async function loadKnowledgeCatalog(): Promise<KnowledgeCatalog> {
  if (!knowledgeCatalogPromise) {
    knowledgeCatalogPromise = (async () => {
      const [roleRaw, eloRaw, championFiles, metaFiles] = await Promise.all([
        readFile(`${identitiesDir}/roles.json`, 'utf8'),
        readFile(`${identitiesDir}/elos.json`, 'utf8'),
        walkJsonFiles(championIdentitiesDir),
        walkJsonFiles(metaPatchReferencesDir)
      ]);

      const roles = roleIdentitySchema.array().parse(JSON.parse(roleRaw));
      const elos = eloProfileSchema.array().parse(JSON.parse(eloRaw));
      const champions = await Promise.all(championFiles.map(async (file) => {
        const raw = await readFile(file, 'utf8');
        return championIdentitySchema.parse(JSON.parse(raw));
      }));
      const metaReferences = await Promise.all(metaFiles.map(async (file) => {
        const raw = await readFile(file, 'utf8');
        return metaPatchReferenceSchema.parse(JSON.parse(raw));
      }));

      return {
        roleIdentities: new Map(roles.map((entry) => [normalizeRoleKey(entry.role), entry])),
        championIdentities: new Map(champions.map((entry) => [normalizeChampionKey(entry.championName), entry])),
        eloProfiles: new Map(elos.map((entry) => [entry.bracket, entry])),
        metaPatchReferences: new Map(metaReferences.map((entry) => [entry.patch, entry]))
      } satisfies KnowledgeCatalog;
    })();
  }

  return knowledgeCatalogPromise;
}

function deriveSkillBracket(highestTier?: string): SkillBracket {
  switch ((highestTier ?? 'UNRANKED').toUpperCase()) {
    case 'IRON':
    case 'BRONZE':
    case 'SILVER':
    case 'UNRANKED':
      return 'low_elo';
    case 'GOLD':
    case 'PLATINUM':
    case 'EMERALD':
      return 'mid_elo';
    case 'DIAMOND':
    case 'MASTER':
      return 'high_elo';
    case 'GRANDMASTER':
    case 'CHALLENGER':
      return 'apex';
    default:
      return 'mid_elo';
  }
}

function getFallbackRoleIdentity(role: string, locale: 'es' | 'en'): CoachKnowledgeContext['roleIdentity'] {
  const labelMap: Record<string, string> = {
    TOP: locale === 'en' ? 'top' : 'top',
    JUNGLE: locale === 'en' ? 'jungle' : 'jungla',
    MIDDLE: locale === 'en' ? 'mid' : 'mid',
    BOTTOM: locale === 'en' ? 'adc' : 'adc',
    UTILITY: locale === 'en' ? 'support' : 'support',
    ALL: locale === 'en' ? 'all roles' : 'todos los roles'
  };

  return {
    role,
    label: labelMap[role] ?? labelMap.ALL,
    csAt15Target: 100,
    stableDeathsPre14: 1,
    killParticipationTarget: 50,
    goldDiffAt15Target: 0,
    levelDiffAt15Target: 0,
    evaluationWeights: {},
    fundamentals: locale === 'en'
      ? ['Tempo, economy and stable map decisions.']
      : ['Tempo, economia y decisiones de mapa estables.'],
    blindSpots: [],
    reviewPrompts: []
  };
}

function getFallbackEloProfile(bracket: SkillBracket, locale: 'es' | 'en'): CoachKnowledgeContext['eloProfile'] {
  const coachStyleByBracket: Record<SkillBracket, string> = {
    low_elo: locale === 'en'
      ? 'Coach fundamentals first. Do not jump to advanced macro before the player stops donating obvious deaths.'
      : 'Priorizar fundamentos. No saltar a macro avanzada antes de cortar muertes obvias.',
    mid_elo: locale === 'en'
      ? 'Balance execution with map structure. The player can absorb one macro layer if the basics are stable.'
      : 'Balancear ejecucion y estructura de mapa. Se puede agregar una capa de macro si la base esta estable.',
    high_elo: locale === 'en'
      ? 'Use sharper language around conversion, setup and role discipline.'
      : 'Usar lenguaje mas fino sobre conversion, setup y disciplina del rol.',
    apex: locale === 'en'
      ? 'Frame the leak as marginal edge, matchup refinement and repeatability under pressure.'
      : 'Enfocar la fuga como edge marginal, refinamiento de matchup y repetibilidad bajo presion.'
  };

  return {
    bracket,
    coachStyle: coachStyleByBracket[bracket],
    evaluationWeights: {},
    deEmphasizeIfDeathsHigh: [],
    reviewThemes: []
  };
}

function buildRoleIdentityContext(roleIdentity: RoleIdentity | undefined, role: string, locale: 'es' | 'en'): CoachKnowledgeContext['roleIdentity'] {
  if (!roleIdentity) return getFallbackRoleIdentity(role, locale);

  return {
    role: roleIdentity.role,
    label: localize(locale, roleIdentity.label),
    csAt15Target: roleIdentity.csAt15Target,
    stableDeathsPre14: roleIdentity.stableDeathsPre14,
    killParticipationTarget: roleIdentity.killParticipationTarget,
    goldDiffAt15Target: roleIdentity.goldDiffAt15Target,
    levelDiffAt15Target: roleIdentity.levelDiffAt15Target,
    evaluationWeights: roleIdentity.evaluationWeights,
    fundamentals: roleIdentity.fundamentals.map((entry) => localize(locale, entry)),
    blindSpots: roleIdentity.blindSpots.map((entry) => localize(locale, entry)),
    reviewPrompts: roleIdentity.reviewPrompts.map((entry) => localize(locale, entry))
  };
}

function buildChampionIdentityContext(params: {
  locale: 'es' | 'en';
  championIdentity?: ChampionIdentity;
  skillBracket: SkillBracket;
}): CoachKnowledgeContext['championIdentity'] {
  const { championIdentity, locale, skillBracket } = params;
  if (!championIdentity) return null;

  return {
    championName: championIdentity.championName,
    roles: championIdentity.roles,
    archetypes: championIdentity.archetypes,
    economyProfile: championIdentity.economyProfile,
    mapProfiles: championIdentity.mapProfiles,
    evaluationWeights: championIdentity.evaluationWeights,
    performanceAxes: championIdentity.performanceAxes.map((entry) => localize(locale, entry)),
    misreadWarnings: championIdentity.misreadWarnings.map((entry) => ({
      focusMetric: entry.focusMetric,
      message: localize(locale, entry.message)
    })),
    priorityNotes: championIdentity.priorityNotes
      .filter((entry) => entry.bracket === 'all' || entry.bracket === skillBracket)
      .map((entry) => localize(locale, entry.message)),
    activeHeuristics: championIdentity.heuristics
      .filter((entry) => entry.status === 'active')
      .map((entry) => ({
        id: entry.id,
        title: localize(locale, entry.title),
        note: localize(locale, entry.note)
      })),
    blockedHeuristics: championIdentity.heuristics
      .filter((entry) => entry.status === 'blocked_by_missing_data')
      .map((entry) => ({
        id: entry.id,
        title: localize(locale, entry.title),
        note: localize(locale, entry.note),
        requiredSignals: entry.requiredSignals
      }))
  };
}

function buildEloProfileContext(profile: EloProfile | undefined, bracket: SkillBracket, locale: 'es' | 'en'): CoachKnowledgeContext['eloProfile'] {
  if (!profile) return getFallbackEloProfile(bracket, locale);

  return {
    bracket: profile.bracket,
    coachStyle: localize(locale, profile.coachStyle),
    evaluationWeights: profile.evaluationWeights,
    deEmphasizeIfDeathsHigh: profile.deEmphasizeIfDeathsHigh,
    reviewThemes: profile.reviewThemes.map((entry) => localize(locale, entry))
  };
}

function buildMetaReferenceContext(params: {
  context: CoachContextBeforeKnowledge;
  locale: 'es' | 'en';
  metaReference?: MetaPatchReference;
}): CoachKnowledgeContext['metaReference'] {
  const { context, locale, metaReference } = params;
  if (!metaReference) {
    return {
      patch: context.patchContext.currentPatch === 'unknown' ? null : context.patchContext.currentPatch,
      status: 'not_configured',
      summary: locale === 'en'
        ? 'Manual patch meta scaffolding is ready, but no tier/build feed has been loaded for this patch yet.'
        : 'El scaffold de meta por parche ya existe, pero todavia no hay un feed de tier/build cargado para este parche.',
      roleHighlights: [],
      championBuilds: []
    };
  }

  const trackedChampions = new Set([
    context.player.anchorChampion,
    ...context.championPool.map((entry) => entry.championName),
    context.problematicMatchup?.opponentChampionName ?? null
  ].filter(Boolean).map((entry) => normalizeChampionKey(entry)));
  const primaryRole = normalizeRoleKey(context.player.primaryRole ?? context.player.roleFilter);

  return {
    patch: metaReference.patch,
    status: metaReference.status,
    summary: localize(locale, metaReference.summary),
    roleHighlights: metaReference.roleHighlights
      .filter((entry) => normalizeRoleKey(entry.role) === primaryRole || trackedChampions.has(normalizeChampionKey(entry.championName)))
      .slice(0, 4)
      .map((entry) => ({
        role: entry.role,
        championName: entry.championName,
        tier: entry.tier,
        note: localize(locale, entry.note)
      })),
    championBuilds: metaReference.championBuilds
      .filter((entry) => trackedChampions.has(normalizeChampionKey(entry.championName)) || normalizeRoleKey(entry.role) === primaryRole)
      .slice(0, 3)
      .map((entry) => ({
        championName: entry.championName,
        role: entry.role,
        coreItems: entry.coreItems,
        situationalItems: entry.situationalItems,
        primaryRunes: entry.primaryRunes,
        secondaryRunes: entry.secondaryRunes,
        note: localize(locale, entry.note)
      }))
  };
}

function measuredPrefix(locale: 'es' | 'en') {
  return locale === 'en' ? 'Measured:' : 'Medido:';
}

function proxyPrefix(locale: 'es' | 'en') {
  return locale === 'en' ? 'Proxy:' : 'Proxy:';
}

function missingPrefix(locale: 'es' | 'en') {
  return locale === 'en' ? 'Missing:' : 'Dato faltante:';
}

function buildSyntheticEvidenceMeta(params: {
  context: CoachContextBeforeKnowledge;
  confidenceBias: number;
  interpretation?: CoachProblem['interpretation'];
}) {
  const { context, confidenceBias, interpretation = 'situational' } = params;
  const sampleSize = context.player.visibleMatches;
  const evidenceScore = Number(Math.max(
    0,
    Math.min(100, confidenceBias + (sampleSize >= 16 ? 16 : sampleSize >= 10 ? 10 : 4))
  ).toFixed(0));
  const evidenceStrength: NonNullable<CoachProblem['evidenceStrength']> = evidenceScore >= 74
    ? 'high'
    : evidenceScore >= 48
      ? 'medium'
      : 'low';
  const sampleWarning = sampleSize < 10
    ? context.player.locale === 'en'
      ? 'The scoped sample is still short, so this read should stay tied to replay validation.'
      : 'La muestra del scope sigue corta, así que esta lectura conviene mantenerla pegada a validación en replay.'
    : null;

  return {
    evidenceScore,
    evidenceStrength,
    interpretation,
    sampleWarning,
    sampleSize
  };
}

function createSyntheticProblem(params: {
  context: CoachContextBeforeKnowledge;
  id: string;
  problem: string;
  title: string;
  category: CoachProblem['category'];
  severity: CoachProblem['severity'];
  priority: CoachProblem['priority'];
  evidence: string[];
  impact: string;
  cause: string;
  actions: string[];
  focusMetric: DiagnosisFocusMetric;
  winRateDelta?: number;
  confidenceBias: number;
  interpretation?: CoachProblem['interpretation'];
}): CoachProblem {
  const meta = buildSyntheticEvidenceMeta({
    context: params.context,
    confidenceBias: params.confidenceBias,
    interpretation: params.interpretation
  });

  return {
    id: params.id,
    problem: params.problem,
    title: params.title,
    category: params.category,
    severity: params.severity,
    priority: params.priority,
    evidence: params.evidence,
    impact: params.impact,
    cause: params.cause,
    actions: params.actions,
    focusMetric: params.focusMetric,
    winRateDelta: params.winRateDelta,
    evidenceStrength: meta.evidenceStrength,
    evidenceScore: meta.evidenceScore,
    interpretation: meta.interpretation,
    sampleSize: meta.sampleSize,
    sampleWarning: meta.sampleWarning
  };
}

function getChampionIdentityMisses(context: CoachContextBeforeKnowledge, knowledge: CoachKnowledgeContext) {
  const identity = knowledge.championIdentity;
  if (!identity) return [];

  const role = knowledge.roleIdentity;
  const misses: Array<{ metric: DiagnosisFocusMetric; weight: number; reason: string; gap: number }> = [];
  const locale = context.player.locale;
  const addMiss = (metric: DiagnosisFocusMetric, weight: number, gap: number, reason: { es: string; en: string }) => {
    if (weight <= 0 || gap <= 0) return;
    misses.push({ metric, weight, gap, reason: localize(locale, reason) });
  };

  addMiss('deaths_pre_14', identity.evaluationWeights.deaths_pre_14 ?? 0, context.performance.avgDeathsPre14 - role.stableDeathsPre14, {
    en: `${identity.championName} is still donating too many pre-14 deaths for the identity it wants to play from.`,
    es: `${identity.championName} sigue regalando demasiadas muertes pre-14 para la identidad desde la que quiere jugar.`
  });
  addMiss('cs_at_15', identity.evaluationWeights.cs_at_15 ?? 0, role.csAt15Target - context.performance.avgCsAt15, {
    en: `${identity.championName} is not reaching its expected early economy floor yet.`,
    es: `${identity.championName} todavia no llega a su piso esperado de economia temprana.`
  });
  addMiss('gold_diff_at_15', identity.evaluationWeights.gold_diff_at_15 ?? 0, role.goldDiffAt15Target - context.performance.avgGoldDiffAt15, {
    en: `${identity.championName} is entering minute 15 with less state than its identity wants.`,
    es: `${identity.championName} esta entrando al minuto 15 con menos estado del que su identidad quiere.`
  });
  addMiss('kill_participation', identity.evaluationWeights.kill_participation ?? 0, role.killParticipationTarget - context.performance.avgKillParticipation, {
    en: `${identity.championName} is not connecting to enough of the relevant plays for its role task.`,
    es: `${identity.championName} no se esta conectando a suficientes jugadas relevantes para la tarea de su rol.`
  });
  addMiss('lead_conversion', identity.evaluationWeights.lead_conversion ?? 0, Math.max(0, 50 - context.performance.winRate), {
    en: `${identity.championName} is not converting enough of its playable games into wins.`,
    es: `${identity.championName} no esta convirtiendo suficientes partidas jugables en victorias.`
  });
  addMiss('lane_volatility', identity.evaluationWeights.lane_volatility ?? 0, context.performance.avgLaneVolatilityScore - 1.15, {
    en: `${identity.championName} is entering too many lanes from a volatile state instead of a controlled one.`,
    es: `${identity.championName} esta entrando a demasiadas lineas desde un estado volatil en vez de uno controlado.`
  });
  addMiss('reset_timing', identity.evaluationWeights.reset_timing ?? 0, context.performance.avgResetTimingScore - 0.8, {
    en: `${identity.championName} is losing too much value around reset timing and item arrival.`,
    es: `${identity.championName} esta perdiendo demasiado valor alrededor del timing de reset y la llegada a items.`
  });
  addMiss('objective_setup_quality', identity.evaluationWeights.objective_setup_quality ?? 0, context.performance.avgObjectiveSetupScore - 0.7, {
    en: `${identity.championName} is arriving too unevenly to the windows where it should shape the map.`,
    es: `${identity.championName} esta llegando demasiado desparejo a las ventanas donde deberia moldear el mapa.`
  });

  return misses.sort((left, right) => (right.weight * right.gap) - (left.weight * left.gap));
}

function buildSyntheticProblems(context: CoachContextBeforeKnowledge, knowledge: CoachKnowledgeContext): CoachProblem[] {
  const locale = context.player.locale;
  const problems: CoachProblem[] = [];
  const topChampion = context.player.anchorChampion ?? (knowledge.championIdentity?.championName ?? null);

  if (
    context.player.visibleMatches >= 8 &&
    (
      context.performance.avgLaneVolatilityScore >= 1.45 ||
      context.performance.avgDeathClusterCountPre14 >= 0.35 ||
      (context.performance.avgFirstDeathMinute !== null && context.performance.avgFirstDeathMinute <= 8)
    )
  ) {
    problems.push(createSyntheticProblem({
      context,
      id: 'synthetic-lane-volatility',
      problem: localize(locale, {
        en: 'Your early game is breaking through volatility, not just through one isolated mistake.',
        es: 'Tu early se esta rompiendo por volatilidad, no solo por un error aislado.'
      }),
      title: localize(locale, {
        en: 'Lane volatility is still too high',
        es: 'La volatilidad de linea sigue demasiado alta'
      }),
      category: 'consistency',
      severity: context.performance.avgLaneVolatilityScore >= 2.15 ? 'high' : 'medium',
      priority: 'high',
      evidence: [
        `${measuredPrefix(locale)} ${localize(locale, {
          en: `First death is arriving around minute ${context.performance.avgFirstDeathMinute ?? 'n/a'} and the sample is still averaging ${context.performance.avgDeathClusterCountPre14.toFixed(2)} clustered follow-up deaths before 14.`,
          es: `La primera muerte esta llegando cerca del minuto ${context.performance.avgFirstDeathMinute ?? 'n/d'} y la muestra sigue promediando ${context.performance.avgDeathClusterCountPre14.toFixed(2)} muertes encadenadas antes del 14.`
        })}`,
        `${proxyPrefix(locale)} ${localize(locale, {
          en: `The volatility score is at ${context.performance.avgLaneVolatilityScore.toFixed(2)} and it is already dragging early gold state to ${context.performance.avgGoldDiffAt15}.`,
          es: `El score de volatilidad esta en ${context.performance.avgLaneVolatilityScore.toFixed(2)} y ya esta arrastrando el estado temprano a ${context.performance.avgGoldDiffAt15} de oro al 15.`
        })}`
      ],
      impact: localize(locale, {
        en: 'The real tax is not one bad death. It is how often the first unstable moment cascades into an unplayable lane or tempo state.',
        es: 'El impuesto real no es una muerte mala. Es cuantas veces el primer momento inestable se convierte en una linea o estado de tempo injugable.'
      }),
      cause: localize(locale, {
        en: 'This usually points to spacing, matchup respect, greed after the first mistake or trying to instantly recover state with another forced play.',
        es: 'Esto suele apuntar a spacing, respeto del matchup, codicia despues del primer error o intentar recuperar el estado con otra jugada forzada.'
      }),
      actions: [
        localize(locale, {
          en: 'Review the first avoidable death and the next 90 seconds together, not as separate mistakes.',
          es: 'Revisá la primera muerte evitable y los 90 segundos siguientes juntos, no como errores separados.'
        }),
        localize(locale, {
          en: 'Mark every game where the first loss of HP, flash or wave turned into a second forced death.',
          es: 'Marcá cada partida donde la primera perdida de vida, flash o wave se convirtió en una segunda muerte forzada.'
        })
      ],
      focusMetric: 'lane_volatility',
      confidenceBias: 58,
      interpretation: context.performance.avgLaneVolatilityScore >= 1.8 ? 'structural' : 'situational'
    }));
  }

  if (
    context.player.visibleMatches >= 8 &&
    (
      context.performance.avgResetTimingScore >= 0.95 ||
      (context.performance.avgFirstBaseMinute !== null && context.performance.avgFirstBaseMinute >= 7.4) ||
      context.performance.avgBasesPre14 <= 1.8
    )
  ) {
    problems.push(createSyntheticProblem({
      context,
      id: 'synthetic-reset-timing',
      problem: localize(locale, {
        en: 'Your reset timings are still arriving too late for the next playable window.',
        es: 'Tus resets siguen llegando demasiado tarde para la siguiente ventana jugable.'
      }),
      title: localize(locale, {
        en: 'Reset timing is costing too much tempo',
        es: 'El timing de reset esta costando demasiado tempo'
      }),
      category: 'early',
      severity: context.performance.avgResetTimingScore >= 1.45 ? 'high' : 'medium',
      priority: knowledge.roleIdentity.role === 'BOTTOM' || knowledge.roleIdentity.role === 'TOP' ? 'high' : 'medium',
      evidence: [
        `${measuredPrefix(locale)} ${localize(locale, {
          en: `First base is landing around ${context.performance.avgFirstBaseMinute ?? 'n/a'} minutes with only ${context.performance.avgBasesPre14.toFixed(2)} base windows before 14.`,
          es: `La primera base esta cayendo cerca de ${context.performance.avgFirstBaseMinute ?? 'n/d'} minutos con solo ${context.performance.avgBasesPre14.toFixed(2)} ventanas de base antes del 14.`
        })}`,
        `${proxyPrefix(locale)} ${localize(locale, {
          en: `The reset score is at ${context.performance.avgResetTimingScore.toFixed(2)} and first completed item is arriving around minute ${context.performance.avgFirstCompletedItemMinute ?? 'n/a'}.`,
          es: `El score de reset esta en ${context.performance.avgResetTimingScore.toFixed(2)} y el primer item completo llega cerca del minuto ${context.performance.avgFirstCompletedItemMinute ?? 'n/d'}.`
        })}`
      ],
      impact: localize(locale, {
        en: 'This leak hurts twice: you lose current tempo and also arrive late to the next map state with the wrong spend timing.',
        es: 'Esta fuga pega dos veces: perdés el tempo actual y ademas llegás tarde al siguiente estado de mapa con mal timing de gasto.'
      }),
      cause: localize(locale, {
        en: 'The sample suggests greed for one more wave, camp or hover before the base that actually mattered.',
        es: 'La muestra sugiere codicia por una wave, camp o hover mas antes de la base que realmente importaba.'
      }),
      actions: [
        localize(locale, {
          en: 'Review each delayed base against the next spawn, crash or fight instead of judging it only by gold left in pocket.',
          es: 'Revisá cada base tardía contra el siguiente spawn, crash o pelea en vez de juzgarla solo por el oro que quedó en bolsillo.'
        }),
        localize(locale, {
          en: 'Use first base and first completed item timing as block KPIs on your anchor pick.',
          es: 'Usá el timing de primera base y primer item completo como KPIs del bloque en tu pick ancla.'
        })
      ],
      focusMetric: 'reset_timing',
      confidenceBias: 54,
      interpretation: 'situational'
    }));
  }

  if (
    context.player.visibleMatches >= 8 &&
    (
      context.performance.avgObjectiveSetupScore >= 0.75 ||
      context.performance.avgObjectiveSetupDeaths >= 0.35
    )
  ) {
    problems.push(createSyntheticProblem({
      context,
      id: 'synthetic-objective-setup',
      problem: localize(locale, {
        en: 'Your objective windows are being lost in the setup minute, not only inside the fight.',
        es: 'Tus ventanas de objetivo se estan perdiendo en el minuto de setup, no solo dentro de la pelea.'
      }),
      title: localize(locale, {
        en: 'Objective setup quality is still weak',
        es: 'La calidad del setup de objetivo sigue floja'
      }),
      category: 'macro',
      severity: context.performance.avgObjectiveSetupScore >= 1.15 ? 'high' : 'medium',
      priority: knowledge.roleIdentity.role === 'JUNGLE' || knowledge.roleIdentity.role === 'UTILITY' ? 'high' : 'medium',
      evidence: [
        `${measuredPrefix(locale)} ${localize(locale, {
          en: `The sample is averaging ${context.performance.avgObjectiveSetupDeaths.toFixed(2)} deaths and ${context.performance.avgObjectiveSetupTakedowns.toFixed(2)} takedowns around setup windows.`,
          es: `La muestra promedia ${context.performance.avgObjectiveSetupDeaths.toFixed(2)} muertes y ${context.performance.avgObjectiveSetupTakedowns.toFixed(2)} takedowns alrededor de ventanas de setup.`
        })}`,
        `${proxyPrefix(locale)} ${localize(locale, {
          en: `The setup score sits at ${context.performance.avgObjectiveSetupScore.toFixed(2)} while objective-fight deaths remain at ${context.performance.avgObjectiveFightDeaths.toFixed(1)}.`,
          es: `El score de setup queda en ${context.performance.avgObjectiveSetupScore.toFixed(2)} mientras las muertes en pelea de objetivo siguen en ${context.performance.avgObjectiveFightDeaths.toFixed(1)}.`
        })}`
      ],
      impact: localize(locale, {
        en: 'The fight is often being judged after the cost was already paid in arrival order, reset state or map position.',
        es: 'Muchas veces la pelea se esta juzgando despues de que el costo ya fue pagado en orden de llegada, estado de reset o posicion de mapa.'
      }),
      cause: localize(locale, {
        en: 'This usually comes from weak arrival sequencing, one extra side action, or entering the setup without the resources the role needed.',
        es: 'Esto suele venir de mala secuencia de llegada, una accion lateral de mas o entrar al setup sin los recursos que el rol necesitaba.'
      }),
      actions: [
        localize(locale, {
          en: 'Review the 60 to 90 seconds before dragon, Herald or Baron before reviewing the fight itself.',
          es: 'Revisá los 60 a 90 segundos previos a dragon, Heraldo o Baron antes de revisar la pelea misma.'
        }),
        localize(locale, {
          en: 'Track whether your role reached the setup with priority, reset and vision responsibility already solved.',
          es: 'Seguí si tu rol llegó al setup con prioridad, reset y responsabilidad de visión ya resueltos.'
        })
      ],
      focusMetric: 'objective_setup_quality',
      confidenceBias: 56,
      interpretation: 'situational'
    }));
  }

  const championIdentityMisses = getChampionIdentityMisses(context, knowledge);
  if (knowledge.championIdentity && championIdentityMisses.length >= 2) {
    problems.push(createSyntheticProblem({
      context,
      id: 'synthetic-champion-identity',
      problem: localize(locale, {
        en: `${knowledge.championIdentity.championName} is being played too generically instead of through its real identity.`,
        es: `${knowledge.championIdentity.championName} se esta jugando demasiado generico en vez de a traves de su identidad real.`
      }),
      title: localize(locale, {
        en: 'Champion identity execution is off',
        es: 'La ejecucion de identidad de campeon esta desviada'
      }),
      category: 'macro',
      severity: championIdentityMisses.length >= 3 ? 'high' : 'medium',
      priority: 'medium',
      evidence: [
        `${proxyPrefix(locale)} ${championIdentityMisses.slice(0, 2).map((entry) => entry.reason).join(' ')}`,
        `${measuredPrefix(locale)} ${localize(locale, {
          en: `${knowledge.championIdentity.championName} is currently being judged through ${knowledge.championIdentity.performanceAxes.slice(0, 2).join(' / ')}.`,
          es: `${knowledge.championIdentity.championName} hoy se esta juzgando a traves de ${knowledge.championIdentity.performanceAxes.slice(0, 2).join(' / ')}.`
        })}`
      ],
      impact: localize(locale, {
        en: 'When the pick is played with the wrong KPI, the coaching loop starts fixing symptoms instead of the champion pattern that actually creates value.',
        es: 'Cuando el pick se juega con el KPI equivocado, el loop de coaching empieza a corregir sintomas en vez del patron del campeon que realmente crea valor.'
      }),
      cause: localize(locale, {
        en: 'The sample is not only underperforming. It is underperforming in the axes that matter most for this champion.',
        es: 'La muestra no solo rinde por debajo. Rinde por debajo justo en los ejes que mas importan para este campeon.'
      }),
      actions: [
        knowledge.championIdentity.priorityNotes[0] ?? localize(locale, {
          en: `Use ${knowledge.championIdentity.championName}'s best games as the reference lens before copying generic role advice.`,
          es: `Usá las mejores partidas de ${knowledge.championIdentity.championName} como lente de referencia antes de copiar consejo genérico del rol.`
        }),
        localize(locale, {
          en: 'Review whether your lane, reset and map choices matched the champion value pattern instead of just the scoreboard.',
          es: 'Revisá si tus decisiones de linea, reset y mapa coincidieron con el patron de valor del campeon en vez de solo con el scoreboard.'
        })
      ],
      focusMetric: 'champion_identity_execution',
      confidenceBias: 50,
      interpretation: 'situational'
    }));
  }

  if (context.loadout.sampleGames >= 6 && (context.loadout.buildStability ?? 1) <= 0.54) {
    problems.push(createSyntheticProblem({
      context,
      id: 'synthetic-itemization-read',
      problem: localize(locale, {
        en: `Your ${topChampion ?? 'anchor'} build path is still too unstable to know if the issue is execution or item read.`,
        es: `La ruta de build de ${topChampion ?? 'tu ancla'} sigue demasiado inestable como para saber si el problema es de ejecución o de lectura de items.`
      }),
      title: localize(locale, {
        en: 'Itemization read is still noisy',
        es: 'La lectura de itemizacion sigue ruidosa'
      }),
      category: 'consistency',
      severity: 'medium',
      priority: knowledge.skillBracket === 'low_elo' ? 'low' : 'medium',
      evidence: [
        `${measuredPrefix(locale)} ${localize(locale, {
          en: `The most repeated first completed item only shows up in ${Math.round((context.loadout.buildStability ?? 0) * 100)}% of ${context.loadout.sampleGames} anchor games.`,
          es: `El primer item completo mas repetido aparece solo en ${Math.round((context.loadout.buildStability ?? 0) * 100)}% de ${context.loadout.sampleGames} partidas del ancla.`
        })}`,
        `${missingPrefix(locale)} ${localize(locale, {
          en: knowledge.metaReference.status === 'ready'
            ? 'Patch references exist, but the system still needs richer branch matching before calling a build outright wrong.'
            : 'Patch build references are not fully loaded yet, so the system can flag drift but not claim patch-true correctness.',
          es: knowledge.metaReference.status === 'ready'
            ? 'Existen referencias de parche, pero el sistema todavía necesita mejor matching de ramas antes de llamar una build directamente incorrecta.'
            : 'Las referencias de build por parche todavía no están cargadas del todo, así que el sistema puede marcar drift pero no reclamar corrección real de parche.'
        })}`
      ],
      impact: localize(locale, {
        en: 'Loadout drift makes post-game review noisier because the champion keeps asking different combat profiles from one game to the next.',
        es: 'El drift de loadout vuelve mas ruidoso el review post-game porque el campeon sigue pidiendo perfiles de combate distintos de una partida a otra.'
      }),
      cause: localize(locale, {
        en: 'The system sees build fragmentation before it can prove a specific branch is wrong.',
        es: 'El sistema ve fragmentación de build antes de poder probar que una rama puntual esté mal.'
      }),
      actions: [
        localize(locale, {
          en: 'Lock one default first-item branch for the next block unless the draft gives you a strong reason to deviate.',
          es: 'Bloqueá una rama default de primer item para el próximo bloque salvo que el draft te dé una razón fuerte para desviarte.'
        })
      ],
      focusMetric: 'itemization_read',
      confidenceBias: 42,
      interpretation: 'observational'
    }));
  }

  if (context.loadout.sampleGames >= 6 && (context.loadout.runeStability ?? 1) <= 0.58) {
    problems.push(createSyntheticProblem({
      context,
      id: 'synthetic-rune-read',
      problem: localize(locale, {
        en: `Your rune page is still changing too much on ${topChampion ?? 'the anchor pick'} for the system to isolate one stable lesson.`,
        es: `La pagina de runas sigue cambiando demasiado en ${topChampion ?? 'el pick ancla'} como para que el sistema pueda aislar una lección estable.`
      }),
      title: localize(locale, {
        en: 'Rune setup is still too unstable',
        es: 'El setup de runas sigue demasiado inestable'
      }),
      category: 'consistency',
      severity: 'medium',
      priority: knowledge.skillBracket === 'low_elo' ? 'low' : 'medium',
      evidence: [
        `${measuredPrefix(locale)} ${localize(locale, {
          en: `The most repeated keystone only covers ${Math.round((context.loadout.runeStability ?? 0) * 100)}% of ${context.loadout.sampleGames} anchor games.`,
          es: `La keystone mas repetida cubre solo ${Math.round((context.loadout.runeStability ?? 0) * 100)}% de ${context.loadout.sampleGames} partidas del ancla.`
        })}`,
        `${proxyPrefix(locale)} ${localize(locale, {
          en: 'The issue may be matchup adaptation, but today the stronger signal is still page instability rather than a measured bad page.',
          es: 'El problema puede ser de adaptación al matchup, pero hoy la señal mas fuerte sigue siendo inestabilidad de pagina y no una pagina mala medida.'
        })}`
      ],
      impact: localize(locale, {
        en: 'Rune drift changes trade pattern, sustain and fight length assumptions before the game even starts.',
        es: 'El drift de runas cambia patrón de trade, sustain y supuestos de duración de pelea antes de que empiece la partida.'
      }),
      cause: localize(locale, {
        en: 'The pre-game plan is still moving too much from one queue to the next.',
        es: 'El plan de pre-game se sigue moviendo demasiado de una cola a la siguiente.'
      }),
      actions: [
        localize(locale, {
          en: 'Set one default rune page for the block and only deviate when you can name the matchup reason before queue pops.',
          es: 'Definí una pagina default de runas para el bloque y desvíate solo cuando puedas nombrar la razón del matchup antes de entrar.'
        })
      ],
      focusMetric: 'rune_setup_read',
      confidenceBias: 40,
      interpretation: 'observational'
    }));
  }

  return problems;
}

function normalizeFocusMetric(metric?: string | null): DiagnosisFocusMetric | null {
  switch (metric) {
    case 'deaths_pre_10':
    case 'deaths_pre_14':
    case 'cs_at_15':
    case 'gold_diff_at_15':
    case 'kill_participation':
    case 'objective_fight_deaths':
    case 'lane_volatility':
    case 'reset_timing':
    case 'objective_setup_quality':
    case 'champion_identity_execution':
    case 'itemization_read':
    case 'rune_setup_read':
    case 'lead_conversion':
    case 'champion_pool_stability':
    case 'matchup_review':
    case 'primary_pick':
      return metric;
    default:
      return null;
  }
}

function buildEvidenceAdjustment(params: {
  focusMetric: DiagnosisFocusMetric;
  context: CoachContextBeforeKnowledge;
  knowledge: CoachKnowledgeContext;
  locale: 'es' | 'en';
}) {
  const { focusMetric, context, knowledge, locale } = params;
  const reasons: string[] = [];
  let score = 0;

  switch (focusMetric) {
    case 'deaths_pre_10': {
      const overflow = context.performance.avgLaneDeathsPre10 - 0.8;
      if (overflow > 0) {
        score += Math.min(18, overflow * 16);
        reasons.push(locale === 'en'
          ? `The lane sample is already showing ${context.performance.avgLaneDeathsPre10} deaths before minute 10 on average.`
          : `La muestra ya muestra ${context.performance.avgLaneDeathsPre10} muertes antes del minuto 10 en promedio.`);
      }
      break;
    }
    case 'deaths_pre_14': {
      const overflow = context.performance.avgDeathsPre14 - knowledge.roleIdentity.stableDeathsPre14;
      if (overflow > 0) {
        score += Math.min(30, overflow * 12);
        reasons.push(locale === 'en'
          ? `The sample is averaging ${context.performance.avgDeathsPre14} deaths before minute 14 against a stable target of ${knowledge.roleIdentity.stableDeathsPre14}.`
          : `La muestra promedia ${context.performance.avgDeathsPre14} muertes antes del 14 contra una referencia estable de ${knowledge.roleIdentity.stableDeathsPre14}.`);
      }
      break;
    }
    case 'cs_at_15': {
      const deficit = knowledge.roleIdentity.csAt15Target - context.performance.avgCsAt15;
      if (deficit > 0) {
        score += Math.min(22, deficit * 0.7);
        reasons.push(locale === 'en'
          ? `The block is still ${deficit.toFixed(1)} CS short of the current role floor by minute 15.`
          : `El bloque sigue ${deficit.toFixed(1)} CS por debajo del piso actual del rol al minuto 15.`);
      }
      break;
    }
    case 'gold_diff_at_15': {
      if (context.performance.avgGoldDiffAt15 < 0) {
        score += Math.min(26, Math.abs(context.performance.avgGoldDiffAt15) / 35);
        reasons.push(locale === 'en'
          ? `By minute 15 you are conceding ${Math.abs(context.performance.avgGoldDiffAt15)} gold on average.`
          : `Al minuto 15 estas cediendo ${Math.abs(context.performance.avgGoldDiffAt15)} de oro en promedio.`);
      }
      if (context.performance.avgLevelDiffAt15 < 0) {
        score += Math.min(12, Math.abs(context.performance.avgLevelDiffAt15) * 8);
      }
      break;
    }
    case 'kill_participation': {
      const deficit = knowledge.roleIdentity.killParticipationTarget - context.performance.avgKillParticipation;
      if (deficit > 0) {
        score += Math.min(18, deficit * 0.8);
        reasons.push(locale === 'en'
          ? `The role-adjusted map participation target is ${knowledge.roleIdentity.killParticipationTarget}% KP and the sample is at ${context.performance.avgKillParticipation}%.`
          : `La referencia ajustada por rol es ${knowledge.roleIdentity.killParticipationTarget}% de KP y la muestra esta en ${context.performance.avgKillParticipation}%.`);
      }
      break;
    }
    case 'objective_fight_deaths': {
      if (context.performance.avgObjectiveFightDeaths > 0) {
        score += Math.min(20, context.performance.avgObjectiveFightDeaths * 20);
        reasons.push(locale === 'en'
          ? `Objective windows are leaking ${context.performance.avgObjectiveFightDeaths} death-events per game on average.`
          : `Las ventanas de objetivo estan perdiendo ${context.performance.avgObjectiveFightDeaths} muertes-evento por partida en promedio.`);
      }
      break;
    }
    case 'lane_volatility': {
      if (context.performance.avgLaneVolatilityScore > 0) {
        score += Math.min(28, context.performance.avgLaneVolatilityScore * 11);
        reasons.push(locale === 'en'
          ? `The lane-volatility score is already at ${context.performance.avgLaneVolatilityScore}, with clustered follow-up deaths still appearing before minute 14.`
          : `El score de volatilidad de linea ya esta en ${context.performance.avgLaneVolatilityScore}, con muertes encadenadas que siguen apareciendo antes del 14.`);
      }
      if (context.performance.avgFirstDeathMinute !== null && context.performance.avgFirstDeathMinute <= 8) {
        score += 8;
      }
      break;
    }
    case 'reset_timing': {
      if (context.performance.avgResetTimingScore > 0) {
        score += Math.min(24, context.performance.avgResetTimingScore * 14);
        reasons.push(locale === 'en'
          ? `Reset timing is already grading as ${context.performance.avgResetTimingScore}, with first base around minute ${context.performance.avgFirstBaseMinute ?? 'n/a'}.`
          : `El timing de reset ya da ${context.performance.avgResetTimingScore}, con primera base cerca del minuto ${context.performance.avgFirstBaseMinute ?? 'n/d'}.`);
      }
      break;
    }
    case 'objective_setup_quality': {
      if (context.performance.avgObjectiveSetupScore > 0) {
        score += Math.min(24, context.performance.avgObjectiveSetupScore * 16);
        reasons.push(locale === 'en'
          ? `The setup score is at ${context.performance.avgObjectiveSetupScore}, with deaths still outnumbering takedowns around objective setup windows.`
          : `El score de setup esta en ${context.performance.avgObjectiveSetupScore}, con muertes que siguen superando a los takedowns alrededor de ventanas de setup.`);
      }
      break;
    }
    case 'champion_identity_execution': {
      const misses = getChampionIdentityMisses(context, knowledge);
      if (misses.length) {
        score += Math.min(22, misses.slice(0, 2).reduce((total, miss) => total + (miss.weight * Math.max(miss.gap, 0) * 12), 0));
        reasons.push(locale === 'en'
          ? `The anchor champion is underperforming in identity-critical axes, not only in generic summary stats.`
          : `El campeon ancla esta rindiendo por debajo en ejes criticos de identidad, no solo en stats genericos del summary.`);
      }
      break;
    }
    case 'itemization_read': {
      const drift = 1 - (context.loadout.buildStability ?? 1);
      if (context.loadout.sampleGames >= 6 && drift > 0) {
        score += Math.min(16, drift * 28);
        reasons.push(locale === 'en'
          ? `The first completed item is still unstable across ${context.loadout.sampleGames} anchor games.`
          : `El primer item completo sigue inestable a lo largo de ${context.loadout.sampleGames} partidas del ancla.`);
      }
      break;
    }
    case 'rune_setup_read': {
      const drift = 1 - (context.loadout.runeStability ?? 1);
      if (context.loadout.sampleGames >= 6 && drift > 0) {
        score += Math.min(16, drift * 26);
        reasons.push(locale === 'en'
          ? `The keystone choice is still unstable across ${context.loadout.sampleGames} anchor games.`
          : `La elección de keystone sigue inestable a lo largo de ${context.loadout.sampleGames} partidas del ancla.`);
      }
      break;
    }
    case 'lead_conversion': {
      if (context.performance.avgGoldDiffAt15 >= Math.max(100, knowledge.roleIdentity.goldDiffAt15Target)) {
        score += 12;
        reasons.push(locale === 'en'
          ? 'The sample is generating enough early state to make conversion a real candidate issue.'
          : 'La muestra esta generando suficiente estado temprano como para que la conversion sea una candidata real.');
      }
      break;
    }
    case 'champion_pool_stability': {
      const topChampionGames = context.championPool[0]?.games ?? 0;
      const topChampionShare = topChampionGames / Math.max(context.player.visibleMatches, 1);
      const broadPool = context.championPool.filter((entry) => entry.games >= 3).length >= 4;
      if (broadPool && topChampionShare < 0.38) {
        score += 14;
        reasons.push(locale === 'en'
          ? 'The visible sample is still spread across too many picks to lock habits quickly.'
          : 'La muestra visible sigue demasiado repartida entre picks como para fijar habitos rapido.');
      }
      break;
    }
    case 'matchup_review': {
      if (context.problematicMatchup && context.problematicMatchup.recentWinRate <= 40) {
        score += 14;
        reasons.push(locale === 'en'
          ? `${context.problematicMatchup.opponentChampionName} is already a recurring punishment point in the sample.`
          : `${context.problematicMatchup.opponentChampionName} ya es un punto de castigo recurrente en la muestra.`);
      }
      break;
    }
    case 'primary_pick':
      break;
  }

  return { score, reasons };
}

function buildSuppressionAdjustment(params: {
  focusMetric: DiagnosisFocusMetric;
  context: CoachContextBeforeKnowledge;
  knowledge: CoachKnowledgeContext;
  locale: 'es' | 'en';
}) {
  const { focusMetric, context, knowledge, locale } = params;
  const reasons: string[] = [];
  let score = 0;
  let suppressed = false;

  const championIdentity = knowledge.championIdentity;

  if (
    focusMetric === 'cs_at_15' &&
    championIdentity?.economyProfile === 'low_econ' &&
    context.performance.avgGoldDiffAt15 >= -150
  ) {
    score -= 16;
    suppressed = true;
    const warning = championIdentity.misreadWarnings.find((entry) => entry.focusMetric === focusMetric)?.message;
    reasons.push(warning ?? (locale === 'en'
      ? `${championIdentity.championName} should not be judged like a pure income carry when the rest of the state is still playable.`
      : `${championIdentity.championName} no deberia evaluarse como un carry de pura renta si el resto del estado sigue jugable.`));
  }

  if (
    (focusMetric === 'itemization_read' || focusMetric === 'rune_setup_read') &&
    context.loadout.sampleGames < 6
  ) {
    score -= 14;
    suppressed = true;
    reasons.push(locale === 'en'
      ? 'Loadout reads stay weak until the anchor pick has enough repeated games.'
      : 'Las lecturas de loadout siguen flojas hasta que el pick ancla tenga suficientes partidas repetidas.');
  }

  if (
    focusMetric === 'champion_identity_execution' &&
    !championIdentity
  ) {
    score -= 16;
    suppressed = true;
    reasons.push(locale === 'en'
      ? 'Champion-identity execution cannot be treated as a strong read without a loaded identity file.'
      : 'La ejecucion de identidad de campeon no puede tomarse como lectura fuerte sin un archivo de identidad cargado.');
  }

  if (
    (focusMetric === 'itemization_read' || focusMetric === 'rune_setup_read') &&
    knowledge.skillBracket === 'low_elo' &&
    context.performance.avgDeathsPre14 > knowledge.roleIdentity.stableDeathsPre14 + 0.8
  ) {
    score -= 12;
    suppressed = true;
    reasons.push(locale === 'en'
      ? 'Pre-game and build reads matter, but the current block is still leaking more expensive early deaths first.'
      : 'La lectura de pre-game y build importa, pero el bloque actual primero esta perdiendo muertes tempranas mas caras.');
  }

  if (
    context.performance.avgDeathsPre14 > knowledge.roleIdentity.stableDeathsPre14 + 0.8 &&
    knowledge.eloProfile.deEmphasizeIfDeathsHigh.includes(focusMetric)
  ) {
    score -= 18;
    suppressed = true;
    reasons.push(locale === 'en'
      ? 'For this elo bracket, advanced map themes should be de-emphasized until the free early deaths are cleaned up.'
      : 'Para este elo conviene de-enfatizar temas avanzados de mapa hasta limpiar primero las muertes gratis del early.');
  }

  if (
    focusMetric === 'lead_conversion' &&
    context.performance.avgGoldDiffAt15 < Math.max(0, knowledge.roleIdentity.goldDiffAt15Target - 50)
  ) {
    score -= 12;
    suppressed = true;
    reasons.push(locale === 'en'
      ? 'Lead conversion is probably downstream here because the sample is not creating enough lead often enough.'
      : 'La conversion probablemente es un problema posterior porque la muestra no esta creando suficiente ventaja con la frecuencia necesaria.');
  }

  if (
    focusMetric === 'matchup_review' &&
    knowledge.skillBracket === 'low_elo' &&
    context.performance.avgDeathsPre14 > knowledge.roleIdentity.stableDeathsPre14 + 1
  ) {
    score -= 10;
    suppressed = true;
    reasons.push(locale === 'en'
      ? 'Matchup prep matters, but the current block is still leaking more fundamental errors first.'
      : 'El matchup importa, pero el bloque actual primero esta perdiendo errores mas fundacionales.');
  }

  return { score, reasons, suppressed };
}

function roundScore(value: number) {
  return Number(value.toFixed(1));
}

function evaluateProblem(params: {
  problem: CoachContextBeforeKnowledge['coaching']['topProblems'][number];
  index: number;
  context: CoachContextBeforeKnowledge;
  knowledge: CoachKnowledgeContext;
}): CoachDiagnosisIssueSummary & { suppressed: boolean } {
  const { problem, index, context, knowledge } = params;
  const locale = context.player.locale;
  const focusMetric = normalizeFocusMetric(problem.focusMetric);
  const reasons: string[] = [];
  let score = Math.max(18, 52 - index * 8);
  let suppressed = false;

  if (problem.priority === 'high') {
    score += 10;
    reasons.push(locale === 'en'
      ? 'The current signal engine already marked this as high priority.'
      : 'El motor actual ya marco este problema como alta prioridad.');
  } else if (problem.priority === 'medium') {
    score += 5;
  }

  if (typeof problem.winRateDelta === 'number') {
    score += Math.min(14, Math.abs(problem.winRateDelta) * 0.45);
  }

  if (problem.evidenceStrength === 'high') {
    score += 8;
    reasons.push(locale === 'en'
      ? 'The evidence layer already rates this pattern as strong.'
      : 'La capa de evidencia ya marca este patron como fuerte.');
  } else if (problem.evidenceStrength === 'low') {
    score -= 8;
    reasons.push(locale === 'en'
      ? 'The evidence layer still treats this as a tentative signal.'
      : 'La capa de evidencia todavia trata esto como una señal tentativa.');
  }

  if (problem.interpretation === 'observational') {
    score -= 6;
  } else if (problem.interpretation === 'structural') {
    score += 4;
  }

  if (focusMetric) {
    const roleWeight = knowledge.roleIdentity.evaluationWeights[focusMetric] ?? 0;
    const championWeight = knowledge.championIdentity?.evaluationWeights[focusMetric] ?? 0;
    const eloWeight = knowledge.eloProfile.evaluationWeights[focusMetric] ?? 0;
    const totalIdentityWeight = roleWeight + championWeight + eloWeight;

    if (totalIdentityWeight !== 0) {
      score += totalIdentityWeight * 20;
      if (totalIdentityWeight > 0.25) {
        reasons.push(locale === 'en'
          ? 'Role, champion and elo identity all increase the importance of this leak.'
          : 'La identidad de rol, campeon y elo aumenta el peso de esta fuga.');
      }
    }

    const evidenceAdjustment = buildEvidenceAdjustment({
      focusMetric,
      context,
      knowledge,
      locale
    });
    score += evidenceAdjustment.score;
    reasons.push(...evidenceAdjustment.reasons);

    const suppressionAdjustment = buildSuppressionAdjustment({
      focusMetric,
      context,
      knowledge,
      locale
    });
    score += suppressionAdjustment.score;
    suppressed = suppressionAdjustment.suppressed;
    reasons.push(...suppressionAdjustment.reasons);
  }

  return {
    problemId: problem.id,
    focusMetric,
    problem: problem.problem,
    score: roundScore(score),
    reasons: reasons.slice(0, 4),
    suppressed
  };
}

function buildDiagnosisSummary(params: {
  context: CoachContextBeforeKnowledge;
  knowledge: CoachKnowledgeContext;
}): CoachDiagnosisSummary {
  const { context, knowledge } = params;
  const ranked = context.coaching.topProblems
    .map((problem, index) => evaluateProblem({ problem, index, context, knowledge }))
    .sort((left, right) => right.score - left.score);

  const dataGaps = [
    ...(knowledge.championIdentity?.blockedHeuristics.map((entry) => entry.note) ?? []),
    ...(knowledge.metaReference.status !== 'ready'
      ? [context.player.locale === 'en'
        ? 'The meta layer can already store tier/build references, but this patch still has no curated feed loaded.'
        : 'La capa de meta ya puede guardar referencias de tier/build, pero este parche todavia no tiene un feed curado cargado.']
      : [])
  ].slice(0, 4);

  const primaryIssue = ranked[0] ?? null;
  const secondScore = ranked[1]?.score ?? (primaryIssue ? primaryIssue.score - 8 : 0);
  const scoreGap = primaryIssue ? primaryIssue.score - secondScore : 0;
  const confidence = primaryIssue
    ? Number(Math.max(0.38, Math.min(0.93, 0.56 + (scoreGap / 40) - (dataGaps.length * 0.03))).toFixed(2))
    : 0.35;

  return {
    primaryIssue: primaryIssue ? {
      problemId: primaryIssue.problemId,
      focusMetric: primaryIssue.focusMetric,
      problem: primaryIssue.problem,
      score: primaryIssue.score,
      reasons: primaryIssue.reasons
    } : null,
    rankedIssues: ranked.map((entry) => ({
      problemId: entry.problemId,
      focusMetric: entry.focusMetric,
      problem: entry.problem,
      score: entry.score,
      reasons: entry.reasons
    })),
    suppressedIssues: ranked
      .filter((entry) => entry.suppressed)
      .map((entry) => ({
        problemId: entry.problemId,
        focusMetric: entry.focusMetric,
        problem: entry.problem,
        score: entry.score,
        reasons: entry.reasons
      })),
    confidence,
    reasonChain: primaryIssue?.reasons.slice(0, 3) ?? [],
    dataGaps
  };
}

export async function enrichCoachContextWithKnowledge(context: CoachContextBeforeKnowledge): Promise<CoachContextWithKnowledge> {
  const catalog = await loadKnowledgeCatalog();
  const locale = context.player.locale;
  const skillBracket = deriveSkillBracket(context.player.highestTier);
  const roleKey = normalizeRoleKey(context.player.primaryRole ?? context.player.roleFilter);
  const roleIdentity = buildRoleIdentityContext(catalog.roleIdentities.get(roleKey), roleKey, locale);
  const championIdentity = buildChampionIdentityContext({
    locale,
    skillBracket,
    championIdentity: catalog.championIdentities.get(normalizeChampionKey(context.player.anchorChampion))
  });
  const eloProfile = buildEloProfileContext(catalog.eloProfiles.get(skillBracket), skillBracket, locale);
  const metaReference = buildMetaReferenceContext({
    context,
    locale,
    metaReference: catalog.metaPatchReferences.get(context.patchContext.currentPatch)
  });

  const knowledge: CoachKnowledgeContext = {
    knowledgeVersion: KNOWLEDGE_VERSION,
    availableSignals: AVAILABLE_SIGNALS,
    skillBracket,
    roleIdentity,
    championIdentity,
    eloProfile,
    metaReference
  };

  const syntheticProblems = buildSyntheticProblems(context, knowledge);
  const diagnosticContext: CoachContextBeforeKnowledge = {
    ...context,
    coaching: {
      ...context.coaching,
      topProblems: [...context.coaching.topProblems, ...syntheticProblems]
    }
  };

  const diagnosis = buildDiagnosisSummary({ context: diagnosticContext, knowledge });
  const scoreByProblemId = new Map(diagnosis.rankedIssues.map((entry) => [entry.problemId, entry.score]));
  const reorderedTopProblems = [...diagnosticContext.coaching.topProblems].sort((left, right) =>
    (scoreByProblemId.get(right.id) ?? 0) - (scoreByProblemId.get(left.id) ?? 0)
  );

  return {
    ...context,
    coaching: {
      ...context.coaching,
      headline: reorderedTopProblems[0]?.problem ?? context.coaching.headline,
      topProblems: reorderedTopProblems
    },
    knowledge,
    diagnosis
  };
}

export async function getCoachKnowledgeAuditSnapshot() {
  const catalog = await loadKnowledgeCatalog();
  const championIdentities = Array.from(catalog.championIdentities.values());
  const roleCoverage = new Map<string, number>();
  let activeHeuristics = 0;
  let blockedHeuristics = 0;

  for (const identity of championIdentities) {
    for (const role of identity.roles) {
      roleCoverage.set(role, (roleCoverage.get(role) ?? 0) + 1);
    }

    activeHeuristics += identity.heuristics.filter((entry) => entry.status === 'active').length;
    blockedHeuristics += identity.heuristics.filter((entry) => entry.status === 'blocked_by_missing_data').length;
  }

  return {
    knowledgeVersion: KNOWLEDGE_VERSION,
    roleIdentities: catalog.roleIdentities.size,
    eloProfiles: catalog.eloProfiles.size,
    championIdentities: championIdentities.length,
    metaPatchReferences: catalog.metaPatchReferences.size,
    activeHeuristics,
    blockedHeuristics,
    roleCoverage: Array.from(roleCoverage.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([role, count]) => ({ role, count }))
  };
}
