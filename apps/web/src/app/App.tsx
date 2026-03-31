import { buildAggregateSummary } from '@don-sosa/core';
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { collectProfile } from '../lib/api';
import type { Dataset } from '../types';
import { Shell, Card, Badge } from '../components/ui';
import { CoachingHome } from '../features/coach/CoachingHome';
import { StatsTab } from '../features/stats/StatsTab';
import { MatchupsTab } from '../features/matchups/MatchupsTab';
import { RunesTab } from '../features/runes/RunesTab';
import { ChampionPoolTab } from '../features/champion-pool/ChampionPoolTab';
import { MatchesTab } from '../features/matches/MatchesTab';
import { getProfileIconUrl, getQueueBucket, getQueueLabel, getRankEmblemDataUrl, getRankPalette, getRoleLabel } from '../lib/lol';
import { formatDecimal } from '../lib/format';
import { buildCs15Benchmark } from '../lib/benchmarks';

const tabs = [
  { id: 'coach', label: 'Coach' },
  { id: 'stats', label: 'Stats' },
  { id: 'matchups', label: 'Matchups' },
  { id: 'runes', label: 'Runes' },
  { id: 'champions', label: 'Champions' },
  { id: 'matches', label: 'Matches' }
] as const;

type TabId = typeof tabs[number]['id'];
interface ProgressState {
  stage: string;
  current: number;
  total: number;
  message: string;
}

function datasetStorageKey(gameName: string, tagLine: string) {
  return `don-sosa:dataset:${gameName}#${tagLine}`.toLowerCase();
}

function mergeDatasets(current: Dataset | null, incoming: Dataset): Dataset {
  if (!current) return incoming;

  const matchMap = new Map<string, Dataset['matches'][number]>();
  for (const match of [...current.matches, ...incoming.matches]) {
    matchMap.set(match.matchId, match);
  }

  const mergedMatches = Array.from(matchMap.values()).sort((a, b) => b.gameCreation - a.gameCreation);
  const mergedSummary = buildAggregateSummary(incoming.player, incoming.tagLine, incoming.summary.region, incoming.summary.platform, mergedMatches);

  return {
    ...incoming,
    matches: mergedMatches,
    summary: mergedSummary,
    remakesExcluded: Math.max(current.remakesExcluded ?? 0, incoming.remakesExcluded ?? 0)
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('coach');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [queueFilter, setQueueFilter] = useState<'ALL' | 'RANKED' | 'RANKED_SOLO' | 'RANKED_FLEX' | 'OTHER'>('ALL');
  const [windowFilter, setWindowFilter] = useState<'ALL' | 'LAST_20' | 'LAST_8'>('ALL');
  const [matchCount, setMatchCount] = useState(50);
  const [gameName, setGameName] = useState('');
  const [tagLine, setTagLine] = useState('');
  const [showAccountControls, setShowAccountControls] = useState(true);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [dataset, setDataset] = useState<Dataset | null>(null);

  useEffect(() => {
    const savedProfile = window.localStorage.getItem('don-sosa:last-profile');
    if (!savedProfile) return;

    try {
      const parsed = JSON.parse(savedProfile) as { gameName?: string; tagLine?: string; matchCount?: number };
      if (parsed.gameName) setGameName(parsed.gameName);
      if (parsed.tagLine) setTagLine(parsed.tagLine);
      if (parsed.matchCount) setMatchCount(parsed.matchCount);
      if (parsed.gameName && parsed.tagLine) {
        const savedDataset = window.localStorage.getItem(datasetStorageKey(parsed.gameName, parsed.tagLine));
        if (savedDataset) {
          try {
            setDataset(JSON.parse(savedDataset) as Dataset);
            setShowAccountControls(false);
          } catch {
            window.localStorage.removeItem(datasetStorageKey(parsed.gameName, parsed.tagLine));
            setShowAccountControls(true);
          }
        } else {
          setShowAccountControls(true);
        }
      }
    } catch {
      window.localStorage.removeItem('don-sosa:last-profile');
    }
  }, []);

  const availableRoles = useMemo(() => {
    if (!dataset) return ['ALL'];
    const roles = Array.from(new Set(dataset.matches.map((match) => match.role || 'NONE')))
      .filter((role) => Boolean(role) && role !== 'NONE');
    return ['ALL', ...roles];
  }, [dataset]);

  const availableQueueFilters = useMemo(() => {
    if (!dataset) return ['ALL'] as const;
    const buckets = new Set(dataset.matches.map((match) => getQueueBucket(match.queueId)));
    const options: Array<'ALL' | 'RANKED' | 'RANKED_SOLO' | 'RANKED_FLEX' | 'OTHER'> = ['ALL'];
    if (buckets.has('RANKED_SOLO') || buckets.has('RANKED_FLEX')) options.push('RANKED');
    if (buckets.has('RANKED_SOLO')) options.push('RANKED_SOLO');
    if (buckets.has('RANKED_FLEX')) options.push('RANKED_FLEX');
    if (buckets.has('OTHER')) options.push('OTHER');
    return options;
  }, [dataset]);

  const viewDataset = useMemo(() => {
    if (!dataset) return null;
    let filteredMatches = [...dataset.matches];
    if (roleFilter !== 'ALL') {
      filteredMatches = filteredMatches.filter((match) => (match.role || 'NONE') === roleFilter);
    }
    if (queueFilter !== 'ALL') {
      filteredMatches = filteredMatches.filter((match) => {
        const bucket = getQueueBucket(match.queueId);
        if (queueFilter === 'RANKED') return bucket === 'RANKED_SOLO' || bucket === 'RANKED_FLEX';
        return bucket === queueFilter;
      });
    }

    filteredMatches.sort((a, b) => b.gameCreation - a.gameCreation);
    if (windowFilter === 'LAST_20') filteredMatches = filteredMatches.slice(0, 20);
    if (windowFilter === 'LAST_8') filteredMatches = filteredMatches.slice(0, 8);

    const filteredSummary = buildAggregateSummary(dataset.player, dataset.tagLine, dataset.summary.region, dataset.summary.platform, filteredMatches);

    return {
      ...dataset,
      matches: filteredMatches,
      summary: filteredSummary
    };
  }, [dataset, roleFilter, queueFilter, windowFilter]);

  const renderedTab = useMemo(() => {
    if (!viewDataset) return null;

    switch (activeTab) {
      case 'coach':
        return <CoachingHome dataset={viewDataset} />;
      case 'stats':
        return <StatsTab dataset={viewDataset} />;
      case 'matchups':
        return <MatchupsTab dataset={viewDataset} />;
      case 'runes':
        return <RunesTab dataset={viewDataset} />;
      case 'champions':
        return <ChampionPoolTab dataset={viewDataset} />;
      case 'matches':
        return <MatchesTab dataset={viewDataset} />;
    }
  }, [activeTab, viewDataset]);

  const csBenchmark = useMemo(() => {
    if (!viewDataset?.rank) return null;
    return buildCs15Benchmark(roleFilter, viewDataset.rank.highest.tier, viewDataset.summary.avgCsAt15);
  }, [roleFilter, viewDataset]);

  const preferredRoles = useMemo(() => {
    if (!availableRoles.length) return ['ALL'];
    const priority = ['ALL', 'JUNGLE', 'TOP', 'MIDDLE', 'BOTTOM', 'UTILITY', 'NONE'];
    return [...availableRoles].sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
  }, [availableRoles]);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    setSyncMessage(null);
    setProgress({ stage: 'queued', current: 0, total: 1, message: 'Preparando analisis' });

    try {
      const cachedDataset = window.localStorage.getItem(datasetStorageKey(gameName, tagLine));
      const previousDataset = cachedDataset ? (JSON.parse(cachedDataset) as Dataset) : null;
      const result = await collectProfile(gameName, tagLine, matchCount, {
        onProgress: (nextProgress) => setProgress(nextProgress),
        knownMatchIds: previousDataset?.matches.map((match) => match.matchId) ?? []
      });
      const mergedDataset = mergeDatasets(previousDataset, result);
      setDataset(mergedDataset);
      setShowAccountControls(false);
      if (previousDataset) {
        const addedMatches = mergedDataset.matches.length - previousDataset.matches.length;
        setSyncMessage(addedMatches > 0
          ? `Se agregaron ${addedMatches} partidas nuevas. El análisis mantiene el historial previo y recalcula todo por fecha real.`
          : 'No aparecieron partidas nuevas para sumar. El análisis mantiene tu histórico actual sin sobrescribirlo.');
      } else {
        setSyncMessage(`Se cargaron ${mergedDataset.summary.matches} partidas válidas para construir tu primera muestra.`);
      }
      window.localStorage.setItem('don-sosa:last-profile', JSON.stringify({ gameName, tagLine, matchCount }));
      window.localStorage.setItem(datasetStorageKey(gameName, tagLine), JSON.stringify(mergedDataset));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await runAnalysis();
  }

  return (
    <Shell>
      <div style={{ display: 'grid', gap: 18, maxWidth: 1440, margin: '0 auto' }}>
        <section style={heroStyle}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ color: '#8b94a4', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: 12 }}>Don Sosa Coach</div>
            <h1 style={{ margin: 0, fontSize: 46, letterSpacing: '-0.05em', maxWidth: 760 }}>Tu lectura competitiva para jugar mejor, no solo mirar stats</h1>
            <p style={{ margin: 0, color: '#9099aa', maxWidth: 760, lineHeight: 1.7 }}>
              Diagnóstico claro, decisiones accionables y una vista ordenada de matchups, runas, campeones y review. Primero entendés qué corregir; después entrás al detalle.
            </p>
            {loading ? (
              <div style={{ color: '#d8fdf1', fontSize: 13, lineHeight: 1.6 }}>
                {progress?.message ?? (matchCount >= 75
                  ? 'Analizando una muestra grande. Esto puede tardar varios minutos por los límites de Riot.'
                  : 'Analizando partidas. Esto puede tardar entre unos segundos y alrededor de un minuto.')}
              </div>
            ) : null}
            {loading && progress ? (
              <div style={{ display: 'grid', gap: 8, maxWidth: 460 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9eb0c7', fontSize: 12 }}>
                  <span>{progress.stage}</span>
                  <span>{`${Math.min(progress.current, progress.total)} / ${progress.total}`}</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(8, (progress.current / Math.max(progress.total, 1)) * 100)}%`, height: '100%', background: '#67d6a4' }} />
                </div>
              </div>
            ) : null}
            {viewDataset?.rank ? (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <RankBadge rank={viewDataset.rank} compact />
                <div style={heroMetaChipStyle}>
                  <div style={heroMetaLabelStyle}>Win rate</div>
                  <div style={heroMetaValueStyle}>{`${viewDataset.rank.highest.winRate}%`}</div>
                  <div style={heroMetaSubtleStyle}>{`${viewDataset.rank.highest.wins}-${viewDataset.rank.highest.losses}`}</div>
                </div>
                {csBenchmark ? (
                  <div style={heroMetaChipStyle}>
                    <div style={heroMetaLabelStyle}>Benchmark</div>
                    <div style={{ ...heroMetaValueStyle, color: csBenchmark.status === 'above' ? '#9ff0cf' : csBenchmark.status === 'below' ? '#ffb3b3' : '#dce8fb' }}>{csBenchmark.label}</div>
                    <div style={heroMetaSubtleStyle}>CS a los 15</div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <Card title={showAccountControls ? 'Analizar cuenta' : 'Cuenta activa'} subtitle={showAccountControls ? 'Ingresá el Riot ID y elegí cuántas partidas querés analizar.' : 'Tu cuenta queda lista para refrescar datos o cambiar de perfil cuando quieras.'}>
            {showAccountControls || !dataset ? (
              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
                <div className="three-col-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr .8fr .7fr', gap: 10 }}>
                  <input value={gameName} onChange={(e) => setGameName(e.target.value)} placeholder="Riot Game Name" style={inputStyle} />
                  <input value={tagLine} onChange={(e) => setTagLine(e.target.value)} placeholder="Tag Line" style={inputStyle} />
                  <select value={matchCount} onChange={(e) => setMatchCount(Number(e.target.value))} style={selectStyle}>
                    {[10, 20, 30, 40, 50, 75, 100].map((count) => (
                      <option key={count} value={count}>{count} partidas</option>
                    ))}
                  </select>
                </div>

                <div style={{ color: '#7f8898', fontSize: 12, lineHeight: 1.5 }}>
                  {matchCount >= 75
                    ? 'Con 75 o 100 partidas el análisis es más estable, pero puede tardar bastante por los límites de Riot.'
                    : 'Menos partidas cargan más rápido. Más partidas dan una lectura más confiable.'}
                </div>

                {!dataset && gameName && tagLine ? (
                  <div style={{ color: '#9ba6b8', fontSize: 12 }}>
                    No hay un análisis guardado para esta cuenta en este navegador. Cargalo una vez y después quedará disponible.
                  </div>
                ) : null}

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Badge tone="default">{`Filtro actual: ${getRoleLabel(roleFilter)}`}</Badge>
                    {dataset?.remakesExcluded ? <Badge tone="medium">{`${dataset.remakesExcluded} remakes excluidos`}</Badge> : null}
                  </div>
                  <button type="submit" style={buttonStyle}>{loading ? 'Analizando...' : `${dataset ? 'Actualizar' : 'Cargar'} ${matchCount} partidas`}</button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ color: '#e7eef8', lineHeight: 1.6 }}>
                  {gameName && tagLine ? `${gameName}#${tagLine}` : 'Cuenta lista para analizar'}.
                </div>
                <div style={{ color: '#8a95a8', fontSize: 12, lineHeight: 1.5 }}>
                  Si ya hay partidas guardadas, actualizar busca partidas nuevas y las agrega sin pisar el historial anterior.
                </div>
                {syncMessage ? <div style={syncMessageStyle}>{syncMessage}</div> : null}
                <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ color: '#8d96a5', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Cantidad de partidas</div>
                    <select value={matchCount} onChange={(e) => setMatchCount(Number(e.target.value))} style={selectStyle}>
                      {[10, 20, 30, 40, 50, 75, 100].map((count) => (
                        <option key={count} value={count}>{count} partidas</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ color: '#8d96a5', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Filtro de rol</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Badge tone="default">{`Filtro actual: ${getRoleLabel(roleFilter)}`}</Badge>
                      {dataset?.remakesExcluded ? <Badge tone="medium">{`${dataset.remakesExcluded} remakes excluidos`}</Badge> : null}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" style={buttonStyle} onClick={() => void runAnalysis()}>
                    {loading ? 'Analizando...' : `Actualizar ${matchCount} partidas`}
                  </button>
                  <button type="button" style={secondaryButtonStyle} onClick={() => setShowAccountControls(true)}>Cambiar cuenta</button>
                </div>
              </div>
            )}
          </Card>
        </section>

        {viewDataset ? (
          <section className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1.05fr 1.95fr', gap: 12 }}>
            <div style={accountCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {viewDataset.profile ? <img src={getProfileIconUrl(viewDataset.profile.profileIconId, viewDataset.ddragonVersion) ?? undefined} alt={viewDataset.player} width={56} height={56} style={profileIconStyle} /> : null}
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{ fontSize: 26, fontWeight: 800 }}>{viewDataset.player}<span style={{ color: '#7d8696', fontWeight: 600 }}>#{viewDataset.tagLine}</span></div>
                  {viewDataset.profile ? <div style={{ color: '#8f99ac', fontSize: 13 }}>{`Nivel ${viewDataset.profile.summonerLevel}`}</div> : null}
                </div>
              </div>
              <div style={accountMetaRowStyle}>
                <div style={recordPillStyle}>
                  <div style={{ color: '#7f8ca1', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Muestra</div>
                  <div style={{ color: '#edf2ff', fontSize: 14, fontWeight: 800 }}>{`${viewDataset.summary.wins}-${viewDataset.summary.losses}`}</div>
                </div>
                <div style={recordPillStyle}>
                  <div style={{ color: '#7f8ca1', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Win rate</div>
                  <div style={{ color: '#dff7eb', fontSize: 14, fontWeight: 800 }}>{`${viewDataset.summary.winRate}%`}</div>
                </div>
                <div style={recordPillStyle}>
                  <div style={{ color: '#7f8ca1', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Partidas válidas</div>
                  <div style={{ color: '#edf2ff', fontSize: 14, fontWeight: 800 }}>{viewDataset.summary.matches}</div>
                </div>
              </div>
              {viewDataset.rank ? <RankBadge rank={viewDataset.rank} /> : null}
            </div>
            <div className="three-col-grid" style={topStatsPanelStyle}>
              <TopStat label="Performance" value={formatDecimal(viewDataset.summary.avgPerformanceScore)} hint="Índice medio de ejecución" />
              <TopStat label="CS a los 15" value={formatDecimal(viewDataset.summary.avgCsAt15)} hint="Economía temprana media" />
              <TopStat label="Oro a los 15" value={Math.round(viewDataset.summary.avgGoldAt15).toLocaleString('es-AR')} hint="Valor generado antes del mid game" />
              <TrendSparkline matches={viewDataset.matches} />
            </div>
          </section>
        ) : null}

        <section style={{ display: 'grid', gap: 12 }}>
          {viewDataset ? (
            <div style={roleFilterPanelStyle}>
              <div style={{ display: 'grid', gap: 3 }}>
                <div style={{ color: '#8da0ba', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Contexto de análisis</div>
                <div style={{ color: '#eef4ff', fontSize: 16, fontWeight: 800 }}>Elegí el contexto exacto que querés revisar</div>
                <div style={{ color: '#8793a8', fontSize: 13 }}>El coaching mejora mucho si separás rol, tipo de cola y ventana reciente en vez de mezclar todas tus partidas.</div>
              </div>
              <div className="role-pill-grid" style={rolePillGridStyle}>
                {preferredRoles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setRoleFilter(role)}
                    style={{
                      ...rolePillStyle,
                      ...(roleFilter === role ? activeRolePillStyle : {})
                    }}
                  >
                    {getRoleLabel(role)}
                  </button>
                ))}
              </div>
              <div className="three-col-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.1fr .9fr', gap: 10 }}>
                <div style={contextGroupStyle}>
                  <div style={contextLabelStyle}>Tipo de cola</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {availableQueueFilters.map((queue) => (
                      <button
                        key={queue}
                        type="button"
                        onClick={() => setQueueFilter(queue)}
                        style={{
                          ...contextChipStyle,
                          ...(queueFilter === queue ? activeContextChipStyle : {})
                        }}
                      >
                        {queue === 'ALL'
                          ? 'Todas'
                          : queue === 'RANKED'
                            ? 'Rankeds'
                            : queue === 'RANKED_SOLO'
                              ? 'Solo/Duo'
                              : queue === 'RANKED_FLEX'
                                ? 'Flex'
                                : 'Otras'}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={contextGroupStyle}>
                  <div style={contextLabelStyle}>Ventana</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { id: 'ALL', label: 'Todo' },
                      { id: 'LAST_20', label: 'Últimas 20' },
                      { id: 'LAST_8', label: 'Últimas 8' }
                    ].map((windowOption) => (
                      <button
                        key={windowOption.id}
                        type="button"
                        onClick={() => setWindowFilter(windowOption.id as typeof windowFilter)}
                        style={{
                          ...contextChipStyle,
                          ...(windowFilter === windowOption.id ? activeContextChipStyle : {})
                        }}
                      >
                        {windowOption.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={contextGroupStyle}>
                  <div style={contextLabelStyle}>Lectura activa</div>
                  <div style={{ color: '#dce7f9', fontSize: 13, lineHeight: 1.5 }}>
                    {`${getRoleLabel(roleFilter)} · ${queueFilter === 'ALL' ? 'todas las colas' : queueFilter === 'RANKED' ? 'rankeds' : queueFilter === 'RANKED_SOLO' ? 'solo/duo' : queueFilter === 'RANKED_FLEX' ? 'flex' : 'otras colas'}`}
                  </div>
                  <div style={{ color: '#8390a6', fontSize: 12 }}>
                    {windowFilter === 'ALL' ? `${viewDataset.summary.matches} partidas en muestra` : `${viewDataset.summary.matches} partidas recientes`}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div style={navigationPanelStyle}>
            <div style={{ display: 'grid', gap: 3 }}>
              <div style={{ color: '#8da0ba', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Exploración</div>
              <div style={{ color: '#eef4ff', fontSize: 15, fontWeight: 800 }}>Elegí qué capa querés abrir</div>
            </div>
            <div className="tab-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8, flex: 1 }}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    ...tabStyle,
                    ...(activeTab === tab.id ? activeTabStyle : {})
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {viewDataset ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge>{`${viewDataset.summary.matches} partidas visibles`}</Badge>
                {viewDataset.matches[0] ? <Badge>{getQueueLabel(viewDataset.matches[0].queueId)}</Badge> : null}
                <Badge tone="default">{getRoleLabel(roleFilter)}</Badge>
              </div>
            ) : null}
          </div>
        </section>

        {error ? <Card title="Error">{error}</Card> : null}

        {viewDataset ? (
          renderedTab
        ) : (
          <Card title="Esperando análisis" subtitle="La idea es que el producto se sienta más cuenta personal premium que panel técnico">
            <div style={{ display: 'grid', gap: 12, color: '#c7d4ea', lineHeight: 1.7 }}>
              <div><strong>Coach:</strong> problema principal, evidencia, impacto y plan activo.</div>
              <div><strong>Stats:</strong> métricas agregadas y evolución.</div>
              <div><strong>Matchups:</strong> rendimiento real frente a rivales directos.</div>
              <div><strong>Runes y champions:</strong> lectura táctica con más contexto visual.</div>
            </div>
          </Card>
        )}
      </div>
    </Shell>
  );
}

const heroStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.2fr .95fr',
  gap: 18,
  padding: 24,
  borderRadius: 24,
  border: '1px solid rgba(255,255,255,0.06)',
  background: 'linear-gradient(180deg, rgba(39,27,67,0.8), rgba(7,10,16,0.98))'
};

const accountCardStyle: CSSProperties = {
  display: 'grid',
  gap: 12,
  padding: '18px 20px',
  borderRadius: 16,
  background: 'linear-gradient(180deg, rgba(22,26,38,0.96), rgba(8,11,18,0.98))',
  border: '1px solid rgba(255,255,255,0.06)'
};

const profileIconStyle: CSSProperties = {
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.08)'
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.08)',
  background: '#070b12',
  color: '#edf2ff'
};

const selectStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.08)',
  background: '#070b12',
  color: '#edf2ff'
};

const buttonStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)',
  padding: '12px 18px',
  borderRadius: 12,
  background: '#d8fdf1',
  color: '#07111f',
  fontWeight: 800,
  cursor: 'pointer'
};

const secondaryButtonStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)',
  padding: '12px 18px',
  borderRadius: 12,
  background: '#0a0f18',
  color: '#e8eef9',
  fontWeight: 700,
  cursor: 'pointer'
};

const tabStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)',
  padding: '12px 14px',
  borderRadius: 12,
  background: '#070b12',
  color: '#d7e3f5',
  cursor: 'pointer',
  textAlign: 'center'
};

const activeTabStyle: CSSProperties = {
  background: 'linear-gradient(180deg, rgba(53,35,95,0.95), rgba(16,23,35,1))',
  borderColor: 'rgba(216,253,241,0.18)',
  color: '#ffffff'
};

const accountMetaRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 8
};

const recordPillStyle: CSSProperties = {
  display: 'grid',
  gap: 4,
  padding: '10px 12px',
  borderRadius: 12,
  background: '#080d15',
  border: '1px solid rgba(255,255,255,0.05)'
};

const roleFilterPanelStyle: CSSProperties = {
  display: 'grid',
  gap: 14,
  padding: '16px 18px',
  borderRadius: 16,
  background: 'linear-gradient(180deg, rgba(13,18,28,0.98), rgba(7,10,16,0.98))',
  border: '1px solid rgba(216,253,241,0.1)'
};

const rolePillGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
  gap: 8
};

const rolePillStyle: CSSProperties = {
  padding: '12px 12px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.08)',
  background: '#080d15',
  color: '#d9e4f6',
  fontWeight: 700,
  cursor: 'pointer',
  textAlign: 'center'
};

const activeRolePillStyle: CSSProperties = {
  background: 'linear-gradient(180deg, rgba(216,253,241,0.14), rgba(26,39,50,0.92))',
  borderColor: 'rgba(216,253,241,0.22)',
  color: '#ffffff',
  boxShadow: '0 0 0 1px rgba(216,253,241,0.08) inset'
};

const contextGroupStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
  padding: '12px 14px',
  borderRadius: 14,
  background: '#080d15',
  border: '1px solid rgba(255,255,255,0.05)'
};

const contextLabelStyle: CSSProperties = {
  color: '#7f8ca1',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.08em'
};

const contextChipStyle: CSSProperties = {
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.08)',
  background: '#0a1018',
  color: '#d7e3f5',
  cursor: 'pointer',
  fontWeight: 700
};

const activeContextChipStyle: CSSProperties = {
  background: 'linear-gradient(180deg, rgba(216,253,241,0.14), rgba(24,35,44,0.96))',
  borderColor: 'rgba(216,253,241,0.22)',
  color: '#ffffff'
};

const syncMessageStyle: CSSProperties = {
  padding: '10px 12px',
  borderRadius: 12,
  background: 'rgba(216,253,241,0.08)',
  border: '1px solid rgba(216,253,241,0.12)',
  color: '#dff7eb',
  fontSize: 12,
  lineHeight: 1.5
};

const navigationPanelStyle: CSSProperties = {
  display: 'grid',
  gap: 10,
  padding: '14px 16px',
  borderRadius: 16,
  background: '#060a10',
  border: '1px solid rgba(255,255,255,0.06)'
};

function TopStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div style={topStatStyle}>
      <div style={{ color: '#768091', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ fontSize: 21, fontWeight: 800, lineHeight: 1.05 }}>{value}</div>
      <div style={{ color: '#8692a7', fontSize: 12 }}>{hint}</div>
    </div>
  );
}

function RankBadge({ rank, compact = false }: { rank: NonNullable<Dataset['rank']>; compact?: boolean }) {
  const emblem = getRankEmblemDataUrl(rank.highest.tier);
  const palette = getRankPalette(rank.highest.tier);
  const lpProgress = Math.max(0, Math.min(rank.highest.leaguePoints, 100));
  const title = `Solo/Duo: ${rank.soloQueue.label} · ${rank.soloQueue.leaguePoints} LP · ${rank.soloQueue.winRate}% WR\nFlex: ${rank.flexQueue.label} · ${rank.flexQueue.leaguePoints} LP · ${rank.flexQueue.winRate}% WR`;

  return (
    <div title={title} style={{
      display: 'grid',
      gap: compact ? 6 : 8,
      minWidth: compact ? 220 : 250,
      padding: compact ? '10px 12px' : '12px 14px',
      borderRadius: 14,
      background: compact ? 'rgba(9, 14, 22, 0.86)' : 'linear-gradient(180deg, rgba(10,14,22,0.96), rgba(19,24,37,0.92))',
      border: `1px solid ${palette.primary}33`
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src={emblem} alt={rank.highest.label} width={compact ? 28 : 36} height={compact ? 28 : 36} style={{ display: 'block' }} />
        <div style={{ display: 'grid', gap: 2 }}>
          <div style={{ color: '#8d97aa', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{rank.highest.queueLabel ?? 'Ranked'}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: compact ? 13 : 15, fontWeight: 800, color: '#edf2ff' }}>{rank.highest.label}</span>
            <span style={{ color: palette.glow, fontSize: 12, fontWeight: 700 }}>{`${rank.highest.leaguePoints} LP`}</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 5 }}>
        <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{ width: `${lpProgress}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${palette.primary}, ${palette.glow})` }} />
        </div>
        {!compact ? (
          <div style={{ color: '#7e889b', fontSize: 11 }}>
            Hover para ver Solo/Duo y Flex
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TrendSparkline({ matches }: { matches: Dataset['matches'] }) {
  const sorted = [...matches].sort((a, b) => a.gameCreation - b.gameCreation).slice(-12);
  const values = sorted.map((match) => match.score.total);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 100);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 0 : (index / Math.max(values.length - 1, 1)) * 100;
    const y = 100 - (((value - min) / Math.max(max - min, 1)) * 100);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={sparklineCardStyle}>
      <div style={{ color: '#7d889c', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Últimas partidas</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12 }}>
        <div style={{ display: 'grid', gap: 4 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Performance reciente</div>
          <div style={{ color: '#8895aa', fontSize: 12 }}>Sparkline de las últimas 12 partidas válidas</div>
        </div>
        <div style={{ color: '#dff7eb', fontSize: 12, fontWeight: 700 }}>{values.length ? `${Math.round(values.at(-1) ?? 0)} último score` : 'Sin datos'}</div>
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: 84, display: 'block' }}>
        <defs>
          <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(216,253,241,0.34)" />
            <stop offset="100%" stopColor="rgba(216,253,241,0)" />
          </linearGradient>
        </defs>
        <polyline fill="none" stroke="rgba(216,253,241,0.95)" strokeWidth="3" points={points} />
      </svg>
    </div>
  );
}

const topStatStyle: CSSProperties = {
  minWidth: 126,
  padding: '14px 15px',
  borderRadius: 16,
  background: '#060a10',
  border: '1px solid rgba(255,255,255,0.06)',
  display: 'grid',
  gap: 4,
  alignContent: 'start'
};

const topStatsPanelStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 10,
  alignItems: 'stretch'
};

const sparklineCardStyle: CSSProperties = {
  gridColumn: '1 / -1',
  display: 'grid',
  gap: 10,
  padding: '14px 15px',
  borderRadius: 16,
  background: '#060a10',
  border: '1px solid rgba(255,255,255,0.06)'
};

const heroMetaChipStyle: CSSProperties = {
  display: 'grid',
  gap: 2,
  minWidth: 128,
  padding: '10px 12px',
  borderRadius: 14,
  background: 'rgba(8,12,20,0.88)',
  border: '1px solid rgba(255,255,255,0.06)'
};

const heroMetaLabelStyle: CSSProperties = {
  color: '#7d889c',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.08em'
};

const heroMetaValueStyle: CSSProperties = {
  color: '#edf2ff',
  fontSize: 16,
  fontWeight: 800
};

const heroMetaSubtleStyle: CSSProperties = {
  color: '#8d98ad',
  fontSize: 12
};
