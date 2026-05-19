import { useMemo, useState } from 'react';
import { Badge, Card, ChampionIdentity, KPI } from '../../components/ui';
import { formatDecimal, formatPercent, formatSignedNumber } from '../../lib/format';
import { formatChampionName, getRoleLabel } from '../../lib/lol';
import type { Locale } from '../../lib/i18n';
import type { Dataset } from '../../types';
import { buildChampionIntelligenceWorkbench } from './championIntelligenceWorkbench';

export function ChampionIntelligenceTab({ dataset, locale = 'es' }: { dataset: Dataset; locale?: Locale }) {
  const workbench = useMemo(() => buildChampionIntelligenceWorkbench(dataset, locale), [dataset, locale]);
  const [selectedChampionName, setSelectedChampionName] = useState<string | null>(workbench.selectedChampionName);

  const selectedChampion = workbench.champions.find((entry) => entry.championName === selectedChampionName) ?? workbench.champions[0] ?? null;

  if (!selectedChampion) {
    return (
      <Card
        title={copy(locale, 'Champion intelligence', 'Champion intelligence')}
        subtitle={copy(locale, 'Todavía no hay muestra suficiente para abrir una lectura de campeón.', 'There is not enough sample yet to open a champion read.')}
      >
        <div style={{ color: '#8a95a7', lineHeight: 1.7 }}>
          {copy(locale, 'Cargá más partidas válidas para empezar a conectar setups, matchups e identidad del pick con tu muestra real.', 'Load more valid matches to start connecting setups, matchups and champion identity to your real sample.')}
        </div>
      </Card>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <Card
        title={copy(locale, 'Champion intelligence', 'Champion intelligence')}
        subtitle={copy(locale, 'Una capa editorial honesta: setups, matchups y reads curadas ancladas a tu propia muestra.', 'An honest editorial layer: setups, matchups and curated reads anchored to your own sample.')}
      >
        <div style={heroLayoutStyle}>
          <div style={{ display: 'grid', gap: 16 }}>
            <ChampionIdentity
              championName={selectedChampion.championName}
              version={dataset.ddragonVersion}
              size={70}
              subtitle={selectedChampion.headline}
              meta={
                <>
                  <Badge tone="default">{selectedChampion.role === 'BOTTOM' ? 'ADC' : getRoleLabel(selectedChampion.role)}</Badge>
                  <Badge tone={patchTone(selectedChampion.profile?.patchStatus)}>{patchLabel(selectedChampion.profile?.patchStatus, locale)}</Badge>
                  <Badge tone="low">{selectedChampion.profile?.sourceLabel ?? copy(locale, 'Curated read', 'Curated read')}</Badge>
                </>
              }
            />

            <div style={{ display: 'grid', gap: 10 }}>
              <div style={heroReadStyle}>{selectedChampion.subheadline}</div>
              <div style={{ color: '#93a0b5', lineHeight: 1.75 }}>{selectedChampion.playerProof.playerFitReason}</div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {selectedChampion.recommendedRuneLabel ? <Badge tone="default">{copy(locale, 'Runas base', 'Baseline runes')}: {selectedChampion.recommendedRuneLabel}</Badge> : null}
              {selectedChampion.recommendedBuildLabel ? <Badge tone="medium">{copy(locale, 'Build base', 'Baseline build')}: {selectedChampion.recommendedBuildLabel}</Badge> : null}
            </div>
          </div>

          <div style={proofPanelStyle}>
            <div style={proofHeaderStyle}>
              <div style={{ fontSize: 13, color: '#8a95a7', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {copy(locale, 'Your proof', 'Your proof')}
              </div>
              <Badge tone="low">{selectedChampion.games} {copy(locale, 'partidas', 'games')}</Badge>
            </div>
            <div style={proofGridStyle}>
              <KPI label="WR" value={formatPercent(selectedChampion.playerProof.winRate)} hint={selectedChampion.playerProof.recentTrendLabel} />
              <KPI label="Score" value={formatDecimal(selectedChampion.playerProof.avgScore)} hint={copy(locale, 'Promedio actual con este pick', 'Current average on this pick')} />
              <KPI label="Gold@15" value={formatSignedNumber(selectedChampion.playerProof.avgGoldDiffAt15, 0)} hint={copy(locale, 'Ventaja media al 15', 'Average lead at 15')} />
              <KPI label={copy(locale, 'Deaths pre14', 'Deaths pre14')} value={formatDecimal(selectedChampion.playerProof.avgDeathsPre14)} hint={copy(locale, 'Cuánto castigo temprano estás absorbiendo', 'How much early punishment you are taking')} />
            </div>
          </div>
        </div>
      </Card>

      <div style={mainLayoutStyle}>
        <div style={{ display: 'grid', gap: 16 }}>
          <Card
            title={copy(locale, 'Champion desk', 'Champion desk')}
            subtitle={copy(locale, 'Elegí el pick que querés leer como una página real de setup intelligence.', 'Choose the pick you want to read as a real setup-intelligence page.')}
          >
            <div style={championListStyle}>
              {workbench.champions.map((entry) => {
                const active = entry.championName === selectedChampion.championName;
                return (
                  <button
                    key={entry.championName}
                    type="button"
                    onClick={() => setSelectedChampionName(entry.championName)}
                    style={{
                      ...championOptionStyle,
                      ...(active ? championOptionActiveStyle : {})
                    }}
                  >
                    <ChampionIdentity
                      championName={entry.championName}
                      version={dataset.ddragonVersion}
                      size={46}
                      subtitle={entry.playerProof.playerFitLabel}
                      meta={
                        <>
                          <Badge tone={active ? 'low' : 'default'}>{entry.games} {copy(locale, 'partidas', 'games')}</Badge>
                          <Badge tone={entry.playerProof.winRate >= 52 ? 'low' : entry.playerProof.winRate <= 47 ? 'high' : 'default'}>{formatPercent(entry.playerProof.winRate)}</Badge>
                        </>
                      }
                    />
                  </button>
                );
              })}
            </div>
          </Card>

          <Card
            title={copy(locale, 'Setup variants', 'Setup variants')}
            subtitle={copy(locale, 'No es una lista de páginas: cada variante explica qué cambia en tu plan y cuándo conviene usarla.', 'This is not a page list: each variant explains what changes in your plan and when it makes sense to use it.')}
          >
            <div style={{ display: 'grid', gap: 14 }}>
              {selectedChampion.setupVariants.map((variant) => (
                <div key={variant.id} style={variantCardStyle}>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{variant.label}</div>
                      <Badge tone={stanceTone(variant.stance)}>{stanceLabel(variant.stance, locale)}</Badge>
                      <Badge tone={confidenceTone(variant.confidence)}>{confidenceLabel(variant.confidence, locale)}</Badge>
                    </div>
                    <div style={{ color: '#e5edf9', lineHeight: 1.65 }}>{variant.summary}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {variant.keystone ? <Badge tone="default">{copy(locale, 'Keystone', 'Keystone')}: {variant.keystone}</Badge> : null}
                      {variant.skillOrder.length ? <Badge tone="medium">{copy(locale, 'Skill order', 'Skill order')}: {variant.skillOrder.join(' > ')}</Badge> : null}
                      {variant.itemPath.length ? <Badge tone="low">{copy(locale, 'Path', 'Path')}: {variant.itemPath.join(' -> ')}</Badge> : null}
                    </div>
                  </div>

                  <div style={variantNotesGridStyle}>
                    <InsightNote label={copy(locale, 'Best when', 'Best when')} value={variant.bestWhen} />
                    <InsightNote label={copy(locale, 'Avoid when', 'Avoid when')} value={variant.avoidWhen} />
                    <InsightNote label={copy(locale, 'Play pattern shift', 'Play pattern shift')} value={variant.playPatternShift} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card
            title={copy(locale, 'High-elo reads', 'High-elo reads')}
            subtitle={copy(locale, 'No pretendemos que un OTP escribió esto: son lecturas curadas, pequeñas y trazables.', 'We do not pretend an OTP wrote this: these are curated, compact and traceable reads.')}
          >
            <div style={{ display: 'grid', gap: 14 }}>
              {selectedChampion.highEloReads.length ? selectedChampion.highEloReads.map((read) => (
                <div key={read.id} style={readCardStyle}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{read.label}</div>
                    <Badge tone={confidenceTone(read.confidence)}>{confidenceLabel(read.confidence, locale)}</Badge>
                    <Badge tone="default">{read.type.replace(/_/g, ' ')}</Badge>
                  </div>
                  <div style={{ color: '#e9f0fb', lineHeight: 1.7 }}>{read.body}</div>
                </div>
              )) : (
                <div style={{ color: '#8e99ac', lineHeight: 1.7 }}>
                  {copy(locale, 'Todavía no cargamos reads curadas para este campeón. La estructura ya está preparada para sumar una capa de referencia real sin generar humo editorial.', 'We have not loaded curated reads for this champion yet. The structure is ready to add real reference material without generating editorial smoke.')}
                </div>
              )}
            </div>
          </Card>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <Card
            title={copy(locale, 'Matchup map', 'Matchup map')}
            subtitle={copy(locale, 'Cruzamos notes curadas con tu propia muestra. No marcamos “hardest matchup” por una sola derrota aislada.', 'We cross curated notes with your own sample. We do not label a “hardest matchup” from a single isolated loss.')}
          >
            <div style={{ display: 'grid', gap: 12 }}>
              {selectedChampion.matchupPlans.length ? selectedChampion.matchupPlans.map((matchup) => (
                <div key={`${selectedChampion.championName}-${matchup.opponentChampionName}-${matchup.role}`} style={matchupCardStyle(matchup.verdict)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 18, fontWeight: 800 }}>{formatChampionName(matchup.opponentChampionName)}</div>
                      <Badge tone={matchupTone(matchup.verdict)}>{matchupLabel(matchup.verdict, locale)}</Badge>
                    </div>
                    {sampleBadgeForMatchup(selectedChampion, matchup, locale)}
                  </div>
                  <div style={{ color: '#e9f0fb', lineHeight: 1.68 }}>{matchup.answer}</div>
                  <div style={matchupDetailGridStyle}>
                    <InsightNote label={copy(locale, 'What they punish', 'What they punish')} value={matchup.threat} />
                    <InsightNote label={copy(locale, 'Your window', 'Your window')} value={matchup.answer} />
                    <InsightNote label={copy(locale, 'Setup adjustment', 'Setup adjustment')} value={matchup.setupAdjustments.join(' · ')} />
                  </div>
                </div>
              )) : (
                <div style={{ color: '#8e99ac', lineHeight: 1.7 }}>
                  {copy(locale, 'Todavía no hay matchup notes curadas para este pick. La lectura se apoya por ahora en tus resultados medidos contra ese rival.', 'There are no curated matchup notes for this pick yet. The read currently leans on your measured results versus each opponent.')}
                </div>
              )}
            </div>
          </Card>

          <Card
            title={copy(locale, 'Player fit', 'Player fit')}
            subtitle={copy(locale, 'La parte más diferencial: qué versión del campeón te conviene a vos, no sólo cuál gana globalmente.', 'The most differential layer: which version of the champion fits you, not only what wins globally.')}
          >
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={playerFitBannerStyle}>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{selectedChampion.playerProof.playerFitLabel}</div>
                <div style={{ color: '#d3dded', lineHeight: 1.7 }}>{selectedChampion.playerProof.playerFitReason}</div>
              </div>

              <div style={proofStatsGridStyle}>
                <KPI label="KP" value={formatPercent(selectedChampion.playerProof.avgKillParticipation)} hint={copy(locale, 'Participación media en kills', 'Average kill participation')} />
                <KPI label={copy(locale, 'Volatility', 'Volatility')} value={formatDecimal(selectedChampion.playerProof.avgLaneVolatility)} hint={copy(locale, 'Cuánto se rompe tu early con este pick', 'How much your early breaks with this pick')} />
                <KPI label={copy(locale, 'Best matchup', 'Best matchup')} value={selectedChampion.playerProof.bestMatchup ? formatChampionName(selectedChampion.playerProof.bestMatchup.championName) : '—'} hint={selectedChampion.playerProof.bestMatchup ? `${selectedChampion.playerProof.bestMatchup.games} ${copy(locale, 'partidas', 'games')} · ${formatPercent(selectedChampion.playerProof.bestMatchup.winRate)}` : copy(locale, 'Necesita más muestra confiable', 'Needs more reliable sample')} />
                <KPI label={copy(locale, 'Hardest matchup', 'Hardest matchup')} value={selectedChampion.playerProof.hardestMatchup ? formatChampionName(selectedChampion.playerProof.hardestMatchup.championName) : '—'} hint={selectedChampion.playerProof.hardestMatchup ? `${selectedChampion.playerProof.hardestMatchup.games} ${copy(locale, 'partidas', 'games')} · ${formatPercent(selectedChampion.playerProof.hardestMatchup.winRate)}` : copy(locale, 'No declaramos uno con muestra floja', 'We do not declare one with weak sample')} />
              </div>
            </div>
          </Card>

          <Card
            title={copy(locale, 'Review triggers', 'Review triggers')}
            subtitle={copy(locale, 'Checklist real para saber qué partida revisar primero y qué ventana de ejecución auditar.', 'A real checklist to decide which game to review first and which execution window to audit.')}
          >
            <div style={{ display: 'grid', gap: 12 }}>
              {selectedChampion.reviewTriggers.length ? selectedChampion.reviewTriggers.map((trigger) => (
                <div key={trigger.id} style={triggerCardStyle}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>{trigger.label}</div>
                    <Badge tone="medium">{copy(locale, 'Review lens', 'Review lens')}</Badge>
                  </div>
                  <div style={{ color: '#e8eefb', lineHeight: 1.7 }}>{trigger.condition}</div>
                  <div style={variantNotesGridStyle}>
                    <InsightNote label={copy(locale, 'Why it matters', 'Why it matters')} value={trigger.whyItMatters} />
                    <InsightNote label={copy(locale, 'Prompts', 'Prompts')} value={trigger.prompts.join(' · ')} />
                    <InsightNote label={copy(locale, 'Use it when', 'Use it when')} value={copy(locale, 'Esa partida parece “normal”, pero la ventana clave del pick llegó rota o tarde.', 'The game looks normal on the surface, but the pick’s key window arrived broken or late.')} />
                  </div>
                </div>
              )) : (
                <div style={{ color: '#8e99ac', lineHeight: 1.7 }}>
                  {copy(locale, 'Todavía no hay review triggers curados para este campeón. La estructura ya está lista para sumar reglas más fuertes por pick.', 'There are no curated review triggers for this champion yet. The structure is ready to add stronger pick-specific rules.')}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function sampleBadgeForMatchup(
  champion: ReturnType<typeof buildChampionIntelligenceWorkbench>['champions'][number],
  matchup: ReturnType<typeof buildChampionIntelligenceWorkbench>['champions'][number]['matchupPlans'][number],
  locale: Locale
) {
  const best = champion.playerProof.bestMatchup;
  const hardest = champion.playerProof.hardestMatchup;

  if (hardest && hardest.championName === matchup.opponentChampionName) {
    return <Badge tone="high">{copy(locale, 'Tu muestra hoy lo marca como cruce duro', 'Your sample currently flags this as a hard matchup')}</Badge>;
  }

  if (best && best.championName === matchup.opponentChampionName) {
    return <Badge tone="low">{copy(locale, 'Tu muestra hoy lo está resolviendo bien', 'Your sample is currently handling this well')}</Badge>;
  }

  return <Badge tone="default">{copy(locale, 'Referencia curada', 'Curated reference')}</Badge>;
}

function InsightNote({ label, value }: { label: string; value: string }) {
  return (
    <div style={insightNoteStyle}>
      <div style={insightLabelStyle}>{label}</div>
      <div style={{ color: '#d8e2f0', lineHeight: 1.62 }}>{value}</div>
    </div>
  );
}

function copy(locale: Locale, es: string, en: string) {
  return locale === 'en' ? en : es;
}

function patchTone(status: string | undefined): 'default' | 'high' | 'medium' | 'low' {
  if (status === 'stable') return 'low';
  if (status === 'patch_sensitive') return 'medium';
  return 'default';
}

function patchLabel(status: string | undefined, locale: Locale) {
  if (status === 'stable') return copy(locale, 'Identity stable', 'Identity stable');
  if (status === 'patch_sensitive') return copy(locale, 'Patch sensitive', 'Patch sensitive');
  return copy(locale, 'Watch patch', 'Watch patch');
}

function stanceTone(stance: string): 'default' | 'high' | 'medium' | 'low' {
  if (stance === 'snowball' || stance === 'anti_frontline') return 'medium';
  if (stance === 'stability' || stance === 'utility') return 'low';
  return 'default';
}

function stanceLabel(stance: string, locale: Locale) {
  const labels: Record<string, { es: string; en: string }> = {
    default: { es: 'Default', en: 'Default' },
    snowball: { es: 'Snowball', en: 'Snowball' },
    stability: { es: 'Stability', en: 'Stability' },
    utility: { es: 'Utility', en: 'Utility' },
    anti_frontline: { es: 'Anti-frontline', en: 'Anti-frontline' },
    anti_range: { es: 'Anti-range', en: 'Anti-range' }
  };
  const label = labels[stance] ?? { es: stance, en: stance };
  return copy(locale, label.es, label.en);
}

function confidenceTone(confidence: string): 'default' | 'high' | 'medium' | 'low' {
  if (confidence === 'measured') return 'low';
  if (confidence === 'curated') return 'default';
  if (confidence === 'inferred') return 'medium';
  return 'high';
}

function confidenceLabel(confidence: string, locale: Locale) {
  const labels: Record<string, { es: string; en: string }> = {
    measured: { es: 'Measured', en: 'Measured' },
    curated: { es: 'Curated', en: 'Curated' },
    inferred: { es: 'Inferred', en: 'Inferred' },
    hypothesis: { es: 'Hypothesis', en: 'Hypothesis' }
  };
  const label = labels[confidence] ?? { es: confidence, en: confidence };
  return copy(locale, label.es, label.en);
}

function matchupTone(tone: string): 'default' | 'high' | 'medium' | 'low' {
  if (tone === 'favored') return 'low';
  if (tone === 'difficult') return 'high';
  return 'default';
}

function matchupLabel(tone: string, locale: Locale) {
  const labels: Record<string, { es: string; en: string }> = {
    favored: { es: 'Favorable', en: 'Favorable' },
    difficult: { es: 'Difícil', en: 'Difficult' },
    skill: { es: 'Skill test', en: 'Skill test' }
  };
  const label = labels[tone] ?? { es: tone, en: tone };
  return copy(locale, label.es, label.en);
}

const heroLayoutStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.5fr) minmax(320px, 0.9fr)',
  gap: 18,
  alignItems: 'stretch'
} as const;

const heroReadStyle = {
  fontSize: 16,
  color: '#edf3ff',
  lineHeight: 1.6
} as const;

const proofPanelStyle = {
  display: 'grid',
  gap: 14,
  alignContent: 'start',
  padding: 18,
  borderRadius: 18,
  background: 'radial-gradient(circle at top, rgba(98, 237, 214, 0.12), transparent 35%), linear-gradient(180deg, rgba(10, 16, 26, 0.96), rgba(6, 10, 18, 0.98))',
  border: '1px solid rgba(123, 236, 214, 0.12)'
} as const;

const proofHeaderStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 10,
  alignItems: 'center',
  flexWrap: 'wrap'
} as const;

const proofGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 12
} as const;

const mainLayoutStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.2fr) minmax(360px, 0.92fr)',
  gap: 18,
  alignItems: 'start'
} as const;

const championListStyle = {
  display: 'grid',
  gap: 10
} as const;

const championOptionStyle = {
  display: 'grid',
  gap: 12,
  width: '100%',
  padding: 14,
  borderRadius: 18,
  border: '1px solid rgba(255,255,255,0.06)',
  background: 'linear-gradient(180deg, rgba(8,12,20,0.9), rgba(6,9,15,0.94))',
  textAlign: 'left' as const,
  cursor: 'pointer'
} as const;

const championOptionActiveStyle = {
  border: '1px solid rgba(133, 243, 214, 0.2)',
  boxShadow: '0 22px 44px rgba(0,0,0,0.16), inset 0 0 0 1px rgba(111, 236, 209, 0.08)',
  background: 'radial-gradient(circle at top left, rgba(84, 220, 190, 0.12), transparent 40%), linear-gradient(180deg, rgba(8,12,20,0.94), rgba(6,9,15,0.98))'
} as const;

const variantCardStyle = {
  display: 'grid',
  gap: 14,
  padding: 16,
  borderRadius: 18,
  background: 'linear-gradient(180deg, rgba(9,14,24,0.96), rgba(6,10,18,0.98))',
  border: '1px solid rgba(255,255,255,0.06)'
} as const;

const variantNotesGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 12
} as const;

const readCardStyle = {
  display: 'grid',
  gap: 8,
  padding: 15,
  borderRadius: 16,
  background: '#070c14',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;

const playerFitBannerStyle = {
  display: 'grid',
  gap: 8,
  padding: 16,
  borderRadius: 18,
  background: 'radial-gradient(circle at top left, rgba(91, 226, 189, 0.12), transparent 42%), linear-gradient(180deg, rgba(10,15,23,0.96), rgba(8,12,19,0.98))',
  border: '1px solid rgba(111, 236, 209, 0.1)'
} as const;

const proofStatsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 12
} as const;

const insightNoteStyle = {
  display: 'grid',
  gap: 6,
  padding: 12,
  borderRadius: 14,
  background: '#07101a',
  border: '1px solid rgba(255,255,255,0.04)'
} as const;

const insightLabelStyle = {
  color: '#8f9cb2',
  fontSize: 12,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em'
} as const;

const matchupDetailGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 12
} as const;

function matchupCardStyle(tone: string) {
  const accent = tone === 'favored'
    ? 'rgba(126, 245, 199, 0.18)'
    : tone === 'difficult'
      ? 'rgba(255, 107, 107, 0.18)'
      : 'rgba(111, 191, 255, 0.14)';

  return {
    display: 'grid',
    gap: 12,
    padding: 16,
    borderRadius: 18,
    background: `linear-gradient(180deg, rgba(8,12,19,0.96), rgba(6,9,15,0.98)), ${accent}`,
    border: `1px solid ${accent}`
  } as const;
}

const triggerCardStyle = {
  display: 'grid',
  gap: 8,
  padding: 15,
  borderRadius: 16,
  background: '#070c14',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;
