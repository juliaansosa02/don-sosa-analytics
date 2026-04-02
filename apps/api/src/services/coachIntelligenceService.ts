import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { AICoachContext } from './aiCoachSchemas.js';
import type { CoachContextWithKnowledge } from './coachKnowledgeService.js';
import {
  type CoachReferenceFrame,
  problemTaxonomyEntrySchema,
  referenceRegistryEntrySchema,
  type CoachIntelligenceSummary,
  type CoachInterventionItem,
  type CoachProblemMapping,
  type CoachProblemTypeHit,
  type CoachReviewLayerPlan,
  type CoachSignalStabilityEntry,
  type IntelligenceDetectionMode,
  type IntelligenceLanguageMode,
  type IntelligenceReviewDepth,
  type IntelligenceSignalState,
  type ProblemTaxonomyEntry,
  type ReferenceRegistryEntry
} from './coachIntelligenceSchemas.js';

const intelligenceDir = fileURLToPath(new URL('../../data/coach-kb/intelligence', import.meta.url));
const INTELLIGENCE_VERSION = '2026-04-coach-intelligence-v1';
const RUNTIME_SIGNALS = new Set(['match_summary', 'timeline_gold_xp', 'objective_windows', 'rank_context']);

type LoadedIntelligenceConfig = {
  taxonomy: ProblemTaxonomyEntry[];
  references: ReferenceRegistryEntry[];
};

let configPromise: Promise<LoadedIntelligenceConfig> | null = null;

function localize(locale: 'es' | 'en', value: { es: string; en: string }) {
  return value[locale];
}

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

function clamp(value: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function normalizeRole(value?: string | null) {
  return (value ?? 'ALL').trim().toUpperCase() || 'ALL';
}

async function loadIntelligenceConfig(): Promise<LoadedIntelligenceConfig> {
  if (!configPromise) {
    configPromise = (async () => {
      const [taxonomyRaw, referencesRaw] = await Promise.all([
        readFile(`${intelligenceDir}/problem-taxonomy.json`, 'utf8'),
        readFile(`${intelligenceDir}/reference-registry.json`, 'utf8')
      ]);

      return {
        taxonomy: problemTaxonomyEntrySchema.array().parse(JSON.parse(taxonomyRaw)),
        references: referenceRegistryEntrySchema.array().parse(JSON.parse(referencesRaw))
      };
    })();
  }

  return configPromise;
}

function getMetricLabel(metric: string, locale: 'es' | 'en') {
  const labels: Record<string, { es: string; en: string }> = {
    deaths_pre_10: { es: 'muertes pre 10', en: 'deaths pre 10' },
    deaths_pre_14: { es: 'muertes pre 14', en: 'deaths pre 14' },
    cs_at_15: { es: 'CS al 15', en: 'CS at 15' },
    gold_diff_at_15: { es: 'diff. de oro al 15', en: 'gold diff at 15' },
    kill_participation: { es: 'participacion en kills', en: 'kill participation' },
    objective_fight_deaths: { es: 'muertes en peleas de objetivo', en: 'objective fight deaths' },
    lead_conversion: { es: 'conversion de ventaja', en: 'lead conversion' },
    champion_pool_stability: { es: 'estabilidad de champion pool', en: 'champion pool stability' },
    matchup_review: { es: 'review de matchup', en: 'matchup review' },
    primary_pick: { es: 'pick principal', en: 'primary pick' }
  };

  return localize(locale, labels[metric] ?? { es: metric, en: metric });
}

function buildLanguagePlan(context: CoachContextWithKnowledge): CoachIntelligenceSummary['languagePlan'] {
  const locale = context.player.locale;
  const deathsOverflow = context.performance.avgDeathsPre14 - context.knowledge.roleIdentity.stableDeathsPre14;
  const eliteProfile = context.player.profileStrength === 'elite' || context.knowledge.skillBracket === 'apex';
  const advancedProfile = context.player.profileStrength === 'advanced' || context.knowledge.skillBracket === 'high_elo';
  type LanguagePlanBase = Omit<CoachIntelligenceSummary['languagePlan'], 'mode'>;

  let mode: IntelligenceLanguageMode = 'fundamental';
  if (eliteProfile) mode = 'optimization';
  else if (advancedProfile) mode = 'direct';
  else if (context.knowledge.skillBracket === 'mid_elo') mode = 'scaffolded';

  if (deathsOverflow > 0.9 && mode !== 'optimization') {
    mode = mode === 'direct' ? 'scaffolded' : 'fundamental';
  }

  const planByMode = {
    fundamental: {
      explanationStyle: localize(locale, {
        es: 'Hablar concreto, corto y accionable. Priorizar el primer error evitable antes que macro abstracta.',
        en: 'Speak concretely, briefly and actionably. Prioritize the first avoidable error before abstract macro.'
      }),
      priorityRule: localize(locale, {
        es: 'Resolver primero la fuga mas barata de corregir que mas estabiliza la muestra.',
        en: 'Fix first the cheapest leak that stabilizes the sample the most.'
      }),
      avoid: locale === 'en'
        ? ['abstract macro jargon', 'elite optimization framing']
        : ['jerga macro abstracta', 'marco de optimizacion elite']
    },
    scaffolded: {
      explanationStyle: localize(locale, {
        es: 'Conectar ejecucion con mapa, pero siempre bajando la idea a un trigger visible en replay.',
        en: 'Connect execution with map structure, but always anchor the idea to a visible replay trigger.'
      }),
      priorityRule: localize(locale, {
        es: 'Desbloquear una capa de mapa solo si la base actual ya es jugable.',
        en: 'Unlock one extra map layer only if the current base is already playable.'
      }),
      avoid: locale === 'en'
        ? ['generic farm advice']
        : ['consejo generico de farm']
    },
    direct: {
      explanationStyle: localize(locale, {
        es: 'Hablar como analista competitivo: leak, trigger, costo y ajuste.',
        en: 'Speak like a competitive analyst: leak, trigger, cost and adjustment.'
      }),
      priorityRule: localize(locale, {
        es: 'Priorizar la decision que mas cambia conversion, setup o disciplina del rol.',
        en: 'Prioritize the decision that most changes conversion, setup or role discipline.'
      }),
      avoid: locale === 'en'
        ? ['beginner boilerplate']
        : ['boilerplate de principiante']
    },
    optimization: {
      explanationStyle: localize(locale, {
        es: 'Enmarcar el problema como edge marginal, repetibilidad y precision bajo presion.',
        en: 'Frame the problem as marginal edge, repeatability and precision under pressure.'
      }),
      priorityRule: localize(locale, {
        es: 'Mover primero el detalle que mas cambia porcentaje de conversion o castigo.',
        en: 'Move first the detail that most changes conversion or punish percentage.'
      }),
      avoid: locale === 'en'
        ? ['low-elo simplifications']
        : ['simplificaciones de low elo']
    }
  } satisfies Record<IntelligenceLanguageMode, LanguagePlanBase>;

  return {
    mode,
    ...planByMode[mode]
  };
}

function getMetricSignalValue(metric: string, context: CoachContextWithKnowledge) {
  const trend = context.coaching.trend;

  switch (metric) {
    case 'deaths_pre_14':
      return {
        baseline: trend.baselineDeathsPre14,
        recent: trend.recentDeathsPre14,
        delta: trend.deathsPre14Delta,
        higherIsBetter: false,
        target: context.knowledge.roleIdentity.stableDeathsPre14
      };
    case 'cs_at_15':
      return {
        baseline: trend.baselineCsAt15,
        recent: trend.recentCsAt15,
        delta: trend.csAt15Delta,
        higherIsBetter: true,
        target: context.knowledge.roleIdentity.csAt15Target
      };
    case 'gold_diff_at_15':
      return {
        baseline: context.coaching.trend.baselineGoldAt15,
        recent: context.coaching.trend.recentGoldAt15,
        delta: context.coaching.trend.goldAt15Delta,
        higherIsBetter: true,
        target: context.knowledge.roleIdentity.goldDiffAt15Target
      };
    case 'kill_participation':
      return {
        baseline: trend.baselineKillParticipation,
        recent: trend.recentKillParticipation,
        delta: trend.killParticipationDelta,
        higherIsBetter: true,
        target: context.knowledge.roleIdentity.killParticipationTarget
      };
    case 'lead_conversion':
      return {
        baseline: trend.baselineWinRate,
        recent: trend.recentWinRate,
        delta: trend.winRateDelta,
        higherIsBetter: true,
        target: null
      };
    default:
      return null;
  }
}

function classifyMetricSignal(params: {
  metric: string;
  context: CoachContextWithKnowledge;
  evidenceStrength?: 'high' | 'medium' | 'low';
}): CoachSignalStabilityEntry | null {
  const { metric, context, evidenceStrength = 'medium' } = params;
  const locale = context.player.locale;
  const values = getMetricSignalValue(metric, context);
  if (!values) return null;

  const recentValue = typeof values.recent === 'number' ? values.recent : null;
  const baselineValue = typeof values.baseline === 'number' ? values.baseline : null;
  const delta = typeof values.delta === 'number' ? values.delta : null;
  const baselineMatches = context.coaching.trend.baselineMatches;
  const recentMatches = context.coaching.trend.recentMatches;
  const smallSample = baselineMatches < 4 || recentMatches < 3 || context.player.visibleMatches < 8;

  let state: IntelligenceSignalState = 'stable_signal';

  const threshold = metric === 'gold_diff_at_15'
    ? 220
    : metric === 'kill_participation'
      ? 6
      : metric === 'lead_conversion'
        ? 7
        : 0.55;

  const anomalyThreshold = metric === 'gold_diff_at_15'
    ? 420
    : metric === 'kill_participation'
      ? 10
      : metric === 'lead_conversion'
        ? 11
        : 0.95;

  const worsening = typeof delta === 'number'
    ? (values.higherIsBetter ? delta < -threshold : delta > threshold)
    : false;
  const improving = typeof delta === 'number'
    ? (values.higherIsBetter ? delta > threshold : delta < -threshold)
    : false;

  const belowTarget = recentValue !== null && values.target !== null
    ? (values.higherIsBetter ? recentValue < values.target : recentValue > values.target)
    : false;
  const baselineBelowTarget = baselineValue !== null && values.target !== null
    ? (values.higherIsBetter ? baselineValue < values.target : baselineValue > values.target)
    : false;

  if (smallSample) {
    state = 'volatile';
  } else if (belowTarget && baselineBelowTarget && evidenceStrength === 'high' && !improving) {
    state = 'stable_leak';
  } else if (worsening && delta !== null && Math.abs(delta) >= anomalyThreshold && evidenceStrength !== 'high') {
    state = 'recent_anomaly';
  } else if (worsening) {
    state = 'emerging_regression';
  } else if (improving) {
    state = 'improving';
  }

  const summaryMap: Record<IntelligenceSignalState, { es: string; en: string }> = {
    stable_signal: {
      es: `La señal de ${getMetricLabel(metric, locale)} viene estable entre baseline y bloque reciente.`,
      en: `The ${getMetricLabel(metric, locale)} signal is stable across baseline and recent block.`
    },
    stable_leak: {
      es: `La fuga de ${getMetricLabel(metric, locale)} aparece tanto en baseline como en el bloque reciente.`,
      en: `The ${getMetricLabel(metric, locale)} leak appears in both baseline and recent block.`
    },
    emerging_regression: {
      es: `El bloque reciente empeoro en ${getMetricLabel(metric, locale)} y pide seguimiento.`,
      en: `The recent block worsened in ${getMetricLabel(metric, locale)} and needs follow-up.`
    },
    recent_anomaly: {
      es: `El bloque reciente muestra un desvio fuerte en ${getMetricLabel(metric, locale)} que todavia puede ser anomalia.`,
      en: `The recent block shows a sharp deviation in ${getMetricLabel(metric, locale)} that may still be an anomaly.`
    },
    improving: {
      es: `El bloque reciente esta mejorando en ${getMetricLabel(metric, locale)} frente al baseline.`,
      en: `The recent block is improving in ${getMetricLabel(metric, locale)} versus baseline.`
    },
    volatile: {
      es: `La muestra todavia es chica o volatil para cerrar una lectura fuerte de ${getMetricLabel(metric, locale)}.`,
      en: `The sample is still too small or volatile to close a strong read on ${getMetricLabel(metric, locale)}.`
    }
  };

  return {
    metric,
    label: getMetricLabel(metric, locale),
    state,
    baselineValue,
    recentValue,
    delta,
    summary: localize(locale, summaryMap[state])
  };
}

function getFocusBoost(entry: ProblemTaxonomyEntry, context: CoachContextWithKnowledge, problem: CoachContextWithKnowledge['coaching']['topProblems'][number]) {
  const role = normalizeRole(context.player.primaryRole ?? context.player.roleFilter);
  const archetypes = context.knowledge.championIdentity?.archetypes ?? [];
  const skillBracket = context.knowledge.skillBracket;
  let score = 0;
  const reasons: string[] = [];

  if (problem.focusMetric && entry.focusMetrics.includes(problem.focusMetric as never)) {
    score += 0.58;
    reasons.push(localize(context.player.locale, {
      es: `La taxonomia coincide con el foco actual ${getMetricLabel(problem.focusMetric, context.player.locale)}.`,
      en: `The taxonomy matches the current focus ${getMetricLabel(problem.focusMetric, context.player.locale)}.`
    }));
  }

  if (entry.roleBias.includes(role as never) || entry.roleBias.includes('ALL')) {
    score += 0.12;
  }

  if (entry.skillBrackets.includes('all') || entry.skillBrackets.includes(skillBracket)) {
    score += 0.06;
  }

  if (entry.championArchetypes.some((tag) => archetypes.includes(tag))) {
    score += 0.12;
    reasons.push(localize(context.player.locale, {
      es: 'La identidad del campeon hace esta lectura mas relevante.',
      en: 'Champion identity makes this read more relevant.'
    }));
  }

  if (problem.priority === 'high') score += 0.06;
  if (problem.evidenceStrength === 'high') score += 0.05;

  if (entry.id === 'champion_identity_execution' && context.knowledge.championIdentity) {
    score += 0.08;
  }

  if (entry.id === 'side_lane_macro' && (role === 'TOP' || role === 'MIDDLE')) {
    score += 0.08;
  }

  if (entry.id === 'objective_setup' && context.performance.avgObjectiveFightDeaths > 0.4) {
    score += 0.08;
  }

  if (entry.id === 'resource_discipline' && context.performance.avgDeathsPre14 > context.knowledge.roleIdentity.stableDeathsPre14) {
    score += 0.08;
  }

  return {
    score: clamp(score, 0, 0.98),
    reasons
  };
}

function buildProblemTypeHit(params: {
  entry: ProblemTaxonomyEntry;
  problem: CoachContextWithKnowledge['coaching']['topProblems'][number];
  context: CoachContextWithKnowledge;
}): CoachProblemTypeHit | null {
  const { entry, problem, context } = params;
  const locale = context.player.locale;
  const { score, reasons } = getFocusBoost(entry, context, problem);
  if (score < 0.24) return null;

  const missingSignals = entry.requiredSignals.filter((signal) => !RUNTIME_SIGNALS.has(signal));
  const detectionMode: IntelligenceDetectionMode = missingSignals.length
    ? 'blocked'
    : entry.requiredSignals.length <= 2
      ? 'measured'
      : 'proxy';

  if (detectionMode === 'blocked' && score < 0.38) return null;

  const detectionReason = detectionMode === 'blocked'
    ? localize(locale, {
      es: 'La taxonomia es relevante, pero hoy falta telemetria para detectarla de forma directa.',
      en: 'The taxonomy is relevant, but direct detection is blocked by missing telemetry today.'
    })
    : detectionMode === 'proxy'
      ? localize(locale, {
        es: 'La lectura usa proxies del summary actual; no es una deteccion directa.',
        en: 'The read uses current summary proxies; it is not a direct detection.'
      })
      : localize(locale, {
        es: 'La lectura se puede sostener con las señales que hoy ya existen en el producto.',
        en: 'The read can be supported by signals already present in the product today.'
      });

  return {
    taxonomyId: entry.id,
    label: localize(locale, entry.label),
    summary: localize(locale, entry.summary),
    confidence: round(score, 2),
    priorityBand: entry.priorityBand,
    detectionMode,
    reasons: unique([detectionReason, ...reasons]).slice(0, 3),
    missingSignals
  };
}

function buildProblemMappings(context: CoachContextWithKnowledge, taxonomy: ProblemTaxonomyEntry[]): CoachProblemMapping[] {
  return context.coaching.topProblems.map((problem) => {
    const hits = taxonomy
      .map((entry) => buildProblemTypeHit({ entry, problem, context }))
      .filter((entry): entry is CoachProblemTypeHit => Boolean(entry))
      .sort((left, right) => right.confidence - left.confidence);

    return {
      problemId: problem.id,
      focusMetric: problem.focusMetric ?? null,
      detectedTypes: hits.filter((entry) => entry.detectionMode !== 'blocked' && entry.confidence >= 0.52).slice(0, 3),
      candidateTypes: hits.filter((entry) => entry.detectionMode === 'proxy' && entry.confidence >= 0.34).slice(0, 3),
      blockedTypes: hits.filter((entry) => entry.detectionMode === 'blocked').slice(0, 3)
    };
  });
}

function buildInterventionItem(params: {
  context: CoachContextWithKnowledge;
  mapping: CoachProblemMapping | undefined;
  issue: Pick<CoachInterventionItem, 'problemId' | 'focusMetric'> & { title: string; baseScore: number; reasons: string[] };
  languageMode: IntelligenceLanguageMode;
  stability: IntelligenceSignalState;
}): CoachInterventionItem {
  const { context, mapping, issue, languageMode, stability } = params;
  const taxonomyIds = unique([
    ...(mapping?.detectedTypes.map((entry) => entry.taxonomyId) ?? []),
    ...(mapping?.candidateTypes.map((entry) => entry.taxonomyId) ?? [])
  ]);

  let score = issue.baseScore;
  if (stability === 'stable_leak') score += 10;
  if (stability === 'emerging_regression') score += 4;
  if (stability === 'recent_anomaly') score -= 6;
  if ((mapping?.blockedTypes.length ?? 0) > (mapping?.detectedTypes.length ?? 0)) score -= 5;
  if (mapping?.detectedTypes.some((entry) => entry.priorityBand === 'foundational') && languageMode !== 'optimization') score += 6;

  const recommendedDepth: IntelligenceReviewDepth = stability === 'recent_anomaly'
    ? 'quick_review'
    : (mapping?.blockedTypes.length ?? 0) > 0
      ? 'deep_vod_review'
      : score >= 68
        ? 'coach_review'
        : 'quick_review';

  const urgency: CoachInterventionItem['urgency'] = score >= 74
    ? 'play_now'
    : score >= 60
      ? 'next_block'
      : score >= 44
        ? 'later'
        : 'watch';

  const reasons = unique([
    ...issue.reasons,
    ...(mapping?.detectedTypes.flatMap((entry) => entry.reasons) ?? []),
    ...(mapping?.blockedTypes.length
      ? [localize(context.player.locale, {
        es: 'Parte de la lectura profunda sigue bloqueada por señales faltantes.',
        en: 'Part of the deeper read is still blocked by missing signals.'
      })]
      : [])
  ]).slice(0, 4);

  return {
    problemId: issue.problemId,
    focusMetric: issue.focusMetric,
    title: issue.title,
    urgency,
    recommendedDepth,
    languageMode,
    score: round(score, 1),
    taxonomyIds,
    stability,
    reasons
  };
}

function buildReviewLayer(params: {
  layer: IntelligenceReviewDepth;
  locale: 'es' | 'en';
  objective: string;
  prompts: string[];
  anchors: string[];
}): CoachReviewLayerPlan {
  return {
    layer: params.layer,
    objective: params.objective,
    prompts: unique(params.prompts).slice(0, 4),
    anchors: unique(params.anchors).slice(0, 4)
  };
}

function buildReferenceFrames(context: CoachContextWithKnowledge, registry: ReferenceRegistryEntry[]) {
  const locale = context.player.locale;
  const sampleSize = context.player.visibleMatches;

  const baseFrames = registry.map((entry) => {
    let status: 'active' | 'weak' | 'scaffold_only' | 'missing' = 'active';
    let version = entry.version;
    let justification = localize(locale, entry.note);

    if (entry.scope === 'sample') {
      version = `${entry.version}:${context.sample.sampleSignature.slice(0, 12)}`;
      status = sampleSize >= 14 ? 'active' : sampleSize >= 8 ? 'weak' : 'missing';
      justification = localize(locale, {
        es: `La lectura actual usa ${sampleSize} partidas visibles en este bloque.`,
        en: `The current read uses ${sampleSize} visible matches in this block.`
      });
    }

    if (entry.scope === 'champion') {
      const championName = context.knowledge.championIdentity?.championName;
      version = championName ? `${entry.version}:${championName.toLowerCase()}` : `${entry.version}:fallback`;
      status = championName ? 'active' : 'missing';
      justification = championName
        ? localize(locale, {
          es: `Hay identidad cargada para ${championName}.`,
          en: `A loaded identity exists for ${championName}.`
        })
        : localize(locale, {
          es: 'No hay identidad especifica para el campeon ancla actual; el sistema cae a defaults.',
          en: 'No champion-specific identity exists for the current anchor pick, so the system falls back to defaults.'
        });
    }

    if (entry.scope === 'role') {
      version = `${entry.version}:${normalizeRole(context.knowledge.roleIdentity.role).toLowerCase()}`;
    }

    if (entry.scope === 'elo') {
      version = `${entry.version}:${context.knowledge.skillBracket}`;
    }

    if (entry.scope === 'patch') {
      version = `${entry.version}:${context.patchContext.currentPatch}`;
      status = context.knowledge.metaReference.status === 'ready'
        ? 'active'
        : context.knowledge.metaReference.status === 'scaffold_only'
          ? 'scaffold_only'
          : 'missing';
      justification = context.knowledge.metaReference.summary;
    }

    return {
      id: entry.id,
      scope: entry.scope,
      label: localize(locale, entry.label),
      version,
      source: entry.source,
      status,
      justification,
      nextUpgrade: localize(locale, entry.upgradePath)
    };
  });

  const metricFrames: CoachReferenceFrame[] = context.referenceAudit.map((entry) => {
    const status: CoachReferenceFrame['status'] = entry.status === 'active'
      ? 'active'
      : entry.status === 'weak'
        ? 'weak'
        : entry.status === 'replace'
          ? 'scaffold_only'
          : 'missing';

    return {
      id: entry.id,
      scope: 'sample',
      label: entry.label,
      version: `metric-audit:${entry.metric}`,
      source: `packages/core:${entry.source}`,
      status,
      justification: entry.note,
      nextUpgrade: entry.replacement
    };
  });

  return [...baseFrames, ...metricFrames];
}

function buildMetaReadiness(context: CoachContextWithKnowledge): CoachIntelligenceSummary['metaReadiness'] {
  const locale = context.player.locale;
  const availableSignals = Array.from(RUNTIME_SIGNALS.values());
  const missingSignals = ['items_runes', 'spell_casts', 'ability_usage', 'position_frames', 'ward_events'];
  const futureSources = locale === 'en'
    ? [
      'Riot patch notes normalized by patch and role',
      'Champion tier/build/rune feeds by patch and lane',
      'Item and rune telemetry from match payload',
      'Spell cast, position frame and ward event telemetry for VOD-grade reads'
    ]
    : [
      'Patch notes de Riot normalizadas por parche y rol',
      'Feeds de tier/build/runas por parche y línea',
      'Telemetría de items y runas desde el payload de match',
      'Telemetría de spell cast, position frames y ward events para lecturas de nivel VOD'
    ];

  return {
    status: context.knowledge.metaReference.status === 'ready'
      ? 'ready'
      : context.knowledge.metaReference.status === 'scaffold_only'
        ? 'partial'
        : 'missing',
    availableSignals,
    missingSignals,
    futureSources
  };
}

export async function enrichCoachContextWithIntelligence(context: CoachContextWithKnowledge): Promise<AICoachContext> {
  const config = await loadIntelligenceConfig();
  const locale = context.player.locale;
  const languagePlan = buildLanguagePlan(context);
  const problemMappings = buildProblemMappings(context, config.taxonomy);
  const problemMappingById = new Map(problemMappings.map((entry) => [entry.problemId, entry]));
  const primaryProblem = context.coaching.topProblems.find((entry) => entry.id === context.diagnosis.primaryIssue?.problemId)
    ?? context.coaching.topProblems[0]
    ?? null;

  const signalMetrics = unique([
    primaryProblem?.focusMetric ?? '',
    'deaths_pre_14',
    'cs_at_15',
    'gold_diff_at_15',
    'kill_participation',
    'lead_conversion'
  ]).filter(Boolean);

  const signalEntries = signalMetrics
    .map((metric) => classifyMetricSignal({
      metric,
      context,
      evidenceStrength: primaryProblem?.focusMetric === metric ? primaryProblem.evidenceStrength : 'medium'
    }))
    .filter((entry): entry is CoachSignalStabilityEntry => Boolean(entry));

  const primarySignal = primaryProblem?.focusMetric
    ? signalEntries.find((entry) => entry.metric === primaryProblem.focusMetric) ?? null
    : signalEntries[0] ?? null;

  const overallState: IntelligenceSignalState = primarySignal?.state
    ?? (signalEntries.some((entry) => entry.state === 'stable_leak')
      ? 'stable_leak'
      : signalEntries.some((entry) => entry.state === 'emerging_regression')
        ? 'emerging_regression'
        : 'volatile');

  const queue = context.diagnosis.rankedIssues.map((issue) => {
    const mapping = problemMappingById.get(issue.problemId);
    const topProblem = context.coaching.topProblems.find((entry) => entry.id === issue.problemId);
    const stability = topProblem?.focusMetric
      ? signalEntries.find((entry) => entry.metric === topProblem.focusMetric)?.state ?? overallState
      : overallState;

    return buildInterventionItem({
      context,
      mapping,
      issue: {
        problemId: issue.problemId,
        focusMetric: issue.focusMetric,
        title: topProblem?.problem ?? issue.problem,
        baseScore: issue.score,
        reasons: issue.reasons
      },
      languageMode: languagePlan.mode,
      stability
    });
  }).sort((left, right) => right.score - left.score);

  const suppressed = context.diagnosis.suppressedIssues.map((issue) => {
    const mapping = problemMappingById.get(issue.problemId);
    return buildInterventionItem({
      context,
      mapping,
      issue: {
        problemId: issue.problemId,
        focusMetric: issue.focusMetric,
        title: issue.problem,
        baseScore: issue.score - 8,
        reasons: issue.reasons
      },
      languageMode: languagePlan.mode,
      stability: 'volatile'
    });
  }).map((item) => ({ ...item, urgency: 'watch' as const }));

  const topQueue = queue[0] ?? null;
  const topMapping = topQueue ? problemMappingById.get(topQueue.problemId) : undefined;
  const quickPromptSource = topMapping?.detectedTypes[0] ?? topMapping?.candidateTypes[0] ?? topMapping?.blockedTypes[0] ?? null;
  const blockedChampionHeuristics = context.knowledge.championIdentity?.blockedHeuristics ?? [];

  const reviewPlan = {
    quickReview: buildReviewLayer({
      layer: 'quick_review',
      locale,
      objective: localize(locale, {
        es: 'Encontrar el primer trigger visible que repite la fuga principal.',
        en: 'Find the first visible trigger that repeats the main leak.'
      }),
      prompts: [
        ...(topQueue ? topQueue.reasons.slice(0, 1) : []),
        ...(context.reviewAgenda.slice(0, 2).map((item) => `${item.title}: ${item.question}`)),
        ...(quickPromptSource ? [quickPromptSource.reasons[0] ?? quickPromptSource.summary] : [])
      ],
      anchors: [
        ...(context.reviewAgenda.slice(0, 2).map((item) => item.matchId)),
        ...(context.reviewAgenda.slice(0, 2).flatMap((item) => item.tags))
      ]
    }),
    coachReview: buildReviewLayer({
      layer: 'coach_review',
      locale,
      objective: localize(locale, {
        es: 'Separar causa raíz, costo y orden correcto de corrección para el bloque.',
        en: 'Separate root cause, cost and right correction order for the block.'
      }),
      prompts: [
        ...(topMapping?.detectedTypes[0]
          ? config.taxonomy.find((entry) => entry.id === topMapping.detectedTypes[0]?.taxonomyId)?.coachReviewPrompts.map((entry) => localize(locale, entry)) ?? []
          : []),
        ...context.diagnosis.reasonChain,
        ...context.knowledge.roleIdentity.reviewPrompts.slice(0, 1),
        ...context.knowledge.eloProfile.reviewThemes.slice(0, 1)
      ],
      anchors: [
        context.player.roleScopeLabel,
        context.player.anchorChampion ?? '',
        context.knowledge.roleIdentity.label
      ]
    }),
    deepVodReview: buildReviewLayer({
      layer: 'deep_vod_review',
      locale,
      objective: localize(locale, {
        es: 'Validar hipotesis que hoy estan bloqueadas por falta de telemetria y convertirlas en checklist manual.',
        en: 'Validate hypotheses that are blocked today by missing telemetry and turn them into a manual checklist.'
      }),
      prompts: [
        ...(topMapping?.blockedTypes[0]
          ? config.taxonomy.find((entry) => entry.id === topMapping.blockedTypes[0]?.taxonomyId)?.deepVodPrompts.map((entry) => localize(locale, entry)) ?? []
          : []),
        ...blockedChampionHeuristics.slice(0, 2).map((entry) => entry.note),
        ...(topQueue?.reasons.slice(0, 1) ?? [])
      ],
      anchors: [
        ...blockedChampionHeuristics.flatMap((entry) => entry.requiredSignals),
        ...(topMapping?.blockedTypes.flatMap((entry) => entry.missingSignals) ?? [])
      ]
    })
  };

  const intelligence: CoachIntelligenceSummary = {
    intelligenceVersion: INTELLIGENCE_VERSION,
    languagePlan,
    taxonomy: {
      primaryProblemId: primaryProblem?.id ?? null,
      mappedProblems: problemMappings
    },
    interventionPlan: {
      primaryObjective: topQueue?.title ?? localize(locale, {
        es: 'Todavia no hay una fuga principal lo bastante estable como para intervenir fuerte.',
        en: 'There is not yet a stable enough main leak for a strong intervention.'
      }),
      whyNow: topQueue?.reasons.slice(0, 3) ?? [],
      queue,
      suppressed
    },
    reviewPlan,
    signalStability: {
      overallState,
      summary: primarySignal?.summary ?? localize(locale, {
        es: 'La lectura de estabilidad todavia depende de una muestra corta o mixta.',
        en: 'The stability read still depends on a short or mixed sample.'
      }),
      primarySignal,
      signals: signalEntries
    },
    referenceFrames: buildReferenceFrames(context, config.references),
    metaReadiness: buildMetaReadiness(context)
  };

  return {
    ...context,
    intelligence
  };
}
