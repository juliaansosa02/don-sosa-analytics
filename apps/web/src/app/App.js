import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { buildAggregateSummary } from '@don-sosa/core';
import { useEffect, useMemo, useState } from 'react';
import { collectProfile, fetchCachedProfile } from '../lib/api';
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
];
const savedProfilesStorageKey = 'don-sosa:saved-profiles';
function datasetStorageKey(gameName, tagLine) {
    return `don-sosa:dataset:${gameName}#${tagLine}`.toLowerCase();
}
function mergeDatasets(current, incoming) {
    if (!current)
        return incoming;
    const matchMap = new Map();
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
    const [activeTab, setActiveTab] = useState('coach');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [queueFilter, setQueueFilter] = useState('ALL');
    const [windowFilter, setWindowFilter] = useState('ALL');
    const [matchCount, setMatchCount] = useState(50);
    const [gameName, setGameName] = useState('');
    const [tagLine, setTagLine] = useState('');
    const [showAccountControls, setShowAccountControls] = useState(true);
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(null);
    const [error, setError] = useState(null);
    const [syncMessage, setSyncMessage] = useState(null);
    const [dataset, setDataset] = useState(null);
    const [savedProfiles, setSavedProfiles] = useState([]);
    async function hydrateFromServer(gameNameValue, tagLineValue) {
        try {
            const serverDataset = await fetchCachedProfile(gameNameValue, tagLineValue);
            if (!serverDataset)
                return false;
            setDataset(serverDataset);
            setShowAccountControls(false);
            window.localStorage.setItem(datasetStorageKey(gameNameValue, tagLineValue), JSON.stringify(serverDataset));
            window.localStorage.setItem('don-sosa:last-profile', JSON.stringify({
                gameName: gameNameValue,
                tagLine: tagLineValue,
                matchCount
            }));
            persistSavedProfile(serverDataset, matchCount);
            setSyncMessage('Recuperamos una versión guardada en el servidor para que no arranques de cero en este dispositivo.');
            return true;
        }
        catch {
            return false;
        }
    }
    useEffect(() => {
        const rawProfiles = window.localStorage.getItem(savedProfilesStorageKey);
        if (rawProfiles) {
            try {
                setSavedProfiles(JSON.parse(rawProfiles));
            }
            catch {
                window.localStorage.removeItem(savedProfilesStorageKey);
            }
        }
        const savedProfile = window.localStorage.getItem('don-sosa:last-profile');
        if (!savedProfile)
            return;
        try {
            const parsed = JSON.parse(savedProfile);
            if (parsed.gameName)
                setGameName(parsed.gameName);
            if (parsed.tagLine)
                setTagLine(parsed.tagLine);
            if (parsed.matchCount)
                setMatchCount(parsed.matchCount);
            if (parsed.gameName && parsed.tagLine) {
                const savedDataset = window.localStorage.getItem(datasetStorageKey(parsed.gameName, parsed.tagLine));
                if (savedDataset) {
                    try {
                        setDataset(JSON.parse(savedDataset));
                        setShowAccountControls(false);
                    }
                    catch {
                        window.localStorage.removeItem(datasetStorageKey(parsed.gameName, parsed.tagLine));
                        setShowAccountControls(true);
                    }
                }
                else {
                    setShowAccountControls(true);
                    void hydrateFromServer(parsed.gameName, parsed.tagLine);
                }
            }
        }
        catch {
            window.localStorage.removeItem('don-sosa:last-profile');
        }
    }, []);
    const availableRoles = useMemo(() => {
        if (!dataset)
            return ['ALL'];
        const roles = Array.from(new Set(dataset.matches.map((match) => match.role || 'NONE')))
            .filter((role) => Boolean(role) && role !== 'NONE');
        return ['ALL', ...roles];
    }, [dataset]);
    const availableQueueFilters = useMemo(() => {
        if (!dataset)
            return ['ALL'];
        const buckets = new Set(dataset.matches.map((match) => getQueueBucket(match.queueId)));
        const options = ['ALL'];
        if (buckets.has('RANKED_SOLO') || buckets.has('RANKED_FLEX'))
            options.push('RANKED');
        if (buckets.has('RANKED_SOLO'))
            options.push('RANKED_SOLO');
        if (buckets.has('RANKED_FLEX'))
            options.push('RANKED_FLEX');
        if (buckets.has('OTHER'))
            options.push('OTHER');
        return options;
    }, [dataset]);
    const viewDataset = useMemo(() => {
        if (!dataset)
            return null;
        let filteredMatches = [...dataset.matches];
        if (roleFilter !== 'ALL') {
            filteredMatches = filteredMatches.filter((match) => (match.role || 'NONE') === roleFilter);
        }
        if (queueFilter !== 'ALL') {
            filteredMatches = filteredMatches.filter((match) => {
                const bucket = getQueueBucket(match.queueId);
                if (queueFilter === 'RANKED')
                    return bucket === 'RANKED_SOLO' || bucket === 'RANKED_FLEX';
                return bucket === queueFilter;
            });
        }
        filteredMatches.sort((a, b) => b.gameCreation - a.gameCreation);
        if (windowFilter === 'LAST_20')
            filteredMatches = filteredMatches.slice(0, 20);
        if (windowFilter === 'LAST_8')
            filteredMatches = filteredMatches.slice(0, 8);
        const filteredSummary = buildAggregateSummary(dataset.player, dataset.tagLine, dataset.summary.region, dataset.summary.platform, filteredMatches);
        return {
            ...dataset,
            matches: filteredMatches,
            summary: filteredSummary
        };
    }, [dataset, roleFilter, queueFilter, windowFilter]);
    const renderedTab = useMemo(() => {
        if (!viewDataset)
            return null;
        switch (activeTab) {
            case 'coach':
                return _jsx(CoachingHome, { dataset: viewDataset });
            case 'stats':
                return _jsx(StatsTab, { dataset: viewDataset });
            case 'matchups':
                return _jsx(MatchupsTab, { dataset: viewDataset });
            case 'runes':
                return _jsx(RunesTab, { dataset: viewDataset });
            case 'champions':
                return _jsx(ChampionPoolTab, { dataset: viewDataset });
            case 'matches':
                return _jsx(MatchesTab, { dataset: viewDataset });
        }
    }, [activeTab, viewDataset]);
    const csBenchmark = useMemo(() => {
        if (!viewDataset?.rank)
            return null;
        return buildCs15Benchmark(roleFilter, viewDataset.rank.highest.tier, viewDataset.summary.avgCsAt15);
    }, [roleFilter, viewDataset]);
    const preferredRoles = useMemo(() => {
        if (!availableRoles.length)
            return ['ALL'];
        const priority = ['ALL', 'JUNGLE', 'TOP', 'MIDDLE', 'BOTTOM', 'UTILITY', 'NONE'];
        return [...availableRoles].sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
    }, [availableRoles]);
    const needsSampleBackfill = useMemo(() => {
        if (!dataset)
            return false;
        return dataset.matches.length < matchCount;
    }, [dataset, matchCount]);
    useEffect(() => {
        if (!availableRoles.includes(roleFilter)) {
            setRoleFilter('ALL');
        }
    }, [availableRoles, roleFilter]);
    function persistSavedProfile(nextDataset, nextMatchCount) {
        const nextRecord = {
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
    function loadSavedProfile(profile) {
        setGameName(profile.gameName);
        setTagLine(profile.tagLine);
        setMatchCount(profile.matchCount);
        setError(null);
        setSyncMessage(null);
        const cachedDataset = window.localStorage.getItem(datasetStorageKey(profile.gameName, profile.tagLine));
        if (cachedDataset) {
            try {
                setDataset(JSON.parse(cachedDataset));
                setShowAccountControls(false);
                window.localStorage.setItem('don-sosa:last-profile', JSON.stringify({
                    gameName: profile.gameName,
                    tagLine: profile.tagLine,
                    matchCount: profile.matchCount
                }));
                return;
            }
            catch {
                window.localStorage.removeItem(datasetStorageKey(profile.gameName, profile.tagLine));
            }
        }
        setDataset(null);
        setShowAccountControls(true);
        void hydrateFromServer(profile.gameName, profile.tagLine);
    }
    async function runAnalysis() {
        setLoading(true);
        setError(null);
        setSyncMessage(null);
        setProgress({ stage: 'queued', current: 0, total: 1, message: 'Preparando analisis' });
        try {
            const cachedDataset = window.localStorage.getItem(datasetStorageKey(gameName, tagLine));
            const previousDataset = cachedDataset ? JSON.parse(cachedDataset) : null;
            const shouldRefreshFullSample = !previousDataset || previousDataset.matches.length < matchCount;
            const result = await collectProfile(gameName, tagLine, matchCount, {
                onProgress: (nextProgress) => setProgress(nextProgress),
                knownMatchIds: shouldRefreshFullSample ? [] : previousDataset.matches.map((match) => match.matchId)
            });
            const mergedDataset = shouldRefreshFullSample
                ? result
                : mergeDatasets(previousDataset, result);
            setDataset(mergedDataset);
            setShowAccountControls(false);
            if (previousDataset && !shouldRefreshFullSample) {
                const addedMatches = mergedDataset.matches.length - previousDataset.matches.length;
                setSyncMessage(addedMatches > 0
                    ? `Se agregaron ${addedMatches} partidas nuevas. El análisis mantiene el historial previo y recalcula todo por fecha real.`
                    : 'No aparecieron partidas nuevas para sumar. El análisis mantiene tu histórico actual sin sobrescribirlo.');
            }
            else if (previousDataset && shouldRefreshFullSample) {
                setSyncMessage(`Se reconstruyó la muestra hasta ${mergedDataset.summary.matches} partidas válidas para que el análisis no quede sesgado por una cache más chica.`);
            }
            else {
                setSyncMessage(`Se cargaron ${mergedDataset.summary.matches} partidas válidas para construir tu primera muestra.`);
            }
            window.localStorage.setItem('don-sosa:last-profile', JSON.stringify({ gameName, tagLine, matchCount }));
            window.localStorage.setItem(datasetStorageKey(gameName, tagLine), JSON.stringify(mergedDataset));
            persistSavedProfile(mergedDataset, matchCount);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        }
        finally {
            setLoading(false);
            setProgress(null);
        }
    }
    async function handleSubmit(event) {
        event.preventDefault();
        await runAnalysis();
    }
    return (_jsx(Shell, { children: _jsxs("div", { style: { display: 'grid', gap: 18, maxWidth: 1440, margin: '0 auto' }, children: [_jsxs("section", { style: heroStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 12 }, children: [_jsx("div", { style: { color: '#8b94a4', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: 12 }, children: "Don Sosa Coach" }), _jsx("h1", { style: { margin: 0, fontSize: 46, letterSpacing: '-0.05em', maxWidth: 760 }, children: "Tu lectura competitiva para jugar mejor, no solo mirar stats" }), _jsx("p", { style: { margin: 0, color: '#9099aa', maxWidth: 760, lineHeight: 1.7 }, children: "Diagn\u00F3stico claro, decisiones accionables y una vista ordenada de matchups, runas, campeones y review. Primero entend\u00E9s qu\u00E9 corregir; despu\u00E9s entr\u00E1s al detalle." }), loading ? (_jsx("div", { style: { color: '#d8fdf1', fontSize: 13, lineHeight: 1.6 }, children: progress?.message ?? (matchCount >= 75
                                        ? 'Analizando una muestra grande. Esto puede tardar varios minutos por los límites de Riot.'
                                        : 'Analizando partidas. Esto puede tardar entre unos segundos y alrededor de un minuto.') })) : null, loading && progress ? (_jsxs("div", { style: { display: 'grid', gap: 8, maxWidth: 460 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', color: '#9eb0c7', fontSize: 12 }, children: [_jsx("span", { children: progress.stage }), _jsx("span", { children: `${Math.min(progress.current, progress.total)} / ${progress.total}` })] }), _jsx("div", { style: { height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }, children: _jsx("div", { style: { width: `${Math.max(8, (progress.current / Math.max(progress.total, 1)) * 100)}%`, height: '100%', background: '#67d6a4' } }) })] })) : null, viewDataset?.rank ? (_jsxs("div", { style: { display: 'flex', gap: 10, flexWrap: 'wrap' }, children: [_jsx(RankBadge, { rank: viewDataset.rank, compact: true }), _jsxs("div", { style: heroMetaChipStyle, children: [_jsx("div", { style: heroMetaLabelStyle, children: "Win rate" }), _jsx("div", { style: heroMetaValueStyle, children: `${viewDataset.rank.highest.winRate}%` }), _jsx("div", { style: heroMetaSubtleStyle, children: `${viewDataset.rank.highest.wins}-${viewDataset.rank.highest.losses}` })] }), csBenchmark ? (_jsxs("div", { style: heroMetaChipStyle, children: [_jsx("div", { style: heroMetaLabelStyle, children: "Benchmark" }), _jsx("div", { style: { ...heroMetaValueStyle, color: csBenchmark.status === 'above' ? '#9ff0cf' : csBenchmark.status === 'below' ? '#ffb3b3' : '#dce8fb' }, children: csBenchmark.label }), _jsx("div", { style: heroMetaSubtleStyle, children: "CS a los 15" })] })) : null] })) : null] }), _jsx(Card, { title: showAccountControls ? 'Analizar cuenta' : 'Cuenta activa', subtitle: showAccountControls ? 'Ingresá el Riot ID y elegí cuántas partidas querés analizar.' : 'Tu cuenta queda lista para refrescar datos o cambiar de perfil cuando quieras.', children: showAccountControls || !dataset ? (_jsxs("form", { onSubmit: handleSubmit, style: { display: 'grid', gap: 12 }, children: [_jsxs("div", { className: "three-col-grid", style: { display: 'grid', gridTemplateColumns: '1.2fr .8fr .7fr', gap: 10 }, children: [_jsx("input", { value: gameName, onChange: (e) => setGameName(e.target.value), placeholder: "Riot Game Name", style: inputStyle }), _jsx("input", { value: tagLine, onChange: (e) => setTagLine(e.target.value), placeholder: "Tag Line", style: inputStyle }), _jsx("select", { value: matchCount, onChange: (e) => setMatchCount(Number(e.target.value)), style: selectStyle, children: [10, 20, 30, 40, 50, 75, 100].map((count) => (_jsxs("option", { value: count, children: [count, " partidas"] }, count))) })] }), _jsx("div", { style: { color: '#7f8898', fontSize: 12, lineHeight: 1.5 }, children: matchCount >= 75
                                            ? 'Con 75 o 100 partidas el análisis es más estable, pero puede tardar bastante por los límites de Riot.'
                                            : 'Menos partidas cargan más rápido. Más partidas dan una lectura más confiable.' }), !dataset && gameName && tagLine ? (_jsx("div", { style: { color: '#9ba6b8', fontSize: 12 }, children: "No hay un an\u00E1lisis guardado para esta cuenta en este navegador. Cargalo una vez y despu\u00E9s quedar\u00E1 disponible." })) : null, _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }, children: [_jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { tone: "default", children: `Filtro actual: ${getRoleLabel(roleFilter)}` }), dataset?.remakesExcluded ? _jsx(Badge, { tone: "medium", children: `${dataset.remakesExcluded} remakes excluidos` }) : null] }), _jsx("button", { type: "submit", style: buttonStyle, children: loading ? 'Analizando...' : `${dataset ? 'Actualizar' : 'Cargar'} ${matchCount} partidas` })] })] })) : (_jsxs("div", { style: { display: 'grid', gap: 12 }, children: [_jsxs("div", { style: { color: '#e7eef8', lineHeight: 1.6 }, children: [gameName && tagLine ? `${gameName}#${tagLine}` : 'Cuenta lista para analizar', "."] }), _jsx("div", { style: { color: '#8a95a8', fontSize: 12, lineHeight: 1.5 }, children: needsSampleBackfill
                                            ? `La muestra guardada tiene ${dataset.matches.length} partidas. Si pedís ${matchCount}, la app vuelve a construir la muestra completa para llegar a ese tamaño.`
                                            : 'Si ya hay partidas guardadas, actualizar busca partidas nuevas y las agrega sin pisar el historial anterior.' }), syncMessage ? _jsx("div", { style: syncMessageStyle, children: syncMessage }) : null, _jsxs("div", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }, children: [_jsxs("div", { style: { display: 'grid', gap: 6 }, children: [_jsx("div", { style: { color: '#8d96a5', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: "Cantidad de partidas" }), _jsx("select", { value: matchCount, onChange: (e) => setMatchCount(Number(e.target.value)), style: selectStyle, children: [10, 20, 30, 40, 50, 75, 100].map((count) => (_jsxs("option", { value: count, children: [count, " partidas"] }, count))) })] }), _jsxs("div", { style: { display: 'grid', gap: 6 }, children: [_jsx("div", { style: { color: '#8d96a5', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: "Filtro de rol" }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { tone: "default", children: `Filtro actual: ${getRoleLabel(roleFilter)}` }), dataset?.remakesExcluded ? _jsx(Badge, { tone: "medium", children: `${dataset.remakesExcluded} remakes excluidos` }) : null] })] })] }), _jsxs("div", { style: { display: 'flex', gap: 10, flexWrap: 'wrap' }, children: [_jsx("button", { type: "button", style: buttonStyle, onClick: () => void runAnalysis(), children: loading ? 'Analizando...' : needsSampleBackfill ? `Completar a ${matchCount} partidas` : `Actualizar ${matchCount} partidas` }), _jsx("button", { type: "button", style: secondaryButtonStyle, onClick: () => setShowAccountControls(true), children: "Cambiar cuenta" })] })] })) })] }), savedProfiles.length ? (_jsxs("section", { style: savedProfilesSectionStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 3 }, children: [_jsx("div", { style: { color: '#8da0ba', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: "Perfiles guardados" }), _jsx("div", { style: { color: '#eef4ff', fontSize: 16, fontWeight: 800 }, children: "Volv\u00E9 r\u00E1pido a cuentas que ya analizaste" })] }), _jsx("div", { className: "four-col-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }, children: savedProfiles.map((profile) => {
                                const isActive = `${profile.gameName}#${profile.tagLine}`.toLowerCase() === `${gameName}#${tagLine}`.toLowerCase();
                                return (_jsxs("button", { type: "button", onClick: () => loadSavedProfile(profile), style: {
                                        ...savedProfileCardStyle,
                                        ...(isActive ? activeSavedProfileCardStyle : {})
                                    }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' }, children: [_jsxs("div", { style: { display: 'grid', gap: 4, textAlign: 'left' }, children: [_jsxs("div", { style: { color: '#edf2ff', fontWeight: 800 }, children: [profile.gameName, _jsxs("span", { style: { color: '#8592a8' }, children: ["#", profile.tagLine] })] }), _jsx("div", { style: { color: '#8390a6', fontSize: 12 }, children: profile.rankLabel ?? 'Sin rango visible' })] }), _jsxs(Badge, { tone: isActive ? 'low' : 'default', children: [profile.matches, " partidas"] })] }), _jsxs("div", { style: { color: '#748198', fontSize: 12, textAlign: 'left' }, children: ["\u00DAltima sync ", new Date(profile.lastSyncedAt).toLocaleDateString('es-AR')] })] }, `${profile.gameName}#${profile.tagLine}`));
                            }) })] })) : null, viewDataset ? (_jsxs("section", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: '1.05fr 1.95fr', gap: 12 }, children: [_jsxs("div", { style: accountCardStyle, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 14 }, children: [viewDataset.profile ? _jsx("img", { src: getProfileIconUrl(viewDataset.profile.profileIconId, viewDataset.ddragonVersion) ?? undefined, alt: viewDataset.player, width: 56, height: 56, style: profileIconStyle }) : null, _jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsxs("div", { style: { fontSize: 26, fontWeight: 800 }, children: [viewDataset.player, _jsxs("span", { style: { color: '#7d8696', fontWeight: 600 }, children: ["#", viewDataset.tagLine] })] }), viewDataset.profile ? _jsx("div", { style: { color: '#8f99ac', fontSize: 13 }, children: `Nivel ${viewDataset.profile.summonerLevel}` }) : null] })] }), _jsxs("div", { style: accountMetaRowStyle, children: [_jsxs("div", { style: recordPillStyle, children: [_jsx("div", { style: { color: '#7f8ca1', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: "Muestra" }), _jsx("div", { style: { color: '#edf2ff', fontSize: 14, fontWeight: 800 }, children: `${viewDataset.summary.wins}-${viewDataset.summary.losses}` })] }), _jsxs("div", { style: recordPillStyle, children: [_jsx("div", { style: { color: '#7f8ca1', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: "Win rate" }), _jsx("div", { style: { color: '#dff7eb', fontSize: 14, fontWeight: 800 }, children: `${viewDataset.summary.winRate}%` })] }), _jsxs("div", { style: recordPillStyle, children: [_jsx("div", { style: { color: '#7f8ca1', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: "Partidas v\u00E1lidas" }), _jsx("div", { style: { color: '#edf2ff', fontSize: 14, fontWeight: 800 }, children: viewDataset.summary.matches })] })] }), viewDataset.rank ? _jsx(RankBadge, { rank: viewDataset.rank }) : null] }), _jsxs("div", { className: "three-col-grid", style: topStatsPanelStyle, children: [_jsx(TopStat, { label: "Performance", value: formatDecimal(viewDataset.summary.avgPerformanceScore), hint: "\u00CDndice medio de ejecuci\u00F3n" }), _jsx(TopStat, { label: "CS a los 15", value: formatDecimal(viewDataset.summary.avgCsAt15), hint: "Econom\u00EDa temprana media" }), _jsx(TopStat, { label: "Oro a los 15", value: Math.round(viewDataset.summary.avgGoldAt15).toLocaleString('es-AR'), hint: "Valor generado antes del mid game" }), _jsx(TrendSparkline, { matches: viewDataset.matches })] })] })) : null, _jsxs("section", { style: { display: 'grid', gap: 12 }, children: [viewDataset ? (_jsxs("div", { style: roleFilterPanelStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 3 }, children: [_jsx("div", { style: { color: '#8da0ba', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: "Contexto de an\u00E1lisis" }), _jsx("div", { style: { color: '#eef4ff', fontSize: 16, fontWeight: 800 }, children: "Eleg\u00ED el contexto exacto que quer\u00E9s revisar" }), _jsx("div", { style: { color: '#8793a8', fontSize: 13 }, children: "El coaching mejora mucho si separ\u00E1s rol, tipo de cola y ventana reciente en vez de mezclar todas tus partidas." })] }), _jsx("div", { className: "role-pill-grid", style: rolePillGridStyle, children: preferredRoles.map((role) => (_jsx("button", { type: "button", onClick: () => setRoleFilter(role), style: {
                                            ...rolePillStyle,
                                            ...(roleFilter === role ? activeRolePillStyle : {})
                                        }, children: getRoleLabel(role) }, role))) }), _jsxs("div", { className: "three-col-grid", style: { display: 'grid', gridTemplateColumns: '1.4fr 1.1fr .9fr', gap: 10 }, children: [_jsxs("div", { style: contextGroupStyle, children: [_jsx("div", { style: contextLabelStyle, children: "Tipo de cola" }), _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: availableQueueFilters.map((queue) => (_jsx("button", { type: "button", onClick: () => setQueueFilter(queue), style: {
                                                            ...contextChipStyle,
                                                            ...(queueFilter === queue ? activeContextChipStyle : {})
                                                        }, children: queue === 'ALL'
                                                            ? 'Todas'
                                                            : queue === 'RANKED'
                                                                ? 'Rankeds'
                                                                : queue === 'RANKED_SOLO'
                                                                    ? 'Solo/Duo'
                                                                    : queue === 'RANKED_FLEX'
                                                                        ? 'Flex'
                                                                        : 'Otras' }, queue))) })] }), _jsxs("div", { style: contextGroupStyle, children: [_jsx("div", { style: contextLabelStyle, children: "Ventana" }), _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [
                                                        { id: 'ALL', label: 'Todo' },
                                                        { id: 'LAST_20', label: 'Últimas 20' },
                                                        { id: 'LAST_8', label: 'Últimas 8' }
                                                    ].map((windowOption) => (_jsx("button", { type: "button", onClick: () => setWindowFilter(windowOption.id), style: {
                                                            ...contextChipStyle,
                                                            ...(windowFilter === windowOption.id ? activeContextChipStyle : {})
                                                        }, children: windowOption.label }, windowOption.id))) })] }), _jsxs("div", { style: contextGroupStyle, children: [_jsx("div", { style: contextLabelStyle, children: "Lectura activa" }), _jsx("div", { style: { color: '#dce7f9', fontSize: 13, lineHeight: 1.5 }, children: `${getRoleLabel(roleFilter)} · ${queueFilter === 'ALL' ? 'todas las colas' : queueFilter === 'RANKED' ? 'rankeds' : queueFilter === 'RANKED_SOLO' ? 'solo/duo' : queueFilter === 'RANKED_FLEX' ? 'flex' : 'otras colas'}` }), _jsx("div", { style: { color: '#8390a6', fontSize: 12 }, children: windowFilter === 'ALL' ? `${viewDataset.summary.matches} partidas en muestra` : `${viewDataset.summary.matches} partidas recientes` })] })] })] })) : null, _jsxs("div", { style: navigationPanelStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 3 }, children: [_jsx("div", { style: { color: '#8da0ba', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: "Exploraci\u00F3n" }), _jsx("div", { style: { color: '#eef4ff', fontSize: 15, fontWeight: 800 }, children: "Eleg\u00ED qu\u00E9 capa quer\u00E9s abrir" })] }), _jsx("div", { className: "tab-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: 8, flex: 1 }, children: tabs.map((tab) => (_jsx("button", { onClick: () => setActiveTab(tab.id), style: {
                                            ...tabStyle,
                                            ...(activeTab === tab.id ? activeTabStyle : {})
                                        }, children: tab.label }, tab.id))) }), viewDataset ? (_jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { children: `${viewDataset.summary.matches} partidas visibles` }), viewDataset.matches[0] ? _jsx(Badge, { children: getQueueLabel(viewDataset.matches[0].queueId) }) : null, _jsx(Badge, { tone: "default", children: getRoleLabel(roleFilter) })] })) : null] })] }), error ? _jsx(Card, { title: "Error", children: error }) : null, viewDataset ? (renderedTab) : (_jsx(Card, { title: "Esperando an\u00E1lisis", subtitle: "La idea es que el producto se sienta m\u00E1s cuenta personal premium que panel t\u00E9cnico", children: _jsxs("div", { style: { display: 'grid', gap: 12, color: '#c7d4ea', lineHeight: 1.7 }, children: [_jsxs("div", { children: [_jsx("strong", { children: "Coach:" }), " problema principal, evidencia, impacto y plan activo."] }), _jsxs("div", { children: [_jsx("strong", { children: "Stats:" }), " m\u00E9tricas agregadas y evoluci\u00F3n."] }), _jsxs("div", { children: [_jsx("strong", { children: "Matchups:" }), " rendimiento real frente a rivales directos."] }), _jsxs("div", { children: [_jsx("strong", { children: "Runes y champions:" }), " lectura t\u00E1ctica con m\u00E1s contexto visual."] })] }) })), _jsxs("footer", { style: footerStyle, children: [_jsx("div", { style: { color: '#7f8ca1', fontSize: 13 }, children: "Don Sosa Coach beta privada de coaching y an\u00E1lisis competitivo para League of Legends." }), _jsxs("div", { style: { display: 'flex', gap: 14, flexWrap: 'wrap' }, children: [_jsx("a", { href: "/privacy.html", target: "_blank", rel: "noreferrer", style: footerLinkStyle, children: "Privacy Policy" }), _jsx("a", { href: "/terms.html", target: "_blank", rel: "noreferrer", style: footerLinkStyle, children: "Terms of Service" })] })] })] }) }));
}
const heroStyle = {
    display: 'grid',
    gridTemplateColumns: '1.2fr .95fr',
    gap: 18,
    padding: 24,
    borderRadius: 24,
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'linear-gradient(180deg, rgba(39,27,67,0.8), rgba(7,10,16,0.98))'
};
const accountCardStyle = {
    display: 'grid',
    gap: 12,
    padding: '18px 20px',
    borderRadius: 16,
    background: 'linear-gradient(180deg, rgba(22,26,38,0.96), rgba(8,11,18,0.98))',
    border: '1px solid rgba(255,255,255,0.06)'
};
const profileIconStyle = {
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.08)'
};
const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: '#070b12',
    color: '#edf2ff'
};
const selectStyle = {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: '#070b12',
    color: '#edf2ff'
};
const buttonStyle = {
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '12px 18px',
    borderRadius: 12,
    background: '#d8fdf1',
    color: '#07111f',
    fontWeight: 800,
    cursor: 'pointer'
};
const secondaryButtonStyle = {
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '12px 18px',
    borderRadius: 12,
    background: '#0a0f18',
    color: '#e8eef9',
    fontWeight: 700,
    cursor: 'pointer'
};
const tabStyle = {
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '12px 14px',
    borderRadius: 12,
    background: '#070b12',
    color: '#d7e3f5',
    cursor: 'pointer',
    textAlign: 'center'
};
const activeTabStyle = {
    background: 'linear-gradient(180deg, rgba(53,35,95,0.95), rgba(16,23,35,1))',
    borderColor: 'rgba(216,253,241,0.18)',
    color: '#ffffff'
};
const accountMetaRowStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 8
};
const recordPillStyle = {
    display: 'grid',
    gap: 4,
    padding: '10px 12px',
    borderRadius: 12,
    background: '#080d15',
    border: '1px solid rgba(255,255,255,0.05)'
};
const roleFilterPanelStyle = {
    display: 'grid',
    gap: 14,
    padding: '16px 18px',
    borderRadius: 16,
    background: 'linear-gradient(180deg, rgba(13,18,28,0.98), rgba(7,10,16,0.98))',
    border: '1px solid rgba(216,253,241,0.1)'
};
const rolePillGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
    gap: 8
};
const rolePillStyle = {
    padding: '12px 12px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: '#080d15',
    color: '#d9e4f6',
    fontWeight: 700,
    cursor: 'pointer',
    textAlign: 'center'
};
const activeRolePillStyle = {
    background: 'linear-gradient(180deg, rgba(216,253,241,0.14), rgba(26,39,50,0.92))',
    borderColor: 'rgba(216,253,241,0.22)',
    color: '#ffffff',
    boxShadow: '0 0 0 1px rgba(216,253,241,0.08) inset'
};
const contextGroupStyle = {
    display: 'grid',
    gap: 8,
    padding: '12px 14px',
    borderRadius: 14,
    background: '#080d15',
    border: '1px solid rgba(255,255,255,0.05)'
};
const contextLabelStyle = {
    color: '#7f8ca1',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
};
const contextChipStyle = {
    padding: '8px 10px',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    background: '#0a1018',
    color: '#d7e3f5',
    cursor: 'pointer',
    fontWeight: 700
};
const activeContextChipStyle = {
    background: 'linear-gradient(180deg, rgba(216,253,241,0.14), rgba(24,35,44,0.96))',
    borderColor: 'rgba(216,253,241,0.22)',
    color: '#ffffff'
};
const syncMessageStyle = {
    padding: '10px 12px',
    borderRadius: 12,
    background: 'rgba(216,253,241,0.08)',
    border: '1px solid rgba(216,253,241,0.12)',
    color: '#dff7eb',
    fontSize: 12,
    lineHeight: 1.5
};
const navigationPanelStyle = {
    display: 'grid',
    gap: 10,
    padding: '14px 16px',
    borderRadius: 16,
    background: '#060a10',
    border: '1px solid rgba(255,255,255,0.06)'
};
const savedProfilesSectionStyle = {
    display: 'grid',
    gap: 12,
    padding: '14px 16px',
    borderRadius: 16,
    background: '#060a10',
    border: '1px solid rgba(255,255,255,0.06)'
};
const savedProfileCardStyle = {
    display: 'grid',
    gap: 12,
    padding: '14px 15px',
    borderRadius: 14,
    background: '#090e16',
    border: '1px solid rgba(255,255,255,0.06)',
    cursor: 'pointer'
};
const activeSavedProfileCardStyle = {
    background: 'linear-gradient(180deg, rgba(216,253,241,0.1), rgba(24,35,44,0.96))',
    borderColor: 'rgba(216,253,241,0.2)'
};
function TopStat({ label, value, hint }) {
    return (_jsxs("div", { style: topStatStyle, children: [_jsx("div", { style: { color: '#768091', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: label }), _jsx("div", { style: { fontSize: 21, fontWeight: 800, lineHeight: 1.05 }, children: value }), _jsx("div", { style: { color: '#8692a7', fontSize: 12 }, children: hint })] }));
}
function RankBadge({ rank, compact = false }) {
    const emblem = getRankEmblemDataUrl(rank.highest.tier);
    const palette = getRankPalette(rank.highest.tier);
    const lpProgress = Math.max(0, Math.min(rank.highest.leaguePoints, 100));
    const title = `Solo/Duo: ${rank.soloQueue.label} · ${rank.soloQueue.leaguePoints} LP · ${rank.soloQueue.winRate}% WR\nFlex: ${rank.flexQueue.label} · ${rank.flexQueue.leaguePoints} LP · ${rank.flexQueue.winRate}% WR`;
    return (_jsxs("div", { title: title, style: {
            display: 'grid',
            gap: compact ? 6 : 8,
            minWidth: compact ? 220 : 250,
            padding: compact ? '10px 12px' : '12px 14px',
            borderRadius: 14,
            background: compact ? 'rgba(9, 14, 22, 0.86)' : 'linear-gradient(180deg, rgba(10,14,22,0.96), rgba(19,24,37,0.92))',
            border: `1px solid ${palette.primary}33`
        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx("img", { src: emblem, alt: rank.highest.label, width: compact ? 28 : 36, height: compact ? 28 : 36, style: { display: 'block' } }), _jsxs("div", { style: { display: 'grid', gap: 2 }, children: [_jsx("div", { style: { color: '#8d97aa', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: rank.highest.queueLabel ?? 'Ranked' }), _jsxs("div", { style: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }, children: [_jsx("span", { style: { fontSize: compact ? 13 : 15, fontWeight: 800, color: '#edf2ff' }, children: rank.highest.label }), _jsx("span", { style: { color: palette.glow, fontSize: 12, fontWeight: 700 }, children: `${rank.highest.leaguePoints} LP` })] })] })] }), _jsxs("div", { style: { display: 'grid', gap: 5 }, children: [_jsx("div", { style: { height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }, children: _jsx("div", { style: { width: `${lpProgress}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${palette.primary}, ${palette.glow})` } }) }), !compact ? (_jsx("div", { style: { color: '#7e889b', fontSize: 11 }, children: "Hover para ver Solo/Duo y Flex" })) : null] })] }));
}
function TrendSparkline({ matches }) {
    const sorted = [...matches].sort((a, b) => a.gameCreation - b.gameCreation).slice(-12);
    const values = sorted.map((match) => match.score.total);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 100);
    const points = values.map((value, index) => {
        const x = values.length === 1 ? 0 : (index / Math.max(values.length - 1, 1)) * 100;
        const y = 100 - (((value - min) / Math.max(max - min, 1)) * 100);
        return `${x},${y}`;
    }).join(' ');
    return (_jsxs("div", { style: sparklineCardStyle, children: [_jsx("div", { style: { color: '#7d889c', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: "\u00DAltimas partidas" }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12 }, children: [_jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsx("div", { style: { fontSize: 18, fontWeight: 800 }, children: "Performance reciente" }), _jsx("div", { style: { color: '#8895aa', fontSize: 12 }, children: "Sparkline de las \u00FAltimas 12 partidas v\u00E1lidas" })] }), _jsx("div", { style: { color: '#dff7eb', fontSize: 12, fontWeight: 700 }, children: values.length ? `${Math.round(values.at(-1) ?? 0)} último score` : 'Sin datos' })] }), _jsxs("svg", { viewBox: "0 0 100 100", preserveAspectRatio: "none", style: { width: '100%', height: 84, display: 'block' }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "spark-fill", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "rgba(216,253,241,0.34)" }), _jsx("stop", { offset: "100%", stopColor: "rgba(216,253,241,0)" })] }) }), _jsx("polyline", { fill: "none", stroke: "rgba(216,253,241,0.95)", strokeWidth: "3", points: points })] })] }));
}
const topStatStyle = {
    minWidth: 126,
    padding: '14px 15px',
    borderRadius: 16,
    background: '#060a10',
    border: '1px solid rgba(255,255,255,0.06)',
    display: 'grid',
    gap: 4,
    alignContent: 'start'
};
const topStatsPanelStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 10,
    alignItems: 'stretch'
};
const sparklineCardStyle = {
    gridColumn: '1 / -1',
    display: 'grid',
    gap: 10,
    padding: '14px 15px',
    borderRadius: 16,
    background: '#060a10',
    border: '1px solid rgba(255,255,255,0.06)'
};
const heroMetaChipStyle = {
    display: 'grid',
    gap: 2,
    minWidth: 128,
    padding: '10px 12px',
    borderRadius: 14,
    background: 'rgba(8,12,20,0.88)',
    border: '1px solid rgba(255,255,255,0.06)'
};
const heroMetaLabelStyle = {
    color: '#7d889c',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
};
const heroMetaValueStyle = {
    color: '#edf2ff',
    fontSize: 16,
    fontWeight: 800
};
const heroMetaSubtleStyle = {
    color: '#8d98ad',
    fontSize: 12
};
const footerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: '4px 4px 18px'
};
const footerLinkStyle = {
    color: '#b8c7de',
    textDecoration: 'none',
    fontSize: 13
};
