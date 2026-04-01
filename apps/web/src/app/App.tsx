import { buildAggregateSummary } from '@don-sosa/core';
import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { collectProfile, fetchCachedProfile, generateAICoach, sendAICoachFeedback } from '../lib/api';
import type { AICoachResult, Dataset } from '../types';
import { Shell, Card, Badge } from '../components/ui';
import { CoachingHome } from '../features/coach/CoachingHome';
import { StatsTab } from '../features/stats/StatsTab';
import { MatchupsTab } from '../features/matchups/MatchupsTab';
import { RunesTab } from '../features/runes/RunesTab';
import { ChampionPoolTab } from '../features/champion-pool/ChampionPoolTab';
import { MatchesTab } from '../features/matches/MatchesTab';
import { detectLocale, translateRole, type Locale } from '../lib/i18n';
import { getProfileIconUrl, getQueueBucket, getQueueLabel, getRankEmblemDataUrl, getRankPalette, getRoleLabel } from '../lib/lol';
import { formatDecimal } from '../lib/format';
import { buildCs15Benchmark } from '../lib/benchmarks';

const tabs = [
  { id: 'coach', label: { es: 'Coaching', en: 'Coaching' } },
  { id: 'stats', label: { es: 'Métricas', en: 'Stats' } },
  { id: 'matchups', label: { es: 'Cruces', en: 'Matchups' } },
  { id: 'runes', label: { es: 'Runas', en: 'Runes' } },
  { id: 'champions', label: { es: 'Campeones', en: 'Champions' } },
  { id: 'matches', label: { es: 'Partidas', en: 'Matches' } }
] as const;

type TabId = typeof tabs[number]['id'];
interface ProgressState {
  stage: string;
  current: number;
  total: number;
  message: string;
}

interface SavedProfileRecord {
  gameName: string;
  tagLine: string;
  matchCount: number;
  lastSyncedAt: number;
  matches: number;
  profileIconId?: number;
  rankLabel?: string;
}

const savedProfilesStorageKey = 'don-sosa:saved-profiles';
const initialMatchOptions = [20, 50, 100];

function datasetStorageKey(gameName: string, tagLine: string) {
  return `don-sosa:dataset:${gameName}#${tagLine}`.toLowerCase();
}

function mergeDatasets(current: Dataset | null, incoming: Dataset, locale: Locale): Dataset {
  if (!current) return incoming;

  const matchMap = new Map<string, Dataset['matches'][number]>();
  for (const match of [...current.matches, ...incoming.matches]) {
    matchMap.set(match.matchId, match);
  }

  const mergedMatches = Array.from(matchMap.values()).sort((a, b) => b.gameCreation - a.gameCreation);
  const mergedSummary = buildAggregateSummary(incoming.player, incoming.tagLine, incoming.summary.region, incoming.summary.platform, mergedMatches, locale);

  return {
    ...incoming,
    matches: mergedMatches,
    summary: mergedSummary,
    remakesExcluded: Math.max(current.remakesExcluded ?? 0, incoming.remakesExcluded ?? 0)
  };
}

function normalizeTagLineInput(value: string) {
  return value.replace(/^#+/, '').trim();
}

function buildTargetOptions(currentMatches: number | null) {
  if (!currentMatches) return initialMatchOptions;

  const options = new Set<number>([currentMatches, 100]);
  [1, 5, 10].forEach((delta) => {
    const next = Math.min(100, currentMatches + delta);
    if (next > currentMatches) options.add(next);
  });

  return Array.from(options).sort((a, b) => a - b);
}

function buildQuickRefreshActions(currentMatches: number | null) {
  if (!currentMatches || currentMatches >= 100) return [];

  const candidates = [
    { id: 'plus-1', target: Math.min(100, currentMatches + 1), label: '+1' },
    { id: 'plus-5', target: Math.min(100, currentMatches + 5), label: '+5' },
    { id: 'plus-10', target: Math.min(100, currentMatches + 10), label: '+10' },
    { id: 'complete', target: 100, label: '100' }
  ];

  const seen = new Set<number>();
  return candidates.filter((action) => {
    if (action.target <= currentMatches || seen.has(action.target)) return false;
    seen.add(action.target);
    return true;
  });
}

export default function App() {
  const [locale] = useState<Locale>(() => detectLocale());
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
  const [savedProfiles, setSavedProfiles] = useState<SavedProfileRecord[]>([]);
  const [aiCoach, setAICoach] = useState<AICoachResult | null>(null);
  const [aiCoachLoading, setAICoachLoading] = useState(false);
  const [aiCoachError, setAICoachError] = useState<string | null>(null);
  const [lastAICoachRequestKey, setLastAICoachRequestKey] = useState<string | null>(null);

  async function hydrateFromServer(gameNameValue: string, tagLineValue: string) {
    try {
      const serverDataset = await fetchCachedProfile(gameNameValue, tagLineValue, locale);
      if (!serverDataset) return false;

      setDataset(serverDataset);
      setShowAccountControls(false);
      window.localStorage.setItem(datasetStorageKey(gameNameValue, tagLineValue), JSON.stringify(serverDataset));
      window.localStorage.setItem('don-sosa:last-profile', JSON.stringify({
        gameName: gameNameValue,
        tagLine: tagLineValue,
        matchCount
      }));
      persistSavedProfile(serverDataset, matchCount);
      setSyncMessage(locale === 'en'
        ? 'We recovered a saved version from the server so you do not have to start from zero on this device.'
        : 'Recuperamos una versión guardada en el servidor para que no arranques de cero en este dispositivo.');
      return true;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    const rawProfiles = window.localStorage.getItem(savedProfilesStorageKey);
    if (rawProfiles) {
      try {
        setSavedProfiles(JSON.parse(rawProfiles) as SavedProfileRecord[]);
      } catch {
        window.localStorage.removeItem(savedProfilesStorageKey);
      }
    }

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
          void hydrateFromServer(parsed.gameName, parsed.tagLine);
        }
      }
    } catch {
      window.localStorage.removeItem('don-sosa:last-profile');
    }
  }, [locale, matchCount]);

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

    const filteredSummary = buildAggregateSummary(dataset.player, dataset.tagLine, dataset.summary.region, dataset.summary.platform, filteredMatches, locale);

    return {
      ...dataset,
      matches: filteredMatches,
      summary: filteredSummary
    };
  }, [dataset, roleFilter, queueFilter, windowFilter, locale]);

  const coachRequestKey = useMemo(() => {
    if (!viewDataset || !gameName || !tagLine) return null;
    return [
      gameName.trim().toLowerCase(),
      tagLine.trim().toLowerCase(),
      locale,
      roleFilter,
      queueFilter,
      windowFilter,
      viewDataset.summary.matches
    ].join('|');
  }, [viewDataset, gameName, tagLine, locale, roleFilter, queueFilter, windowFilter]);

  const renderedTab = useMemo(() => {
    if (!viewDataset) return null;

    switch (activeTab) {
      case 'coach':
        return (
          <CoachingHome
            dataset={viewDataset}
            locale={locale}
            aiCoach={aiCoach}
            generatingAICoach={aiCoachLoading}
            aiCoachError={aiCoachError}
            onGenerateAICoach={() => void handleGenerateAICoach(true)}
            onSendFeedback={(verdict) => void handleAICoachFeedback(verdict)}
          />
        );
      case 'stats':
        return <StatsTab dataset={viewDataset} locale={locale} />;
      case 'matchups':
        return <MatchupsTab dataset={viewDataset} locale={locale} />;
      case 'runes':
        return <RunesTab dataset={viewDataset} locale={locale} />;
      case 'champions':
        return <ChampionPoolTab dataset={viewDataset} locale={locale} />;
      case 'matches':
        return <MatchesTab dataset={viewDataset} locale={locale} />;
    }
  }, [activeTab, viewDataset, locale, aiCoach, aiCoachLoading, aiCoachError]);

  const csBenchmark = useMemo(() => {
    if (!viewDataset?.rank) return null;
    return buildCs15Benchmark(roleFilter, viewDataset.rank.highest.tier, viewDataset.summary.avgCsAt15, locale);
  }, [roleFilter, viewDataset, locale]);

  const preferredRoles = useMemo(() => {
    if (!availableRoles.length) return ['ALL'];
    const priority = ['ALL', 'JUNGLE', 'TOP', 'MIDDLE', 'BOTTOM', 'UTILITY', 'NONE'];
    return [...availableRoles].sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
  }, [availableRoles]);

  const needsSampleBackfill = useMemo(() => {
    if (!dataset) return false;
    return dataset.matches.length < matchCount;
  }, [dataset, matchCount]);

  const targetCountOptions = useMemo(() => buildTargetOptions(dataset?.matches.length ?? null), [dataset?.matches.length]);
  const quickRefreshActions = useMemo(() => buildQuickRefreshActions(dataset?.matches.length ?? null), [dataset?.matches.length]);

  useEffect(() => {
    if (!availableRoles.includes(roleFilter)) {
      setRoleFilter('ALL');
    }
  }, [availableRoles, roleFilter]);

  useEffect(() => {
    setAICoach(null);
    setAICoachError(null);
    setLastAICoachRequestKey(null);
  }, [gameName, tagLine, roleFilter, queueFilter, windowFilter, dataset?.summary.matches]);

  useEffect(() => {
    if (activeTab !== 'coach' || !coachRequestKey || aiCoachLoading) return;
    if (lastAICoachRequestKey === coachRequestKey) return;
    void handleGenerateAICoach();
  }, [activeTab, coachRequestKey, aiCoachLoading, lastAICoachRequestKey]);

  function persistSavedProfile(nextDataset: Dataset, nextMatchCount: number) {
    const nextRecord: SavedProfileRecord = {
      gameName: nextDataset.player,
      tagLine: nextDataset.tagLine,
      matchCount: nextMatchCount,
      lastSyncedAt: Date.now(),
      matches: nextDataset.summary.matches,
      profileIconId: nextDataset.profile?.profileIconId,
      rankLabel: nextDataset.rank?.highest.label
    };

    const nextProfiles = [
      nextRecord,
      ...savedProfiles.filter((profile) => `${profile.gameName}#${profile.tagLine}`.toLowerCase() !== `${nextRecord.gameName}#${nextRecord.tagLine}`.toLowerCase())
    ].slice(0, 8);

    setSavedProfiles(nextProfiles);
    window.localStorage.setItem(savedProfilesStorageKey, JSON.stringify(nextProfiles));
  }

  function loadSavedProfile(profile: SavedProfileRecord) {
    setGameName(profile.gameName);
    setTagLine(profile.tagLine);
    setMatchCount(profile.matchCount);
    setError(null);
    setSyncMessage(null);

    const cachedDataset = window.localStorage.getItem(datasetStorageKey(profile.gameName, profile.tagLine));
    if (cachedDataset) {
      try {
        setDataset(JSON.parse(cachedDataset) as Dataset);
        setShowAccountControls(false);
        window.localStorage.setItem('don-sosa:last-profile', JSON.stringify({
          gameName: profile.gameName,
          tagLine: profile.tagLine,
          matchCount: profile.matchCount
        }));
        return;
      } catch {
        window.localStorage.removeItem(datasetStorageKey(profile.gameName, profile.tagLine));
      }
    }

    setDataset(null);
    setShowAccountControls(true);
    void hydrateFromServer(profile.gameName, profile.tagLine);
  }

  async function runAnalysis(requestedCount = matchCount) {
    setLoading(true);
    setError(null);
    setSyncMessage(null);
    setProgress({ stage: 'queued', current: 0, total: 1, message: locale === 'en' ? 'Preparing analysis' : 'Preparando análisis' });

    try {
      const cachedDataset = window.localStorage.getItem(datasetStorageKey(gameName, tagLine));
      const previousDataset = cachedDataset ? (JSON.parse(cachedDataset) as Dataset) : null;
      const shouldRefreshFullSample = !previousDataset || previousDataset.matches.length < requestedCount;
      const result = await collectProfile(gameName, tagLine, requestedCount, {
        locale,
        onProgress: (nextProgress) => setProgress(nextProgress),
        knownMatchIds: shouldRefreshFullSample ? [] : previousDataset.matches.map((match) => match.matchId)
      });
      const mergedDataset = shouldRefreshFullSample
        ? result
        : mergeDatasets(previousDataset, result, locale);
      setDataset(mergedDataset);
      setShowAccountControls(false);
      if (previousDataset && !shouldRefreshFullSample) {
        const addedMatches = mergedDataset.matches.length - previousDataset.matches.length;
        setSyncMessage(addedMatches > 0
          ? (locale === 'en'
            ? `${addedMatches} new matches were added. The analysis keeps your previous history and recalculates everything by real date.`
            : `Se agregaron ${addedMatches} partidas nuevas. El análisis mantiene el historial previo y recalcula todo por fecha real.`)
          : (locale === 'en'
            ? 'No new matches were found to add. The analysis keeps your current history without overwriting it.'
            : 'No aparecieron partidas nuevas para sumar. El análisis mantiene tu histórico actual sin sobrescribirlo.'));
        } else if (previousDataset && shouldRefreshFullSample) {
        setSyncMessage(locale === 'en'
          ? `The sample was rebuilt to ${mergedDataset.summary.matches} valid matches so the analysis is not biased by a smaller cache.`
          : `Se reconstruyó la muestra hasta ${mergedDataset.summary.matches} partidas válidas para que el análisis no quede sesgado por una cache más chica.`);
      } else {
        setSyncMessage(locale === 'en'
          ? `${mergedDataset.summary.matches} valid matches were loaded to build your first sample.`
          : `Se cargaron ${mergedDataset.summary.matches} partidas válidas para construir tu primera muestra.`);
      }
      setMatchCount(requestedCount);
      window.localStorage.setItem('don-sosa:last-profile', JSON.stringify({ gameName, tagLine, matchCount: requestedCount }));
      window.localStorage.setItem(datasetStorageKey(gameName, tagLine), JSON.stringify(mergedDataset));
      persistSavedProfile(mergedDataset, requestedCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await runAnalysis(matchCount);
  }

  async function handleGenerateAICoach(force = false) {
    if (!gameName || !tagLine || !coachRequestKey) return;
    if (!force && lastAICoachRequestKey === coachRequestKey) return;

    setLastAICoachRequestKey(coachRequestKey);
    setAICoachLoading(true);
    setAICoachError(null);

    try {
      const result = await generateAICoach({
        gameName,
        tagLine,
        locale,
        roleFilter,
        queueFilter,
        windowFilter
      });
      setAICoach(result);
    } catch (err) {
      setAICoachError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAICoachLoading(false);
    }
  }

  async function handleAICoachFeedback(verdict: 'useful' | 'mixed' | 'generic' | 'incorrect') {
    if (!aiCoach?.generationId) return;

    try {
      await sendAICoachFeedback({
        generationId: aiCoach.generationId,
        verdict
      });
      setSyncMessage(locale === 'en' ? 'AI feedback saved. This will help us tighten future coaching blocks.' : 'Feedback de IA guardado. Esto nos va a ayudar a afinar futuros bloques de coaching.');
    } catch (err) {
      setAICoachError(err instanceof Error ? err.message : 'Unknown error');
    }
  }

  return (
    <Shell>
      <div style={{ display: 'grid', gap: 18, maxWidth: 1440, margin: '0 auto' }}>
        <section style={heroStyle}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ color: '#8b94a4', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: 12 }}>Don Sosa Coach</div>
            <h1 style={{ margin: 0, fontSize: 46, letterSpacing: '-0.05em', maxWidth: 760 }}>
              {locale === 'en'
                ? 'A competitive read of your play, not just another stats page'
                : 'Tu lectura competitiva para jugar mejor, no solo mirar stats'}
            </h1>
            <p style={{ margin: 0, color: '#9099aa', maxWidth: 760, lineHeight: 1.7 }}>
              {locale === 'en'
                ? 'Clear diagnosis, actionable decisions and an organized view of matchups, runes, champions and review. First you understand what to fix, then you go deeper.'
                : 'Diagnóstico claro, decisiones accionables y una vista ordenada de matchups, runas, campeones y review. Primero entendés qué corregir; después entrás al detalle.'}
            </p>
            {loading ? (
              <div style={{ color: '#d8fdf1', fontSize: 13, lineHeight: 1.6 }}>
                {progress?.message ?? (matchCount >= 75
                  ? (locale === 'en' ? 'Analyzing a large sample. This can take several minutes because of Riot rate limits.' : 'Analizando una muestra grande. Esto puede tardar varios minutos por los límites de Riot.')
                  : (locale === 'en' ? 'Analyzing matches. This can take anywhere from a few seconds to about a minute.' : 'Analizando partidas. Esto puede tardar entre unos segundos y alrededor de un minuto.'))}
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
                  <RankBadge rank={viewDataset.rank} compact locale={locale} />
                  <div style={heroMetaChipStyle}>
                  <div style={heroMetaLabelStyle}>{locale === 'en' ? 'Win rate' : 'WR'}</div>
                  <div style={heroMetaValueStyle}>{`${viewDataset.rank.highest.winRate}%`}</div>
                  <div style={heroMetaSubtleStyle}>{`${viewDataset.rank.highest.wins}-${viewDataset.rank.highest.losses}`}</div>
                </div>
                {csBenchmark ? (
                  <div style={heroMetaChipStyle}>
                    <div style={heroMetaLabelStyle}>{locale === 'en' ? 'Benchmark' : 'Referencia'}</div>
                    <div style={{ ...heroMetaValueStyle, color: csBenchmark.status === 'above' ? '#9ff0cf' : csBenchmark.status === 'below' ? '#ffb3b3' : '#dce8fb' }}>{csBenchmark.label}</div>
                    <div style={heroMetaSubtleStyle}>{locale === 'en' ? 'CS at 15' : 'CS a los 15'}</div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <Card
            title={showAccountControls ? (locale === 'en' ? 'Load Riot account' : 'Cargar cuenta de Riot') : (locale === 'en' ? 'Active account' : 'Cuenta activa')}
            subtitle={showAccountControls
              ? (locale === 'en' ? 'Enter the Riot ID you want to analyze and choose the depth of the first sample.' : 'Ingresá el Riot ID que querés analizar y elegí la profundidad de la primera muestra.')
              : (locale === 'en' ? 'Your account is ready. Refresh only what is missing or switch profiles whenever you want.' : 'Tu cuenta ya está lista. Refrescá solo lo que falta o cambiá de perfil cuando quieras.')}
          >
            {showAccountControls || !dataset ? (
              <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
                <div className="three-col-grid" style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr .7fr', gap: 12, alignItems: 'end' }}>
                  <label style={fieldBlockStyle}>
                    <span style={fieldLabelStyle}>{locale === 'en' ? 'Game name' : 'Game name'}</span>
                    <input value={gameName} onChange={(e) => setGameName(e.target.value)} placeholder={locale === 'en' ? 'For example, Faker' : 'Por ejemplo, Don Sosa'} style={inputStyle} />
                  </label>
                  <label style={fieldBlockStyle}>
                    <span style={fieldLabelStyle}>{locale === 'en' ? 'Tag' : 'Tag'}</span>
                    <div style={tagInputShellStyle}>
                      <span style={tagPrefixStyle}>#</span>
                      <input value={tagLine} onChange={(e) => setTagLine(normalizeTagLineInput(e.target.value))} placeholder={locale === 'en' ? 'KR1' : 'LAS'} style={tagInputStyle} />
                    </div>
                  </label>
                  <label style={fieldBlockStyle}>
                    <span style={fieldLabelStyle}>{locale === 'en' ? 'First sample' : 'Primera muestra'}</span>
                    <select value={matchCount} onChange={(e) => setMatchCount(Number(e.target.value))} style={selectStyle}>
                      {initialMatchOptions.map((count) => (
                        <option key={count} value={count}>{count} {locale === 'en' ? 'matches' : 'partidas'}</option>
                      ))}
                    </select>
                  </label>
                </div>

                <div style={softPanelStyle}>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <div style={{ color: '#eef4ff', fontWeight: 700 }}>
                      {locale === 'en' ? 'Recommended start' : 'Inicio recomendado'}
                    </div>
                    <div style={{ color: '#8f9bad', fontSize: 13, lineHeight: 1.6 }}>
                      {matchCount >= 100
                        ? (locale === 'en' ? 'A 100-match baseline gives the sharpest first read, but it can take longer because of Riot rate limits.' : 'Una base de 100 partidas da la lectura inicial más filosa, pero puede tardar más por los límites de Riot.')
                        : (locale === 'en' ? 'Start with 20 or 50 if you want speed. Move to 100 when you want the most stable baseline.' : 'Empezá con 20 o 50 si querés velocidad. Pasá a 100 cuando quieras la base más estable.')}
                    </div>
                  </div>
                  {!dataset && gameName && tagLine ? (
                    <div style={{ color: '#a5b2c6', fontSize: 13, lineHeight: 1.6 }}>
                      {locale === 'en'
                        ? 'Once this account is loaded, it will stay saved here and future refreshes will only complete what is missing.'
                        : 'Una vez que cargues esta cuenta, va a quedar guardada acá y los próximos refreshes solo completarán lo que falte.'}
                    </div>
                  ) : null}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Badge tone="default">{locale === 'en' ? `${matchCount} match target` : `Objetivo de ${matchCount} partidas`}</Badge>
                    <Badge tone="default">{locale === 'en' ? `Current read: ${translateRole(roleFilter, 'en')}` : `Lectura actual: ${getRoleLabel(roleFilter)}`}</Badge>
                  </div>
                  <button type="submit" style={buttonStyle}>{loading ? (locale === 'en' ? 'Analyzing...' : 'Analizando...') : (locale === 'en' ? 'Build first analysis' : 'Construir primer análisis')}</button>
                </div>
              </form>
            ) : (
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={softPanelStyle}>
                  <div style={{ color: '#e7eef8', lineHeight: 1.5, fontWeight: 700 }}>
                    {gameName && tagLine ? `${gameName}#${tagLine}` : (locale === 'en' ? 'Account ready to analyze' : 'Cuenta lista para analizar')}
                  </div>
                  <div style={{ color: '#8a95a8', fontSize: 13, lineHeight: 1.6 }}>
                    {locale === 'en'
                      ? `Saved sample: ${dataset.matches.length} matches. Choose whether you want to add a little, a lot or complete the block.`
                      : `Muestra guardada: ${dataset.matches.length} partidas. Elegí si querés sumar un poco, bastante o completar el bloque.`}
                  </div>
                </div>
                {syncMessage ? <div style={syncMessageStyle}>{syncMessage}</div> : null}
                <div style={{ display: 'grid', gap: 10 }}>
                  {quickRefreshActions.length ? (
                    <div style={{ display: 'grid', gap: 8 }}>
                      <div style={fieldLabelStyle}>{locale === 'en' ? 'Quick refresh' : 'Refresh rápido'}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {quickRefreshActions.map((action) => (
                          <button
                            key={action.id}
                            type="button"
                            style={secondaryButtonStyle}
                            onClick={() => void runAnalysis(action.target)}
                            disabled={loading}
                          >
                            {action.id === 'complete'
                              ? (locale === 'en' ? 'Complete to 100' : 'Completar a 100')
                              : `${action.label} ${locale === 'en' ? 'match' : 'partida'}${action.label === '+1' ? '' : 's'}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 12 }}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={fieldLabelStyle}>{locale === 'en' ? 'Target block' : 'Bloque objetivo'}</div>
                    <select value={matchCount} onChange={(e) => setMatchCount(Number(e.target.value))} style={selectStyle}>
                      {targetCountOptions.map((count) => (
                        <option key={count} value={count}>{count} {locale === 'en' ? 'matches' : 'partidas'}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={fieldLabelStyle}>{locale === 'en' ? 'Current context' : 'Contexto actual'}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Badge tone="default">{locale === 'en' ? `${translateRole(roleFilter, 'en')}` : `${getRoleLabel(roleFilter)}`}</Badge>
                      {dataset?.remakesExcluded ? <Badge tone="medium">{locale === 'en' ? `${dataset.remakesExcluded} remakes excluded` : `${dataset.remakesExcluded} remakes excluidos`}</Badge> : null}
                      {needsSampleBackfill ? <Badge tone="medium">{locale === 'en' ? 'Needs backfill' : 'Le falta backfill'}</Badge> : <Badge tone="low">{locale === 'en' ? 'Only new matches' : 'Solo nuevas partidas'}</Badge>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" style={buttonStyle} onClick={() => void runAnalysis()}>
                    {loading
                      ? (locale === 'en' ? 'Analyzing...' : 'Analizando...')
                      : needsSampleBackfill
                        ? (locale === 'en' ? `Backfill to ${matchCount} matches` : `Completar a ${matchCount} partidas`)
                        : (locale === 'en' ? 'Check for new matches' : 'Buscar nuevas partidas')}
                  </button>
                  <button type="button" style={secondaryButtonStyle} onClick={() => setShowAccountControls(true)}>{locale === 'en' ? 'Switch account' : 'Cambiar cuenta'}</button>
                </div>
              </div>
            )}
          </Card>
        </section>

        {savedProfiles.length ? (
          <section style={savedProfilesSectionStyle}>
            <div style={{ display: 'grid', gap: 3 }}>
              <div style={{ color: '#8da0ba', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{locale === 'en' ? 'Saved profiles' : 'Perfiles guardados'}</div>
              <div style={{ color: '#eef4ff', fontSize: 16, fontWeight: 800 }}>{locale === 'en' ? 'Jump back into accounts you already analyzed' : 'Volvé rápido a cuentas que ya analizaste'}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
              {savedProfiles.map((profile) => {
                const isActive = `${profile.gameName}#${profile.tagLine}`.toLowerCase() === `${gameName}#${tagLine}`.toLowerCase();
                return (
                  <button
                    key={`${profile.gameName}#${profile.tagLine}`}
                    type="button"
                    onClick={() => loadSavedProfile(profile)}
                    style={{
                      ...savedProfileCardStyle,
                      ...(isActive ? activeSavedProfileCardStyle : {})
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' }}>
                      <div style={{ display: 'grid', gap: 4, textAlign: 'left' }}>
                        <div style={{ color: '#edf2ff', fontWeight: 800 }}>{profile.gameName}<span style={{ color: '#8592a8' }}>#{profile.tagLine}</span></div>
                        <div style={{ color: '#8390a6', fontSize: 12 }}>{profile.rankLabel ?? (locale === 'en' ? 'No visible rank' : 'Sin rango visible')}</div>
                      </div>
                      <Badge tone={isActive ? 'low' : 'default'}>{locale === 'en' ? `${profile.matches} matches` : `${profile.matches} partidas`}</Badge>
                    </div>
                    <div style={{ color: '#748198', fontSize: 12, textAlign: 'left' }}>
                      {locale === 'en' ? 'Last sync' : 'Última sync'} {new Date(profile.lastSyncedAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-AR')}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {viewDataset ? (
          <section className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1.05fr 1.95fr', gap: 12 }}>
            <div style={accountCardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                {viewDataset.profile ? <img src={getProfileIconUrl(viewDataset.profile.profileIconId, viewDataset.ddragonVersion) ?? undefined} alt={viewDataset.player} width={56} height={56} style={profileIconStyle} /> : null}
                <div style={{ display: 'grid', gap: 4 }}>
                  <div style={{ fontSize: 26, fontWeight: 800 }}>{viewDataset.player}<span style={{ color: '#7d8696', fontWeight: 600 }}>#{viewDataset.tagLine}</span></div>
                  {viewDataset.profile ? <div style={{ color: '#8f99ac', fontSize: 13 }}>{locale === 'en' ? `Level ${viewDataset.profile.summonerLevel}` : `Nivel ${viewDataset.profile.summonerLevel}`}</div> : null}
                </div>
              </div>
              <div style={accountMetaRowStyle}>
                <div style={recordPillStyle}>
                  <div style={{ color: '#7f8ca1', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{locale === 'en' ? 'Record' : 'Muestra'}</div>
                  <div style={{ color: '#edf2ff', fontSize: 14, fontWeight: 800 }}>{`${viewDataset.summary.wins}-${viewDataset.summary.losses}`}</div>
                </div>
                <div style={recordPillStyle}>
                  <div style={{ color: '#7f8ca1', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{locale === 'en' ? 'Win rate' : 'WR'}</div>
                  <div style={{ color: '#dff7eb', fontSize: 14, fontWeight: 800 }}>{`${viewDataset.summary.winRate}%`}</div>
                </div>
                <div style={recordPillStyle}>
                  <div style={{ color: '#7f8ca1', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{locale === 'en' ? 'Valid matches' : 'Partidas válidas'}</div>
                  <div style={{ color: '#edf2ff', fontSize: 14, fontWeight: 800 }}>{viewDataset.summary.matches}</div>
                </div>
              </div>
              {viewDataset.rank ? <RankBadge rank={viewDataset.rank} locale={locale} /> : null}
            </div>
            <div className="three-col-grid" style={topStatsPanelStyle}>
              <TopStat label="Performance" value={formatDecimal(viewDataset.summary.avgPerformanceScore)} hint={locale === 'en' ? 'Average execution index' : 'Índice medio de ejecución'} />
              <TopStat label={locale === 'en' ? 'CS at 15' : 'CS a los 15'} value={formatDecimal(viewDataset.summary.avgCsAt15)} hint={locale === 'en' ? 'Average early economy' : 'Economía temprana media'} />
              <TopStat label={locale === 'en' ? 'Gold at 15' : 'Oro a los 15'} value={Math.round(viewDataset.summary.avgGoldAt15).toLocaleString(locale === 'en' ? 'en-US' : 'es-AR')} hint={locale === 'en' ? 'Value generated before mid game' : 'Valor generado antes del mid game'} />
              <TrendSparkline matches={viewDataset.matches} locale={locale} />
            </div>
          </section>
        ) : null}

        <section style={{ display: 'grid', gap: 12 }}>
          {viewDataset ? (
            <div style={roleFilterPanelStyle}>
                <div style={{ display: 'grid', gap: 3 }}>
                  <div style={{ color: '#8da0ba', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{locale === 'en' ? 'Analysis context' : 'Contexto de análisis'}</div>
                <div style={{ color: '#eef4ff', fontSize: 16, fontWeight: 800 }}>{locale === 'en' ? 'Choose the exact context you want to review' : 'Elegí el contexto exacto que querés revisar'}</div>
                <div style={{ color: '#8793a8', fontSize: 13 }}>{locale === 'en' ? 'Coaching gets much better when you separate role, queue type and recent window instead of mixing every match together.' : 'El coaching mejora mucho si separás rol, tipo de cola y ventana reciente en vez de mezclar todas tus partidas.'}</div>
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
                    {locale === 'en' ? translateRole(role, 'en') : getRoleLabel(role)}
                  </button>
                ))}
              </div>
              <div className="three-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                <div style={contextGroupStyle}>
                  <div style={contextLabelStyle}>{locale === 'en' ? 'Queue type' : 'Tipo de cola'}</div>
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
                          ? (locale === 'en' ? 'All' : 'Todas')
                          : queue === 'RANKED'
                            ? (locale === 'en' ? 'Ranked' : 'Rankeds')
                            : queue === 'RANKED_SOLO'
                              ? 'Solo/Duo'
                              : queue === 'RANKED_FLEX'
                                ? 'Flex'
                                : (locale === 'en' ? 'Other' : 'Otras')}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={contextGroupStyle}>
                  <div style={contextLabelStyle}>{locale === 'en' ? 'Window' : 'Ventana'}</div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {[
                      { id: 'ALL', label: locale === 'en' ? 'All' : 'Todo' },
                      { id: 'LAST_20', label: locale === 'en' ? 'Last 20' : 'Últimas 20' },
                      { id: 'LAST_8', label: locale === 'en' ? 'Last 8' : 'Últimas 8' }
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
                  <div style={contextLabelStyle}>{locale === 'en' ? 'Active read' : 'Lectura activa'}</div>
                  <div style={{ color: '#dce7f9', fontSize: 13, lineHeight: 1.5 }}>
                    {locale === 'en'
                      ? `${translateRole(roleFilter, 'en')} · ${queueFilter === 'ALL' ? 'all queues' : queueFilter === 'RANKED' ? 'ranked queues' : queueFilter === 'RANKED_SOLO' ? 'solo/duo' : queueFilter === 'RANKED_FLEX' ? 'flex' : 'other queues'}`
                      : `${getRoleLabel(roleFilter)} · ${queueFilter === 'ALL' ? 'todas las colas' : queueFilter === 'RANKED' ? 'rankeds' : queueFilter === 'RANKED_SOLO' ? 'solo/duo' : queueFilter === 'RANKED_FLEX' ? 'flex' : 'otras colas'}`}
                  </div>
                  <div style={{ color: '#8390a6', fontSize: 12 }}>
                    {locale === 'en'
                      ? (windowFilter === 'ALL' ? `${viewDataset.summary.matches} matches in sample` : `${viewDataset.summary.matches} recent matches`)
                      : (windowFilter === 'ALL' ? `${viewDataset.summary.matches} partidas en muestra` : `${viewDataset.summary.matches} partidas recientes`)}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div style={navigationPanelStyle}>
              <div style={{ display: 'grid', gap: 3 }}>
              <div style={{ color: '#8da0ba', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{locale === 'en' ? 'Explore' : 'Exploración'}</div>
              <div style={{ color: '#eef4ff', fontSize: 15, fontWeight: 800 }}>{locale === 'en' ? 'Open the layer you need now' : 'Abrí la capa que necesitás ahora'}</div>
            </div>
            <div className="tab-grid" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    ...tabStyle,
                    ...(activeTab === tab.id ? activeTabStyle : {})
                  }}
                >
                  {tab.label[locale]}
                </button>
              ))}
            </div>
            {viewDataset ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Badge>{locale === 'en' ? `${viewDataset.summary.matches} visible matches` : `${viewDataset.summary.matches} partidas visibles`}</Badge>
                {viewDataset.matches[0] ? <Badge>{getQueueLabel(viewDataset.matches[0].queueId)}</Badge> : null}
                <Badge tone="default">{locale === 'en' ? translateRole(roleFilter, 'en') : getRoleLabel(roleFilter)}</Badge>
              </div>
            ) : null}
          </div>
        </section>

        {error ? <Card title={locale === 'en' ? 'Error' : 'Error'}>{error}</Card> : null}

        {viewDataset ? (
          renderedTab
        ) : (
          <Card title={locale === 'en' ? 'Waiting for analysis' : 'Esperando análisis'} subtitle={locale === 'en' ? 'The goal is for the product to feel more like a premium personal account than a technical dashboard' : 'La idea es que el producto se sienta más cuenta personal premium que panel técnico'}>
            <div style={{ display: 'grid', gap: 12, color: '#c7d4ea', lineHeight: 1.7 }}>
              {locale === 'en' ? (
                <>
                  <div><strong>Coach:</strong> main blocker, evidence, impact and active plan.</div>
                  <div><strong>Stats:</strong> aggregated metrics and recent evolution.</div>
                  <div><strong>Matchups:</strong> real performance into direct opponents.</div>
                  <div><strong>Runes and champions:</strong> tactical read with more visual context.</div>
                </>
              ) : (
                <>
                  <div><strong>Coach:</strong> problema principal, evidencia, impacto y plan activo.</div>
                  <div><strong>Stats:</strong> métricas agregadas y evolución.</div>
                  <div><strong>Matchups:</strong> rendimiento real frente a rivales directos.</div>
                  <div><strong>Runes y champions:</strong> lectura táctica con más contexto visual.</div>
                </>
              )}
            </div>
          </Card>
        )}

        <footer style={footerStyle}>
          <div style={{ color: '#7f8ca1', fontSize: 13 }}>
            {locale === 'en'
              ? 'Don Sosa Coach private beta for competitive coaching and review in League of Legends.'
              : 'Don Sosa Coach beta privada de coaching y análisis competitivo para League of Legends.'}
          </div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <a href="/privacy.html" target="_blank" rel="noreferrer" style={footerLinkStyle}>Privacy Policy</a>
            <a href="/terms.html" target="_blank" rel="noreferrer" style={footerLinkStyle}>Terms of Service</a>
          </div>
        </footer>
      </div>
    </Shell>
  );
}

const heroStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1.18fr .82fr',
  gap: 20,
  padding: 28,
  borderRadius: 28,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'radial-gradient(circle at top left, rgba(79, 56, 146, 0.34), transparent 42%), linear-gradient(180deg, rgba(17,20,31,0.96), rgba(7,10,16,0.98))',
  boxShadow: '0 28px 80px rgba(0,0,0,0.26)'
};

const accountCardStyle: CSSProperties = {
  display: 'grid',
  gap: 14,
  padding: '20px 22px',
  borderRadius: 20,
  background: 'linear-gradient(180deg, rgba(16,20,30,0.98), rgba(8,11,18,0.98))',
  border: '1px solid rgba(255,255,255,0.07)'
};

const profileIconStyle: CSSProperties = {
  borderRadius: 16,
  border: '1px solid rgba(255,255,255,0.08)'
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '13px 14px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(7,11,18,0.92)',
  color: '#edf2ff',
  boxShadow: '0 0 0 1px rgba(255,255,255,0.02) inset'
};

const selectStyle: CSSProperties = {
  width: '100%',
  padding: '13px 14px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(7,11,18,0.92)',
  color: '#edf2ff',
  boxShadow: '0 0 0 1px rgba(255,255,255,0.02) inset'
};

const buttonStyle: CSSProperties = {
  border: '1px solid rgba(216,253,241,0.12)',
  padding: '12px 18px',
  borderRadius: 14,
  background: 'linear-gradient(180deg, #d8fdf1, #b8f4df)',
  color: '#07111f',
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 10px 28px rgba(87, 209, 162, 0.18)'
};

const secondaryButtonStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)',
  padding: '12px 18px',
  borderRadius: 14,
  background: '#0a0f18',
  color: '#e8eef9',
  fontWeight: 700,
  cursor: 'pointer'
};

const tabStyle: CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)',
  padding: '10px 14px',
  borderRadius: 999,
  background: '#070b12',
  color: '#d7e3f5',
  cursor: 'pointer',
  textAlign: 'center'
};

const activeTabStyle: CSSProperties = {
  background: 'linear-gradient(180deg, rgba(49,55,86,0.95), rgba(16,23,35,1))',
  borderColor: 'rgba(216,253,241,0.2)',
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
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: 8
};

const rolePillStyle: CSSProperties = {
  padding: '12px 12px',
  borderRadius: 14,
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
  padding: '12px 14px',
  borderRadius: 14,
  background: 'rgba(216,253,241,0.08)',
  border: '1px solid rgba(216,253,241,0.14)',
  color: '#dff7eb',
  fontSize: 13,
  lineHeight: 1.5
};

const navigationPanelStyle: CSSProperties = {
  display: 'grid',
  gap: 12,
  padding: '16px 18px',
  borderRadius: 18,
  background: '#060a10',
  border: '1px solid rgba(255,255,255,0.06)'
};

const savedProfilesSectionStyle: CSSProperties = {
  display: 'grid',
  gap: 12,
  padding: '14px 16px',
  borderRadius: 16,
  background: '#060a10',
  border: '1px solid rgba(255,255,255,0.06)'
};

const savedProfileCardStyle: CSSProperties = {
  display: 'grid',
  gap: 12,
  padding: '14px 15px',
  borderRadius: 16,
  background: '#090e16',
  border: '1px solid rgba(255,255,255,0.06)',
  cursor: 'pointer'
};

const activeSavedProfileCardStyle: CSSProperties = {
  background: 'linear-gradient(180deg, rgba(216,253,241,0.1), rgba(24,35,44,0.96))',
  borderColor: 'rgba(216,253,241,0.2)'
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

function RankBadge({ rank, compact = false, locale = 'es' }: { rank: NonNullable<Dataset['rank']>; compact?: boolean; locale?: Locale }) {
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
            {locale === 'en' ? 'Hover to view Solo/Duo and Flex' : 'Hover para ver Solo/Duo y Flex'}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function TrendSparkline({ matches, locale = 'es' }: { matches: Dataset['matches']; locale?: Locale }) {
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
      <div style={{ color: '#7d889c', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{locale === 'en' ? 'Latest matches' : 'Últimas partidas'}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12 }}>
        <div style={{ display: 'grid', gap: 4 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{locale === 'en' ? 'Recent performance' : 'Performance reciente'}</div>
          <div style={{ color: '#8895aa', fontSize: 12 }}>{locale === 'en' ? 'Sparkline from the last 12 valid matches' : 'Sparkline de las últimas 12 partidas válidas'}</div>
        </div>
        <div style={{ color: '#dff7eb', fontSize: 12, fontWeight: 700 }}>{values.length ? (locale === 'en' ? `${Math.round(values.at(-1) ?? 0)} latest score` : `${Math.round(values.at(-1) ?? 0)} último score`) : (locale === 'en' ? 'No data' : 'Sin datos')}</div>
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

const footerStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 12,
  padding: '4px 4px 18px'
};

const footerLinkStyle: CSSProperties = {
  color: '#b8c7de',
  textDecoration: 'none',
  fontSize: 13
};

const fieldBlockStyle: CSSProperties = {
  display: 'grid',
  gap: 7
};

const fieldLabelStyle: CSSProperties = {
  color: '#8da0ba',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.08em'
};

const tagInputShellStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '36px minmax(0, 1fr)',
  alignItems: 'center',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(7,11,18,0.92)',
  boxShadow: '0 0 0 1px rgba(255,255,255,0.02) inset'
};

const tagPrefixStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#7f8ca1',
  fontWeight: 800,
  fontSize: 13,
  borderRight: '1px solid rgba(255,255,255,0.06)',
  height: '100%'
};

const tagInputStyle: CSSProperties = {
  width: '100%',
  padding: '13px 14px',
  borderRadius: 14,
  border: 0,
  outline: 'none',
  background: 'transparent',
  color: '#edf2ff'
};

const softPanelStyle: CSSProperties = {
  display: 'grid',
  gap: 8,
  padding: '14px 15px',
  borderRadius: 16,
  background: 'rgba(9,14,22,0.85)',
  border: '1px solid rgba(255,255,255,0.05)'
};
