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

type CoachContextBeforeKnowledge = Omit<AICoachContext, 'knowledge' | 'diagnosis'>;

const identitiesDir = fileURLToPath(new URL('../../data/coach-kb/identities', import.meta.url));
const championIdentitiesDir = fileURLToPath(new URL('../../data/coach-kb/identities/champions', import.meta.url));
const metaPatchReferencesDir = fileURLToPath(new URL('../../data/coach-kb/meta/patches', import.meta.url));
const KNOWLEDGE_VERSION = '2026-04-knowledge-v1';
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

function normalizeFocusMetric(metric?: string | null): DiagnosisFocusMetric | null {
  switch (metric) {
    case 'deaths_pre_10':
    case 'deaths_pre_14':
    case 'cs_at_15':
    case 'gold_diff_at_15':
    case 'kill_participation':
    case 'objective_fight_deaths':
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

export async function enrichCoachContextWithKnowledge(context: CoachContextBeforeKnowledge): Promise<AICoachContext> {
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

  const diagnosis = buildDiagnosisSummary({ context, knowledge });
  const scoreByProblemId = new Map(diagnosis.rankedIssues.map((entry) => [entry.problemId, entry.score]));
  const reorderedTopProblems = [...context.coaching.topProblems].sort((left, right) =>
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
