import { jsx, jsxs } from "react/jsx-runtime";
import { Badge, Card, ChampionIdentity } from "../../components/ui";
import { getItemIconUrl } from "../../lib/lol";
import { formatDecimal, formatInteger, formatPercent, formatSignedNumber } from "../../lib/format";
import { evidenceBadgeLabel, evidenceExplanation, evidenceTone } from "../premium-analysis/evidence";
import { buildChampionBuildWorkbench } from "./buildWorkbench";
function BuildsTab({ dataset, locale = "es" }) {
  const workspace = buildChampionBuildWorkbench(dataset, locale);
  if (!workspace.ready) {
    return /* @__PURE__ */ jsx(
      Card,
      {
        title: locale === "en" ? "Builds / items lab" : "Lab de builds / items",
        subtitle: locale === "en" ? "This workspace needs the new timeline-enriched snapshots. A fresh sync will unlock item timings, tracked activations and build families." : "Este workspace necesita los nuevos snapshots enriquecidos con timeline. Un sync fresco va a desbloquear timings de items, activaciones seguidas y familias de build.",
        children: /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 12, color: "#c8d5e7", lineHeight: 1.7 }, children: [
          /* @__PURE__ */ jsx("div", { children: locale === "en" ? "The implementation is ready, but the visible profile was collected before we started storing purchase events and item milestones." : "La implementaci\xF3n ya est\xE1 lista, pero el perfil visible fue recolectado antes de que empez\xE1ramos a guardar eventos de compra y milestones de items." }),
          /* @__PURE__ */ jsx("div", { style: notePanelStyle, children: locale === "en" ? "Next step: refresh the profile so the collector stores first item / second item / boots timings, tracked windows like Cull or Hubris, and enemy composition pressure summaries." : "Siguiente paso: refrescar el perfil para que el collector guarde timings de primer item / segundo item / botas, ventanas seguidas como Cull o Hubris y res\xFAmenes de presi\xF3n de composici\xF3n enemiga." })
        ] })
      }
    );
  }
  const comparisons = workspace.champions.flatMap((champion) => champion.comparisons);
  const strongReads = comparisons.filter((comparison) => comparison.evidenceTier === "strong").length;
  const weakReads = comparisons.filter((comparison) => comparison.evidenceTier === "weak").length;
  return /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 18 }, children: [
    /* @__PURE__ */ jsx(
      Card,
      {
        title: locale === "en" ? "Builds / items lab" : "Lab de builds / items",
        subtitle: locale === "en" ? "A premium build system: family comparisons, timing leverage, comp-fit, missing answers and concrete examples." : "Un sistema premium de builds: comparaciones de familias, leverage de timing, comp-fit, respuestas faltantes y ejemplos concretos.",
        children: /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 16 }, children: [
          /* @__PURE__ */ jsxs("div", { style: topSummaryGridStyle, children: [
            /* @__PURE__ */ jsx(
              SummaryBox,
              {
                label: locale === "en" ? "Champions with build families" : "Campeones con familias de build",
                value: String(workspace.champions.length),
                hint: locale === "en" ? "At least one baseline plus an alternative path." : "Al menos un baseline m\xE1s un path alternativo."
              }
            ),
            /* @__PURE__ */ jsx(
              SummaryBox,
              {
                label: locale === "en" ? "Strong build reads" : "Lecturas fuertes de build",
                value: String(strongReads),
                hint: locale === "en" ? "Families with decent sample and a real change in output." : "Familias con muestra decente y un cambio real de output."
              }
            ),
            /* @__PURE__ */ jsx(
              SummaryBox,
              {
                label: locale === "en" ? "Directional reads" : "Lecturas direccionales",
                value: String(weakReads + comparisons.length - strongReads - weakReads),
                hint: locale === "en" ? "Useful for watchlists, not yet a closed answer." : "Sirven para watchlists, no todav\xEDa como respuesta cerrada."
              }
            )
          ] }),
          /* @__PURE__ */ jsx("div", { style: notePanelStyle, children: locale === "en" ? "Every champion now gets a baseline family, alternative families, timing deltas, early-state and duration splits, comp-fit heuristics, leverage/underperformance by item, and a mini context layer with example matches." : "Cada campe\xF3n ahora recibe una familia baseline, familias alternativas, deltas de timing, cortes por early y duraci\xF3n, heur\xEDsticas de comp-fit, leverage/underperformance por item y una mini capa de contexto con partidas ejemplo." })
        ] })
      }
    ),
    workspace.champions.map((champion) => /* @__PURE__ */ jsx(
      Card,
      {
        title: champion.championName,
        subtitle: locale === "en" ? `${champion.games} visible games. The baseline is the most repeated build family for this champion in the current sample.` : `${champion.games} partidas visibles. El baseline es la familia de build m\xE1s repetida para este campe\xF3n en la muestra actual.`,
        children: /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 18 }, children: [
          /* @__PURE__ */ jsx(
            ChampionIdentity,
            {
              championName: champion.championName,
              version: dataset.ddragonVersion,
              subtitle: champion.headline,
              meta: /* @__PURE__ */ jsx(Badge, { children: locale === "en" ? `${champion.buildFamilies.length} visible families` : `${champion.buildFamilies.length} familias visibles` })
            }
          ),
          /* @__PURE__ */ jsx("div", { style: headlinePanelStyle, children: champion.decisionNote }),
          champion.baseline ? /* @__PURE__ */ jsx(BaselineBuildPanel, { dataset, baseline: champion.baseline, locale }) : null,
          champion.comparisons.length ? /* @__PURE__ */ jsx("div", { style: { display: "grid", gap: 12 }, children: champion.comparisons.slice(0, 3).map((comparison) => /* @__PURE__ */ jsx(BuildComparisonCard, { dataset, comparison, locale }, `${comparison.variant.key}-${comparison.variant.label}`)) }) : /* @__PURE__ */ jsx("div", { style: emptyStateStyle, children: locale === "en" ? "There is still only one clear family for this champion, so the workspace tracks timings, comp-fit and item signals without forcing fake build-versus-build claims." : "Todav\xEDa hay una sola familia clara para este campe\xF3n, as\xED que el workspace sigue timings, comp-fit y se\xF1ales por item sin forzar claims falsos de build contra build." }),
          /* @__PURE__ */ jsxs("div", { style: signalGridStyle, children: [
            /* @__PURE__ */ jsx(
              ItemSignalColumn,
              {
                title: locale === "en" ? "Items with leverage" : "Items con leverage",
                emptyLabel: locale === "en" ? "Still no item shows a clean positive lift." : "Todav\xEDa no aparece un item con lift positivo limpio.",
                items: champion.topItems,
                dataset,
                locale
              }
            ),
            /* @__PURE__ */ jsx(
              ItemSignalColumn,
              {
                title: locale === "en" ? "Items underperforming" : "Items flojos",
                emptyLabel: locale === "en" ? "Still no weak item pattern is visible." : "Todav\xEDa no aparece un patr\xF3n claro de item flojo.",
                items: champion.weakItems,
                dataset,
                locale
              }
            )
          ] })
        ] })
      },
      champion.championName
    ))
  ] });
}
function SummaryBox({ label, value, hint }) {
  return /* @__PURE__ */ jsxs("div", { style: summaryBoxStyle, children: [
    /* @__PURE__ */ jsx("div", { style: summaryLabelStyle, children: label }),
    /* @__PURE__ */ jsx("div", { style: summaryValueStyle, children: value }),
    /* @__PURE__ */ jsx("div", { style: summaryHintStyle, children: hint })
  ] });
}
function BaselineBuildPanel({ dataset, baseline, locale }) {
  return /* @__PURE__ */ jsxs("div", { style: baselineCardStyle, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 6 }, children: [
      /* @__PURE__ */ jsx("div", { style: sectionLabelStyle, children: locale === "en" ? "Baseline family" : "Familia baseline" }),
      /* @__PURE__ */ jsx("div", { style: { color: "#f4fbff", fontSize: 20, fontWeight: 800 }, children: baseline.label }),
      /* @__PURE__ */ jsx("div", { style: { color: "#90a0b5", lineHeight: 1.6 }, children: locale === "en" ? `${baseline.games} games \xB7 ${formatPercent(baseline.winRate)} WR \xB7 ${formatDecimal(baseline.avgScore)} average score` : `${baseline.games} partidas \xB7 ${formatPercent(baseline.winRate)} WR \xB7 ${formatDecimal(baseline.avgScore)} de score medio` })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: metricsGridStyle, children: [
      /* @__PURE__ */ jsx(MetricBox, { label: locale === "en" ? "Total damage" : "Da\xF1o total", value: formatInteger(baseline.avgTotalDamage) }),
      /* @__PURE__ */ jsx(MetricBox, { label: locale === "en" ? "Damage to champs" : "Da\xF1o a champs", value: formatInteger(baseline.avgDamageToChampions) }),
      /* @__PURE__ */ jsx(MetricBox, { label: "CS@15", value: formatDecimal(baseline.avgCsAt15) }),
      /* @__PURE__ */ jsx(MetricBox, { label: "GD@15", value: formatInteger(baseline.avgGoldDiffAt15) }),
      /* @__PURE__ */ jsx(MetricBox, { label: locale === "en" ? "1st item" : "1er item", value: baseline.avgFirstItemMinute !== null ? `${formatDecimal(baseline.avgFirstItemMinute)}m` : "\u2014" }),
      /* @__PURE__ */ jsx(MetricBox, { label: locale === "en" ? "2nd item" : "2do item", value: baseline.avgSecondItemMinute !== null ? `${formatDecimal(baseline.avgSecondItemMinute)}m` : "\u2014" }),
      /* @__PURE__ */ jsx(MetricBox, { label: locale === "en" ? "Boots" : "Botas", value: baseline.avgBootsMinute !== null ? `${formatDecimal(baseline.avgBootsMinute)}m` : "\u2014" })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
      baseline.topItems.map((itemId) => /* @__PURE__ */ jsx(ItemPill, { dataset, itemId }, `${baseline.key}-${itemId}`)),
      baseline.bootsId ? /* @__PURE__ */ jsx(ItemPill, { dataset, itemId: baseline.bootsId }) : null,
      /* @__PURE__ */ jsxs("div", { style: contextPillStyle, children: [
        /* @__PURE__ */ jsx("strong", { children: locale === "en" ? "Comp fit" : "Comp fit" }),
        /* @__PURE__ */ jsx("span", { children: baseline.compFitLabel })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: contextPillStyle, children: [
        /* @__PURE__ */ jsx("strong", { children: locale === "en" ? "Enemy pressure" : "Presi\xF3n rival" }),
        /* @__PURE__ */ jsx("span", { children: baseline.pressureProfile.replaceAll("_", " ") })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "build-context-grid", style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }, children: [
      /* @__PURE__ */ jsx(
        ContextCard,
        {
          title: locale === "en" ? "Early state" : "Estado del early",
          lines: [
            `${locale === "en" ? "Stable" : "Estable"} ${baseline.earlyStateProfile.stable}%`,
            `${locale === "en" ? "Scrappy" : "Tenso"} ${baseline.earlyStateProfile.scrappy}%`,
            `${locale === "en" ? "Volatile" : "Vol\xE1til"} ${baseline.earlyStateProfile.volatile}%`
          ]
        }
      ),
      /* @__PURE__ */ jsx(
        ContextCard,
        {
          title: locale === "en" ? "Duration split" : "Split por duraci\xF3n",
          lines: [
            `${locale === "en" ? "Short" : "Corta"} ${baseline.durationProfile.short}%`,
            `${locale === "en" ? "Standard" : "Media"} ${baseline.durationProfile.standard}%`,
            `${locale === "en" ? "Long" : "Larga"} ${baseline.durationProfile.long}%`
          ]
        }
      ),
      /* @__PURE__ */ jsx(
        ContextCard,
        {
          title: locale === "en" ? "Plan quality" : "Calidad del plan",
          lines: [
            `${locale === "en" ? "Volatility" : "Volatilidad"} ${formatDecimal(baseline.avgLaneVolatility)}`,
            `${locale === "en" ? "Reset" : "Reset"} ${formatDecimal(baseline.avgResetTiming)}`,
            `${locale === "en" ? "Setup" : "Setup"} ${formatDecimal(baseline.avgObjectiveSetup)}`
          ]
        }
      )
    ] }),
    baseline.missingResponseLabel ? /* @__PURE__ */ jsx("div", { style: warningCalloutStyle, children: baseline.missingResponseLabel }) : null,
    baseline.trackedWindows.length ? /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: baseline.trackedWindows.map((window) => /* @__PURE__ */ jsxs("div", { style: trackingPillStyle, children: [
      /* @__PURE__ */ jsx("strong", { children: window.label }),
      /* @__PURE__ */ jsxs("span", { children: [
        formatDecimal(window.minute),
        "m \xB7 ",
        window.coverage,
        "%"
      ] })
    ] }, `${baseline.key}-${window.label}`)) }) : null,
    /* @__PURE__ */ jsx(ExampleMatchesPanel, { examples: baseline.examples, locale })
  ] });
}
function BuildComparisonCard({ dataset, comparison, locale }) {
  return /* @__PURE__ */ jsxs("div", { style: comparisonCardStyle, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "start" }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 5 }, children: [
        /* @__PURE__ */ jsx("div", { style: sectionLabelStyle, children: locale === "en" ? "Alternative family" : "Familia alternativa" }),
        /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 18, fontWeight: 800 }, children: comparison.variant.label }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
          comparison.variant.topItems.map((itemId) => /* @__PURE__ */ jsx(ItemPill, { dataset, itemId }, `${comparison.variant.key}-${itemId}`)),
          comparison.variant.bootsId ? /* @__PURE__ */ jsx(ItemPill, { dataset, itemId: comparison.variant.bootsId }) : null
        ] })
      ] }),
      /* @__PURE__ */ jsx(Badge, { tone: evidenceTone(comparison.evidenceTier), children: evidenceBadgeLabel(comparison.evidenceTier, locale) })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: deltaGridStyle, children: [
      /* @__PURE__ */ jsx(DeltaBox, { label: "WR", value: formatSignedNumber(comparison.deltas.winRate, 1, "%") }),
      /* @__PURE__ */ jsx(DeltaBox, { label: locale === "en" ? "Score" : "Score", value: formatSignedNumber(comparison.deltas.score) }),
      /* @__PURE__ */ jsx(DeltaBox, { label: locale === "en" ? "Champ dmg" : "Da\xF1o champs", value: formatSignedNumber(comparison.deltas.damageToChampions, 0) }),
      /* @__PURE__ */ jsx(DeltaBox, { label: "CS@15", value: formatSignedNumber(comparison.deltas.csAt15) }),
      /* @__PURE__ */ jsx(DeltaBox, { label: "GD@15", value: formatSignedNumber(comparison.deltas.goldDiffAt15, 0) }),
      /* @__PURE__ */ jsx(DeltaBox, { label: locale === "en" ? "Pre14 deaths" : "Muertes pre14", value: formatSignedNumber(comparison.deltas.deathsPre14) }),
      /* @__PURE__ */ jsx(DeltaBox, { label: locale === "en" ? "Volatility" : "Volatilidad", value: formatSignedNumber(comparison.deltas.laneVolatility) }),
      /* @__PURE__ */ jsx(DeltaBox, { label: locale === "en" ? "1st item" : "1er item", value: comparison.deltas.firstItemMinute !== null ? formatSignedNumber(comparison.deltas.firstItemMinute, 1, "m") : "\u2014" })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 8 }, children: [
      /* @__PURE__ */ jsx("div", { style: { color: "#f2f8ff", fontWeight: 700, lineHeight: 1.65 }, children: comparison.summary }),
      comparison.pressureNote ? /* @__PURE__ */ jsx("div", { style: { color: "#9ba9bc", lineHeight: 1.6 }, children: comparison.pressureNote }) : null,
      comparison.leverageNote ? /* @__PURE__ */ jsx("div", { style: recommendationBoxStyle, children: comparison.leverageNote }) : null,
      /* @__PURE__ */ jsxs("div", { className: "build-decision-grid", style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }, children: [
        /* @__PURE__ */ jsx(DecisionCard, { title: locale === "en" ? "Best when" : "Rinde m\xE1s cuando", value: comparison.bestWhen ?? (locale === "en" ? "No clear edge yet." : "Todav\xEDa no aparece un edge claro.") }),
        /* @__PURE__ */ jsx(DecisionCard, { title: locale === "en" ? "Careful when" : "Ojo cuando", value: comparison.avoidWhen ?? (locale === "en" ? "No clear avoid-case yet." : "Todav\xEDa no aparece un avoid-case claro.") })
      ] }),
      comparison.recommendation ? /* @__PURE__ */ jsx("div", { style: warningCalloutStyle, children: comparison.recommendation }) : null,
      /* @__PURE__ */ jsx(ExampleMatchesPanel, { examples: comparison.variant.examples, locale }),
      /* @__PURE__ */ jsx("div", { style: { color: "#7f8da2", fontSize: 12, lineHeight: 1.6 }, children: evidenceExplanation(comparison.evidenceTier, locale, comparison.baseline.games + comparison.variant.games, comparison.constraint) })
    ] })
  ] });
}
function ItemSignalColumn({
  title,
  emptyLabel,
  items,
  dataset,
  locale
}) {
  return /* @__PURE__ */ jsxs("div", { style: signalColumnStyle, children: [
    /* @__PURE__ */ jsx("div", { style: sectionLabelStyle, children: title }),
    items.length ? /* @__PURE__ */ jsx("div", { style: { display: "grid", gap: 10 }, children: items.map((item) => /* @__PURE__ */ jsxs("div", { style: itemImpactCardStyle, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, alignItems: "center" }, children: [
          /* @__PURE__ */ jsx(ItemPill, { dataset, itemId: item.itemId, compact: true }),
          /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 3 }, children: [
            /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontWeight: 700 }, children: item.name }),
            /* @__PURE__ */ jsxs("div", { style: { color: "#8d9bb0", fontSize: 12 }, children: [
              item.games,
              " \xB7 ",
              formatDecimal(item.usageShare),
              "% \xB7 ",
              item.utilityLabel
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx(Badge, { tone: evidenceTone(item.evidenceTier), children: evidenceBadgeLabel(item.evidenceTier, locale) })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: itemImpactMetricsStyle, children: [
        /* @__PURE__ */ jsx(DeltaBox, { label: "WR", value: formatSignedNumber(item.winRateDelta, 1, "%") }),
        /* @__PURE__ */ jsx(DeltaBox, { label: locale === "en" ? "Score" : "Score", value: formatSignedNumber(item.scoreDelta) }),
        /* @__PURE__ */ jsx(DeltaBox, { label: locale === "en" ? "Champ dmg" : "Da\xF1o champs", value: formatSignedNumber(item.damageDelta, 0) }),
        /* @__PURE__ */ jsx(DeltaBox, { label: locale === "en" ? "Stable early" : "Early estable", value: formatSignedNumber(item.earlyStateDelta, 1, "%") }),
        /* @__PURE__ */ jsx(DeltaBox, { label: locale === "en" ? "Completion" : "Completa", value: item.avgCompletionMinute !== null ? `${formatDecimal(item.avgCompletionMinute)}m` : "\u2014" })
      ] })
    ] }, `${title}-${item.itemId}`)) }) : /* @__PURE__ */ jsx("div", { style: emptyStateStyle, children: emptyLabel })
  ] });
}
function ExampleMatchesPanel({ examples, locale }) {
  if (!examples.length) return null;
  return /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 10 }, children: [
    /* @__PURE__ */ jsx("div", { style: sectionLabelStyle, children: locale === "en" ? "Match explorer" : "Match explorer" }),
    /* @__PURE__ */ jsx("div", { className: "example-match-grid", style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }, children: examples.map((example) => /* @__PURE__ */ jsxs("div", { style: exampleCardStyle, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontWeight: 800 }, children: example.opponentChampionName ? `vs ${example.opponentChampionName}` : locale === "en" ? "Match sample" : "Partida muestra" }),
        /* @__PURE__ */ jsx(Badge, { tone: example.win ? "low" : "high", children: example.win ? "Win" : "Loss" })
      ] }),
      /* @__PURE__ */ jsx("div", { style: { color: "#8ea0b6", fontSize: 13, lineHeight: 1.55 }, children: new Date(example.gameCreation).toLocaleDateString(locale === "en" ? "en-US" : "es-AR") }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 5 }, children: [
        /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff" }, children: `Score ${formatDecimal(example.score)} \xB7 ${formatInteger(example.damageToChampions)} dmg` }),
        /* @__PURE__ */ jsx("div", { style: { color: "#8ea0b6" }, children: `CS@15 ${formatDecimal(example.csAt15)} \xB7 GD@15 ${formatInteger(example.goldDiffAt15)}` }),
        /* @__PURE__ */ jsx("div", { style: { color: "#8ea0b6" }, children: `1st ${example.firstItemMinute ? `${formatDecimal(example.firstItemMinute)}m` : "\u2014"} \xB7 2nd ${example.secondItemMinute ? `${formatDecimal(example.secondItemMinute)}m` : "\u2014"} \xB7 Boots ${example.bootsMinute ? `${formatDecimal(example.bootsMinute)}m` : "\u2014"}` })
      ] })
    ] }, example.matchId)) })
  ] });
}
function MetricBox({ label, value }) {
  return /* @__PURE__ */ jsxs("div", { style: metricBoxStyle, children: [
    /* @__PURE__ */ jsx("div", { style: metricLabelStyle, children: label }),
    /* @__PURE__ */ jsx("div", { style: metricValueStyle, children: value })
  ] });
}
function DeltaBox({ label, value }) {
  return /* @__PURE__ */ jsxs("div", { style: deltaBoxStyle, children: [
    /* @__PURE__ */ jsx("div", { style: metricLabelStyle, children: label }),
    /* @__PURE__ */ jsx("div", { style: deltaValueStyle, children: value })
  ] });
}
function ContextCard({ title, lines }) {
  return /* @__PURE__ */ jsxs("div", { style: contextCardStyle, children: [
    /* @__PURE__ */ jsx("div", { style: sectionLabelStyle, children: title }),
    /* @__PURE__ */ jsx("div", { style: { display: "grid", gap: 4 }, children: lines.map((line) => /* @__PURE__ */ jsx("div", { style: { color: "#dce6f5", lineHeight: 1.5 }, children: line }, line)) })
  ] });
}
function DecisionCard({ title, value }) {
  return /* @__PURE__ */ jsxs("div", { style: decisionCardStyle, children: [
    /* @__PURE__ */ jsx("div", { style: sectionLabelStyle, children: title }),
    /* @__PURE__ */ jsx("div", { style: { color: "#ecf3ff", lineHeight: 1.6 }, children: value })
  ] });
}
function ItemPill({ dataset, itemId, compact = false }) {
  const icon = getItemIconUrl(itemId, dataset.ddragonVersion);
  const item = dataset.itemCatalog?.[String(itemId)];
  return /* @__PURE__ */ jsxs("div", { style: compact ? compactItemPillStyle : itemPillStyle, children: [
    icon ? /* @__PURE__ */ jsx("img", { src: icon, alt: item?.name ?? String(itemId), width: compact ? 24 : 28, height: compact ? 24 : 28, style: itemIconStyle }) : null,
    /* @__PURE__ */ jsx("span", { children: item?.name ?? `Item ${itemId}` })
  ] });
}
const topSummaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 12
};
const summaryBoxStyle = {
  display: "grid",
  gap: 8,
  padding: "14px 15px",
  borderRadius: 16,
  background: "#070d15",
  border: "1px solid rgba(255,255,255,0.06)"
};
const summaryLabelStyle = {
  color: "#7d8ba0",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.08em"
};
const summaryValueStyle = {
  color: "#f4fbff",
  fontSize: 30,
  fontWeight: 800
};
const summaryHintStyle = {
  color: "#8fa0b5",
  lineHeight: 1.6
};
const notePanelStyle = {
  padding: "13px 14px",
  borderRadius: 16,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.05)",
  color: "#cbd7e8",
  lineHeight: 1.7
};
const headlinePanelStyle = {
  padding: "14px 15px",
  borderRadius: 18,
  background: "rgba(125,174,255,0.07)",
  border: "1px solid rgba(125,174,255,0.12)",
  color: "#deebff",
  lineHeight: 1.65
};
const baselineCardStyle = {
  display: "grid",
  gap: 14,
  padding: "15px 16px",
  borderRadius: 18,
  background: "linear-gradient(180deg, rgba(14,22,35,0.96), rgba(7,12,19,0.98))",
  border: "1px solid rgba(255,255,255,0.06)"
};
const sectionLabelStyle = {
  color: "#7f8da2",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.08em"
};
const metricsGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
  gap: 10
};
const metricBoxStyle = {
  display: "grid",
  gap: 6,
  padding: "11px 12px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.05)"
};
const metricLabelStyle = {
  color: "#7d8ba0",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.06em"
};
const metricValueStyle = {
  color: "#f0f6ff",
  fontSize: 17,
  fontWeight: 800
};
const comparisonCardStyle = {
  display: "grid",
  gap: 14,
  padding: "15px 16px",
  borderRadius: 16,
  background: "#070d15",
  border: "1px solid rgba(255,255,255,0.06)"
};
const deltaGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
  gap: 10
};
const deltaBoxStyle = {
  display: "grid",
  gap: 6,
  padding: "11px 12px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.05)"
};
const deltaValueStyle = {
  color: "#f4fbff",
  fontSize: 17,
  fontWeight: 800
};
const itemPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.05)",
  color: "#d7e2f1",
  fontSize: 12,
  whiteSpace: "nowrap"
};
const compactItemPillStyle = {
  ...itemPillStyle,
  padding: "6px 8px"
};
const itemIconStyle = {
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.08)"
};
const contextPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.05)",
  color: "#cdd8e8",
  fontSize: 12
};
const trackingPillStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 10px",
  borderRadius: 999,
  background: "rgba(126,245,199,0.08)",
  border: "1px solid rgba(126,245,199,0.12)",
  color: "#d7f7e9",
  fontSize: 12
};
const warningCalloutStyle = {
  padding: "10px 12px",
  borderRadius: 14,
  background: "rgba(255,196,82,0.07)",
  border: "1px solid rgba(255,196,82,0.14)",
  color: "#e6d3a4",
  lineHeight: 1.6
};
const recommendationBoxStyle = {
  padding: "10px 12px",
  borderRadius: 14,
  background: "rgba(126,245,199,0.08)",
  border: "1px solid rgba(126,245,199,0.12)",
  color: "#d7f7e9",
  lineHeight: 1.6
};
const emptyStateStyle = {
  padding: "14px 15px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.03)",
  border: "1px dashed rgba(255,255,255,0.08)",
  color: "#9aa7ba",
  lineHeight: 1.7
};
const signalGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 12
};
const signalColumnStyle = {
  display: "grid",
  gap: 12,
  padding: "14px 15px",
  borderRadius: 16,
  background: "#070d15",
  border: "1px solid rgba(255,255,255,0.06)"
};
const itemImpactCardStyle = {
  display: "grid",
  gap: 10,
  padding: "12px 13px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.05)"
};
const itemImpactMetricsStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(92px, 1fr))",
  gap: 8
};
const contextCardStyle = {
  display: "grid",
  gap: 8,
  padding: "11px 12px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.05)"
};
const decisionCardStyle = {
  display: "grid",
  gap: 8,
  padding: "11px 12px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.05)"
};
const exampleCardStyle = {
  display: "grid",
  gap: 8,
  padding: "11px 12px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.05)"
};
export {
  BuildsTab
};
