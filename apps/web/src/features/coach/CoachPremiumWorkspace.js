import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge, Card, ChampionIdentity, KPI, TrendIndicator } from "../../components/ui";
import { formatDecimal, formatInteger } from "../../lib/format";
import { buildCs15ProgressionBenchmark, buildLevel15ProgressionBenchmark } from "../../lib/benchmarks";
import { getProfileIconUrl } from "../../lib/lol";
const t = (locale, es, en) => locale === "en" ? en : es;
const avg = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
function formatRelativeDate(value, locale) {
  const timestamp = typeof value === "number" ? value : new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return locale === "en" ? "Unknown" : "Sin dato";
  const elapsedMinutes = Math.max(1, Math.round((Date.now() - timestamp) / 6e4));
  if (elapsedMinutes < 60) return locale === "en" ? `${elapsedMinutes}m ago` : `hace ${elapsedMinutes} min`;
  const elapsedHours = Math.round(elapsedMinutes / 60);
  if (elapsedHours < 48) return locale === "en" ? `${elapsedHours}h ago` : `hace ${elapsedHours} h`;
  const elapsedDays = Math.round(elapsedHours / 24);
  return locale === "en" ? `${elapsedDays}d ago` : `hace ${elapsedDays} d`;
}
function buildMatchTrend(matches) {
  return [...matches].sort((a, b) => a.gameCreation - b.gameCreation).map((match, index) => ({
    game: index + 1,
    score: Number(match.score.total.toFixed(1)),
    goldDiffAt15: Number((match.timeline.goldDiffAt15 ?? 0).toFixed(0)),
    laneVolatility: Number(match.timeline.laneVolatilityScore.toFixed(1))
  }));
}
function computeLaneControlScore(match) {
  return clamp(
    58 + (match.timeline.goldDiffAt15 ?? 0) / 28 + (match.timeline.levelDiffAt15 ?? 0) * 14 - match.timeline.laneDeathsPre10 * 20 - Math.max(0, match.timeline.deathsPre14 - 1) * 8
  );
}
function MiniMeta({ label, value }) {
  return /* @__PURE__ */ jsxs("div", { style: rosterMetricStyle, children: [
    /* @__PURE__ */ jsx("div", { style: coachMetaLabelStyle, children: label }),
    /* @__PURE__ */ jsx("div", { style: rosterMetricValueStyle, children: value })
  ] });
}
function RosterMetric({ label, value }) {
  return /* @__PURE__ */ jsxs("div", { style: rosterMetricStyle, children: [
    /* @__PURE__ */ jsx("div", { style: coachMetaLabelStyle, children: label }),
    /* @__PURE__ */ jsx("div", { style: { ...rosterMetricValueStyle, fontSize: 13 }, children: value })
  ] });
}
function SignalBar({
  label,
  value,
  detail,
  tone
}) {
  const barColor = tone === "positive" ? "#7ef5c7" : tone === "warning" ? "#ffd989" : "#8bb6ff";
  return /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 8 }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }, children: [
      /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontWeight: 700 }, children: label }),
      /* @__PURE__ */ jsx("div", { style: { color: barColor, fontWeight: 800 }, children: `${formatDecimal(value)}%` })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { height: 8, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }, children: /* @__PURE__ */ jsx("div", { style: { width: `${clamp(value)}%`, height: "100%", background: barColor } }) }),
    /* @__PURE__ */ jsx("div", { style: { color: "#8ea0b6", fontSize: 13, lineHeight: 1.5 }, children: detail })
  ] });
}
function ReviewLayerCard({ eyebrow, title, summary }) {
  return /* @__PURE__ */ jsxs("div", { style: detailInfoCardStyle, children: [
    /* @__PURE__ */ jsx("div", { style: coachMetaLabelStyle, children: eyebrow }),
    /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 17, fontWeight: 800, lineHeight: 1.2 }, children: title }),
    /* @__PURE__ */ jsx("div", { style: { color: "#8ea0b6", lineHeight: 1.6 }, children: summary })
  ] });
}
function DetailMetric({
  label,
  value,
  compact = false
}) {
  return /* @__PURE__ */ jsxs("div", { style: compact ? detailStatCompactStyle : detailStatCardStyle, children: [
    /* @__PURE__ */ jsx("div", { style: coachMetaLabelStyle, children: label }),
    /* @__PURE__ */ jsx("div", { style: detailStatValueStyle, children: value })
  ] });
}
function BenchmarkDeltaPill({
  delta,
  inverted,
  locale
}) {
  if (delta === null) return /* @__PURE__ */ jsx(Badge, { tone: "medium", children: t(locale, "Sin benchmark", "No benchmark") });
  const better = inverted ? delta <= -0.2 : delta >= 0.2;
  const worse = inverted ? delta >= 0.2 : delta <= -0.2;
  return /* @__PURE__ */ jsxs(Badge, { tone: better ? "low" : worse ? "high" : "default", children: [
    delta > 0 ? "+" : "",
    formatDecimal(delta),
    " ",
    locale === "en" ? "delta" : "delta"
  ] });
}
const coachWorkspaceShellStyle = {
  display: "grid",
  gap: 16,
  padding: "22px 22px",
  borderRadius: 26,
  background: "radial-gradient(circle at top left, rgba(36, 79, 122, 0.32), transparent 34%), linear-gradient(180deg, rgba(9, 14, 22, 0.99), rgba(4, 7, 12, 0.99))",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 28px 72px rgba(0,0,0,0.24)"
};
const coachEyebrowStyle = {
  color: "#8fb5da",
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  fontWeight: 800
};
const coachHeroCardStyle = {
  display: "grid",
  gap: 12,
  alignContent: "start",
  minHeight: 174,
  padding: "16px 16px",
  borderRadius: 20,
  background: "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.015))",
  border: "1px solid rgba(255,255,255,0.06)"
};
const coachMetaLabelStyle = {
  color: "#7f93aa",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.1em"
};
const workspaceButtonStyle = {
  border: "1px solid rgba(255,255,255,0.08)",
  padding: "11px 14px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.03)",
  color: "#dce6f6",
  fontWeight: 700,
  cursor: "pointer"
};
const activeWorkspaceButtonStyle = {
  background: "linear-gradient(180deg, rgba(216,253,241,0.14), rgba(29,42,54,0.96))",
  borderColor: "rgba(216,253,241,0.24)",
  color: "#ffffff"
};
const tooltipStyle = {
  background: "#08101a",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 14,
  color: "#eef4ff"
};
const rosterCardStyle = {
  display: "grid",
  gap: 12,
  padding: "14px 14px",
  borderRadius: 18,
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.06)"
};
const activeRosterCardStyle = {
  background: "radial-gradient(circle at top left, rgba(216,253,241,0.1), transparent 38%), rgba(255,255,255,0.03)",
  borderColor: "rgba(216,253,241,0.2)"
};
const rosterMetricStyle = {
  display: "grid",
  gap: 5,
  padding: "10px 11px",
  borderRadius: 13,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.05)"
};
const rosterMetricValueStyle = {
  color: "#eef4ff",
  fontWeight: 800,
  lineHeight: 1.35
};
const staffBlockStyle = {
  display: "grid",
  gap: 8,
  padding: "14px 15px",
  borderRadius: 18,
  background: "rgba(125, 174, 255, 0.07)",
  border: "1px solid rgba(125, 174, 255, 0.12)"
};
const patternRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "start",
  padding: "11px 12px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.05)"
};
const reviewQueueButtonStyle = {
  display: "grid",
  gap: 10,
  width: "100%",
  textAlign: "left",
  padding: "13px 13px",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.06)",
  background: "rgba(255,255,255,0.03)",
  cursor: "pointer"
};
const activeReviewQueueButtonStyle = {
  background: "radial-gradient(circle at top left, rgba(216,253,241,0.1), transparent 45%), rgba(255,255,255,0.04)",
  borderColor: "rgba(216,253,241,0.22)"
};
const timelinePhaseStyle = {
  display: "grid",
  gap: 10,
  padding: "12px 13px",
  borderRadius: 16,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.05)"
};
const detailStatCardStyle = {
  display: "grid",
  gap: 6,
  padding: "11px 12px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.05)"
};
const detailStatCompactStyle = {
  display: "grid",
  gap: 4
};
const detailStatValueStyle = {
  color: "#eef4ff",
  fontSize: 18,
  fontWeight: 800,
  lineHeight: 1.1
};
const detailInfoCardStyle = {
  display: "grid",
  gap: 10,
  padding: "14px 14px",
  borderRadius: 18,
  background: "linear-gradient(180deg, rgba(10, 15, 23, 0.96), rgba(6, 9, 15, 0.96))",
  border: "1px solid rgba(255,255,255,0.06)"
};
const roadmapCardStyle = {
  padding: "12px 13px",
  borderRadius: 15,
  background: "rgba(255,255,255,0.025)",
  border: "1px solid rgba(255,255,255,0.05)",
  color: "#d6e0f0",
  lineHeight: 1.6
};
const benchmarkRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  padding: "12px 13px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.05)"
};
const referenceCardStyle = {
  display: "grid",
  gap: 12,
  padding: "16px 16px",
  borderRadius: 18,
  background: "linear-gradient(180deg, rgba(10, 15, 24, 0.98), rgba(7, 11, 17, 0.98))",
  border: "1px solid rgba(255,255,255,0.05)"
};
const emptyStateStyle = {
  padding: "14px 15px",
  borderRadius: 16,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.05)",
  color: "#c7d4ea",
  lineHeight: 1.65
};
function computeResourceScore(match) {
  return clamp(25 + match.timeline.csAt15 * 0.62 + (match.timeline.goldDiffAt15 ?? 0) / 40 - match.timeline.deathsPre14 * 11);
}
function computeSetupScore(match) {
  return clamp(
    24 + match.timeline.objectiveSetupScore * 0.62 + match.killParticipation * 0.34 - match.timeline.objectiveFightDeaths * 18
  );
}
function computeConversionScore(match) {
  return clamp(34 + match.score.macro * 0.45 + (match.win ? 18 : -10) + (match.timeline.goldDiffAt15 ?? 0) / 38 - match.timeline.objectiveFightDeaths * 10);
}
function buildPhaseChartData(matches, locale) {
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
      phaseLabel: t(locale, "Control de l\xEDnea", "Lane control"),
      baseline: Number(avg(groups.baseline.map(computeLaneControlScore)).toFixed(1)),
      recent: Number(avg(groups.recent.map(computeLaneControlScore)).toFixed(1)),
      wins: Number(avg(groups.wins.map(computeLaneControlScore)).toFixed(1)),
      losses: Number(avg(groups.losses.map(computeLaneControlScore)).toFixed(1))
    },
    {
      phaseLabel: t(locale, "Piso de recursos", "Resource floor"),
      baseline: Number(avg(groups.baseline.map(computeResourceScore)).toFixed(1)),
      recent: Number(avg(groups.recent.map(computeResourceScore)).toFixed(1)),
      wins: Number(avg(groups.wins.map(computeResourceScore)).toFixed(1)),
      losses: Number(avg(groups.losses.map(computeResourceScore)).toFixed(1))
    },
    {
      phaseLabel: t(locale, "Setup", "Setup"),
      baseline: Number(avg(groups.baseline.map(computeSetupScore)).toFixed(1)),
      recent: Number(avg(groups.recent.map(computeSetupScore)).toFixed(1)),
      wins: Number(avg(groups.wins.map(computeSetupScore)).toFixed(1)),
      losses: Number(avg(groups.losses.map(computeSetupScore)).toFixed(1))
    },
    {
      phaseLabel: t(locale, "Conversi\xF3n", "Conversion"),
      baseline: Number(avg(groups.baseline.map(computeConversionScore)).toFixed(1)),
      recent: Number(avg(groups.recent.map(computeConversionScore)).toFixed(1)),
      wins: Number(avg(groups.wins.map(computeConversionScore)).toFixed(1)),
      losses: Number(avg(groups.losses.map(computeConversionScore)).toFixed(1))
    }
  ];
}
function buildOperationalSignals(matches, locale) {
  const stableOpenings = matches.filter((match) => match.timeline.laneDeathsPre10 === 0);
  const playableTo15 = matches.filter((match) => match.timeline.deathsPre14 <= 1 && (match.timeline.goldDiffAt15 ?? 0) >= -250);
  const cleanResets = matches.filter((match) => match.timeline.resetTimingScore >= 62);
  const objectiveClean = matches.filter((match) => match.timeline.objectiveFightDeaths === 0);
  const leadSamples = matches.filter((match) => (match.timeline.goldDiffAt15 ?? 0) >= 250);
  const convertedLeads = leadSamples.filter((match) => match.win);
  return [
    {
      label: t(locale, "Inicios limpios", "Clean starts"),
      value: matches.length ? stableOpenings.length / matches.length * 100 : 0,
      detail: t(locale, `${stableOpenings.length}/${matches.length} sin muerte antes de 10`, `${stableOpenings.length}/${matches.length} without a pre-10 death`)
    },
    {
      label: t(locale, "Minuto 15 jugable", "Playable minute 15"),
      value: matches.length ? playableTo15.length / matches.length * 100 : 0,
      detail: t(locale, `${playableTo15.length}/${matches.length} llegan con margen`, `${playableTo15.length}/${matches.length} reach minute 15 with margin`)
    },
    {
      label: t(locale, "Resets limpios", "Clean resets"),
      value: matches.length ? cleanResets.length / matches.length * 100 : 0,
      detail: t(locale, `${cleanResets.length}/${matches.length} mantienen tempo razonable`, `${cleanResets.length}/${matches.length} keep a reasonable tempo`)
    },
    {
      label: t(locale, "Setup de objetivo", "Objective setup"),
      value: matches.length ? objectiveClean.length / matches.length * 100 : 0,
      detail: t(locale, `${objectiveClean.length}/${matches.length} sin muertes cerca de objetivo`, `${objectiveClean.length}/${matches.length} without objective-window deaths`)
    },
    {
      label: t(locale, "Conversi\xF3n de ventaja", "Lead conversion"),
      value: leadSamples.length ? convertedLeads.length / leadSamples.length * 100 : 0,
      detail: leadSamples.length ? t(locale, `${convertedLeads.length}/${leadSamples.length} ventajas convertidas`, `${convertedLeads.length}/${leadSamples.length} leads converted`) : t(locale, "Todav\xEDa no hay suficientes ventajas tempranas", "Not enough early leads yet")
    }
  ];
}
function classifyCollapse(match, locale) {
  if ((match.timeline.goldDiffAt15 ?? 0) >= 250 && !match.win) {
    return {
      id: "lead-drop",
      label: t(locale, "Se cae al convertir", "Drops on conversion"),
      reason: t(locale, "Consigue ventaja, pero no la transforma en control estable.", "Gets an advantage, but does not turn it into stable control.")
    };
  }
  if (match.timeline.objectiveFightDeaths > 0 || match.timeline.objectiveSetupDeaths > 0) {
    return {
      id: "setup-break",
      label: t(locale, "Se rompe en setup", "Breaks in setup"),
      reason: t(locale, "La fuga aparece antes o durante la ventana de objetivo.", "The leak appears before or during the objective window.")
    };
  }
  if (match.timeline.deathsPre14 >= 2 || match.timeline.laneDeathsPre10 >= 1) {
    return {
      id: "early-collapse",
      label: t(locale, "Se cae temprano", "Collapses early"),
      reason: t(locale, "La partida pierde jugabilidad demasiado pronto.", "The game loses playability too early.")
    };
  }
  if ((match.timeline.goldDiffAt15 ?? 0) <= -400 || (match.timeline.levelDiffAt15 ?? 0) <= -0.8) {
    return {
      id: "lane-deficit",
      label: t(locale, "Cede l\xEDnea/tempo", "Gives lane/tempo"),
      reason: t(locale, "Llega al 15 desde desventaja real de oro o nivel.", "Reaches minute 15 from a real gold or level deficit.")
    };
  }
  if (match.killParticipation < 45) {
    return {
      id: "map-disconnect",
      label: t(locale, "Llega desconectado", "Arrives disconnected"),
      reason: t(locale, "No se conecta a tiempo con las jugadas que mueven el mapa.", "Does not connect in time to the plays that move the map.")
    };
  }
  return {
    id: "reference",
    label: t(locale, "Base estable", "Stable base"),
    reason: t(locale, "La partida no muestra un colapso estructural dominante.", "The game does not show a dominant structural collapse.")
  };
}
function buildCollapsePatterns(matches, locale) {
  const source = matches.some((match) => !match.win) ? matches.filter((match) => !match.win) : matches;
  const grouped = /* @__PURE__ */ new Map();
  for (const match of source) {
    const collapse = classifyCollapse(match, locale);
    const current = grouped.get(collapse.id) ?? { ...collapse, matches: [] };
    current.matches.push(match);
    grouped.set(collapse.id, current);
  }
  return Array.from(grouped.values()).map((entry) => ({
    ...entry,
    count: entry.matches.length,
    rate: source.length ? entry.matches.length / source.length * 100 : 0
  })).sort((a, b) => b.count - a.count);
}
function inferBreakpoint(match, locale) {
  if ((match.timeline.goldDiffAt15 ?? 0) >= 250 && !match.win) {
    return {
      label: t(locale, "Post-15: mala conversi\xF3n", "Post-15: poor conversion"),
      description: t(locale, "La partida lleg\xF3 jugable, pero no sostuvo control despu\xE9s de la ventaja.", "The game reached a playable state, but did not sustain control after the lead.")
    };
  }
  if (match.timeline.objectiveFightDeaths > 0 || match.timeline.objectiveSetupDeaths > 0) {
    return {
      label: t(locale, "Ventana de objetivo", "Objective window"),
      description: t(locale, "El mayor quiebre aparece en setup, llegada o ejecuci\xF3n alrededor del objetivo.", "The biggest break appears in setup, arrival or execution around the objective.")
    };
  }
  if (match.timeline.deathsPre14 >= 2) {
    return {
      label: t(locale, "0-14: disciplina", "0-14: discipline"),
      description: t(locale, "La primera muerte evitable parece cambiar toda la jugabilidad posterior.", "The first avoidable death seems to change the entire later game state.")
    };
  }
  if ((match.timeline.goldDiffAt15 ?? 0) <= -350) {
    return {
      label: t(locale, "10-15: econom\xEDa", "10-15: economy"),
      description: t(locale, "La partida se queda corta en recursos antes del primer tramo serio de mapa.", "The game runs short on resources before the first serious map segment.")
    };
  }
  return {
    label: t(locale, "Base estable", "Stable base"),
    description: t(locale, "Sirve como espejo para comparar con las partidas rotas.", "This works as a mirror against the broken games.")
  };
}
function buildReviewTimeline(matches, dataset, locale) {
  const agendaIds = dataset.summary.reviewAgenda.map((item) => item.matchId);
  const prioritized = matches.filter((match) => agendaIds.includes(match.matchId)).sort((a, b) => agendaIds.indexOf(a.matchId) - agendaIds.indexOf(b.matchId));
  const fallback = matches.filter((match) => !match.win || match.timeline.objectiveFightDeaths > 0 || match.timeline.deathsPre14 >= 2).sort((a, b) => b.gameCreation - a.gameCreation);
  return (prioritized.length ? prioritized : fallback).slice(0, 4).map((match) => ({
    match,
    reviewItem: dataset.summary.reviewAgenda.find((item) => item.matchId === match.matchId),
    breakpoint: inferBreakpoint(match, locale)
  }));
}
function buildStaffBrief(patterns, signals, locale) {
  const mainPattern = patterns[0];
  const weakestSignal = [...signals].sort((a, b) => a.value - b.value)[0];
  if (!mainPattern || !weakestSignal) {
    return t(locale, "Todav\xEDa no hay suficiente muestra para una lectura de staff m\xE1s dura.", "There is not enough sample yet for a harder staff read.");
  }
  return t(
    locale,
    `Hoy el patr\xF3n dominante es "${mainPattern.label}": concentra ${formatDecimal(mainPattern.rate)}% de las partidas problem\xE1ticas. Adem\xE1s, "${weakestSignal.label}" est\xE1 en ${formatDecimal(weakestSignal.value)}%, as\xED que conviene preparar reviews donde el coach aisle primero el punto de quiebre y despu\xE9s el h\xE1bito que lo habilita.`,
    `Right now the dominant pattern is "${mainPattern.label}": it concentrates ${formatDecimal(mainPattern.rate)}% of problematic games. Also, "${weakestSignal.label}" is at ${formatDecimal(weakestSignal.value)}%, so reviews should isolate the breakpoint first and then the habit that enabled it.`
  );
}
function detectDominantQueueBucket(matches) {
  const counts = /* @__PURE__ */ new Map();
  for (const match of matches) {
    const bucket = match.queueId === 420 ? "RANKED_SOLO" : match.queueId === 440 ? "RANKED_FLEX" : "OTHER";
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "OTHER";
}
function getAnchorTier(dataset) {
  if (dataset.rank?.soloQueue.tier && dataset.rank.soloQueue.tier !== "UNRANKED") return dataset.rank.soloQueue.tier;
  if (dataset.rank?.highest.tier && dataset.rank.highest.tier !== "UNRANKED") return dataset.rank.highest.tier;
  return null;
}
function buildTierBenchmarkRows(dataset, locale) {
  const tier = getAnchorTier(dataset);
  const role = dataset.summary.primaryRole;
  if (!tier || !role || role === "ALL") return [];
  const dominantQueue = detectDominantQueueBucket(dataset.matches);
  const roleBenchmarks = dataset.benchmarks?.roleBenchmarks ?? [];
  const benchmark = roleBenchmarks.find((entry) => entry.tier === tier && entry.role === role && entry.queueBucket === dominantQueue && entry.championName === null) ?? roleBenchmarks.find((entry) => entry.tier === tier && entry.role === role && entry.championName === null) ?? null;
  const avgCsAt15 = avg(dataset.matches.map((match) => match.timeline.csAt15));
  const avgGoldAt15 = avg(dataset.matches.map((match) => match.timeline.goldAt15));
  const avgDeathsPre14 = avg(dataset.matches.map((match) => match.timeline.deathsPre14));
  const avgLevelAt15 = avg(dataset.matches.map((match) => match.timeline.levelAt15));
  const csProgression = buildCs15ProgressionBenchmark(role, tier, avgCsAt15);
  const levelProgression = buildLevel15ProgressionBenchmark(role, tier, avgLevelAt15);
  return [
    {
      label: "CS@15",
      actual: avgCsAt15,
      benchmark: benchmark?.avgCsAt15 ?? csProgression?.currentTier.value ?? null
    },
    {
      label: "Gold@15",
      actual: avgGoldAt15,
      benchmark: benchmark?.avgGoldAt15 ?? null
    },
    {
      label: t(locale, "Muertes pre14", "Deaths pre14"),
      actual: avgDeathsPre14,
      benchmark: benchmark?.avgDeathsPre14 ?? null
    },
    {
      label: "Lvl@15",
      actual: avgLevelAt15,
      benchmark: benchmark?.avgLevelAt15 ?? levelProgression?.currentTier.value ?? null
    }
  ].map((entry) => ({
    ...entry,
    delta: entry.benchmark === null ? null : Number((entry.actual - entry.benchmark).toFixed(1))
  }));
}
function buildPerformanceBandProxy(dataset, benchmarkRows, locale) {
  const tier = getAnchorTier(dataset);
  if (!tier || !benchmarkRows.length) {
    return {
      label: t(locale, "Sin proxy estable todav\xEDa", "No stable proxy yet"),
      summary: t(locale, "Hace falta un rank visible y m\xE1s benchmark interno para aproximar el nivel de lobby.", "A visible rank and more internal benchmark data are needed to approximate lobby level."),
      note: t(locale, "Esto ser\xEDa una proxy de performance, no el MMR real de Riot.", "This would be a performance proxy, not Riot\u2019s real MMR.")
    };
  }
  const score = benchmarkRows.reduce((sum, row) => {
    if (row.delta === null) return sum;
    if (row.label === t(locale, "Muertes pre14", "Deaths pre14")) return sum + (row.delta <= -0.2 ? 1 : row.delta >= 0.2 ? -1 : 0);
    return sum + (row.delta >= 0.8 ? 1 : row.delta <= -0.8 ? -1 : 0);
  }, 0);
  const winRate = dataset.matches.length ? dataset.matches.filter((match) => match.win).length / dataset.matches.length * 100 : 0;
  if (score >= 2 && winRate >= 55) {
    return {
      label: t(locale, `Proxy: borde alto de ${tier}`, `Proxy: high edge of ${tier}`),
      summary: t(locale, "Por econom\xEDa y disciplina temprana, el bloque se parece m\xE1s al borde alto de su tier que al promedio interno.", "By economy and early discipline, the block looks closer to the high edge of its tier than to the internal average."),
      note: t(locale, "No revela el elo real del lobby: solo aproxima d\xF3nde rinde hoy contra referencias internas.", "This does not reveal the lobby\u2019s real elo: it only approximates where the player performs today against internal references.")
    };
  }
  if (score <= -2) {
    return {
      label: t(locale, `Proxy: por debajo del ritmo de ${tier}`, `Proxy: below ${tier} pace`),
      summary: t(locale, "El bloque rinde por debajo del ritmo interno esperado para su tier, sobre todo en econom\xEDa/tempo temprano.", "The block is performing below the internal pace expected for the tier, especially in early economy/tempo."),
      note: t(locale, "No es MMR real ni matchmaking exacto: es una lectura proxy de performance.", "This is not real MMR nor exact matchmaking: it is a proxy performance read.")
    };
  }
  return {
    label: t(locale, `Proxy: ritmo actual de ${tier}`, `Proxy: current ${tier} pace`),
    summary: t(locale, "El bloque se mueve cerca del marco interno de su tier actual, sin una se\xF1al fuerte de overperformance u underperformance.", "The block is moving close to the internal frame of its current tier, without a strong overperformance or underperformance signal."),
    note: t(locale, "Usalo como contexto de staff, no como una afirmaci\xF3n de matchmaking real.", "Use it as staff context, not as a claim about real matchmaking.")
  };
}
function buildReferenceRows(dataset, roleReferences, locale) {
  const role = dataset.summary.primaryRole;
  if (!role || role === "ALL") return [];
  return roleReferences.filter((reference) => reference.role === role).slice(0, 3).map((reference) => ({
    id: reference.slotId,
    label: reference.slotLabel,
    subtitle: `${reference.gameName}#${reference.tagLine} \xB7 ${reference.rankLabel}`,
    highlights: [
      `CS@15 ${formatDecimal(reference.avgCsAt15)}`,
      `Gold@15 ${formatInteger(reference.avgGoldAt15)}`,
      t(locale, `${formatDecimal(reference.avgDeathsPre14)} muertes pre14`, `${formatDecimal(reference.avgDeathsPre14)} deaths pre14`),
      t(locale, `Consistencia ${formatDecimal(reference.consistencyIndex)}`, `Consistency ${formatDecimal(reference.consistencyIndex)}`)
    ]
  }));
}
function buildCoachKPIs(dataset, locale) {
  const ordered = [...dataset.matches].sort((a, b) => a.gameCreation - b.gameCreation);
  const recentCount = Math.min(8, Math.max(3, Math.ceil(ordered.length * 0.35)));
  const recent = ordered.slice(-Math.min(recentCount, ordered.length));
  const baseline = ordered.slice(0, Math.max(1, ordered.length - recent.length));
  const recentWr = recent.length ? recent.filter((match) => match.win).length / recent.length * 100 : 0;
  const baselineWr = baseline.length ? baseline.filter((match) => match.win).length / baseline.length * 100 : 0;
  const recentScore = avg(recent.map((match) => match.score.total));
  const baselineScore = avg(baseline.map((match) => match.score.total));
  const recentVolatility = avg(recent.map((match) => match.timeline.laneVolatilityScore));
  const recentSetup = avg(recent.map((match) => match.timeline.objectiveSetupScore));
  return [
    { label: t(locale, "Recent WR", "Recent WR"), value: `${formatDecimal(recentWr)}%`, hint: t(locale, `${formatDecimal(recentWr - baselineWr)} pts vs bloque previo`, `${formatDecimal(recentWr - baselineWr)} pts vs previous block`), trend: { direction: recentWr >= baselineWr + 1 ? "up" : recentWr <= baselineWr - 1 ? "down" : "steady", tone: recentWr >= baselineWr + 1 ? "positive" : recentWr <= baselineWr - 1 ? "negative" : "neutral" } },
    { label: t(locale, "Form score", "Form score"), value: formatDecimal(recentScore), hint: t(locale, `${formatDecimal(recentScore - baselineScore)} vs tramo previo`, `${formatDecimal(recentScore - baselineScore)} vs previous stretch`), trend: { direction: recentScore >= baselineScore + 0.4 ? "up" : recentScore <= baselineScore - 0.4 ? "down" : "steady", tone: recentScore >= baselineScore + 0.4 ? "positive" : recentScore <= baselineScore - 0.4 ? "negative" : "neutral" } },
    { label: t(locale, "Lane volatility", "Lane volatility"), value: formatDecimal(recentVolatility), hint: t(locale, "M\xE1s bajo suele ser mejor", "Lower is usually better"), trend: { direction: recentVolatility <= 38 ? "up" : recentVolatility >= 52 ? "down" : "steady", tone: recentVolatility <= 38 ? "positive" : recentVolatility >= 52 ? "negative" : "neutral" } },
    { label: t(locale, "Setup score", "Setup score"), value: formatDecimal(recentSetup), hint: t(locale, "Lectura de llegada a objetivos", "Objective arrival read"), trend: { direction: recentSetup >= 58 ? "up" : recentSetup <= 42 ? "down" : "steady", tone: recentSetup >= 58 ? "positive" : recentSetup <= 42 ? "negative" : "neutral" } }
  ];
}
function buildMatchDetailSegments(match, locale) {
  return [
    {
      id: "opening",
      label: "0-10",
      title: t(locale, "Entrada de l\xEDnea", "Lane entry"),
      state: match.timeline.laneDeathsPre10 === 0 ? "good" : "bad",
      detail: match.timeline.laneDeathsPre10 === 0 ? t(locale, "Sin muerte temprana visible.", "No visible early death.") : t(locale, `${match.timeline.laneDeathsPre10} muerte(s) antes de 10.`, `${match.timeline.laneDeathsPre10} death(s) before 10.`)
    },
    {
      id: "economy",
      label: "10-15",
      title: t(locale, "Econom\xEDa y tempo", "Economy and tempo"),
      state: (match.timeline.goldDiffAt15 ?? 0) >= -150 && match.timeline.deathsPre14 <= 1 ? "good" : (match.timeline.goldDiffAt15 ?? 0) <= -350 || match.timeline.deathsPre14 >= 2 ? "bad" : "warn",
      detail: `${formatInteger(match.timeline.goldDiffAt15 ?? 0)} G@15 \xB7 ${formatDecimal(match.timeline.deathsPre14)} D pre14`
    },
    {
      id: "setup",
      label: "Obj",
      title: t(locale, "Setup objetivo", "Objective setup"),
      state: match.timeline.objectiveFightDeaths === 0 && match.timeline.objectiveSetupDeaths === 0 ? "good" : "bad",
      detail: t(locale, `${match.timeline.objectiveSetupDeaths + match.timeline.objectiveFightDeaths} muerte(s) en setup/pelea`, `${match.timeline.objectiveSetupDeaths + match.timeline.objectiveFightDeaths} death(s) around setup/fight`)
    },
    {
      id: "close",
      label: "End",
      title: t(locale, "Conversi\xF3n", "Conversion"),
      state: match.win ? "good" : (match.timeline.goldDiffAt15 ?? 0) >= 250 ? "bad" : "warn",
      detail: match.win ? t(locale, "La partida se convirti\xF3.", "The game was converted.") : (match.timeline.goldDiffAt15 ?? 0) >= 250 ? t(locale, "Ventaja no convertida.", "Lead not converted.") : t(locale, "Partida perdida.", "Game lost.")
    }
  ];
}
function segmentTone(state) {
  if (state === "good") return "positive";
  if (state === "bad") return "negative";
  return "neutral";
}
function segmentDirection(state) {
  if (state === "good") return "up";
  if (state === "bad") return "down";
  return "steady";
}
function buildRoadmapNotes(locale) {
  return [
    t(locale, "Mapa de muertes con coordenadas reales y trazado de rutas, cuando entren eventos de posici\xF3n.", "Death map with real coordinates and route traces once position events are available."),
    t(locale, "Dashboard de los 10 jugadores en una partida para leer front-to-back, engage, peel y distribuci\xF3n real de recursos.", "10-player match dashboard to read front-to-back, engage, peel and real resource distribution."),
    t(locale, "Timeline completa de objetivos, kills y ventanas de reset para VOD review asistido.", "Full objective, kill and reset-window timeline for assisted VOD review.")
  ];
}
function CoachPremiumWorkspace({
  dataset,
  locale = "es",
  rosterPlayers = [],
  roleReferences = [],
  canManageRoster = false
}) {
  const [activeView, setActiveView] = useState("desk");
  const trendData = useMemo(() => buildMatchTrend(dataset.matches), [dataset.matches]);
  const phaseChartData = useMemo(() => buildPhaseChartData(dataset.matches, locale), [dataset.matches, locale]);
  const signals = useMemo(() => buildOperationalSignals(dataset.matches, locale), [dataset.matches, locale]);
  const patterns = useMemo(() => buildCollapsePatterns(dataset.matches, locale), [dataset.matches, locale]);
  const reviewTimeline = useMemo(() => buildReviewTimeline(dataset.matches, dataset, locale), [dataset.matches, dataset, locale]);
  const staffBrief = useMemo(() => buildStaffBrief(patterns, signals, locale), [patterns, signals, locale]);
  const benchmarkRows = useMemo(() => buildTierBenchmarkRows(dataset, locale), [dataset, locale]);
  const performanceBandProxy = useMemo(() => buildPerformanceBandProxy(dataset, benchmarkRows, locale), [dataset, benchmarkRows, locale]);
  const referenceRows = useMemo(() => buildReferenceRows(dataset, roleReferences, locale), [dataset, roleReferences, locale]);
  const coachKpis = useMemo(() => buildCoachKPIs(dataset, locale), [dataset, locale]);
  const loadedRosterPlayer = rosterPlayers.find((player) => player.isLoaded) ?? null;
  const loadedChampion = dataset.summary.championPool[0];
  const syncedRosterPlayers = rosterPlayers.filter((player) => player.localProfile);
  const roadmapNotes = buildRoadmapNotes(locale);
  const dominantPattern = patterns[0] ?? null;
  const weakestSignal = [...signals].sort((a, b) => a.value - b.value)[0] ?? null;
  const headerChampionName = loadedChampion?.championName ?? dataset.matches[0]?.championName ?? null;
  const profileIconUrl = loadedRosterPlayer?.localProfile?.profileIconId ? getProfileIconUrl(loadedRosterPlayer.localProfile.profileIconId, loadedRosterPlayer.localProfile.ddragonVersion ?? dataset.ddragonVersion) : dataset.profile?.profileIconId ? getProfileIconUrl(dataset.profile.profileIconId, dataset.ddragonVersion) : null;
  const [selectedMatchId, setSelectedMatchId] = useState(reviewTimeline[0]?.match.matchId ?? null);
  useEffect(() => {
    if (!reviewTimeline.some((entry) => entry.match.matchId === selectedMatchId)) {
      setSelectedMatchId(reviewTimeline[0]?.match.matchId ?? null);
    }
  }, [reviewTimeline, selectedMatchId]);
  const selectedReviewEntry = reviewTimeline.find((entry) => entry.match.matchId === selectedMatchId) ?? reviewTimeline[0] ?? null;
  const selectedSegments = selectedReviewEntry ? buildMatchDetailSegments(selectedReviewEntry.match, locale) : [];
  const activeViewMeta = {
    desk: {
      label: t(locale, "Command desk", "Command desk"),
      summary: t(locale, "Roster vivo, cola de intervenci\xF3n y agenda de staff.", "Live roster, intervention queue and staff agenda.")
    },
    player: {
      label: t(locale, "Player lens", "Player lens"),
      summary: t(locale, "Forma reciente, quiebres repetidos y lectura del bloque activo.", "Recent form, repeated breaks and read of the active block.")
    },
    review: {
      label: t(locale, "Review room", "Review room"),
      summary: t(locale, "Eleg\xED una partida y entr\xE1 con contexto, no con intuici\xF3n vac\xEDa.", "Pick a match and enter with context, not empty intuition.")
    },
    benchmarks: {
      label: t(locale, "Benchmarks", "Benchmarks"),
      summary: t(locale, "Compar\xE1 contra el tier actual sin vender MMR ni claims flojos.", "Compare against the current tier without selling MMR or weak claims.")
    }
  };
  const viewOrder = ["desk", "player", "review", "benchmarks"];
  return /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 16 }, children: [
    /* @__PURE__ */ jsx("section", { style: coachWorkspaceShellStyle, children: /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 14 }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "start" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 8, maxWidth: 900 }, children: [
          /* @__PURE__ */ jsx("div", { style: coachEyebrowStyle, children: t(locale, "Coach command desk", "Coach command desk") }),
          /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 32, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1.02 }, children: t(locale, "Una superficie de staff para preparar intervenci\xF3n, review y seguimiento.", "A staff surface to prepare intervention, review and follow-up.") }),
          /* @__PURE__ */ jsx("div", { style: { color: "#99a8bd", lineHeight: 1.75, maxWidth: 860 }, children: staffBrief })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }, children: [
          /* @__PURE__ */ jsx(Badge, { children: t(locale, `${dataset.summary.matches} partidas en el bloque`, `${dataset.summary.matches} matches in the block`) }),
          canManageRoster ? /* @__PURE__ */ jsx(Badge, { tone: "low", children: t(locale, `${rosterPlayers.length} jugadores en roster`, `${rosterPlayers.length} players in roster`) }) : null,
          /* @__PURE__ */ jsx(Badge, { tone: "medium", children: t(locale, "Staff lens", "Staff lens") })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "coach-workspace-hero-grid", style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }, children: [
        /* @__PURE__ */ jsxs("div", { style: coachHeroCardStyle, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: profileIconUrl ? "54px minmax(0, 1fr)" : "1fr", gap: 12, alignItems: "center" }, children: [
            profileIconUrl ? /* @__PURE__ */ jsx("img", { src: profileIconUrl, alt: dataset.player, width: 54, height: 54, style: { width: 54, height: 54, borderRadius: 16, border: "1px solid rgba(255,255,255,0.08)" } }) : null,
            /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 5 }, children: [
              /* @__PURE__ */ jsx("div", { style: coachMetaLabelStyle, children: t(locale, "Jugador cargado", "Loaded player") }),
              /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 20, fontWeight: 800, lineHeight: 1.08 }, children: `${dataset.player}#${dataset.tagLine}` }),
              /* @__PURE__ */ jsx("div", { style: { color: "#8fa0b7", fontSize: 13, lineHeight: 1.5 }, children: loadedRosterPlayer ? t(locale, "Est\xE1 dentro del roster del coach y ya se est\xE1 leyendo como cliente activo.", "This player is inside the coach roster and is already being read as the active client.") : t(locale, "Se est\xE1 leyendo como bloque activo. Si quer\xE9s seguimiento continuo, conviene dejarlo dentro del roster.", "This is being read as the active block. If you want continuous follow-up, it should live inside the coach roster.") })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
            headerChampionName ? /* @__PURE__ */ jsx(Badge, { tone: "low", children: headerChampionName }) : null,
            dataset.summary.primaryRole && dataset.summary.primaryRole !== "ALL" ? /* @__PURE__ */ jsx(Badge, { children: dataset.summary.primaryRole }) : null,
            loadedRosterPlayer ? /* @__PURE__ */ jsx(Badge, { tone: "default", children: t(locale, "Roster activo", "Active roster") }) : null
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: coachHeroCardStyle, children: [
          /* @__PURE__ */ jsx("div", { style: coachMetaLabelStyle, children: t(locale, "Pulso de roster", "Roster pulse") }),
          /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 26, fontWeight: 800, lineHeight: 1.05 }, children: `${syncedRosterPlayers.length}/${Math.max(rosterPlayers.length, 1)}` }),
          /* @__PURE__ */ jsx("div", { style: { color: "#9aa8bb", lineHeight: 1.65 }, children: rosterPlayers.length ? t(locale, "con perfil local listo para seguimiento, comparativa y refresh r\xE1pido.", "with a local profile ready for follow-up, comparison and quick refresh.") : t(locale, "Todav\xEDa no hay roster cargado desde cuenta coach.", "There is no coach roster loaded yet from the account.") }),
          /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }, children: [
            /* @__PURE__ */ jsx(MiniMeta, { label: t(locale, "Con sync", "Synced"), value: String(syncedRosterPlayers.length) }),
            /* @__PURE__ */ jsx(MiniMeta, { label: t(locale, "Sin cache", "No cache"), value: String(Math.max(0, rosterPlayers.length - syncedRosterPlayers.length)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: coachHeroCardStyle, children: [
          /* @__PURE__ */ jsx("div", { style: coachMetaLabelStyle, children: t(locale, "Colapso dominante", "Dominant collapse") }),
          /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 22, fontWeight: 800, lineHeight: 1.08 }, children: dominantPattern?.label ?? t(locale, "Sin patr\xF3n firme", "No firm pattern") }),
          /* @__PURE__ */ jsx("div", { style: { color: "#9aa8bb", lineHeight: 1.65 }, children: dominantPattern?.reason ?? t(locale, "Todav\xEDa falta muestra para una lectura de colapso dominante.", "There is still not enough sample for a dominant collapse read.") }),
          dominantPattern ? /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
            /* @__PURE__ */ jsx(Badge, { tone: "high", children: t(locale, `${formatDecimal(dominantPattern.rate)}% del problema`, `${formatDecimal(dominantPattern.rate)}% of the problem`) }),
            /* @__PURE__ */ jsx(Badge, { tone: "medium", children: t(locale, `${dominantPattern.count} partidas`, `${dominantPattern.count} matches`) })
          ] }) : null
        ] }),
        /* @__PURE__ */ jsxs("div", { style: coachHeroCardStyle, children: [
          /* @__PURE__ */ jsx("div", { style: coachMetaLabelStyle, children: t(locale, "Proxy competitiva", "Competitive proxy") }),
          /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 22, fontWeight: 800, lineHeight: 1.08 }, children: performanceBandProxy.label }),
          /* @__PURE__ */ jsx("div", { style: { color: "#9aa8bb", lineHeight: 1.65 }, children: performanceBandProxy.summary }),
          /* @__PURE__ */ jsx("div", { style: { color: "#74859a", fontSize: 12, lineHeight: 1.55 }, children: performanceBandProxy.note })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 4 }, children: [
          /* @__PURE__ */ jsx("div", { style: coachMetaLabelStyle, children: activeViewMeta[activeView].label }),
          /* @__PURE__ */ jsx("div", { style: { color: "#90a0b5", lineHeight: 1.6 }, children: activeViewMeta[activeView].summary })
        ] }),
        /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: viewOrder.map((view) => /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => setActiveView(view),
            style: {
              ...workspaceButtonStyle,
              ...activeView === view ? activeWorkspaceButtonStyle : {}
            },
            children: activeViewMeta[view].label
          },
          view
        )) })
      ] })
    ] }) }),
    activeView === "desk" ? /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 16 }, children: [
      /* @__PURE__ */ jsx(Card, { title: t(locale, "KPIs de seguimiento", "Follow-up KPIs"), subtitle: t(locale, "Cuatro n\xFAmeros para saber r\xE1pido si el bloque mejora, se rompe antes o llega mejor a objetivos.", "Four numbers to know quickly whether the block is improving, breaking earlier or arriving better to objectives."), children: /* @__PURE__ */ jsx("div", { className: "coach-kpi-grid", style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }, children: coachKpis.map((kpi) => /* @__PURE__ */ jsx(KPI, { label: kpi.label, value: kpi.value, hint: kpi.hint, trend: kpi.trend }, kpi.label)) }) }),
      /* @__PURE__ */ jsxs("div", { className: "coach-desk-grid", style: { display: "grid", gridTemplateColumns: "minmax(280px, 0.92fr) minmax(0, 1.08fr)", gap: 16 }, children: [
        /* @__PURE__ */ jsx(Card, { title: t(locale, "Dashboard de jugadores", "Player dashboard"), subtitle: t(locale, "Qui\xE9n est\xE1 listo para seguimiento real y qui\xE9n todav\xEDa necesita quedar cacheado o actualizado.", "Who is ready for real follow-up and who still needs to be cached or refreshed."), children: rosterPlayers.length ? /* @__PURE__ */ jsx("div", { style: { display: "grid", gap: 10 }, children: rosterPlayers.map((player) => {
          const iconUrl = player.localProfile?.profileIconId ? getProfileIconUrl(player.localProfile.profileIconId, player.localProfile.ddragonVersion ?? dataset.ddragonVersion) : null;
          const coverageLabel = player.localProfile ? t(locale, `${player.localProfile.matches}/${player.localProfile.targetMatches} listas`, `${player.localProfile.matches}/${player.localProfile.targetMatches} ready`) : t(locale, "Sin cache local", "No local cache");
          const syncLabel = player.localProfile ? formatRelativeDate(player.localProfile.lastSyncedAt, locale) : t(locale, "Nunca sincronizado", "Never synced");
          return /* @__PURE__ */ jsxs("div", { style: { ...rosterCardStyle, ...player.isLoaded ? activeRosterCardStyle : {} }, children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: iconUrl ? "44px minmax(0, 1fr)" : "1fr", gap: 12, alignItems: "center" }, children: [
              iconUrl ? /* @__PURE__ */ jsx("img", { src: iconUrl, alt: player.displayName, width: 44, height: 44, style: { width: 44, height: 44, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)" } }) : null,
              /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 4 }, children: [
                /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start", flexWrap: "wrap" }, children: [
                  /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontWeight: 800, lineHeight: 1.2 }, children: player.profile ? `${player.profile.gameName}#${player.profile.tagLine}` : player.displayName }),
                  /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" }, children: [
                    player.isLoaded ? /* @__PURE__ */ jsx(Badge, { tone: "low", children: t(locale, "Abierto", "Open") }) : null,
                    /* @__PURE__ */ jsx(Badge, { tone: player.localProfile ? "default" : "medium", children: player.localProfile ? t(locale, "Listo", "Ready") : t(locale, "Pendiente", "Pending") })
                  ] })
                ] }),
                /* @__PURE__ */ jsx("div", { style: { color: "#8d9bb0", fontSize: 13, lineHeight: 1.55 }, children: player.email ?? player.profile?.platform ?? t(locale, "Asignaci\xF3n de coach", "Coach assignment") })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }, children: [
              /* @__PURE__ */ jsx(RosterMetric, { label: t(locale, "Cobertura", "Coverage"), value: coverageLabel }),
              /* @__PURE__ */ jsx(RosterMetric, { label: t(locale, "Sync", "Sync"), value: syncLabel }),
              /* @__PURE__ */ jsx(RosterMetric, { label: t(locale, "Rank", "Rank"), value: player.localProfile?.rankLabel ?? "\u2014" })
            ] }),
            player.note ? /* @__PURE__ */ jsx("div", { style: { color: "#9aa8bc", lineHeight: 1.6 }, children: player.note }) : null
          ] }, player.assignmentId);
        }) }) : /* @__PURE__ */ jsx("div", { style: emptyStateStyle, children: canManageRoster ? t(locale, "Todav\xEDa no hay jugadores asignados al roster del coach. La estructura ya qued\xF3 preparada para operarlos desde ac\xE1 en cuanto existan.", "There are no players assigned to the coach roster yet. The structure is ready to operate them from here as soon as they exist.") : t(locale, "No hay roster disponible para esta cuenta.", "There is no roster available for this account.") }) }),
        /* @__PURE__ */ jsx(Card, { title: t(locale, "Intervention board", "Intervention board"), subtitle: t(locale, "Menos vanity, m\xE1s orden para decidir qu\xE9 corregir primero y qu\xE9 llevar a review.", "Less vanity, more order to decide what to correct first and what to bring into review."), children: /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 12 }, children: [
          /* @__PURE__ */ jsxs("div", { style: staffBlockStyle, children: [
            /* @__PURE__ */ jsx("div", { style: coachMetaLabelStyle, children: t(locale, "Lectura de staff", "Staff read") }),
            /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 18, fontWeight: 800, lineHeight: 1.2 }, children: dominantPattern?.label ?? t(locale, "Sin patr\xF3n dominante", "No dominant pattern") }),
            /* @__PURE__ */ jsx("div", { style: { color: "#9aa8bc", lineHeight: 1.65 }, children: staffBrief })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "coach-pattern-grid", style: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 12 }, children: [
            /* @__PURE__ */ jsxs("div", { style: detailInfoCardStyle, children: [
              /* @__PURE__ */ jsx("div", { style: coachMetaLabelStyle, children: t(locale, "Patrones que m\xE1s rompen partidas", "Patterns breaking games most often") }),
              /* @__PURE__ */ jsx("div", { style: { display: "grid", gap: 10 }, children: patterns.slice(0, 4).map((pattern) => /* @__PURE__ */ jsxs("div", { style: patternRowStyle, children: [
                /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 4 }, children: [
                  /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontWeight: 800 }, children: pattern.label }),
                  /* @__PURE__ */ jsx("div", { style: { color: "#90a0b5", fontSize: 13, lineHeight: 1.55 }, children: pattern.reason })
                ] }),
                /* @__PURE__ */ jsx(Badge, { tone: pattern.id === dominantPattern?.id ? "high" : "default", children: `${formatDecimal(pattern.rate)}%` })
              ] }, pattern.id)) })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: detailInfoCardStyle, children: [
              /* @__PURE__ */ jsx("div", { style: coachMetaLabelStyle, children: t(locale, "Se\xF1ales operativas", "Operational signals") }),
              /* @__PURE__ */ jsx("div", { style: { display: "grid", gap: 10 }, children: signals.map((signalItem) => /* @__PURE__ */ jsx(
                SignalBar,
                {
                  label: signalItem.label,
                  value: signalItem.value,
                  detail: signalItem.detail,
                  tone: weakestSignal?.label === signalItem.label ? "warning" : signalItem.value >= 60 ? "positive" : "neutral"
                },
                signalItem.label
              )) })
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "coach-layer-grid", style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }, children: [
            /* @__PURE__ */ jsx(
              ReviewLayerCard,
              {
                eyebrow: t(locale, "Quick review", "Quick review"),
                title: selectedReviewEntry?.breakpoint.label ?? t(locale, "Eleg\xED una partida", "Pick a match"),
                summary: selectedReviewEntry?.breakpoint.description ?? t(locale, "Usalo para aislar r\xE1pido d\xF3nde se rompe la jugabilidad.", "Use it to quickly isolate where playability breaks.")
              }
            ),
            /* @__PURE__ */ jsx(
              ReviewLayerCard,
              {
                eyebrow: t(locale, "Coach review", "Coach review"),
                title: weakestSignal?.label ?? t(locale, "Sin se\xF1al d\xE9bil clara", "No clear weak signal"),
                summary: weakestSignal?.detail ?? t(locale, "Hace falta m\xE1s muestra o m\xE1s roster para priorizar mejor.", "More sample or a wider roster are needed to prioritize better.")
              }
            ),
            /* @__PURE__ */ jsx(
              ReviewLayerCard,
              {
                eyebrow: t(locale, "Deep VOD review", "Deep VOD review"),
                title: dominantPattern?.label ?? t(locale, "Quiebre central", "Central break"),
                summary: t(locale, "Preparado para entrar con pregunta, evidencia y punto de quiebre; falta mapa/eventos para llevarlo al siguiente nivel.", "Ready to enter with a question, evidence and breakpoint; it still needs map/events to reach the next level.")
              }
            )
          ] })
        ] }) })
      ] })
    ] }) : null,
    activeView === "player" ? /* @__PURE__ */ jsxs("div", { className: "coach-player-grid", style: { display: "grid", gap: 16 }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)", gap: 16 }, children: [
        /* @__PURE__ */ jsx(Card, { title: t(locale, "Recent form", "Recent form"), subtitle: t(locale, "Score y volatilidad en una l\xEDnea para detectar si el bloque mejora o solo alterna highs y lows.", "Score and volatility in one line to detect whether the block improves or simply alternates highs and lows."), children: /* @__PURE__ */ jsx("div", { style: { width: "100%", height: 240 }, children: /* @__PURE__ */ jsx(ResponsiveContainer, { children: /* @__PURE__ */ jsxs(LineChart, { data: trendData, children: [
          /* @__PURE__ */ jsx(CartesianGrid, { stroke: "rgba(255,255,255,0.06)", vertical: false }),
          /* @__PURE__ */ jsx(XAxis, { dataKey: "game", tick: { fill: "#7f8ca1", fontSize: 12 }, axisLine: false, tickLine: false }),
          /* @__PURE__ */ jsx(YAxis, { tick: { fill: "#7f8ca1", fontSize: 12 }, axisLine: false, tickLine: false, domain: [0, 100] }),
          /* @__PURE__ */ jsx(Tooltip, { contentStyle: tooltipStyle }),
          /* @__PURE__ */ jsx(Line, { type: "monotone", dataKey: "score", stroke: "#d8fdf1", strokeWidth: 3, dot: false, name: t(locale, "Score", "Score") }),
          /* @__PURE__ */ jsx(Line, { type: "monotone", dataKey: "laneVolatility", stroke: "#7caeff", strokeWidth: 2, dot: false, name: t(locale, "Volatilidad", "Volatility") })
        ] }) }) }) }),
        /* @__PURE__ */ jsx(Card, { title: t(locale, "Lectura por fase", "Phase read"), subtitle: t(locale, "Compar\xE1 baseline contra tramo reciente para ver d\xF3nde se abri\xF3 o cerr\xF3 la fuga.", "Compare baseline versus recent stretch to see where the leak opened or closed."), children: /* @__PURE__ */ jsx("div", { style: { width: "100%", height: 240 }, children: /* @__PURE__ */ jsx(ResponsiveContainer, { children: /* @__PURE__ */ jsxs(BarChart, { data: phaseChartData, layout: "vertical", margin: { left: 8, right: 8 }, children: [
          /* @__PURE__ */ jsx(CartesianGrid, { stroke: "rgba(255,255,255,0.05)", horizontal: false }),
          /* @__PURE__ */ jsx(XAxis, { type: "number", tick: { fill: "#7f8ca1", fontSize: 12 }, axisLine: false, tickLine: false, domain: [0, 100] }),
          /* @__PURE__ */ jsx(YAxis, { type: "category", dataKey: "phaseLabel", tick: { fill: "#aeb9cb", fontSize: 12 }, axisLine: false, tickLine: false, width: 94 }),
          /* @__PURE__ */ jsx(Tooltip, { contentStyle: tooltipStyle }),
          /* @__PURE__ */ jsx(Bar, { dataKey: "baseline", fill: "rgba(124,174,255,0.7)", radius: 999, name: t(locale, "Baseline", "Baseline") }),
          /* @__PURE__ */ jsx(Bar, { dataKey: "recent", fill: "#d8fdf1", radius: 999, name: t(locale, "Reciente", "Recent") })
        ] }) }) }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 16 }, children: [
        /* @__PURE__ */ jsx(Card, { title: t(locale, "Quiebres repetidos", "Repeated breaks"), subtitle: t(locale, "Lo que m\xE1s se repite en derrotas o partidas tensas del bloque.", "What repeats most in losses or tense games within the block."), children: /* @__PURE__ */ jsx("div", { style: { display: "grid", gap: 10 }, children: patterns.length ? patterns.map((pattern) => /* @__PURE__ */ jsxs("div", { style: patternRowStyle, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 4 }, children: [
            /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontWeight: 800 }, children: pattern.label }),
            /* @__PURE__ */ jsx("div", { style: { color: "#90a0b5", fontSize: 13, lineHeight: 1.55 }, children: pattern.reason })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "grid", justifyItems: "end", gap: 5 }, children: [
            /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontWeight: 800 }, children: `${formatDecimal(pattern.rate)}%` }),
            /* @__PURE__ */ jsx("div", { style: { color: "#8091a6", fontSize: 12 }, children: t(locale, `${pattern.count} partidas`, `${pattern.count} matches`) })
          ] })
        ] }, pattern.id)) : /* @__PURE__ */ jsx("div", { style: emptyStateStyle, children: t(locale, "No hay suficientes quiebres repetidos para este bloque.", "There are not enough repeated breaks for this block.") }) }) }),
        /* @__PURE__ */ jsx(Card, { title: t(locale, "Se\xF1ales de jugabilidad", "Playability signals"), subtitle: t(locale, "No muestran todo, pero ordenan qu\xE9 tan seguido la partida llega jugable al 15 y a la primera ventana seria.", "They do not show everything, but they order how often the game reaches minute 15 and the first serious window in a playable state."), children: /* @__PURE__ */ jsx("div", { style: { display: "grid", gap: 10 }, children: signals.map((signalItem) => /* @__PURE__ */ jsx(
          SignalBar,
          {
            label: signalItem.label,
            value: signalItem.value,
            detail: signalItem.detail,
            tone: signalItem.value >= 60 ? "positive" : signalItem.value <= 40 ? "warning" : "neutral"
          },
          signalItem.label
        )) }) })
      ] })
    ] }) : null,
    activeView === "review" ? /* @__PURE__ */ jsxs("div", { className: "coach-review-grid", style: { display: "grid", gridTemplateColumns: "minmax(280px, 0.92fr) minmax(0, 1.08fr)", gap: 16 }, children: [
      /* @__PURE__ */ jsx(Card, { title: t(locale, "Review queue", "Review queue"), subtitle: t(locale, "Partidas elegidas para entrar con pregunta y contexto de quiebre.", "Matches chosen to enter with a question and breakpoint context."), children: reviewTimeline.length ? /* @__PURE__ */ jsx("div", { style: { display: "grid", gap: 10 }, children: reviewTimeline.map((entry) => /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: () => setSelectedMatchId(entry.match.matchId),
          style: {
            ...reviewQueueButtonStyle,
            ...selectedReviewEntry?.match.matchId === entry.match.matchId ? activeReviewQueueButtonStyle : {}
          },
          children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "start" }, children: [
              /* @__PURE__ */ jsx(
                ChampionIdentity,
                {
                  championName: entry.match.championName,
                  version: dataset.ddragonVersion,
                  subtitle: `${entry.match.opponentChampionName ? `vs ${entry.match.opponentChampionName} \xB7 ` : ""}${new Date(entry.match.gameCreation).toLocaleDateString(locale === "en" ? "en-US" : "es-AR")}`,
                  size: 44
                }
              ),
              /* @__PURE__ */ jsx(Badge, { tone: entry.match.win ? "low" : "high", children: entry.match.win ? t(locale, "Win", "Win") : t(locale, "Loss", "Loss") })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 4 }, children: [
              /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontWeight: 800 }, children: entry.breakpoint.label }),
              /* @__PURE__ */ jsx("div", { style: { color: "#8ea0b6", fontSize: 13, lineHeight: 1.55 }, children: entry.breakpoint.description })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
              /* @__PURE__ */ jsx(Badge, { children: `KDA ${entry.match.kills}/${entry.match.deaths}/${entry.match.assists}` }),
              /* @__PURE__ */ jsx(Badge, { tone: "medium", children: `Score ${formatDecimal(entry.match.score.total)}` })
            ] })
          ]
        },
        entry.match.matchId
      )) }) : /* @__PURE__ */ jsx("div", { style: emptyStateStyle, children: t(locale, "Todav\xEDa no hay una cola de review clara para este bloque.", "There is no clear review queue for this block yet.") }) }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 16 }, children: [
        /* @__PURE__ */ jsx(Card, { title: t(locale, "Match room", "Match room"), subtitle: t(locale, "Una vista \xFAtil hoy: contexto, punto de quiebre y evidencia utilizable para review.", "A useful view today: context, breakpoint and evidence you can actually use in review."), children: selectedReviewEntry ? /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 14 }, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "start" }, children: [
            /* @__PURE__ */ jsx(
              ChampionIdentity,
              {
                championName: selectedReviewEntry.match.championName,
                version: dataset.ddragonVersion,
                subtitle: `${selectedReviewEntry.match.opponentChampionName ? `vs ${selectedReviewEntry.match.opponentChampionName} \xB7 ` : ""}${new Date(selectedReviewEntry.match.gameCreation).toLocaleString(locale === "en" ? "en-US" : "es-AR")}`,
                meta: /* @__PURE__ */ jsx(Badge, { tone: selectedReviewEntry.match.win ? "low" : "high", children: selectedReviewEntry.match.win ? t(locale, "Victoria", "Win") : t(locale, "Derrota", "Loss") }),
                size: 52
              }
            ),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
              /* @__PURE__ */ jsx(Badge, { tone: "medium", children: selectedReviewEntry.breakpoint.label }),
              selectedReviewEntry.reviewItem?.tags?.slice(0, 2).map((tag) => /* @__PURE__ */ jsx(Badge, { children: tag }, tag))
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "match-room-stat-grid", style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }, children: [
            /* @__PURE__ */ jsx(DetailMetric, { label: "KDA", value: `${selectedReviewEntry.match.kills}/${selectedReviewEntry.match.deaths}/${selectedReviewEntry.match.assists}` }),
            /* @__PURE__ */ jsx(DetailMetric, { label: "KP", value: `${formatDecimal(selectedReviewEntry.match.killParticipation)}%` }),
            /* @__PURE__ */ jsx(DetailMetric, { label: "CS@15", value: formatDecimal(selectedReviewEntry.match.timeline.csAt15) }),
            /* @__PURE__ */ jsx(DetailMetric, { label: "Gold@15", value: formatInteger(selectedReviewEntry.match.timeline.goldAt15) }),
            /* @__PURE__ */ jsx(DetailMetric, { label: "Score", value: formatDecimal(selectedReviewEntry.match.score.total) }),
            /* @__PURE__ */ jsx(DetailMetric, { label: t(locale, "Da\xF1o", "Damage"), value: formatInteger(selectedReviewEntry.match.damageToChampions) })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "match-room-segment-grid", style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }, children: selectedSegments.map((segment) => /* @__PURE__ */ jsxs("div", { style: timelinePhaseStyle, children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start" }, children: [
              /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 5 }, children: [
                /* @__PURE__ */ jsx("div", { style: coachMetaLabelStyle, children: segment.label }),
                /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontWeight: 800 }, children: segment.title })
              ] }),
              /* @__PURE__ */ jsx(TrendIndicator, { direction: segmentDirection(segment.state), tone: segmentTone(segment.state) })
            ] }),
            /* @__PURE__ */ jsx("div", { style: { color: "#8ea0b6", fontSize: 13, lineHeight: 1.55 }, children: segment.detail })
          ] }, segment.id)) }),
          /* @__PURE__ */ jsxs("div", { className: "match-room-context-grid", style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }, children: [
            /* @__PURE__ */ jsxs("div", { style: detailInfoCardStyle, children: [
              /* @__PURE__ */ jsx("div", { style: coachMetaLabelStyle, children: t(locale, "Tempo temprano", "Early tempo") }),
              /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 8 }, children: [
                /* @__PURE__ */ jsx(DetailMetric, { label: t(locale, "Primera muerte", "First death"), value: selectedReviewEntry.match.timeline.firstDeathMinute ? `${formatDecimal(selectedReviewEntry.match.timeline.firstDeathMinute)}m` : "\u2014", compact: true }),
                /* @__PURE__ */ jsx(DetailMetric, { label: t(locale, "Primer reset", "First reset"), value: selectedReviewEntry.match.timeline.firstBaseMinute ? `${formatDecimal(selectedReviewEntry.match.timeline.firstBaseMinute)}m` : "\u2014", compact: true }),
                /* @__PURE__ */ jsx(DetailMetric, { label: t(locale, "Muertes pre14", "Deaths pre14"), value: formatDecimal(selectedReviewEntry.match.timeline.deathsPre14), compact: true }),
                /* @__PURE__ */ jsx(DetailMetric, { label: t(locale, "Diff oro 15", "Gold diff 15"), value: formatInteger(selectedReviewEntry.match.timeline.goldDiffAt15 ?? 0), compact: true })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: detailInfoCardStyle, children: [
              /* @__PURE__ */ jsx("div", { style: coachMetaLabelStyle, children: t(locale, "Objetivos y quiebre", "Objectives and breakpoint") }),
              /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 8 }, children: [
                /* @__PURE__ */ jsx(DetailMetric, { label: t(locale, "Muertes setup", "Setup deaths"), value: formatInteger(selectedReviewEntry.match.timeline.objectiveSetupDeaths), compact: true }),
                /* @__PURE__ */ jsx(DetailMetric, { label: t(locale, "Muertes fight", "Fight deaths"), value: formatInteger(selectedReviewEntry.match.timeline.objectiveFightDeaths), compact: true }),
                /* @__PURE__ */ jsx(DetailMetric, { label: t(locale, "Takedowns setup", "Setup takedowns"), value: formatInteger(selectedReviewEntry.match.timeline.objectiveSetupTakedowns), compact: true }),
                /* @__PURE__ */ jsx(DetailMetric, { label: t(locale, "Volatilidad", "Volatility"), value: formatDecimal(selectedReviewEntry.match.timeline.laneVolatilityScore), compact: true })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: detailInfoCardStyle, children: [
              /* @__PURE__ */ jsx("div", { style: coachMetaLabelStyle, children: t(locale, "Pregunta de review", "Review question") }),
              /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", lineHeight: 1.65 }, children: selectedReviewEntry.reviewItem?.question ?? t(locale, "\xBFQu\xE9 pas\xF3 justo antes de que la partida dejara de ser jugable?", "What happened right before the game stopped being playable?") }),
              /* @__PURE__ */ jsx("div", { style: { color: "#8ea0b6", lineHeight: 1.6 }, children: selectedReviewEntry.reviewItem?.focus ?? t(locale, "Us\xE1 el punto de quiebre para mirar la decisi\xF3n previa, no solo la jugada final.", "Use the breakpoint to inspect the prior decision, not only the final play.") })
            ] })
          ] })
        ] }) : /* @__PURE__ */ jsx("div", { style: emptyStateStyle, children: t(locale, "Eleg\xED una partida para abrir el room de review.", "Pick a match to open the review room.") }) }),
        /* @__PURE__ */ jsx(Card, { title: t(locale, "Roadmap de review profundo", "Deep review roadmap"), subtitle: t(locale, "Lo m\xE1ximo viable hoy con esta data ya qued\xF3 resuelto arriba. Esto es lo que elevar\xEDa la review al siguiente est\xE1ndar.", "The maximum viable experience with current data is already solved above. This is what would raise review to the next standard."), children: /* @__PURE__ */ jsx("div", { style: { display: "grid", gap: 10 }, children: roadmapNotes.map((note) => /* @__PURE__ */ jsx("div", { style: roadmapCardStyle, children: note }, note)) }) })
      ] })
    ] }) : null,
    activeView === "benchmarks" ? /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 16 }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: "minmax(0, 1.05fr) minmax(280px, 0.95fr)", gap: 16 }, children: [
        /* @__PURE__ */ jsx(Card, { title: t(locale, "Benchmarks internos por tier", "Internal tier benchmarks"), subtitle: t(locale, "Comparan el bloque actual contra referencias internas del mismo rol y tier. No son MMR ni lobby truth.", "They compare the current block against internal references from the same role and tier. They are not MMR nor lobby truth."), children: benchmarkRows.length ? /* @__PURE__ */ jsx("div", { style: { display: "grid", gap: 10 }, children: benchmarkRows.map((row) => /* @__PURE__ */ jsxs("div", { style: benchmarkRowStyle, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 4 }, children: [
            /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontWeight: 800 }, children: row.label }),
            /* @__PURE__ */ jsx("div", { style: { color: "#8ea0b6", fontSize: 13 }, children: t(locale, "Actual vs benchmark interno", "Actual vs internal benchmark") })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "grid", justifyItems: "end", gap: 4 }, children: [
            /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontWeight: 800 }, children: row.benchmark === null ? formatDecimal(row.actual) : `${formatDecimal(row.actual)} / ${formatDecimal(row.benchmark)}` }),
            /* @__PURE__ */ jsx(BenchmarkDeltaPill, { delta: row.delta, inverted: row.label === t(locale, "Muertes pre14", "Deaths pre14"), locale })
          ] })
        ] }, row.label)) }) : /* @__PURE__ */ jsx("div", { style: emptyStateStyle, children: t(locale, "Hace falta tier visible y benchmark interno para esta lectura.", "A visible tier and internal benchmark are needed for this read.") }) }),
        /* @__PURE__ */ jsx(Card, { title: t(locale, "Lectura proxy de lobby", "Proxy lobby read"), subtitle: t(locale, "Aproxima d\xF3nde est\xE1 rindiendo este bloque hoy frente a referencias internas.", "It approximates where this block is performing today against internal references."), children: /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 12 }, children: [
          /* @__PURE__ */ jsxs("div", { style: staffBlockStyle, children: [
            /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 20, fontWeight: 800, lineHeight: 1.15 }, children: performanceBandProxy.label }),
            /* @__PURE__ */ jsx("div", { style: { color: "#9aa8bc", lineHeight: 1.65 }, children: performanceBandProxy.summary })
          ] }),
          /* @__PURE__ */ jsx("div", { style: { color: "#7f91a7", fontSize: 12, lineHeight: 1.55 }, children: performanceBandProxy.note })
        ] }) })
      ] }),
      /* @__PURE__ */ jsx(Card, { title: t(locale, "Referencias elite del rol", "Elite role references"), subtitle: t(locale, "No para copiar sin pensar, sino para ver qu\xE9 baseline competitivo conviene imitar.", "Not to copy blindly, but to see which competitive baseline is worth imitating."), children: referenceRows.length ? /* @__PURE__ */ jsx("div", { className: "coach-reference-grid", style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }, children: referenceRows.map((reference) => /* @__PURE__ */ jsxs("div", { style: referenceCardStyle, children: [
        /* @__PURE__ */ jsx("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start" }, children: /* @__PURE__ */ jsx(Badge, { tone: "default", children: reference.label }) }),
        /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 5 }, children: [
          /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 18, fontWeight: 800, lineHeight: 1.15 }, children: reference.subtitle }),
          /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: reference.highlights.map((highlight) => /* @__PURE__ */ jsx(Badge, { tone: "low", children: highlight }, highlight)) })
        ] })
      ] }, reference.id)) }) : /* @__PURE__ */ jsx("div", { style: emptyStateStyle, children: t(locale, "Todav\xEDa no hay referencias elite disponibles para este rol.", "There are no elite references available for this role yet.") }) })
    ] }) : null
  ] });
}
export {
  CoachPremiumWorkspace
};
