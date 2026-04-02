import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Card, ChampionIdentity, TrendIndicator } from '../../components/ui';
import type { Dataset } from '../../types';
import type { Locale } from '../../lib/i18n';
import { formatDecimal, formatInteger } from '../../lib/format';

type WorkspaceView = 'summary' | 'trends' | 'review' | 'compare';
type MatchEntry = Dataset['matches'][number];

const t = (locale: Locale, es: string, en: string) => (locale === 'en' ? en : es);
const avg = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

function buildMatchTrend(matches: MatchEntry[]) {
  return [...matches]
    .sort((a, b) => a.gameCreation - b.gameCreation)
    .map((match, index) => ({
      game: index + 1,
      score: Number(match.score.total.toFixed(1)),
      goldDiffAt15: Number((match.timeline.goldDiffAt15 ?? 0).toFixed(0)),
      deathsPre14: Number(match.timeline.deathsPre14.toFixed(1)),
      win: match.win ? 1 : 0,
      champion: match.championName
    }));
}

function computeLaneControlScore(match: MatchEntry) {
  return clamp(
    58
      + (match.timeline.goldDiffAt15 ?? 0) / 28
      + (match.timeline.levelDiffAt15 ?? 0) * 14
      - match.timeline.laneDeathsPre10 * 20
      - Math.max(0, match.timeline.deathsPre14 - 1) * 8
  );
}

function computeResourceScore(match: MatchEntry) {
  return clamp(25 + match.timeline.csAt15 * 0.62 + (match.timeline.goldDiffAt15 ?? 0) / 40 - match.timeline.deathsPre14 * 11);
}

function computeSetupScore(match: MatchEntry) {
  return clamp(
    18
      + match.killParticipation * 0.72
      + (match.timeline.firstMoveMinute !== null && match.timeline.firstMoveMinute !== undefined ? Math.max(0, 8.5 - match.timeline.firstMoveMinute) * 5 : 0)
      - match.timeline.objectiveFightDeaths * 22
  );
}

function computeConversionScore(match: MatchEntry) {
  return clamp(34 + match.score.macro * 0.45 + (match.win ? 18 : -10) + (match.timeline.goldDiffAt15 ?? 0) / 38 - match.timeline.objectiveFightDeaths * 10);
}

function buildPhaseChartData(matches: MatchEntry[], locale: Locale) {
  const ordered = [...matches].sort((a, b) => a.gameCreation - b.gameCreation);
  const recentCount = Math.min(8, Math.max(3, Math.ceil(ordered.length * 0.35)));
  const recent = ordered.slice(-Math.min(recentCount, ordered.length));
  const baseline = ordered.slice(0, Math.max(1, ordered.length - recent.length));
  const wins = matches.filter((match) => match.win);
  const losses = matches.filter((match) => !match.win);
  const groups = {
    baseline: baseline.length ? baseline : recent,
    recent: recent.length ? recent : baseline,
    wins: wins.length ? wins : recent,
    losses: losses.length ? losses : baseline
  };

  return [
    {
      phaseLabel: t(locale, 'Control de línea', 'Lane control'),
      baseline: Number(avg(groups.baseline.map(computeLaneControlScore)).toFixed(1)),
      recent: Number(avg(groups.recent.map(computeLaneControlScore)).toFixed(1)),
      wins: Number(avg(groups.wins.map(computeLaneControlScore)).toFixed(1)),
      losses: Number(avg(groups.losses.map(computeLaneControlScore)).toFixed(1))
    },
    {
      phaseLabel: t(locale, 'Piso de recursos', 'Resource floor'),
      baseline: Number(avg(groups.baseline.map(computeResourceScore)).toFixed(1)),
      recent: Number(avg(groups.recent.map(computeResourceScore)).toFixed(1)),
      wins: Number(avg(groups.wins.map(computeResourceScore)).toFixed(1)),
      losses: Number(avg(groups.losses.map(computeResourceScore)).toFixed(1))
    },
    {
      phaseLabel: t(locale, 'Setup', 'Setup'),
      baseline: Number(avg(groups.baseline.map(computeSetupScore)).toFixed(1)),
      recent: Number(avg(groups.recent.map(computeSetupScore)).toFixed(1)),
      wins: Number(avg(groups.wins.map(computeSetupScore)).toFixed(1)),
      losses: Number(avg(groups.losses.map(computeSetupScore)).toFixed(1))
    },
    {
      phaseLabel: t(locale, 'Conversión', 'Conversion'),
      baseline: Number(avg(groups.baseline.map(computeConversionScore)).toFixed(1)),
      recent: Number(avg(groups.recent.map(computeConversionScore)).toFixed(1)),
      wins: Number(avg(groups.wins.map(computeConversionScore)).toFixed(1)),
      losses: Number(avg(groups.losses.map(computeConversionScore)).toFixed(1))
    }
  ];
}

function buildOperationalSignals(matches: MatchEntry[], locale: Locale) {
  const stableOpenings = matches.filter((match) => match.timeline.laneDeathsPre10 === 0);
  const playableTo15 = matches.filter((match) => match.timeline.deathsPre14 <= 1 && (match.timeline.goldDiffAt15 ?? 0) >= -250);
  const objectiveClean = matches.filter((match) => match.timeline.objectiveFightDeaths === 0);
  const leadSamples = matches.filter((match) => (match.timeline.goldDiffAt15 ?? 0) >= 250);
  const convertedLeads = leadSamples.filter((match) => match.win);
  const resilientLosses = matches.filter((match) => !match.win && (match.timeline.goldDiffAt15 ?? 0) >= 0);

  return [
    {
      label: t(locale, 'Inicios limpios', 'Clean starts'),
      value: matches.length ? (stableOpenings.length / matches.length) * 100 : 0,
      detail: t(locale, `${stableOpenings.length}/${matches.length} partidas sin muerte antes de 10`, `${stableOpenings.length}/${matches.length} games without a pre-10 death`)
    },
    {
      label: t(locale, 'Minuto 15 jugable', 'Playable minute 15'),
      value: matches.length ? (playableTo15.length / matches.length) * 100 : 0,
      detail: t(locale, `${playableTo15.length}/${matches.length} llegan al 15 con margen`, `${playableTo15.length}/${matches.length} reach minute 15 with margin`)
    },
    {
      label: t(locale, 'Setup de objetivo', 'Objective setup'),
      value: matches.length ? (objectiveClean.length / matches.length) * 100 : 0,
      detail: t(locale, `${objectiveClean.length}/${matches.length} sin muertes alrededor de objetivo`, `${objectiveClean.length}/${matches.length} without objective-window deaths`)
    },
    {
      label: t(locale, 'Conversión de ventaja', 'Lead conversion'),
      value: leadSamples.length ? (convertedLeads.length / leadSamples.length) * 100 : 0,
      detail: leadSamples.length
        ? t(locale, `${convertedLeads.length}/${leadSamples.length} ventajas convertidas`, `${convertedLeads.length}/${leadSamples.length} leads converted`)
        : t(locale, 'Todavía no hay suficientes ventajas tempranas', 'Not enough early leads yet')
    },
    {
      label: t(locale, 'Derrotas recuperables', 'Recoverable losses'),
      value: matches.length ? (resilientLosses.length / matches.length) * 100 : 0,
      detail: resilientLosses.length
        ? t(locale, `${resilientLosses.length} derrotas con base jugable`, `${resilientLosses.length} losses with a playable base`)
        : t(locale, 'No aparecen derrotas con base competitiva todavía', 'No losses from a competitive base yet')
    }
  ];
}

function classifyCollapse(match: MatchEntry, locale: Locale) {
  if ((match.timeline.goldDiffAt15 ?? 0) >= 250 && !match.win) {
    return {
      id: 'lead-drop',
      label: t(locale, 'Se cae al convertir', 'Drops on conversion'),
      reason: t(locale, 'Consigue ventaja, pero no la transforma en control estable.', 'Gets an advantage, but does not turn it into stable control.')
    };
  }

  if (match.timeline.objectiveFightDeaths > 0) {
    return {
      id: 'setup-break',
      label: t(locale, 'Se rompe en setup', 'Breaks in setup'),
      reason: t(locale, 'La fuga aparece antes o durante la ventana de objetivo.', 'The leak appears before or during the objective window.')
    };
  }

  if (match.timeline.deathsPre14 >= 2 || match.timeline.laneDeathsPre10 >= 1) {
    return {
      id: 'early-collapse',
      label: t(locale, 'Se cae temprano', 'Collapses early'),
      reason: t(locale, 'La partida pierde jugabilidad demasiado pronto.', 'The game loses playability too early.')
    };
  }

  if ((match.timeline.goldDiffAt15 ?? 0) <= -400 || (match.timeline.levelDiffAt15 ?? 0) <= -0.8) {
    return {
      id: 'lane-deficit',
      label: t(locale, 'Cede línea/tempo', 'Gives lane/tempo'),
      reason: t(locale, 'Llega al 15 desde desventaja real de oro o nivel.', 'Reaches minute 15 from a real gold or level deficit.')
    };
  }

  if (match.killParticipation < 45) {
    return {
      id: 'map-disconnect',
      label: t(locale, 'Llega desconectado', 'Arrives disconnected'),
      reason: t(locale, 'No se conecta a tiempo con las jugadas que mueven el mapa.', 'Does not connect in time to the plays that move the map.')
    };
  }

  return {
    id: 'reference',
    label: t(locale, 'Base estable', 'Stable base'),
    reason: t(locale, 'La partida no muestra un colapso estructural dominante.', 'The game does not show a dominant structural collapse.')
  };
}

function buildCollapsePatterns(matches: MatchEntry[], locale: Locale) {
  const source = matches.some((match) => !match.win) ? matches.filter((match) => !match.win) : matches;
  const grouped = new Map<string, { id: string; label: string; reason: string; matches: MatchEntry[] }>();

  for (const match of source) {
    const collapse = classifyCollapse(match, locale);
    const current = grouped.get(collapse.id) ?? { ...collapse, matches: [] };
    current.matches.push(match);
    grouped.set(collapse.id, current);
  }

  return Array.from(grouped.values())
    .map((entry) => ({
      ...entry,
      count: entry.matches.length,
      rate: source.length ? (entry.matches.length / source.length) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count);
}

function inferBreakpoint(match: MatchEntry, locale: Locale) {
  if ((match.timeline.goldDiffAt15 ?? 0) >= 250 && !match.win) {
    return {
      label: t(locale, 'Post-15: mala conversión', 'Post-15: poor conversion'),
      description: t(locale, 'La partida llegó jugable, pero no sostuvo control después de la ventaja.', 'The game reached a playable state, but did not sustain control after the lead.')
    };
  }

  if (match.timeline.objectiveFightDeaths > 0) {
    return {
      label: t(locale, 'Ventana de objetivo', 'Objective window'),
      description: t(locale, 'El mayor quiebre aparece en setup, llegada o ejecución alrededor del objetivo.', 'The biggest break appears in setup, arrival or execution around the objective.')
    };
  }

  if (match.timeline.deathsPre14 >= 2) {
    return {
      label: t(locale, '0-14: disciplina', '0-14: discipline'),
      description: t(locale, 'La primera muerte evitable parece cambiar toda la jugabilidad posterior.', 'The first avoidable death seems to change the entire later game state.')
    };
  }

  if ((match.timeline.goldDiffAt15 ?? 0) <= -350) {
    return {
      label: t(locale, '10-15: economía', '10-15: economy'),
      description: t(locale, 'La partida se queda corta en recursos antes del primer tramo serio de mapa.', 'The game runs short on resources before the first serious map segment.')
    };
  }

  return {
    label: t(locale, 'Base estable', 'Stable base'),
    description: t(locale, 'Sirve como espejo para comparar con las partidas rotas.', 'This works as a mirror against the broken games.')
  };
}

function buildReviewTimeline(matches: MatchEntry[], dataset: Dataset, locale: Locale) {
  const agendaIds = dataset.summary.reviewAgenda.map((item) => item.matchId);
  const prioritized = matches
    .filter((match) => agendaIds.includes(match.matchId))
    .sort((a, b) => agendaIds.indexOf(a.matchId) - agendaIds.indexOf(b.matchId));
  const fallback = matches
    .filter((match) => !match.win || match.timeline.objectiveFightDeaths > 0 || match.timeline.deathsPre14 >= 2)
    .sort((a, b) => b.gameCreation - a.gameCreation);

  return (prioritized.length ? prioritized : fallback).slice(0, 3).map((match) => ({
    match,
    reviewItem: dataset.summary.reviewAgenda.find((item) => item.matchId === match.matchId),
    breakpoint: inferBreakpoint(match, locale)
  }));
}

function buildStaffBrief(patterns: ReturnType<typeof buildCollapsePatterns>, signals: ReturnType<typeof buildOperationalSignals>, locale: Locale) {
  const mainPattern = patterns[0];
  const weakestSignal = [...signals].sort((a, b) => a.value - b.value)[0];
  if (!mainPattern || !weakestSignal) {
    return t(locale, 'Todavía no hay suficiente muestra para una lectura de staff más dura.', 'There is not enough sample yet for a harder staff read.');
  }

  return t(
    locale,
    `Hoy el patrón dominante es "${mainPattern.label}": concentra ${formatDecimal(mainPattern.rate)}% de las partidas problemáticas. Además, "${weakestSignal.label}" está en ${formatDecimal(weakestSignal.value)}%, así que conviene preparar reviews donde el coach aisle primero el punto de quiebre y después el hábito que lo habilita.`,
    `Right now the dominant pattern is "${mainPattern.label}": it concentrates ${formatDecimal(mainPattern.rate)}% of problematic games. Also, "${weakestSignal.label}" is at ${formatDecimal(weakestSignal.value)}%, so reviews should isolate the breakpoint first and then the habit that enabled it.`
  );
}

function ConsistencyRow({ label, detail, value, locale }: { label: string; detail: string; value: number; locale: Locale }) {
  const tone = value <= 18 ? 'positive' : value <= 34 ? 'neutral' : 'negative';
  return (
    <div style={consistencyRowStyle}>
      <div style={{ display: 'grid', gap: 4 }}>
        <div style={{ color: '#eef4ff', fontWeight: 800 }}>{label}</div>
        <div style={{ color: '#8f9aad', lineHeight: 1.6 }}>{detail}</div>
      </div>
      <div style={{ display: 'grid', justifyItems: 'end', gap: 8 }}>
        <div style={{ color: '#eef4ff', fontSize: 24, fontWeight: 800 }}>{formatDecimal(value)}</div>
        <TrendIndicator
          direction={tone === 'positive' ? 'up' : tone === 'neutral' ? 'steady' : 'down'}
          tone={tone}
          label={tone === 'positive' ? t(locale, 'estable', 'stable') : tone === 'neutral' ? t(locale, 'mixto', 'mixed') : t(locale, 'volátil', 'volatile')}
        />
      </div>
    </div>
  );
}

export function CoachPremiumWorkspace({ dataset, locale = 'es' }: { dataset: Dataset; locale?: Locale }) {
  const [activeView, setActiveView] = useState<WorkspaceView>('summary');
  const trendData = useMemo(() => buildMatchTrend(dataset.matches), [dataset.matches]);
  const phaseChartData = useMemo(() => buildPhaseChartData(dataset.matches, locale), [dataset.matches, locale]);
  const signals = useMemo(() => buildOperationalSignals(dataset.matches, locale), [dataset.matches, locale]);
  const patterns = useMemo(() => buildCollapsePatterns(dataset.matches, locale), [dataset.matches, locale]);
  const reviewTimeline = useMemo(() => buildReviewTimeline(dataset.matches, dataset, locale), [dataset.matches, dataset, locale]);
  const staffBrief = useMemo(() => buildStaffBrief(patterns, signals, locale), [patterns, signals, locale]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card
        title={t(locale, 'Workspace coach premium', 'Premium coach workspace')}
        subtitle={t(locale, 'Un producto pensado para staff: menos vanity, más lectura accionable para diagnóstico, seguimiento y review.', 'A product built for staff: less vanity, more actionable read for diagnosis, tracking and review.')}
      >
        <div style={{ display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: 6, maxWidth: 880 }}>
              <div style={{ color: '#eef4ff', fontSize: 26, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05 }}>
                {t(locale, 'Diseñado para preparar una intervención, no solo para mirar un dashboard.', 'Built to prepare an intervention, not just to browse a dashboard.')}
              </div>
              <div style={{ color: '#9aa5b7', lineHeight: 1.7 }}>{staffBrief}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge>{t(locale, `${dataset.summary.matches} partidas visibles`, `${dataset.summary.matches} visible games`)}</Badge>
              <Badge tone="low">{t(locale, 'Staff mode', 'Staff mode')}</Badge>
              <Badge tone="medium">{t(locale, 'Lectura por bloques', 'Block-based read')}</Badge>
            </div>
          </div>

          <div className="four-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
            {([
              { id: 'summary' as const, label: t(locale, 'Resumen', 'Summary'), subtitle: t(locale, 'Diagnóstico operativo del jugador.', 'Operational player diagnosis.') },
              { id: 'trends' as const, label: t(locale, 'Tendencias', 'Trends'), subtitle: t(locale, 'Qué está cambiando de verdad.', 'What is truly changing.') },
              { id: 'review' as const, label: t(locale, 'Review', 'Review'), subtitle: t(locale, 'Qué partidas abrir y qué preguntar.', 'Which games to open and what to ask.') },
              { id: 'compare' as const, label: t(locale, 'Comparativa', 'Compare'), subtitle: t(locale, 'Bloques, wins y losses lado a lado.', 'Blocks, wins and losses side by side.') }
            ]).map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => setActiveView(view.id)}
                style={{ ...workspaceButtonStyle, ...(activeView === view.id ? activeWorkspaceButtonStyle : {}) }}
              >
                <div style={{ color: '#eef4ff', fontWeight: 800 }}>{view.label}</div>
                <div style={{ color: activeView === view.id ? '#dce9fb' : '#8694aa', fontSize: 12, lineHeight: 1.55 }}>{view.subtitle}</div>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {activeView === 'summary' ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="five-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }}>
            {signals.map((signal) => (
              <div key={signal.label} style={signalCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
                  <div style={{ color: '#8d9ab0', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{signal.label}</div>
                  <TrendIndicator direction={signal.value >= 60 ? 'up' : signal.value >= 40 ? 'steady' : 'down'} tone={signal.value >= 60 ? 'positive' : signal.value >= 40 ? 'neutral' : 'negative'} />
                </div>
                <div style={{ color: '#eef4ff', fontSize: 30, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05 }}>{`${formatDecimal(signal.value)}%`}</div>
                <div style={{ color: '#8f9aad', lineHeight: 1.6 }}>{signal.detail}</div>
              </div>
            ))}
          </div>

          <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 16 }}>
            <Card
              title={t(locale, 'Patrones de caída', 'Collapse patterns')}
              subtitle={t(locale, 'Clasificamos dónde se rompe más seguido el jugador para que la review tenga prioridad real.', 'We classify where the player breaks most often so the review has real priority.')}
            >
              <div style={{ display: 'grid', gap: 10 }}>
                {patterns.map((pattern) => (
                  <div key={pattern.id} style={patternRowStyle}>
                    <div style={{ display: 'grid', gap: 5 }}>
                      <div style={{ color: '#eef4ff', fontWeight: 800 }}>{pattern.label}</div>
                      <div style={{ color: '#8f9aad', lineHeight: 1.6 }}>{pattern.reason}</div>
                    </div>
                    <div style={{ display: 'grid', justifyItems: 'end', gap: 8 }}>
                      <Badge tone={pattern.rate >= 35 ? 'high' : pattern.rate >= 20 ? 'medium' : 'default'}>{`${formatDecimal(pattern.rate)}%`}</Badge>
                      <div style={{ color: '#9db0c8', fontSize: 12 }}>{`${formatInteger(pattern.count)} ${t(locale, 'partidas', 'games')}`}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card
              title={t(locale, 'Lectura de staff', 'Staff read')}
              subtitle={t(locale, 'Qué vale la pena decirle hoy al jugador en una reunión corta.', 'What is worth saying to the player today in a short meeting.')}
            >
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={staffBlockStyle}>
                  <div style={{ color: '#8c98ad', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t(locale, 'Diagnóstico principal', 'Primary diagnosis')}</div>
                  <div style={{ color: '#eef4ff', fontSize: 18, fontWeight: 800, lineHeight: 1.25 }}>{patterns[0]?.label ?? t(locale, 'Sin patrón dominante todavía', 'No dominant pattern yet')}</div>
                  <div style={{ color: '#d9e2f0', lineHeight: 1.7 }}>{staffBrief}</div>
                </div>
                <div style={staffBlockStyle}>
                  <div style={{ color: '#8c98ad', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t(locale, 'Intervención sugerida', 'Suggested intervention')}</div>
                  <div style={{ color: '#dff7eb', lineHeight: 1.7 }}>
                    {patterns[0]?.id === 'setup-break'
                      ? t(locale, 'Entrar a replay con foco en los 60 segundos previos a objetivo: reset, prioridad real, visión y orden de llegada.', 'Open replay focusing on the 60 seconds before the objective: reset, real priority, vision and order of arrival.')
                      : patterns[0]?.id === 'lead-drop'
                        ? t(locale, 'Separar “crear ventaja” de “convertir ventaja”. El review no debería empezar por la línea, sino por qué se regala control después del 15.', 'Separate “creating a lead” from “converting a lead”. The review should not start from lane, but from why control is given away after minute 15.')
                        : patterns[0]?.id === 'early-collapse'
                          ? t(locale, 'Aislar la primera muerte evitable y el costo real que tuvo sobre el resto del mapa.', 'Isolate the first avoidable death and its real cost on the rest of the map.')
                          : t(locale, 'Usar una partida rota y una partida estable como espejo de bloque antes de cambiar el pool o abrir más variables.', 'Use one broken game and one stable game as a block mirror before changing the pool or opening more variables.')}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {activeView === 'trends' ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <Card
            title={t(locale, 'Tendencia del bloque', 'Block trend')}
            subtitle={t(locale, 'Score y diff de oro a lo largo de la muestra visible para separar racha real de ruido.', 'Score and gold diff across the visible sample to separate true streaks from noise.')}
          >
            <div style={{ width: '100%', height: 340 }}>
              <ResponsiveContainer>
                <LineChart data={trendData}>
                  <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="game" stroke="#8fa8cc" />
                  <YAxis yAxisId="left" stroke="#8fa8cc" />
                  <YAxis yAxisId="right" orientation="right" stroke="#7ef5c7" />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#eef4ff' }} />
                  <Line yAxisId="left" type="monotone" dataKey="score" stroke="#eef4ff" strokeWidth={3} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="goldDiffAt15" stroke="#7ef5c7" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 16 }}>
            <Card
              title={t(locale, 'Lectura por fases', 'Phase read')}
              subtitle={t(locale, 'No solo importa cuánto gana o pierde: importa en qué fase se distorsiona el partido.', 'It is not only about winning or losing, but in which phase the game gets distorted.')}
            >
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={phaseChartData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="phaseLabel" stroke="#8fa8cc" />
                    <YAxis stroke="#8fa8cc" />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#eef4ff' }} />
                    <Bar dataKey="baseline" fill="#58708d" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="recent" fill="#d8fdf1" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="wins" fill="#7ef5c7" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="losses" fill="#ff8f8f" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card
              title={t(locale, 'Señales de consistencia', 'Consistency signals')}
              subtitle={t(locale, 'Ayudan a distinguir si el bloque está mejorando o si solo alterna partidas muy buenas con derrumbes iguales.', 'These help distinguish real improvement from alternating very good games with the same collapses as before.')}
            >
              <div style={{ display: 'grid', gap: 10 }}>
                <ConsistencyRow
                  locale={locale}
                  label={t(locale, 'Gap wins vs losses', 'Wins vs losses gap')}
                  detail={t(locale, 'Cuánta distancia hay entre una versión que gana y una que pierde.', 'How far apart the winning and losing versions are.')}
                  value={Math.abs(avg(dataset.matches.filter((match) => match.win).map((match) => match.score.total)) - avg(dataset.matches.filter((match) => !match.win).map((match) => match.score.total)))}
                />
                <ConsistencyRow
                  locale={locale}
                  label={t(locale, 'Volatilidad de early', 'Early volatility')}
                  detail={t(locale, 'Oscilación entre partidas jugables al 15 y partidas que ya llegan rotas.', 'Swing between playable minute-15 games and games that arrive already broken.')}
                  value={Math.abs(avg(dataset.matches.map((match) => match.timeline.goldDiffAt15 ?? 0))) / 10 + avg(dataset.matches.map((match) => match.timeline.deathsPre14)) * 6}
                />
                <ConsistencyRow
                  locale={locale}
                  label={t(locale, 'Costo del setup', 'Setup cost')}
                  detail={t(locale, 'Cuánto se paga en muertes cuando el mapa gira alrededor de objetivos.', 'How much is paid in deaths when the map turns around objectives.')}
                  value={avg(dataset.matches.map((match) => match.timeline.objectiveFightDeaths)) * 18}
                />
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {activeView === 'review' ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <Card
            title={t(locale, 'Timeline operativo de partidas', 'Operational match timeline')}
            subtitle={t(locale, 'No es un timeline minuto a minuto; es una línea de staff para detectar dónde se corta la partida y qué abrir en replay.', 'This is not a minute-by-minute timeline; it is a staff line to detect where the game breaks and what to open in replay.')}
          >
            <div style={{ display: 'grid', gap: 12 }}>
              {reviewTimeline.map((entry) => (
                <div key={entry.match.matchId} style={timelineCardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start', flexWrap: 'wrap' }}>
                    <ChampionIdentity
                      championName={entry.match.championName}
                      version={dataset.ddragonVersion}
                      subtitle={`${new Date(entry.match.gameCreation).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-AR')} · ${entry.match.opponentChampionName ? `vs ${entry.match.opponentChampionName}` : t(locale, 'sin rival detectado', 'no opponent detected')}`}
                      size={52}
                    />
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Badge tone={entry.match.win ? 'low' : 'high'}>{entry.match.win ? t(locale, 'Victoria', 'Win') : t(locale, 'Derrota', 'Loss')}</Badge>
                      <Badge tone="medium">{entry.breakpoint.label}</Badge>
                    </div>
                  </div>

                  <div className="four-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
                    {[
                      {
                        label: '0-10',
                        title: t(locale, 'Entrada de línea', 'Lane entry'),
                        state: entry.match.timeline.laneDeathsPre10 === 0 ? 'good' : 'bad',
                        detail: entry.match.timeline.laneDeathsPre10 === 0 ? t(locale, 'Sin muerte temprana visible.', 'No visible early death.') : t(locale, `${entry.match.timeline.laneDeathsPre10} muerte(s) antes de 10.`, `${entry.match.timeline.laneDeathsPre10} death(s) before 10.`)
                      },
                      {
                        label: '10-15',
                        title: t(locale, 'Piso económico', 'Economy floor'),
                        state: (entry.match.timeline.goldDiffAt15 ?? 0) >= -150 && entry.match.timeline.deathsPre14 <= 1 ? 'good' : (entry.match.timeline.goldDiffAt15 ?? 0) <= -350 || entry.match.timeline.deathsPre14 >= 2 ? 'bad' : 'warn',
                        detail: `${formatInteger(entry.match.timeline.goldDiffAt15 ?? 0)} G@15 · ${formatDecimal(entry.match.timeline.deathsPre14)} D pre14`
                      },
                      {
                        label: 'Obj',
                        title: t(locale, 'Setup objetivo', 'Objective setup'),
                        state: entry.match.timeline.objectiveFightDeaths === 0 ? 'good' : 'bad',
                        detail: entry.match.timeline.objectiveFightDeaths === 0 ? t(locale, 'Sin muertes en ventana de objetivo.', 'No deaths in objective windows.') : t(locale, `${entry.match.timeline.objectiveFightDeaths} muerte(s) cerca de objetivo.`, `${entry.match.timeline.objectiveFightDeaths} death(s) near objectives.`)
                      },
                      {
                        label: 'End',
                        title: t(locale, 'Cierre', 'Close'),
                        state: entry.match.win ? 'good' : (entry.match.timeline.goldDiffAt15 ?? 0) >= 250 ? 'bad' : 'warn',
                        detail: entry.match.win ? t(locale, 'La partida se convirtió.', 'The game was converted.') : (entry.match.timeline.goldDiffAt15 ?? 0) >= 250 ? t(locale, 'Ventaja no convertida.', 'Lead not converted.') : t(locale, 'Partida perdida.', 'Game lost.')
                      }
                    ].map((phase) => (
                      <div key={`${entry.match.matchId}-${phase.label}`} style={{ ...timelinePhaseStyle, borderColor: phase.state === 'good' ? 'rgba(126,245,199,0.16)' : phase.state === 'bad' ? 'rgba(255,143,143,0.16)' : 'rgba(255,196,82,0.16)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                          <div style={{ color: '#8c98ad', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{phase.label}</div>
                          <TrendIndicator direction={phase.state === 'good' ? 'up' : phase.state === 'bad' ? 'down' : 'steady'} tone={phase.state === 'good' ? 'positive' : phase.state === 'bad' ? 'negative' : 'neutral'} />
                        </div>
                        <div style={{ color: '#eef4ff', fontWeight: 800 }}>{phase.title}</div>
                        <div style={{ color: '#9aa5b7', lineHeight: 1.55 }}>{phase.detail}</div>
                      </div>
                    ))}
                  </div>

                  <div style={reviewQuestionStyle}>
                    <div style={{ color: '#8d9ab0', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t(locale, 'Punto de quiebre', 'Breakpoint')}</div>
                    <div style={{ color: '#eef4ff', fontWeight: 800 }}>{entry.breakpoint.label}</div>
                    <div style={{ color: '#d9e2f0', lineHeight: 1.7 }}>{entry.reviewItem?.question ?? entry.breakpoint.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card
            title={t(locale, 'Cola de review accionable', 'Actionable review queue')}
            subtitle={t(locale, 'Qué abrir primero si el coach tiene poco tiempo y necesita salir con una intervención concreta.', 'What to open first if the coach has limited time and needs to leave with a concrete intervention.')}
          >
            <div style={{ display: 'grid', gap: 10 }}>
              {dataset.summary.reviewAgenda.slice(0, 4).map((item, index) => (
                <div key={item.matchId} style={queueItemStyle}>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <div style={{ color: '#8d9ab0', fontSize: 12 }}>{`${index + 1}. ${item.title}`}</div>
                    <div style={{ color: '#eef4ff', fontWeight: 800 }}>{item.reason}</div>
                    <div style={{ color: '#d9e2f0', lineHeight: 1.65 }}>{item.question}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'end' }}>
                    {item.tags.map((tag) => <Badge key={`${item.matchId}-${tag}`}>{tag}</Badge>)}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      {activeView === 'compare' ? (
        <div style={{ display: 'grid', gap: 16 }}>
          <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 16 }}>
            <Card
              title={t(locale, 'Comparativa entre bloques', 'Block comparison')}
              subtitle={t(locale, 'Separá si el jugador mejora contra su propio bloque previo o si solo alterna rendimiento por contexto.', 'Separate true improvement against the previous block from context-driven alternation.')}
            >
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={phaseChartData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="phaseLabel" stroke="#8fa8cc" />
                    <YAxis stroke="#8fa8cc" />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#eef4ff' }} />
                    <Bar dataKey="baseline" fill="#5a6478" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="recent" fill="#d8fdf1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card
              title={t(locale, 'Wins vs losses', 'Wins vs losses')}
              subtitle={t(locale, 'Sirve para ver qué cambia cuando el jugador sí logra jugar desde una base competitiva.', 'Useful to see what changes when the player manages to play from a competitive base.')}
            >
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={phaseChartData}>
                    <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                    <XAxis dataKey="phaseLabel" stroke="#8fa8cc" />
                    <YAxis stroke="#8fa8cc" />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: '#eef4ff' }} />
                    <Bar dataKey="wins" fill="#7ef5c7" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="losses" fill="#ff8f8f" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card
            title={t(locale, 'Lectura comparativa rápida', 'Quick comparative read')}
            subtitle={t(locale, 'Atajos para preparar un review de bloque o una devolución de scrim/soloQ.', 'Shortcuts to prepare a block review or a scrim/soloQ feedback session.')}
          >
            <div className="three-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
              {phaseChartData.map((entry) => (
                <div key={entry.phaseLabel} style={compareCardStyle}>
                  <div style={{ color: '#8c98ad', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{entry.phaseLabel}</div>
                  <div style={{ color: '#eef4ff', fontSize: 20, fontWeight: 800 }}>{`${formatDecimal(entry.recent - entry.baseline)} pts`}</div>
                  <div style={{ color: '#9aa5b7', lineHeight: 1.6 }}>
                    {entry.recent >= entry.baseline
                      ? t(locale, 'El bloque reciente sostiene mejor esta fase que el anterior.', 'The recent block sustains this phase better than the previous one.')
                      : t(locale, 'El bloque reciente cede terreno frente al anterior en esta fase.', 'The recent block is giving ground to the previous one in this phase.')}
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Badge tone={entry.recent >= entry.baseline ? 'low' : 'high'}>{t(locale, 'Reciente vs previo', 'Recent vs previous')}</Badge>
                    <Badge tone={entry.wins >= entry.losses ? 'low' : 'medium'}>{t(locale, 'Wins vs losses', 'Wins vs losses')}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

const workspaceButtonStyle = {
  display: 'grid',
  gap: 4,
  padding: '14px 15px',
  borderRadius: 18,
  border: '1px solid rgba(255,255,255,0.07)',
  background: 'rgba(255,255,255,0.025)',
  textAlign: 'left' as const,
  cursor: 'pointer'
} as const;

const activeWorkspaceButtonStyle = {
  background: 'linear-gradient(180deg, rgba(216,253,241,0.12), rgba(18,28,34,0.96))',
  borderColor: 'rgba(216,253,241,0.2)',
  boxShadow: '0 0 0 1px rgba(216,253,241,0.08) inset'
} as const;

const tooltipStyle = {
  background: 'rgba(7,11,18,0.98)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  color: '#eef4ff'
} as const;

const signalCardStyle = {
  display: 'grid',
  gap: 8,
  padding: '16px 16px',
  borderRadius: 18,
  background: 'linear-gradient(180deg, rgba(10, 15, 24, 0.98), rgba(7, 11, 17, 0.98))',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;

const patternRowStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 12,
  alignItems: 'start',
  padding: '14px 15px',
  borderRadius: 16,
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;

const staffBlockStyle = {
  display: 'grid',
  gap: 8,
  padding: '15px 16px',
  borderRadius: 16,
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;

const consistencyRowStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 12,
  alignItems: 'start',
  padding: '14px 15px',
  borderRadius: 16,
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;

const timelineCardStyle = {
  display: 'grid',
  gap: 12,
  padding: '16px 16px',
  borderRadius: 18,
  background: 'linear-gradient(180deg, rgba(10, 15, 24, 0.98), rgba(7, 11, 17, 0.98))',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;

const timelinePhaseStyle = {
  display: 'grid',
  gap: 8,
  padding: '12px 13px',
  borderRadius: 16,
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;

const reviewQuestionStyle = {
  display: 'grid',
  gap: 6,
  padding: '13px 14px',
  borderRadius: 16,
  background: 'rgba(216,253,241,0.08)',
  border: '1px solid rgba(216,253,241,0.12)'
} as const;

const queueItemStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 12,
  alignItems: 'start',
  padding: '14px 15px',
  borderRadius: 16,
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;

const compareCardStyle = {
  display: 'grid',
  gap: 8,
  padding: '15px 16px',
  borderRadius: 16,
  background: 'rgba(255,255,255,0.025)',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;
