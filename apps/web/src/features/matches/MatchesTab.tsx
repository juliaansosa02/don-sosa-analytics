import { useMemo, useState, type PropsWithChildren } from 'react';
import type { Dataset } from '../../types';
import { formatDecimal, formatSignedNumber } from '../../lib/format';
import { formatChampionName, getItemIconUrl, getQueueLabel, getRoleLabel } from '../../lib/lol';
import type { Locale } from '../../lib/i18n';
import { Badge, ChampionIdentity, InfoHint } from '../../components/ui';
import {
  buildMatchQuickRead,
  formatMatchDuration,
  getChampionAccent
} from '../dashboard/dashboardSignals';

function toneToBadgeTone(tone: ReturnType<typeof buildMatchQuickRead>['tone']) {
  switch (tone) {
    case 'reference':
      return 'low';
    case 'stable':
      return 'default';
    case 'volatile':
      return 'medium';
    case 'warning':
      return 'high';
    default:
      return 'default';
  }
}

function formatObjectives(match: Dataset['matches'][number], locale: Locale) {
  const pieces = [
    match.turretKills ? (locale === 'en' ? `${match.turretKills} towers` : `${match.turretKills} torres`) : null,
    match.dragonKills ? (locale === 'en' ? `${match.dragonKills} drakes` : `${match.dragonKills} dragones`) : null,
    match.baronKills ? (locale === 'en' ? `${match.baronKills} barons` : `${match.baronKills} barones`) : null
  ].filter(Boolean);

  return pieces.length
    ? pieces.join(' · ')
    : (locale === 'en' ? 'No major objectives secured' : 'Sin objetivos mayores asegurados');
}

function formatDetailDate(gameCreation: number, locale: Locale) {
  return new Date(gameCreation).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

function detailMetricLabel(locale: Locale, key: 'firstDeath' | 'firstBase' | 'firstMove' | 'firstItem' | 'laneVolatility' | 'setupScore' | 'damage' | 'totalDamage' | 'vision' | 'takedowns' | 'deaths' | 'goldDiff') {
  const labels = {
    firstDeath: { en: 'First death', es: 'Primera muerte' },
    firstBase: { en: 'First base', es: 'Primera base' },
    firstMove: { en: 'First move', es: 'Primer move' },
    firstItem: { en: 'First item', es: 'Primer item' },
    laneVolatility: { en: 'Lane volatility', es: 'Volatilidad' },
    setupScore: { en: 'Setup score', es: 'Score de setup' },
    damage: { en: 'Damage to champs', es: 'Daño a champs' },
    totalDamage: { en: 'Total damage', es: 'Daño total' },
    vision: { en: 'Vision', es: 'Visión' },
    takedowns: { en: 'Takedowns pre14', es: 'Takedowns pre14' },
    deaths: { en: 'Deaths pre14', es: 'Muertes pre14' },
    goldDiff: { en: 'Gold diff 15', es: 'Diff oro 15' }
  } as const;

  return labels[key][locale];
}

function renderItemRow(match: Dataset['matches'][number], dataset: Dataset, locale: Locale) {
  const finalBuild = match.items?.finalBuild ?? [];
  if (!finalBuild.length) return null;

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={sectionEyebrowStyle}>{locale === 'en' ? 'Final build snapshot' : 'Snapshot de build final'}</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {finalBuild.slice(0, 6).map((itemId) => {
          const iconUrl = getItemIconUrl(itemId, dataset.ddragonVersion);
          const itemName = dataset.itemCatalog?.[String(itemId)]?.name ?? `Item ${itemId}`;

          return (
            <div key={`${match.matchId}-${itemId}`} style={itemShellStyle} title={itemName}>
              {iconUrl ? <img src={iconUrl} alt={itemName} width={34} height={34} style={{ width: 34, height: 34, borderRadius: 10, display: 'block' }} /> : <span style={{ fontSize: 10, color: '#dfe8f7', fontWeight: 700 }}>{itemId}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MatchesTab({ dataset, locale = 'es' }: { dataset: Dataset; locale?: Locale }) {
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const matches = useMemo(() => [...dataset.matches].sort((left, right) => right.gameCreation - left.gameCreation), [dataset.matches]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {matches.map((match) => {
        const accent = getChampionAccent(match.championName);
        const quickRead = buildMatchQuickRead(match, dataset, locale);
        const expanded = expandedMatchId === match.matchId;
        const firstItemMinute = match.items?.milestones.firstCompletedItemMinute;
        const firstItemName = match.items?.milestones.firstCompletedItemId
          ? dataset.itemCatalog?.[String(match.items.milestones.firstCompletedItemId)]?.name ?? null
          : null;

        return (
          <article
            key={match.matchId}
            style={{
              display: 'grid',
              gap: 16,
              padding: 18,
              borderRadius: 24,
              background: accent.panel,
              border: `1px solid ${accent.border}`,
              boxShadow: `0 22px 54px rgba(0,0,0,0.24), 0 0 0 1px rgba(255,255,255,0.02), 0 0 34px ${accent.glow}`
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start', flexWrap: 'wrap' }}>
              <ChampionIdentity
                championName={match.championName}
                version={dataset.ddragonVersion}
                subtitle={`${formatDetailDate(match.gameCreation, locale)} · ${getQueueLabel(match.queueId)} · ${formatMatchDuration(match.gameDurationSeconds, locale)}`}
                meta={
                  <>
                    <Badge tone={match.win ? 'low' : 'high'}>{match.win ? (locale === 'en' ? 'Win' : 'Victoria') : (locale === 'en' ? 'Loss' : 'Derrota')}</Badge>
                    <Badge tone={toneToBadgeTone(quickRead.tone)}>{quickRead.toneLabel}</Badge>
                    <Badge tone={toneToBadgeTone(quickRead.tone)}>{quickRead.impactLabel}</Badge>
                  </>
                }
              />

              <div style={{ display: 'grid', gap: 10, justifyItems: 'end' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'end' }}>
                  <Badge>{match.opponentChampionName ? `vs ${formatChampionName(match.opponentChampionName)}` : (locale === 'en' ? 'Opponent unknown' : 'Rival sin detectar')}</Badge>
                  <Badge>{locale === 'en' ? getRoleLabel(match.role || dataset.summary.primaryRole || 'ALL') : getRoleLabel(match.role || dataset.summary.primaryRole || 'ALL')}</Badge>
                  <Badge>{`${match.kills}/${match.deaths}/${match.assists}`}</Badge>
                  <Badge>{`${formatDecimal(match.killParticipation)}% KP`}</Badge>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedMatchId(expanded ? null : match.matchId)}
                  style={detailToggleStyle}
                >
                  {expanded
                    ? (locale === 'en' ? 'Hide mini detail' : 'Ocultar mini detail')
                    : (locale === 'en' ? 'Open mini detail' : 'Abrir mini detail')}
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: 10 }}>
                  <CompactMetric
                    label={locale === 'en' ? 'Score' : 'Score'}
                    value={formatDecimal(match.score.total)}
                    info={locale === 'en' ? 'Internal execution score for this exact match.' : 'Score interno de ejecución para esta partida exacta.'}
                  />
                  <CompactMetric
                    label={locale === 'en' ? 'Gold diff 15' : 'Diff oro 15'}
                    value={formatSignedNumber(match.timeline.goldDiffAt15, 0)}
                    info={locale === 'en' ? 'Gold edge against the detected direct opponent at minute 15.' : 'Ventaja de oro contra el rival directo detectado al minuto 15.'}
                  />
                  <CompactMetric
                    label={locale === 'en' ? 'CS 15' : 'CS 15'}
                    value={formatDecimal(match.timeline.csAt15)}
                    info={locale === 'en' ? 'Lane or jungle economy accumulated by minute 15.' : 'Economía de línea o jungla acumulada al minuto 15.'}
                  />
                  <CompactMetric
                    label={locale === 'en' ? 'Damage' : 'Daño'}
                    value={Math.round(match.damageToChampions).toLocaleString(locale === 'en' ? 'en-US' : 'es-AR')}
                    info={locale === 'en' ? 'Damage dealt to enemy champions.' : 'Daño hecho a campeones enemigos.'}
                  />
                  <CompactMetric
                    label={locale === 'en' ? 'Objectives' : 'Objetivos'}
                    value={`${(match.turretKills ?? 0) + (match.dragonKills ?? 0) + (match.baronKills ?? 0)}`}
                    info={locale === 'en' ? 'Towers, dragons and barons secured by you.' : 'Torres, dragones y barones asegurados por vos.'}
                  />
                  <CompactMetric
                    label={locale === 'en' ? 'Deaths pre14' : 'Muertes pre14'}
                    value={formatDecimal(match.timeline.deathsPre14)}
                    info={locale === 'en' ? 'How expensive the early game got before minute 14.' : 'Qué tan caro se volvió el early antes del minuto 14.'}
                  />
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <SignalBadge tone="default">{formatObjectives(match, locale)}</SignalBadge>
                  {match.timeline.firstDeathMinute !== null ? <SignalBadge tone="medium">{`${detailMetricLabel(locale, 'firstDeath')} ${formatDecimal(match.timeline.firstDeathMinute, 1)}m`}</SignalBadge> : null}
                  {match.timeline.firstBaseMinute !== null ? <SignalBadge tone="default">{`${detailMetricLabel(locale, 'firstBase')} ${formatDecimal(match.timeline.firstBaseMinute, 1)}m`}</SignalBadge> : null}
                  {firstItemMinute ? <SignalBadge tone="default">{`${detailMetricLabel(locale, 'firstItem')} ${formatDecimal(firstItemMinute, 1)}m`}</SignalBadge> : null}
                  {(match.timeline.laneVolatilityScore ?? 0) >= 1.4 ? <SignalBadge tone="high">{locale === 'en' ? 'Volatile early' : 'Early volátil'}</SignalBadge> : null}
                  {(match.timeline.objectiveSetupScore ?? 0) >= 0.8 ? <SignalBadge tone="medium">{locale === 'en' ? 'Setup debt' : 'Deuda de setup'}</SignalBadge> : null}
                  {(match.timeline.resetTimingScore ?? 0) >= 1 ? <SignalBadge tone="medium">{locale === 'en' ? 'Reset debt' : 'Deuda de reset'}</SignalBadge> : null}
                  {match.firstBloodKill ? <SignalBadge tone="low">{locale === 'en' ? 'First blood' : 'First blood'}</SignalBadge> : null}
                  {match.firstTowerKill ? <SignalBadge tone="low">{locale === 'en' ? 'First tower' : 'First tower'}</SignalBadge> : null}
                  {match.doubleKills > 0 || match.tripleKills > 0 || match.quadraKills > 0 || match.pentaKills > 0
                    ? <SignalBadge tone="low">{locale === 'en' ? 'Multi-kill pressure' : 'Presión de multi-kill'}</SignalBadge>
                    : null}
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: 12,
                  padding: 16,
                  borderRadius: 18,
                  background: 'linear-gradient(180deg, rgba(9,13,21,0.84), rgba(7,10,16,0.96))',
                  border: `1px solid ${accent.border}`
                }}
              >
                <div style={{ color: accent.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 800 }}>
                  {locale === 'en' ? 'Quick read' : 'Lectura rápida'}
                </div>
                <div style={{ color: accent.text, fontSize: 20, lineHeight: 1.15, fontWeight: 850 }}>{quickRead.title}</div>
                <div style={{ color: '#d8e3f5', lineHeight: 1.7 }}>{quickRead.body}</div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {quickRead.evidence.slice(0, 2).map((entry) => (
                    <div key={entry} style={evidenceRowStyle}>{entry}</div>
                  ))}
                </div>
              </div>
            </div>

            {expanded ? (
              <div style={detailSurfaceStyle}>
                <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                  <div style={{ display: 'grid', gap: 16 }}>
                    <DetailSection
                      title={locale === 'en' ? 'Why this game landed here' : 'Por qué esta partida cayó acá'}
                      subtitle={locale === 'en' ? 'The goal is to decide what deserves review first.' : 'La idea es decidir qué merece review primero.'}
                    >
                      <div style={{ display: 'grid', gap: 8 }}>
                        {quickRead.reviewBullets.map((entry) => (
                          <div key={entry} style={bulletRowStyle}>{entry}</div>
                        ))}
                        <div style={bulletRowStyle}>
                          {locale === 'en'
                            ? `${championNameOrFallback(match.championName)} vs ${match.opponentChampionName ? formatChampionName(match.opponentChampionName) : 'unknown opponent'} in ${getRoleLabel(match.role || dataset.summary.primaryRole || 'ALL')} should be reviewed with this lens first.`
                            : `${championNameOrFallback(match.championName)} vs ${match.opponentChampionName ? formatChampionName(match.opponentChampionName) : 'rival desconocido'} en ${getRoleLabel(match.role || dataset.summary.primaryRole || 'ALL')} conviene revisarlo primero con esta lente.`}
                        </div>
                      </div>
                    </DetailSection>

                    <DetailSection
                      title={locale === 'en' ? 'Early state and tempo' : 'Estado temprano y tempo'}
                      subtitle={locale === 'en' ? 'Useful to separate lane issue, reset issue or setup issue.' : 'Sirve para separar si fue un problema de línea, reset o setup.'}
                    >
                      <div style={detailMetricGridStyle}>
                        <DetailMetric label={detailMetricLabel(locale, 'deaths')} value={formatDecimal(match.timeline.deathsPre14)} />
                        <DetailMetric label={detailMetricLabel(locale, 'laneVolatility')} value={formatDecimal(match.timeline.laneVolatilityScore, 1)} />
                        <DetailMetric label={detailMetricLabel(locale, 'firstDeath')} value={match.timeline.firstDeathMinute !== null ? `${formatDecimal(match.timeline.firstDeathMinute, 1)}m` : '—'} />
                        <DetailMetric label={detailMetricLabel(locale, 'firstBase')} value={match.timeline.firstBaseMinute !== null ? `${formatDecimal(match.timeline.firstBaseMinute, 1)}m` : '—'} />
                        <DetailMetric label={detailMetricLabel(locale, 'firstMove')} value={match.timeline.firstMoveMinute !== null ? `${formatDecimal(match.timeline.firstMoveMinute, 1)}m` : '—'} />
                        <DetailMetric label={detailMetricLabel(locale, 'firstItem')} value={firstItemMinute ? `${formatDecimal(firstItemMinute, 1)}m` : '—'} />
                        <DetailMetric label={detailMetricLabel(locale, 'goldDiff')} value={formatSignedNumber(match.timeline.goldDiffAt15, 0)} />
                        <DetailMetric label={locale === 'en' ? 'Level diff 15' : 'Diff nivel 15'} value={formatSignedNumber(match.timeline.levelDiffAt15, 1)} />
                      </div>
                    </DetailSection>
                  </div>

                  <div style={{ display: 'grid', gap: 16 }}>
                    <DetailSection
                      title={locale === 'en' ? 'Impact and objective context' : 'Impacto y contexto de objetivos'}
                      subtitle={locale === 'en' ? 'Good to tell apart noisy score from real influence.' : 'Útil para separar score ruidoso de influencia real.'}
                    >
                      <div style={detailMetricGridStyle}>
                        <DetailMetric label={detailMetricLabel(locale, 'damage')} value={Math.round(match.damageToChampions).toLocaleString(locale === 'en' ? 'en-US' : 'es-AR')} />
                        <DetailMetric label={detailMetricLabel(locale, 'totalDamage')} value={Math.round(match.totalDamageDealt ?? 0).toLocaleString(locale === 'en' ? 'en-US' : 'es-AR')} />
                        <DetailMetric label={detailMetricLabel(locale, 'vision')} value={Math.round(match.visionScore).toLocaleString(locale === 'en' ? 'en-US' : 'es-AR')} />
                        <DetailMetric label={detailMetricLabel(locale, 'takedowns')} value={formatDecimal(match.timeline.takedownsPre14)} />
                        <DetailMetric label={detailMetricLabel(locale, 'setupScore')} value={formatDecimal(match.timeline.objectiveSetupScore, 1)} />
                        <DetailMetric label={locale === 'en' ? 'Setup deaths' : 'Muertes de setup'} value={formatDecimal(match.timeline.objectiveSetupDeaths, 1)} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {match.soloKills ? <SignalBadge tone="default">{locale === 'en' ? `${match.soloKills} solo kills` : `${match.soloKills} solo kills`}</SignalBadge> : null}
                        {match.doubleKills ? <SignalBadge tone="low">{locale === 'en' ? `${match.doubleKills} doubles` : `${match.doubleKills} dobles`}</SignalBadge> : null}
                        {match.tripleKills ? <SignalBadge tone="low">{locale === 'en' ? `${match.tripleKills} triples` : `${match.tripleKills} triples`}</SignalBadge> : null}
                        {match.quadraKills ? <SignalBadge tone="low">{locale === 'en' ? `${match.quadraKills} quadras` : `${match.quadraKills} quadras`}</SignalBadge> : null}
                        {match.pentaKills ? <SignalBadge tone="low">{locale === 'en' ? `${match.pentaKills} pentas` : `${match.pentaKills} pentas`}</SignalBadge> : null}
                      </div>
                    </DetailSection>

                    <DetailSection
                      title={locale === 'en' ? 'Build and item timing' : 'Build y timing de items'}
                      subtitle={firstItemName
                        ? (locale === 'en' ? `First completed item: ${firstItemName}` : `Primer item completo: ${firstItemName}`)
                        : (locale === 'en' ? 'Useful to review when the curve actually came online.' : 'Sirve para revisar cuándo entró en línea la curva real.')}
                    >
                      {renderItemRow(match, dataset, locale)}
                    </DetailSection>
                  </div>
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function championNameOrFallback(championName?: string | null) {
  return championName ? formatChampionName(championName) : 'Champion';
}

function CompactMetric({ label, value, info }: { label: string; value: string; info: string }) {
  return (
    <div style={compactMetricStyle}>
      <div style={{ display: 'flex', alignItems: 'center', color: '#90a1b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        {label}
        <InfoHint text={info} />
      </div>
      <div style={{ color: '#f6fbff', fontSize: 22, fontWeight: 850, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

function SignalBadge({ children, tone = 'default' }: PropsWithChildren<{ tone?: 'default' | 'high' | 'medium' | 'low' }>) {
  return <Badge tone={tone}>{children}</Badge>;
}

function DetailSection({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle: string }>) {
  return (
    <div style={detailSectionStyle}>
      <div style={{ display: 'grid', gap: 5 }}>
        <div style={{ color: '#f2f7ff', fontSize: 15, fontWeight: 800 }}>{title}</div>
        <div style={{ color: '#8d9cb2', fontSize: 13, lineHeight: 1.55 }}>{subtitle}</div>
      </div>
      {children}
    </div>
  );
}

function DetailMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={detailMetricStyle}>
      <div style={{ color: '#7d8da6', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{ color: '#f0f6ff', fontSize: 18, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

const compactMetricStyle = {
  display: 'grid',
  gap: 8,
  padding: '13px 12px',
  borderRadius: 16,
  background: 'rgba(7,10,16,0.78)',
  border: '1px solid rgba(255,255,255,0.06)'
} as const;

const evidenceRowStyle = {
  color: '#d7e0ef',
  fontSize: 13,
  lineHeight: 1.65,
  padding: '10px 11px',
  borderRadius: 12,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;

const detailToggleStyle = {
  padding: '10px 13px',
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.09)',
  background: 'rgba(255,255,255,0.04)',
  color: '#edf4ff',
  cursor: 'pointer',
  fontWeight: 700
} as const;

const detailSurfaceStyle = {
  display: 'grid',
  gap: 14,
  padding: 16,
  borderRadius: 20,
  background: 'linear-gradient(180deg, rgba(5,8,13,0.9), rgba(8,11,18,0.96))',
  border: '1px solid rgba(255,255,255,0.07)'
} as const;

const detailSectionStyle = {
  display: 'grid',
  gap: 14,
  padding: 16,
  borderRadius: 18,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;

const detailMetricGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: 10
} as const;

const detailMetricStyle = {
  display: 'grid',
  gap: 6,
  padding: '11px 12px',
  borderRadius: 14,
  background: '#070b12',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;

const bulletRowStyle = {
  color: '#dde7f7',
  lineHeight: 1.65,
  padding: '10px 12px',
  borderRadius: 12,
  background: '#070b12',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;

const sectionEyebrowStyle = {
  color: '#90a1b8',
  fontSize: 11,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  fontWeight: 800
} as const;

const itemShellStyle = {
  width: 38,
  height: 38,
  borderRadius: 12,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#070b12',
  border: '1px solid rgba(255,255,255,0.07)'
} as const;
