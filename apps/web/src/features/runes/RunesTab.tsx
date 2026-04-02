import { Badge, Card, ChampionIdentity } from '../../components/ui';
import type { Dataset } from '../../types';
import { formatChampionName } from '../../lib/lol';
import { formatDecimal, formatInteger, formatPercent, formatSignedNumber } from '../../lib/format';
import type { Locale } from '../../lib/i18n';
import { evidenceBadgeLabel, evidenceExplanation, evidenceTone } from '../premium-analysis/evidence';
import { buildChampionRuneWorkbench, type RuneComparison, type RuneVariantAggregate } from './runeWorkbench';

export function RunesTab({ dataset, locale = 'es' }: { dataset: Dataset; locale?: Locale }) {
  const champions = buildChampionRuneWorkbench(dataset, locale);
  const comparisons = champions.flatMap((champion) => champion.keystones.flatMap((keystone) => keystone.comparisons));
  const strongReads = comparisons.filter((comparison) => comparison.evidenceTier === 'strong').length;
  const weakReads = comparisons.filter((comparison) => comparison.evidenceTier === 'weak').length;
  const hypothesisReads = comparisons.filter((comparison) => comparison.evidenceTier === 'hypothesis').length;

  if (!champions.length) {
    return (
      <Card
        title={locale === 'en' ? 'Runes workbench' : 'Workbench de runas'}
        subtitle={locale === 'en'
          ? 'We need more repeated champion sample before the system can compare real micro-variants inside the same pick.'
          : 'Necesitamos más muestra repetida por campeón antes de comparar microvariantes reales dentro del mismo pick.'}
      >
        <div style={{ display: 'grid', gap: 12, color: '#c8d5e7', lineHeight: 1.7 }}>
          <div>
            {locale === 'en'
              ? 'This tab now looks for same-champion pages, same keystone families and small rune swaps with enough sample on both sides. Right now the visible block is still too thin to call those differences.'
              : 'Esta pestaña ahora busca páginas del mismo campeón, familias con la misma keystone y swaps chicos con suficiente muestra en ambos lados. En el bloque visible todavía no alcanza para leer esas diferencias con honestidad.'}
          </div>
          <div style={noteBoxStyle}>
            {locale === 'en'
              ? 'Best next step: add more games on the same champion and avoid changing several variables at once. The workbench gets much stronger when one pick accumulates at least 6-8 games with two visible rune variants.'
              : 'Siguiente mejor paso: sumar más partidas en el mismo campeón y no abrir demasiadas variables a la vez. El workbench mejora mucho cuando un pick junta al menos 6-8 partidas con dos variantes visibles de runas.'}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <Card
        title={locale === 'en' ? 'Runes workbench' : 'Workbench de runas'}
        subtitle={locale === 'en'
          ? 'Champion-first comparisons, same-keystone families and explicit evidence tiers so each rune read is useful for decisions.'
          : 'Comparaciones champion-first, familias con la misma keystone y tiers de evidencia explícitos para que cada lectura sirva para decidir.'}
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={summaryGridStyle}>
            <SummaryTile
              label={locale === 'en' ? 'Champions with real variants' : 'Campeones con variantes reales'}
              value={String(champions.length)}
              hint={locale === 'en' ? 'Same champion, repeat sample, at least one alternative page.' : 'Mismo campeón, muestra repetida y al menos una página alternativa.'}
            />
            <SummaryTile
              label={locale === 'en' ? 'Strong reads' : 'Lecturas fuertes'}
              value={String(strongReads)}
              hint={locale === 'en' ? 'Good sample on both sides plus a real signal.' : 'Buena muestra en ambos lados más una señal real.'}
            />
            <SummaryTile
              label={locale === 'en' ? 'Watchpoints' : 'Puntos de seguimiento'}
              value={String(weakReads + hypothesisReads)}
              hint={locale === 'en' ? 'Directional reads or still-open hypotheses.' : 'Lecturas direccionales o hipótesis todavía abiertas.'}
            />
          </div>

          <div style={methodologyPanelStyle}>
            <div style={sectionLabelStyle}>{locale === 'en' ? 'How to read this' : 'Cómo leer esto'}</div>
            <div style={{ color: '#edf3ff', lineHeight: 1.7 }}>
              {locale === 'en'
                ? 'The baseline is the most repeated page inside each keystone family for that champion. Every alternative page is compared against that baseline, checking small rune swaps, matchup skew, game length and execution metrics before calling it strong, weak or just a hypothesis.'
                : 'El baseline es la página más repetida dentro de cada familia de keystone para ese campeón. Cada página alternativa se compara contra ese baseline revisando swaps chicos, sesgo de matchup, duración de partida y métricas de ejecución antes de llamarla fuerte, débil o solo hipótesis.'}
            </div>
          </div>
        </div>
      </Card>

      {champions.map((champion) => (
        <Card
          key={champion.championName}
          title={formatChampionName(champion.championName)}
          subtitle={locale === 'en'
            ? `${champion.games} visible games. The goal is not “most picked” but whether small swaps move the actual output of the champion.`
            : `${champion.games} partidas visibles. El objetivo no es “most picked” sino si los swaps chicos mueven el output real del campeón.`}
        >
          <div style={{ display: 'grid', gap: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <ChampionIdentity
                championName={champion.championName}
                version={dataset.ddragonVersion}
                subtitle={locale === 'en'
                  ? 'Variants are grouped by keystone first, then compared inside the same family.'
                  : 'Las variantes se agrupan primero por keystone y después se comparan dentro de la misma familia.'}
                meta={
                  <>
                    {champion.strongReads ? <Badge tone="low">{locale === 'en' ? `${champion.strongReads} strong` : `${champion.strongReads} fuertes`}</Badge> : null}
                    {champion.weakReads ? <Badge tone="medium">{locale === 'en' ? `${champion.weakReads} weak` : `${champion.weakReads} débiles`}</Badge> : null}
                    {champion.hypothesisReads ? <Badge>{locale === 'en' ? `${champion.hypothesisReads} hypotheses` : `${champion.hypothesisReads} hipótesis`}</Badge> : null}
                  </>
                }
              />
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              {champion.keystones.map((keystone) => (
                <section key={`${champion.championName}-${keystone.keystone}`} style={keystoneCardStyle}>
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ display: 'grid', gap: 4 }}>
                        <div style={{ color: '#edf3ff', fontSize: 18, fontWeight: 800 }}>{keystone.keystone}</div>
                        <div style={{ color: '#8d9bb0', fontSize: 13 }}>
                          {locale === 'en'
                            ? `${keystone.totalGames} games in this family · baseline = the most repeated page`
                            : `${keystone.totalGames} partidas en esta familia · baseline = la página más repetida`}
                        </div>
                      </div>
                      <Badge tone="default">
                        {locale === 'en'
                          ? `${keystone.variants.length} visible variants`
                          : `${keystone.variants.length} variantes visibles`}
                      </Badge>
                    </div>

                    <BaselinePanel baseline={keystone.baseline} locale={locale} />

                    {keystone.comparisons.length ? (
                      <div style={{ display: 'grid', gap: 12 }}>
                        {keystone.comparisons.slice(0, 3).map((comparison) => (
                          <ComparisonCard key={`${comparison.variant.key}-${comparison.differenceLabel}`} comparison={comparison} locale={locale} />
                        ))}
                      </div>
                    ) : (
                      <div style={emptyComparisonStyle}>
                        {locale === 'en'
                          ? 'There is still only one visible page inside this keystone family, so the system keeps it as a baseline without forcing fake comparisons.'
                          : 'Todavía hay una sola página visible dentro de esta familia de keystone, así que el sistema la guarda como baseline sin forzar comparaciones falsas.'}
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function SummaryTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div style={summaryTileStyle}>
      <div style={summaryLabelStyle}>{label}</div>
      <div style={summaryValueStyle}>{value}</div>
      <div style={summaryHintStyle}>{hint}</div>
    </div>
  );
}

function BaselinePanel({ baseline, locale }: { baseline: RuneVariantAggregate; locale: Locale }) {
  return (
    <div style={baselinePanelStyle}>
      <div style={{ display: 'grid', gap: 6 }}>
        <div style={sectionLabelStyle}>{locale === 'en' ? 'Baseline page' : 'Página baseline'}</div>
        <div style={{ color: '#f6fbff', fontWeight: 800, fontSize: 18 }}>{baseline.compactLabel}</div>
        <div style={{ color: '#8d9bb0', lineHeight: 1.6 }}>
          {locale === 'en'
            ? `${baseline.games} games · ${formatPercent(baseline.winRate)} WR · ${formatDecimal(baseline.avgScore)} average score`
            : `${baseline.games} partidas · ${formatPercent(baseline.winRate)} WR · ${formatDecimal(baseline.avgScore)} de score medio`}
        </div>
      </div>

      <div style={metricRowStyle}>
        <MetricChip label="WR" value={formatPercent(baseline.winRate)} />
        <MetricChip label={locale === 'en' ? 'Score' : 'Score'} value={formatDecimal(baseline.avgScore)} />
        <MetricChip label={locale === 'en' ? 'Damage' : 'Daño'} value={formatInteger(baseline.avgDamageToChampions)} />
        <MetricChip label="CS@15" value={formatDecimal(baseline.avgCsAt15)} />
        <MetricChip label={locale === 'en' ? 'Pre14 deaths' : 'Muertes pre14'} value={formatDecimal(baseline.avgDeathsPre14)} />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {baseline.topMatchups.map((matchup) => (
          <div key={`${baseline.key}-${matchup.championName}`} style={contextPillStyle}>
            <strong>{formatChampionName(matchup.championName)}</strong>
            <span>{matchup.games} · {formatDecimal(matchup.share)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonCard({ comparison, locale }: { comparison: RuneComparison; locale: Locale }) {
  return (
    <div style={comparisonCardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 5 }}>
          <div style={sectionLabelStyle}>{locale === 'en' ? 'Micro-variant under review' : 'Microvariante bajo revisión'}</div>
          <div style={{ color: '#eef4ff', fontSize: 17, fontWeight: 800 }}>{comparison.variant.compactLabel}</div>
          <div style={{ color: '#8d9bb0', lineHeight: 1.6 }}>
            {comparison.differenceLabel}
          </div>
        </div>
        <Badge tone={evidenceTone(comparison.evidenceTier)}>
          {evidenceBadgeLabel(comparison.evidenceTier, locale)}
        </Badge>
      </div>

      <div style={deltaGridStyle}>
        <DeltaTile label="WR" value={formatSignedNumber(comparison.deltas.winRate, 1, '%')} />
        <DeltaTile label={locale === 'en' ? 'Score' : 'Score'} value={formatSignedNumber(comparison.deltas.score)} />
        <DeltaTile label={locale === 'en' ? 'Damage' : 'Daño'} value={formatSignedNumber(comparison.deltas.damageToChampions, 0)} />
        <DeltaTile label="CS@15" value={formatSignedNumber(comparison.deltas.csAt15)} />
        <DeltaTile label={locale === 'en' ? 'Duration' : 'Duración'} value={formatSignedNumber(comparison.deltas.durationMinutes, 1, 'm')} />
        <DeltaTile label={locale === 'en' ? 'Pre14 deaths' : 'Muertes pre14'} value={formatSignedNumber(comparison.deltas.deathsPre14)} />
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ color: '#f0f6ff', lineHeight: 1.65, fontWeight: 700 }}>{comparison.summary}</div>
        <div style={{ color: '#9aa7ba', lineHeight: 1.65 }}>{comparison.signalNote}</div>
        {comparison.contextNote ? <div style={contextCalloutStyle}>{comparison.contextNote}</div> : null}
        <div style={{ color: '#7f8da2', fontSize: 12, lineHeight: 1.6 }}>
          {evidenceExplanation(
            comparison.evidenceTier,
            locale,
            comparison.baseline.games + comparison.variant.games,
            comparison.constraint
          )}
        </div>
      </div>
    </div>
  );
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={metricChipStyle}>
      <div style={metricChipLabelStyle}>{label}</div>
      <div style={metricChipValueStyle}>{value}</div>
    </div>
  );
}

function DeltaTile({ label, value }: { label: string; value: string }) {
  return (
    <div style={deltaTileStyle}>
      <div style={metricChipLabelStyle}>{label}</div>
      <div style={deltaValueStyle}>{value}</div>
    </div>
  );
}

const summaryGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 12
} as const;

const summaryTileStyle = {
  display: 'grid',
  gap: 8,
  padding: '14px 15px',
  borderRadius: 16,
  background: '#070d15',
  border: '1px solid rgba(255,255,255,0.06)'
} as const;

const summaryLabelStyle = {
  color: '#7d8ba0',
  fontSize: 11,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em'
} as const;

const summaryValueStyle = {
  color: '#f5fbff',
  fontSize: 30,
  fontWeight: 800,
  lineHeight: 1
} as const;

const summaryHintStyle = {
  color: '#91a0b5',
  lineHeight: 1.6
} as const;

const methodologyPanelStyle = {
  display: 'grid',
  gap: 8,
  padding: '14px 15px',
  borderRadius: 16,
  background: 'linear-gradient(180deg, rgba(12,17,28,0.96), rgba(8,12,19,0.98))',
  border: '1px solid rgba(216,253,241,0.08)'
} as const;

const keystoneCardStyle = {
  display: 'grid',
  gap: 14,
  padding: 16,
  borderRadius: 18,
  background: '#060b12',
  border: '1px solid rgba(255,255,255,0.06)'
} as const;

const baselinePanelStyle = {
  display: 'grid',
  gap: 12,
  padding: '14px 15px',
  borderRadius: 16,
  background: 'linear-gradient(180deg, rgba(16,24,38,0.94), rgba(8,12,20,0.98))',
  border: '1px solid rgba(255,255,255,0.06)'
} as const;

const sectionLabelStyle = {
  color: '#7f8da2',
  fontSize: 11,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em'
} as const;

const metricRowStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  gap: 10
} as const;

const metricChipStyle = {
  display: 'grid',
  gap: 5,
  padding: '11px 12px',
  borderRadius: 14,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;

const metricChipLabelStyle = {
  color: '#7d8ba0',
  fontSize: 11,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em'
} as const;

const metricChipValueStyle = {
  color: '#eef4ff',
  fontSize: 18,
  fontWeight: 800
} as const;

const contextPillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 10px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.05)',
  color: '#cbd7e8',
  fontSize: 12
} as const;

const comparisonCardStyle = {
  display: 'grid',
  gap: 14,
  padding: '15px 16px',
  borderRadius: 16,
  background: '#070d15',
  border: '1px solid rgba(255,255,255,0.06)'
} as const;

const deltaGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
  gap: 10
} as const;

const deltaTileStyle = {
  display: 'grid',
  gap: 6,
  padding: '11px 12px',
  borderRadius: 14,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;

const deltaValueStyle = {
  color: '#f4fbff',
  fontSize: 18,
  fontWeight: 800
} as const;

const contextCalloutStyle = {
  padding: '10px 12px',
  borderRadius: 14,
  background: 'rgba(255, 196, 82, 0.07)',
  border: '1px solid rgba(255, 196, 82, 0.14)',
  color: '#e7d2a2',
  lineHeight: 1.6
} as const;

const emptyComparisonStyle = {
  padding: '14px 15px',
  borderRadius: 14,
  background: 'rgba(255,255,255,0.03)',
  border: '1px dashed rgba(255,255,255,0.08)',
  color: '#9aa7ba',
  lineHeight: 1.7
} as const;

const noteBoxStyle = {
  padding: '12px 14px',
  borderRadius: 16,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;
