import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { buildAggregateSummary } from '@don-sosa/core';
import { useEffect, useMemo, useState } from 'react';
import { collectProfile, fetchCachedProfile, generateAICoach, sendAICoachFeedback } from '../lib/api';
import { Shell, Card, Badge } from '../components/ui';
import { CoachingHome } from '../features/coach/CoachingHome';
import { StatsTab } from '../features/stats/StatsTab';
import { MatchupsTab } from '../features/matchups/MatchupsTab';
import { RunesTab } from '../features/runes/RunesTab';
import { ChampionPoolTab } from '../features/champion-pool/ChampionPoolTab';
import { MatchesTab } from '../features/matches/MatchesTab';
import { detectLocale, translateRole } from '../lib/i18n';
import { getQueueBucket, getQueueLabel, getRankEmblemDataUrl, getRankPalette, getRoleLabel } from '../lib/lol';
import { buildCs15Benchmark } from '../lib/benchmarks';
const tabs = [
    { id: 'coach', label: { es: 'Coaching', en: 'Coaching' } },
    { id: 'stats', label: { es: 'Métricas', en: 'Stats' } },
    { id: 'matchups', label: { es: 'Cruces', en: 'Matchups' } },
    { id: 'runes', label: { es: 'Runas', en: 'Runes' } },
    { id: 'champions', label: { es: 'Campeones', en: 'Champions' } },
    { id: 'matches', label: { es: 'Partidas', en: 'Matches' } }
];
const savedProfilesStorageKey = 'don-sosa:saved-profiles';
const initialMatchOptions = [20, 50, 100];
function datasetStorageKey(gameName, tagLine) {
    return `don-sosa:dataset:${gameName}#${tagLine}`.toLowerCase();
}
function coachScopeStorageKey(gameName, tagLine) {
    return `don-sosa:coach-scope:${gameName}#${tagLine}`.toLowerCase();
}
function mergeDatasets(current, incoming, locale) {
    if (!current)
        return incoming;
    const matchMap = new Map();
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
function normalizeTagLineInput(value) {
    return value.replace(/^#+/, '').trim();
}
function serializeCoachRoles(roles) {
    return [...new Set(roles.map((role) => role.trim().toUpperCase()).filter(Boolean))].sort().join('+');
}
function formatCoachScopeLabel(roles, locale) {
    if (!roles.length)
        return locale === 'en' ? 'Choose 1 or 2 roles' : 'Elegí 1 o 2 roles';
    return roles.map((role) => (locale === 'en' ? translateRole(role, 'en') : getRoleLabel(role))).join(' + ');
}
function buildDefaultCoachRoles(dataset) {
    const roleCounts = new Map();
    for (const match of dataset.matches) {
        const role = (match.role || 'NONE').toUpperCase();
        if (!role || role === 'NONE')
            continue;
        roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
    }
    const rankedRoles = Array.from(roleCounts.entries()).sort((a, b) => b[1] - a[1]);
    const [primary, secondary] = rankedRoles;
    if (!primary)
        return [];
    if (!secondary)
        return [primary[0]];
    const total = rankedRoles.reduce((sum, [, count]) => sum + count, 0);
    const primaryShare = primary[1] / Math.max(total, 1);
    if (primaryShare >= 0.7 || primary[1] >= secondary[1] * 2) {
        return [primary[0]];
    }
    return [primary[0], secondary[0]];
}
function buildTargetOptions(currentMatches) {
    if (!currentMatches)
        return initialMatchOptions;
    const options = new Set([currentMatches, 100]);
    [1, 5, 10].forEach((delta) => {
        const next = Math.min(100, currentMatches + delta);
        if (next > currentMatches)
            options.add(next);
    });
    return Array.from(options).sort((a, b) => a - b);
}
function buildQuickRefreshActions(currentMatches) {
    if (!currentMatches || currentMatches >= 100)
        return [];
    const candidates = [
        { id: 'plus-1', target: Math.min(100, currentMatches + 1), label: '+1' },
        { id: 'plus-5', target: Math.min(100, currentMatches + 5), label: '+5' },
        { id: 'plus-10', target: Math.min(100, currentMatches + 10), label: '+10' },
        { id: 'complete', target: 100, label: '100' }
    ];
    const seen = new Set();
    return candidates.filter((action) => {
        if (action.target <= currentMatches || seen.has(action.target))
            return false;
        seen.add(action.target);
        return true;
    });
}
function formatQueueSummary(dataset, locale) {
    const queueCounts = new Map();
    for (const match of dataset.matches) {
        const bucket = getQueueBucket(match.queueId);
        queueCounts.set(bucket, (queueCounts.get(bucket) ?? 0) + 1);
    }
    const solo = queueCounts.get('RANKED_SOLO') ?? 0;
    const flex = queueCounts.get('RANKED_FLEX') ?? 0;
    if (solo && flex) {
        return locale === 'en' ? 'Solo + Flex' : 'Solo + Flex';
    }
    if (solo)
        return 'Solo/Duo';
    if (flex)
        return 'Flex';
    return locale === 'en' ? 'Mixed queue' : 'Cola mixta';
}
export default function App() {
    const [locale] = useState(() => detectLocale());
    const [activeTab, setActiveTab] = useState('coach');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [coachRoles, setCoachRoles] = useState([]);
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
    const [aiCoach, setAICoach] = useState(null);
    const [aiCoachLoading, setAICoachLoading] = useState(false);
    const [aiCoachError, setAICoachError] = useState(null);
    const [lastAICoachRequestKey, setLastAICoachRequestKey] = useState(null);
    const [lastGeneratedCoachScopeKey, setLastGeneratedCoachScopeKey] = useState(null);
    async function hydrateFromServer(gameNameValue, tagLineValue) {
        try {
            const serverDataset = await fetchCachedProfile(gameNameValue, tagLineValue, locale);
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
            setSyncMessage(locale === 'en'
                ? 'We recovered a saved version from the server so you do not have to start from zero on this device.'
                : 'Recuperamos una versión guardada en el servidor para que no arranques de cero en este dispositivo.');
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
    }, [locale, matchCount]);
    const availableRoles = useMemo(() => {
        if (!dataset)
            return ['ALL'];
        const roles = Array.from(new Set(dataset.matches.map((match) => match.role || 'NONE')))
            .filter((role) => Boolean(role) && role !== 'NONE');
        return ['ALL', ...roles];
    }, [dataset]);
    const coachRoleOptions = useMemo(() => availableRoles.filter((role) => role !== 'ALL' && role !== 'NONE'), [availableRoles]);
    const coachScopeKey = useMemo(() => serializeCoachRoles(coachRoles), [coachRoles]);
    const coachScopeLabel = useMemo(() => formatCoachScopeLabel(coachRoles, locale), [coachRoles, locale]);
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
    const coachDataset = dataset;
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
        const filteredSummary = buildAggregateSummary(dataset.player, dataset.tagLine, dataset.summary.region, dataset.summary.platform, filteredMatches, locale);
        return {
            ...dataset,
            matches: filteredMatches,
            summary: filteredSummary
        };
    }, [dataset, roleFilter, queueFilter, windowFilter, locale]);
    const coachRequestKey = useMemo(() => {
        if (!coachDataset || !gameName || !tagLine || !coachScopeKey)
            return null;
        return [
            gameName.trim().toLowerCase(),
            tagLine.trim().toLowerCase(),
            locale,
            coachScopeKey,
            coachDataset.summary.matches,
            coachDataset.matches[0]?.matchId ?? 'no-latest-match'
        ].join('|');
    }, [coachDataset, gameName, tagLine, locale, coachScopeKey]);
    const coachScopeDirty = useMemo(() => {
        if (!coachScopeKey)
            return false;
        if (!lastGeneratedCoachScopeKey)
            return false;
        return coachScopeKey !== lastGeneratedCoachScopeKey;
    }, [coachScopeKey, lastGeneratedCoachScopeKey]);
    const renderedTab = useMemo(() => {
        if (activeTab === 'coach') {
            if (!coachDataset)
                return null;
            return (_jsx(CoachingHome, { dataset: coachDataset, locale: locale, aiCoach: aiCoach, generatingAICoach: aiCoachLoading, aiCoachError: aiCoachError, onGenerateAICoach: () => void handleGenerateAICoach(true), onSendFeedback: (verdict) => void handleAICoachFeedback(verdict) }));
        }
        if (!viewDataset)
            return null;
        switch (activeTab) {
            case 'stats':
                return _jsx(StatsTab, { dataset: viewDataset, locale: locale });
            case 'matchups':
                return _jsx(MatchupsTab, { dataset: viewDataset, locale: locale });
            case 'runes':
                return _jsx(RunesTab, { dataset: viewDataset, locale: locale });
            case 'champions':
                return _jsx(ChampionPoolTab, { dataset: viewDataset, locale: locale });
            case 'matches':
                return _jsx(MatchesTab, { dataset: viewDataset, locale: locale });
        }
    }, [activeTab, coachDataset, viewDataset, locale, aiCoach, aiCoachLoading, aiCoachError]);
    const csBenchmark = useMemo(() => {
        if (!viewDataset?.rank)
            return null;
        return buildCs15Benchmark(roleFilter, viewDataset.rank.highest.tier, viewDataset.summary.avgCsAt15, locale);
    }, [roleFilter, viewDataset, locale]);
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
    const targetCountOptions = useMemo(() => buildTargetOptions(dataset?.matches.length ?? null), [dataset?.matches.length]);
    const quickRefreshActions = useMemo(() => buildQuickRefreshActions(dataset?.matches.length ?? null), [dataset?.matches.length]);
    useEffect(() => {
        if (!dataset || !gameName || !tagLine) {
            setCoachRoles([]);
            setLastGeneratedCoachScopeKey(null);
            return;
        }
        const defaultRoles = buildDefaultCoachRoles(dataset);
        try {
            const raw = window.localStorage.getItem(coachScopeStorageKey(gameName, tagLine));
            if (!raw) {
                setCoachRoles(defaultRoles);
                setLastGeneratedCoachScopeKey(null);
                return;
            }
            const parsed = JSON.parse(raw);
            const nextRoles = parsed
                .map((role) => role.trim().toUpperCase())
                .filter((role) => coachRoleOptions.includes(role))
                .slice(0, 2);
            setCoachRoles(nextRoles.length ? nextRoles : defaultRoles);
            setLastGeneratedCoachScopeKey(null);
        }
        catch {
            setCoachRoles(defaultRoles);
            setLastGeneratedCoachScopeKey(null);
        }
    }, [dataset, gameName, tagLine, coachRoleOptions]);
    useEffect(() => {
        if (!availableRoles.includes(roleFilter)) {
            setRoleFilter('ALL');
        }
    }, [availableRoles, roleFilter]);
    useEffect(() => {
        setAICoach(null);
        setAICoachError(null);
        setLastAICoachRequestKey(null);
        setLastGeneratedCoachScopeKey(null);
    }, [gameName, tagLine, locale, dataset?.summary.matches]);
    useEffect(() => {
        if (activeTab !== 'coach' || !coachRequestKey || aiCoachLoading || coachScopeDirty)
            return;
        if (lastAICoachRequestKey === coachRequestKey)
            return;
        void handleGenerateAICoach();
    }, [activeTab, coachRequestKey, aiCoachLoading, lastAICoachRequestKey, coachScopeDirty]);
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
    async function runAnalysis(requestedCount = matchCount) {
        setLoading(true);
        setError(null);
        setSyncMessage(null);
        setProgress({ stage: 'queued', current: 0, total: 1, message: locale === 'en' ? 'Preparing analysis' : 'Preparando análisis' });
        try {
            const cachedDataset = window.localStorage.getItem(datasetStorageKey(gameName, tagLine));
            const previousDataset = cachedDataset ? JSON.parse(cachedDataset) : null;
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
            }
            else if (previousDataset && shouldRefreshFullSample) {
                setSyncMessage(locale === 'en'
                    ? `The sample was rebuilt to ${mergedDataset.summary.matches} valid matches so the analysis is not biased by a smaller cache.`
                    : `Se reconstruyó la muestra hasta ${mergedDataset.summary.matches} partidas válidas para que el análisis no quede sesgado por una cache más chica.`);
            }
            else {
                setSyncMessage(locale === 'en'
                    ? `${mergedDataset.summary.matches} valid matches were loaded to build your first sample.`
                    : `Se cargaron ${mergedDataset.summary.matches} partidas válidas para construir tu primera muestra.`);
            }
            setMatchCount(requestedCount);
            window.localStorage.setItem('don-sosa:last-profile', JSON.stringify({ gameName, tagLine, matchCount: requestedCount }));
            window.localStorage.setItem(datasetStorageKey(gameName, tagLine), JSON.stringify(mergedDataset));
            persistSavedProfile(mergedDataset, requestedCount);
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
        await runAnalysis(matchCount);
    }
    function toggleCoachRole(role) {
        const normalizedRole = role.trim().toUpperCase();
        setCoachRoles((current) => {
            const next = current.includes(normalizedRole)
                ? current.filter((item) => item !== normalizedRole)
                : [...current, normalizedRole].slice(0, 2);
            if (gameName && tagLine) {
                window.localStorage.setItem(coachScopeStorageKey(gameName, tagLine), JSON.stringify(next));
            }
            return next;
        });
    }
    async function handleGenerateAICoach(force = false) {
        if (!gameName || !tagLine || !coachRequestKey)
            return;
        if (!coachRoles.length) {
            setAICoachError(locale === 'en' ? 'Choose at least one role for coaching before generating the analysis.' : 'Elegí al menos un rol para coaching antes de generar el análisis.');
            return;
        }
        if (!force && lastAICoachRequestKey === coachRequestKey)
            return;
        setLastAICoachRequestKey(coachRequestKey);
        setAICoachLoading(true);
        setAICoachError(null);
        try {
            const result = await generateAICoach({
                gameName,
                tagLine,
                locale,
                roleFilter: coachScopeKey,
                coachRoles,
                queueFilter: 'ALL',
                windowFilter: 'ALL'
            });
            setAICoach(result);
            setLastGeneratedCoachScopeKey(coachScopeKey);
            window.localStorage.setItem(coachScopeStorageKey(gameName, tagLine), JSON.stringify(coachRoles));
        }
        catch (err) {
            setAICoachError(err instanceof Error ? err.message : 'Unknown error');
        }
        finally {
            setAICoachLoading(false);
        }
    }
    async function handleAICoachFeedback(verdict) {
        if (!aiCoach?.generationId)
            return;
        try {
            await sendAICoachFeedback({
                generationId: aiCoach.generationId,
                verdict
            });
            setSyncMessage(locale === 'en' ? 'AI feedback saved. This will help us tighten future coaching blocks.' : 'Feedback de IA guardado. Esto nos va a ayudar a afinar futuros bloques de coaching.');
        }
        catch (err) {
            setAICoachError(err instanceof Error ? err.message : 'Unknown error');
        }
    }
    return (_jsx(Shell, { children: _jsxs("div", { style: { display: 'grid', gap: 18, maxWidth: 1440, margin: '0 auto' }, children: [_jsxs("section", { style: topBarStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsx("div", { style: { color: '#eef4ff', fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em' }, children: "Don Sosa Coach" }), _jsx("div", { style: { color: '#8b96aa', fontSize: 13 }, children: locale === 'en' ? 'Premium coaching, review and progression tracking for League of Legends.' : 'Coaching premium, revisión y seguimiento de progreso para League of Legends.' })] }), _jsxs("div", { style: accountAccessStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 3 }, children: [_jsx("div", { style: { color: '#dfe8f6', fontSize: 13, fontWeight: 700 }, children: locale === 'en' ? 'Account and membership' : 'Cuenta y membresía' }), _jsx("div", { style: { color: '#8190a6', fontSize: 12 }, children: locale === 'en' ? 'Reserved space for login, profile and billing.' : 'Espacio reservado para login, perfil y suscripción.' })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsx(Badge, { tone: "default", children: locale === 'en' ? 'Coming soon' : 'Próximamente' }), _jsx("button", { type: "button", style: topBarGhostButtonStyle, disabled: true, children: locale === 'en' ? 'Sign in' : 'Iniciar sesión' }), _jsx("button", { type: "button", style: topBarPrimaryButtonStyle, disabled: true, children: locale === 'en' ? 'Profile' : 'Perfil' })] })] })] }), _jsxs("section", { style: heroGridStyle, children: [!dataset ? (_jsx("div", { style: heroIntroPanelStyle, children: _jsxs("div", { style: { display: 'grid', gap: 12 }, children: [_jsx("div", { style: { color: '#8b94a4', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: 12 }, children: "Don Sosa Coach" }), _jsx("h1", { style: { margin: 0, fontSize: 46, letterSpacing: '-0.05em', maxWidth: 760 }, children: locale === 'en'
                                            ? 'A competitive read of your play, not just another stats page'
                                            : 'Tu lectura competitiva para jugar mejor, no solo mirar stats' }), _jsx("p", { style: { margin: 0, color: '#9099aa', maxWidth: 760, lineHeight: 1.7 }, children: locale === 'en'
                                            ? 'Clear diagnosis, actionable decisions and an organized view of matchups, runes, champions and review. First you understand what to fix, then you go deeper.'
                                            : 'Diagnóstico claro, decisiones accionables y una vista ordenada de matchups, runas, campeones y revisión. Primero entendés qué corregir; después entrás al detalle.' }), loading ? (_jsx("div", { style: { color: '#d8fdf1', fontSize: 13, lineHeight: 1.6 }, children: progress?.message ?? (matchCount >= 75
                                            ? (locale === 'en' ? 'Analyzing a large sample. This can take several minutes because of Riot rate limits.' : 'Analizando una muestra grande. Esto puede tardar varios minutos por los límites de Riot.')
                                            : (locale === 'en' ? 'Analyzing matches. This can take anywhere from a few seconds to about a minute.' : 'Analizando partidas. Esto puede tardar entre unos segundos y alrededor de un minuto.')) })) : null, loading && progress ? (_jsxs("div", { style: { display: 'grid', gap: 8, maxWidth: 460 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', color: '#9eb0c7', fontSize: 12 }, children: [_jsx("span", { children: progress.stage }), _jsx("span", { children: `${Math.min(progress.current, progress.total)} / ${progress.total}` })] }), _jsx("div", { style: { height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }, children: _jsx("div", { style: { width: `${Math.max(8, (progress.current / Math.max(progress.total, 1)) * 100)}%`, height: '100%', background: '#67d6a4' } }) })] })) : null] }) })) : (_jsxs("div", { style: { display: 'grid', gap: 16 }, children: [_jsx("div", { style: heroIntroPanelStyle, children: _jsxs("div", { style: { display: 'grid', gap: 16 }, children: [_jsxs("div", { style: { display: 'grid', gap: 6 }, children: [_jsx("div", { style: { color: '#8b94a4', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: 12 }, children: locale === 'en' ? 'Current profile' : 'Perfil actual' }), _jsxs("h1", { style: { margin: 0, fontSize: 38, letterSpacing: '-0.05em', lineHeight: 1.05 }, children: [dataset.player, _jsxs("span", { style: { color: '#8894ab' }, children: ["#", dataset.tagLine] })] }), _jsx("p", { style: { margin: 0, color: '#96a1b4', maxWidth: 760, lineHeight: 1.65 }, children: locale === 'en'
                                                            ? 'The coaching block uses this saved sample as its base. You can explore the rest of the product without spending tokens again on every visual filter change.'
                                                            : 'El bloque de coaching usa esta muestra guardada como base. Podés explorar el resto del producto sin volver a gastar tokens por cada cambio visual de filtros.' })] }), _jsxs("div", { className: "three-col-grid", style: { display: 'grid', gridTemplateColumns: '1.25fr repeat(2, minmax(0, 1fr))', gap: 12 }, children: [dataset.rank ? _jsx(RankBadge, { rank: dataset.rank, compact: true, locale: locale }) : null, _jsxs("div", { style: heroMetaChipStyle, children: [_jsx("div", { style: heroMetaLabelStyle, children: locale === 'en' ? 'Block' : 'Bloque' }), _jsx("div", { style: heroMetaValueStyle, children: dataset.summary.matches }), _jsx("div", { style: heroMetaSubtleStyle, children: locale === 'en' ? 'valid matches saved' : 'partidas válidas guardadas' })] }), _jsxs("div", { style: heroMetaChipStyle, children: [_jsx("div", { style: heroMetaLabelStyle, children: locale === 'en' ? 'Win rate' : 'WR' }), _jsxs("div", { style: heroMetaValueStyle, children: [dataset.summary.winRate, "%"] }), _jsx("div", { style: heroMetaSubtleStyle, children: `${dataset.summary.wins}-${dataset.summary.losses}` })] })] })] }) }), _jsx(Card, { title: locale === 'en' ? 'Coaching scope' : 'Alcance del coaching', subtitle: locale === 'en'
                                        ? 'Choose the one or two roles you truly want to improve. The AI block is generated only from this scope.'
                                        : 'Elegí el o los dos roles que de verdad querés mejorar. El bloque de IA se genera solo sobre este alcance.', children: _jsxs("div", { style: { display: 'grid', gap: 14 }, children: [_jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: coachRoleOptions.map((role) => {
                                                    const selected = coachRoles.includes(role);
                                                    return (_jsx("button", { type: "button", onClick: () => toggleCoachRole(role), style: {
                                                            ...rolePillStyle,
                                                            ...(selected ? activeRolePillStyle : {}),
                                                            borderColor: selected ? 'rgba(216,253,241,0.26)' : 'rgba(255,255,255,0.07)'
                                                        }, children: locale === 'en' ? translateRole(role, 'en') : getRoleLabel(role) }, role));
                                                }) }), _jsxs("div", { className: "three-col-grid", style: { display: 'grid', gridTemplateColumns: '1.2fr repeat(2, minmax(0, 1fr))', gap: 12 }, children: [_jsxs("div", { style: scopeMetaCardStyle, children: [_jsx("div", { style: heroMetaLabelStyle, children: locale === 'en' ? 'Current scope' : 'Alcance actual' }), _jsx("div", { style: { ...heroMetaValueStyle, fontSize: 20 }, children: coachScopeLabel }), _jsx("div", { style: heroMetaSubtleStyle, children: coachRoles.length === 2
                                                                    ? (locale === 'en' ? 'Maximum scope selected' : 'Máximo de alcance seleccionado')
                                                                    : locale === 'en'
                                                                        ? 'You can add one more role'
                                                                        : 'Podés sumar un rol más' })] }), _jsxs("div", { style: scopeMetaCardStyle, children: [_jsx("div", { style: heroMetaLabelStyle, children: locale === 'en' ? 'Token policy' : 'Política de tokens' }), _jsx("div", { style: { ...heroMetaValueStyle, fontSize: 20 }, children: locale === 'en' ? 'Manual refresh' : 'Refresh manual' }), _jsx("div", { style: heroMetaSubtleStyle, children: locale === 'en' ? 'Changing this scope does not regenerate coaching until you refresh.' : 'Cambiar este alcance no regenera coaching hasta que vos actualices.' })] }), _jsxs("div", { style: scopeMetaCardStyle, children: [_jsx("div", { style: heroMetaLabelStyle, children: locale === 'en' ? 'Current queue read' : 'Lectura de colas' }), _jsx("div", { style: { ...heroMetaValueStyle, fontSize: 20 }, children: formatQueueSummary(dataset, locale) }), _jsx("div", { style: heroMetaSubtleStyle, children: locale === 'en' ? 'Saved ranked context' : 'Contexto ranked guardado' })] })] }), coachScopeDirty ? (_jsx("div", { style: scopeStatusStyle, children: locale === 'en'
                                                    ? `The coaching scope changed to ${coachScopeLabel}. Refresh the coaching block when you want this role selection to become the new main read.`
                                                    : `El alcance del coaching cambió a ${coachScopeLabel}. Actualizá el bloque cuando quieras que esta selección de roles pase a ser la lectura principal.` })) : null] }) })] })), _jsx(Card, { title: showAccountControls ? (locale === 'en' ? 'Load Riot account' : 'Cargar cuenta de Riot') : (locale === 'en' ? 'Active account' : 'Cuenta activa'), subtitle: showAccountControls
                                ? (locale === 'en' ? 'Enter the Riot ID you want to analyze and choose the depth of the first sample.' : 'Ingresá el Riot ID que querés analizar y elegí la profundidad de la primera muestra.')
                                : (locale === 'en' ? 'Your account is ready. Refresh only what is missing or switch profiles whenever you want.' : 'Tu cuenta ya está lista. Refrescá solo lo que falta o cambiá de perfil cuando quieras.'), children: showAccountControls || !dataset ? (_jsxs("form", { onSubmit: handleSubmit, style: { display: 'grid', gap: 16 }, children: [_jsxs("div", { className: "three-col-grid", style: { display: 'grid', gridTemplateColumns: '1.15fr .85fr .7fr', gap: 12, alignItems: 'end' }, children: [_jsxs("label", { style: fieldBlockStyle, children: [_jsx("span", { style: fieldLabelStyle, children: locale === 'en' ? 'Game name' : 'Nombre en juego' }), _jsx("input", { value: gameName, onChange: (e) => setGameName(e.target.value), placeholder: locale === 'en' ? 'For example, Faker' : 'Por ejemplo, Don Sosa', style: inputStyle })] }), _jsxs("label", { style: fieldBlockStyle, children: [_jsx("span", { style: fieldLabelStyle, children: locale === 'en' ? 'Tag' : 'Tag' }), _jsxs("div", { style: tagInputShellStyle, children: [_jsx("span", { style: tagPrefixStyle, children: "#" }), _jsx("input", { value: tagLine, onChange: (e) => setTagLine(normalizeTagLineInput(e.target.value)), placeholder: locale === 'en' ? 'KR1' : 'LAS', style: tagInputStyle })] })] }), _jsxs("label", { style: fieldBlockStyle, children: [_jsx("span", { style: fieldLabelStyle, children: locale === 'en' ? 'First sample' : 'Primera muestra' }), _jsx("select", { value: matchCount, onChange: (e) => setMatchCount(Number(e.target.value)), style: selectStyle, children: initialMatchOptions.map((count) => (_jsxs("option", { value: count, children: [count, " ", locale === 'en' ? 'matches' : 'partidas'] }, count))) })] })] }), _jsxs("div", { style: softPanelStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsx("div", { style: { color: '#eef4ff', fontWeight: 700 }, children: locale === 'en' ? 'Recommended start' : 'Inicio recomendado' }), _jsx("div", { style: { color: '#8f9bad', fontSize: 13, lineHeight: 1.6 }, children: matchCount >= 100
                                                            ? (locale === 'en' ? 'A 100-match baseline gives the sharpest first read, but it can take longer because of Riot rate limits.' : 'Una base de 100 partidas da la lectura inicial más filosa, pero puede tardar más por los límites de Riot.')
                                                            : (locale === 'en' ? 'Start with 20 or 50 if you want speed. Move to 100 when you want the most stable baseline.' : 'Empezá con 20 o 50 si querés velocidad. Pasá a 100 cuando quieras la base más estable.') })] }), !dataset && gameName && tagLine ? (_jsx("div", { style: { color: '#a5b2c6', fontSize: 13, lineHeight: 1.6 }, children: locale === 'en'
                                                    ? 'Once this account is loaded, it will stay saved here and future refreshes will only complete what is missing.'
                                                    : 'Una vez que cargues esta cuenta, va a quedar guardada acá y los próximos refreshes solo completarán lo que falte.' })) : null] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }, children: [_jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { tone: "default", children: locale === 'en' ? `${matchCount} match target` : `Objetivo de ${matchCount} partidas` }), _jsx(Badge, { tone: "low", children: locale === 'en' ? 'Coaching scope is chosen after loading the account' : 'El alcance del coaching se elige después de cargar la cuenta' })] }), _jsx("button", { type: "submit", style: buttonStyle, children: loading ? (locale === 'en' ? 'Analyzing...' : 'Analizando...') : (locale === 'en' ? 'Build first analysis' : 'Construir primer análisis') })] })] })) : (_jsxs("div", { style: { display: 'grid', gap: 14 }, children: [_jsxs("div", { style: softPanelStyle, children: [_jsx("div", { style: { color: '#e7eef8', lineHeight: 1.5, fontWeight: 700 }, children: gameName && tagLine ? `${gameName}#${tagLine}` : (locale === 'en' ? 'Account ready to analyze' : 'Cuenta lista para analizar') }), _jsx("div", { style: { color: '#8a95a8', fontSize: 13, lineHeight: 1.6 }, children: locale === 'en'
                                                    ? `Saved sample: ${dataset.matches.length} matches. Choose whether you want to add a little, a lot or complete the block.`
                                                    : `Muestra guardada: ${dataset.matches.length} partidas. Elegí si querés sumar un poco, bastante o completar el bloque.` })] }), syncMessage ? _jsx("div", { style: syncMessageStyle, children: syncMessage }) : null, _jsx("div", { style: { display: 'grid', gap: 10 }, children: quickRefreshActions.length ? (_jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsx("div", { style: fieldLabelStyle, children: locale === 'en' ? 'Quick refresh' : 'Refresh rápido' }), _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: quickRefreshActions.map((action) => (_jsx("button", { type: "button", style: secondaryButtonStyle, onClick: () => void runAnalysis(action.target), disabled: loading, children: action.id === 'complete'
                                                            ? (locale === 'en' ? 'Complete to 100' : 'Completar a 100')
                                                            : `${action.label} ${locale === 'en' ? 'match' : 'partida'}${action.label === '+1' ? '' : 's'}` }, action.id))) })] })) : null }), _jsxs("div", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 12 }, children: [_jsxs("div", { style: { display: 'grid', gap: 6 }, children: [_jsx("div", { style: fieldLabelStyle, children: locale === 'en' ? 'Target block' : 'Bloque objetivo' }), _jsx("select", { value: matchCount, onChange: (e) => setMatchCount(Number(e.target.value)), style: selectStyle, children: targetCountOptions.map((count) => (_jsxs("option", { value: count, children: [count, " ", locale === 'en' ? 'matches' : 'partidas'] }, count))) })] }), _jsxs("div", { style: { display: 'grid', gap: 6 }, children: [_jsx("div", { style: fieldLabelStyle, children: locale === 'en' ? 'Coaching scope' : 'Alcance del coaching' }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { tone: "default", children: coachScopeLabel }), dataset?.remakesExcluded ? _jsx(Badge, { tone: "medium", children: locale === 'en' ? `${dataset.remakesExcluded} remakes excluded` : `${dataset.remakesExcluded} remakes excluidos` }) : null, needsSampleBackfill ? _jsx(Badge, { tone: "medium", children: locale === 'en' ? 'Needs backfill' : 'Le falta backfill' }) : _jsx(Badge, { tone: "low", children: locale === 'en' ? 'Only new matches' : 'Solo nuevas partidas' })] })] })] }), _jsxs("div", { style: { display: 'flex', gap: 10, flexWrap: 'wrap' }, children: [_jsx("button", { type: "button", style: buttonStyle, onClick: () => void runAnalysis(), children: loading
                                                    ? (locale === 'en' ? 'Analyzing...' : 'Analizando...')
                                                    : needsSampleBackfill
                                                        ? (locale === 'en' ? `Backfill to ${matchCount} matches` : `Completar a ${matchCount} partidas`)
                                                        : (locale === 'en' ? 'Check for new matches' : 'Buscar nuevas partidas') }), _jsx("button", { type: "button", style: secondaryButtonStyle, onClick: () => setShowAccountControls(true), children: locale === 'en' ? 'Switch account' : 'Cambiar cuenta' })] })] })) })] }), savedProfiles.length ? (_jsxs("section", { style: savedProfilesSectionStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 3 }, children: [_jsx("div", { style: { color: '#8da0ba', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: locale === 'en' ? 'Saved profiles' : 'Perfiles guardados' }), _jsx("div", { style: { color: '#eef4ff', fontSize: 16, fontWeight: 800 }, children: locale === 'en' ? 'Jump back into accounts you already analyzed' : 'Volvé rápido a cuentas que ya analizaste' })] }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }, children: savedProfiles.map((profile) => {
                                const isActive = `${profile.gameName}#${profile.tagLine}`.toLowerCase() === `${gameName}#${tagLine}`.toLowerCase();
                                return (_jsxs("button", { type: "button", onClick: () => loadSavedProfile(profile), style: {
                                        ...savedProfileCardStyle,
                                        ...(isActive ? activeSavedProfileCardStyle : {})
                                    }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' }, children: [_jsxs("div", { style: { display: 'grid', gap: 4, textAlign: 'left' }, children: [_jsxs("div", { style: { color: '#edf2ff', fontWeight: 800 }, children: [profile.gameName, _jsxs("span", { style: { color: '#8592a8' }, children: ["#", profile.tagLine] })] }), _jsx("div", { style: { color: '#8390a6', fontSize: 12 }, children: profile.rankLabel ?? (locale === 'en' ? 'No visible rank' : 'Sin rango visible') })] }), _jsx(Badge, { tone: isActive ? 'low' : 'default', children: locale === 'en' ? `${profile.matches} matches` : `${profile.matches} partidas` })] }), _jsxs("div", { style: { color: '#748198', fontSize: 12, textAlign: 'left' }, children: [locale === 'en' ? 'Last update' : 'Última actualización', " ", new Date(profile.lastSyncedAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-AR')] })] }, `${profile.gameName}#${profile.tagLine}`));
                            }) })] })) : null, _jsxs("section", { style: { display: 'grid', gap: 12 }, children: [viewDataset && activeTab !== 'coach' ? (_jsxs("div", { style: roleFilterPanelStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 3 }, children: [_jsx("div", { style: { color: '#8da0ba', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: locale === 'en' ? 'Exploration filters' : 'Filtros de exploración' }), _jsx("div", { style: { color: '#eef4ff', fontSize: 16, fontWeight: 800 }, children: locale === 'en' ? 'Open the exact slice you want to inspect' : 'Abrí el recorte exacto que querés inspeccionar' }), _jsx("div", { style: { color: '#8793a8', fontSize: 13 }, children: locale === 'en' ? 'These filters only affect stats, matchups, runes, champions and match review. They no longer trigger a new AI coaching block.' : 'Estos filtros afectan solo métricas, cruces, runas, campeones y review de partidas. Ya no disparan un bloque nuevo de coaching IA.' })] }), _jsx("div", { className: "role-pill-grid", style: rolePillGridStyle, children: preferredRoles.map((role) => (_jsx("button", { type: "button", onClick: () => setRoleFilter(role), style: {
                                            ...rolePillStyle,
                                            ...(roleFilter === role ? activeRolePillStyle : {})
                                        }, children: locale === 'en' ? translateRole(role, 'en') : getRoleLabel(role) }, role))) }), _jsxs("div", { className: "three-col-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }, children: [_jsxs("div", { style: contextGroupStyle, children: [_jsx("div", { style: contextLabelStyle, children: locale === 'en' ? 'Queue type' : 'Tipo de cola' }), _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: availableQueueFilters.map((queue) => (_jsx("button", { type: "button", onClick: () => setQueueFilter(queue), style: {
                                                            ...contextChipStyle,
                                                            ...(queueFilter === queue ? activeContextChipStyle : {})
                                                        }, children: queue === 'ALL'
                                                            ? (locale === 'en' ? 'All' : 'Todas')
                                                            : queue === 'RANKED'
                                                                ? (locale === 'en' ? 'Ranked' : 'Rankeds')
                                                                : queue === 'RANKED_SOLO'
                                                                    ? 'Solo/Duo'
                                                                    : queue === 'RANKED_FLEX'
                                                                        ? 'Flex'
                                                                        : (locale === 'en' ? 'Other' : 'Otras') }, queue))) })] }), _jsxs("div", { style: contextGroupStyle, children: [_jsx("div", { style: contextLabelStyle, children: locale === 'en' ? 'Window' : 'Ventana' }), _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [
                                                        { id: 'ALL', label: locale === 'en' ? 'All' : 'Todo' },
                                                        { id: 'LAST_20', label: locale === 'en' ? 'Last 20' : 'Últimas 20' },
                                                        { id: 'LAST_8', label: locale === 'en' ? 'Last 8' : 'Últimas 8' }
                                                    ].map((windowOption) => (_jsx("button", { type: "button", onClick: () => setWindowFilter(windowOption.id), style: {
                                                            ...contextChipStyle,
                                                            ...(windowFilter === windowOption.id ? activeContextChipStyle : {})
                                                        }, children: windowOption.label }, windowOption.id))) })] }), _jsxs("div", { style: contextGroupStyle, children: [_jsx("div", { style: contextLabelStyle, children: locale === 'en' ? 'Current slice' : 'Recorte actual' }), _jsx("div", { style: { color: '#dce7f9', fontSize: 13, lineHeight: 1.5 }, children: locale === 'en'
                                                        ? `${translateRole(roleFilter, 'en')} · ${queueFilter === 'ALL' ? 'all queues' : queueFilter === 'RANKED' ? 'ranked queues' : queueFilter === 'RANKED_SOLO' ? 'solo/duo' : queueFilter === 'RANKED_FLEX' ? 'flex' : 'other queues'}`
                                                        : `${getRoleLabel(roleFilter)} · ${queueFilter === 'ALL' ? 'todas las colas' : queueFilter === 'RANKED' ? 'rankeds' : queueFilter === 'RANKED_SOLO' ? 'solo/duo' : queueFilter === 'RANKED_FLEX' ? 'flex' : 'otras colas'}` }), _jsx("div", { style: { color: '#8390a6', fontSize: 12 }, children: locale === 'en'
                                                        ? (windowFilter === 'ALL' ? `${viewDataset.summary.matches} matches in sample` : `${viewDataset.summary.matches} recent matches`)
                                                        : (windowFilter === 'ALL' ? `${viewDataset.summary.matches} partidas en muestra` : `${viewDataset.summary.matches} partidas recientes`) })] })] })] })) : null, _jsxs("div", { style: navigationPanelStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 3 }, children: [_jsx("div", { style: { color: '#8da0ba', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: locale === 'en' ? 'Product navigation' : 'Navegación del producto' }), _jsx("div", { style: { color: '#eef4ff', fontSize: 15, fontWeight: 800 }, children: locale === 'en' ? 'One coaching read, several exploration layers' : 'Una lectura de coaching, varias capas de exploración' })] }), _jsx("div", { className: "tab-grid", style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: tabs.map((tab) => (_jsx("button", { onClick: () => setActiveTab(tab.id), style: {
                                            ...tabStyle,
                                            ...(activeTab === tab.id ? activeTabStyle : {})
                                        }, children: tab.label[locale] }, tab.id))) }), viewDataset ? (_jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: activeTab === 'coach' ? (_jsxs(_Fragment, { children: [_jsx(Badge, { children: locale === 'en' ? `${dataset?.summary.matches ?? 0} matches in the saved coaching block` : `${dataset?.summary.matches ?? 0} partidas en el bloque guardado de coaching` }), _jsx(Badge, { children: coachScopeLabel }), _jsx(Badge, { tone: "low", children: locale === 'en' ? 'Filters do not spend AI here' : 'Acá los filtros no gastan IA' })] })) : (_jsxs(_Fragment, { children: [_jsx(Badge, { children: locale === 'en' ? `${viewDataset.summary.matches} visible matches` : `${viewDataset.summary.matches} partidas visibles` }), viewDataset.matches[0] ? _jsx(Badge, { children: getQueueLabel(viewDataset.matches[0].queueId) }) : null, _jsx(Badge, { tone: "default", children: locale === 'en' ? translateRole(roleFilter, 'en') : getRoleLabel(roleFilter) })] })) })) : null] })] }), error ? _jsx(Card, { title: locale === 'en' ? 'Error' : 'Error', children: error }) : null, viewDataset ? (renderedTab) : (_jsx(Card, { title: locale === 'en' ? 'Waiting for analysis' : 'Esperando análisis', subtitle: locale === 'en' ? 'The goal is for the product to feel more like a premium personal account than a technical dashboard' : 'La idea es que el producto se sienta más cuenta personal premium que panel técnico', children: _jsx("div", { style: { display: 'grid', gap: 12, color: '#c7d4ea', lineHeight: 1.7 }, children: locale === 'en' ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("strong", { children: "Coach:" }), " main blocker, evidence, impact and active plan."] }), _jsxs("div", { children: [_jsx("strong", { children: "Stats:" }), " aggregated metrics and recent evolution."] }), _jsxs("div", { children: [_jsx("strong", { children: "Matchups:" }), " real performance into direct opponents."] }), _jsxs("div", { children: [_jsx("strong", { children: "Runes and champions:" }), " tactical read with more visual context."] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("strong", { children: "Coach:" }), " problema principal, evidencia, impacto y plan activo."] }), _jsxs("div", { children: [_jsx("strong", { children: "Stats:" }), " m\u00E9tricas agregadas y evoluci\u00F3n."] }), _jsxs("div", { children: [_jsx("strong", { children: "Matchups:" }), " rendimiento real frente a rivales directos."] }), _jsxs("div", { children: [_jsx("strong", { children: "Runes y champions:" }), " lectura t\u00E1ctica con m\u00E1s contexto visual."] })] })) }) })), _jsxs("footer", { style: footerStyle, children: [_jsx("div", { style: { color: '#7f8ca1', fontSize: 13 }, children: locale === 'en'
                                ? 'Don Sosa Coach private beta for competitive coaching and review in League of Legends.'
                                : 'Don Sosa Coach beta privada de coaching y análisis competitivo para League of Legends.' }), _jsxs("div", { style: { display: 'flex', gap: 14, flexWrap: 'wrap' }, children: [_jsx("a", { href: "/privacy.html", target: "_blank", rel: "noreferrer", style: footerLinkStyle, children: locale === 'en' ? 'Privacy Policy' : 'Política de privacidad' }), _jsx("a", { href: "/terms.html", target: "_blank", rel: "noreferrer", style: footerLinkStyle, children: locale === 'en' ? 'Terms of Service' : 'Términos del servicio' })] })] })] }) }));
}
const topBarStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 16,
    alignItems: 'center',
    flexWrap: 'wrap',
    padding: '4px 2px 0'
};
const accountAccessStyle = {
    display: 'flex',
    gap: 14,
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    borderRadius: 18,
    background: 'linear-gradient(180deg, rgba(14,18,28,0.94), rgba(8,11,18,0.98))',
    border: '1px solid rgba(255,255,255,0.07)',
    width: 'min(100%, 560px)',
    boxShadow: '0 16px 40px rgba(0,0,0,0.14)'
};
const topBarGhostButtonStyle = {
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '10px 12px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.02)',
    color: '#8996aa',
    fontWeight: 700,
    cursor: 'not-allowed'
};
const topBarPrimaryButtonStyle = {
    border: '1px solid rgba(216,253,241,0.18)',
    padding: '10px 12px',
    borderRadius: 12,
    background: 'rgba(216,253,241,0.08)',
    color: '#d7f9ea',
    fontWeight: 800,
    cursor: 'not-allowed'
};
const heroGridStyle = {
    display: 'grid',
    gridTemplateColumns: '1.18fr .82fr',
    gap: 20,
    alignItems: 'start'
};
const heroIntroPanelStyle = {
    display: 'grid',
    gap: 12,
    padding: 28,
    borderRadius: 28,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'radial-gradient(circle at top left, rgba(79, 56, 146, 0.34), transparent 42%), linear-gradient(180deg, rgba(17,20,31,0.96), rgba(7,10,16,0.98))',
    boxShadow: '0 28px 80px rgba(0,0,0,0.22)'
};
const accountCardStyle = {
    display: 'grid',
    gap: 14,
    padding: '20px 22px',
    borderRadius: 20,
    background: 'linear-gradient(180deg, rgba(16,20,30,0.98), rgba(8,11,18,0.98))',
    border: '1px solid rgba(255,255,255,0.07)'
};
const profileIconStyle = {
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.08)'
};
const inputStyle = {
    width: '100%',
    padding: '13px 14px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(7,11,18,0.92)',
    color: '#edf2ff',
    boxShadow: '0 0 0 1px rgba(255,255,255,0.02) inset'
};
const selectStyle = {
    width: '100%',
    padding: '13px 14px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(7,11,18,0.92)',
    color: '#edf2ff',
    boxShadow: '0 0 0 1px rgba(255,255,255,0.02) inset'
};
const buttonStyle = {
    border: '1px solid rgba(216,253,241,0.12)',
    padding: '12px 18px',
    borderRadius: 14,
    background: 'linear-gradient(180deg, #d8fdf1, #b8f4df)',
    color: '#07111f',
    fontWeight: 800,
    cursor: 'pointer',
    boxShadow: '0 10px 28px rgba(87, 209, 162, 0.18)'
};
const secondaryButtonStyle = {
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '12px 18px',
    borderRadius: 14,
    background: '#0a0f18',
    color: '#e8eef9',
    fontWeight: 700,
    cursor: 'pointer'
};
const tabStyle = {
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '10px 14px',
    borderRadius: 999,
    background: '#070b12',
    color: '#d7e3f5',
    cursor: 'pointer',
    textAlign: 'center'
};
const activeTabStyle = {
    background: 'linear-gradient(180deg, rgba(49,55,86,0.95), rgba(16,23,35,1))',
    borderColor: 'rgba(216,253,241,0.2)',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: 8
};
const rolePillStyle = {
    padding: '12px 12px',
    borderRadius: 14,
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
    padding: '12px 14px',
    borderRadius: 14,
    background: 'rgba(216,253,241,0.08)',
    border: '1px solid rgba(216,253,241,0.14)',
    color: '#dff7eb',
    fontSize: 13,
    lineHeight: 1.5
};
const navigationPanelStyle = {
    display: 'grid',
    gap: 12,
    padding: '16px 18px',
    borderRadius: 18,
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
    borderRadius: 16,
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
function RankBadge({ rank, compact = false, locale = 'es' }) {
    const emblem = getRankEmblemDataUrl(rank.highest.tier);
    const palette = getRankPalette(rank.highest.tier);
    const lpProgress = Math.max(0, Math.min(rank.highest.leaguePoints, 100));
    const title = `${locale === 'en' ? 'Solo/Duo' : 'Solo/Duo'}: ${rank.soloQueue.label} · ${rank.soloQueue.leaguePoints} LP · ${rank.soloQueue.winRate}% WR\nFlex: ${rank.flexQueue.label} · ${rank.flexQueue.leaguePoints} LP · ${rank.flexQueue.winRate}% WR`;
    return (_jsxs("div", { title: title, style: {
            display: 'grid',
            gap: compact ? 6 : 8,
            minWidth: compact ? 220 : 250,
            padding: compact ? '10px 12px' : '12px 14px',
            borderRadius: 14,
            background: compact ? 'rgba(9, 14, 22, 0.86)' : 'linear-gradient(180deg, rgba(10,14,22,0.96), rgba(19,24,37,0.92))',
            border: `1px solid ${palette.primary}33`
        }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 10 }, children: [_jsx("img", { src: emblem, alt: rank.highest.label, width: compact ? 52 : 68, height: compact ? 52 : 68, style: { display: 'block', objectFit: 'contain', filter: `drop-shadow(0 10px 24px ${palette.primary}22)` } }), _jsxs("div", { style: { display: 'grid', gap: 2 }, children: [_jsx("div", { style: { color: '#8d97aa', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: rank.highest.queueLabel ?? (locale === 'en' ? 'Ranked' : 'Ranked') }), _jsxs("div", { style: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }, children: [_jsx("span", { style: { fontSize: compact ? 13 : 15, fontWeight: 800, color: '#edf2ff' }, children: rank.highest.label }), _jsx("span", { style: { color: palette.glow, fontSize: 12, fontWeight: 700 }, children: `${rank.highest.leaguePoints} LP` })] })] })] }), _jsxs("div", { style: { display: 'grid', gap: 5 }, children: [_jsx("div", { style: { height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }, children: _jsx("div", { style: { width: `${lpProgress}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${palette.primary}, ${palette.glow})` } }) }), !compact ? (_jsx("div", { style: { color: '#7e889b', fontSize: 11 }, children: locale === 'en' ? 'Hover to view Solo/Duo and Flex' : 'Hover para ver Solo/Duo y Flex' })) : null] })] }));
}
function TrendSparkline({ matches, locale = 'es' }) {
    const sorted = [...matches].sort((a, b) => a.gameCreation - b.gameCreation).slice(-12);
    const values = sorted.map((match) => match.score.total);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 100);
    const points = values.map((value, index) => {
        const x = values.length === 1 ? 0 : (index / Math.max(values.length - 1, 1)) * 100;
        const y = 100 - (((value - min) / Math.max(max - min, 1)) * 100);
        return `${x},${y}`;
    }).join(' ');
    return (_jsxs("div", { style: sparklineCardStyle, children: [_jsx("div", { style: { color: '#7d889c', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: locale === 'en' ? 'Latest matches' : 'Últimas partidas' }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12 }, children: [_jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsx("div", { style: { fontSize: 18, fontWeight: 800 }, children: locale === 'en' ? 'Recent performance' : 'Performance reciente' }), _jsx("div", { style: { color: '#8895aa', fontSize: 12 }, children: locale === 'en' ? 'Sparkline from the last 12 valid matches' : 'Sparkline de las últimas 12 partidas válidas' })] }), _jsx("div", { style: { color: '#dff7eb', fontSize: 12, fontWeight: 700 }, children: values.length ? (locale === 'en' ? `${Math.round(values.at(-1) ?? 0)} latest score` : `${Math.round(values.at(-1) ?? 0)} último score`) : (locale === 'en' ? 'No data' : 'Sin datos') })] }), _jsxs("svg", { viewBox: "0 0 100 100", preserveAspectRatio: "none", style: { width: '100%', height: 84, display: 'block' }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "spark-fill", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "rgba(216,253,241,0.34)" }), _jsx("stop", { offset: "100%", stopColor: "rgba(216,253,241,0)" })] }) }), _jsx("polyline", { fill: "none", stroke: "rgba(216,253,241,0.95)", strokeWidth: "3", points: points })] })] }));
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
const scopeMetaCardStyle = {
    ...heroMetaChipStyle,
    gap: 6,
    minHeight: 92,
    alignContent: 'start'
};
const scopeStatusStyle = {
    padding: '12px 14px',
    borderRadius: 16,
    border: '1px solid rgba(216,253,241,0.12)',
    background: 'rgba(14, 35, 29, 0.6)',
    color: '#d9f8eb',
    lineHeight: 1.6
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
const fieldBlockStyle = {
    display: 'grid',
    gap: 7
};
const fieldLabelStyle = {
    color: '#8da0ba',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
};
const tagInputShellStyle = {
    display: 'grid',
    gridTemplateColumns: '36px minmax(0, 1fr)',
    alignItems: 'center',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'rgba(7,11,18,0.92)',
    boxShadow: '0 0 0 1px rgba(255,255,255,0.02) inset'
};
const tagPrefixStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#7f8ca1',
    fontWeight: 800,
    fontSize: 13,
    borderRight: '1px solid rgba(255,255,255,0.06)',
    height: '100%'
};
const tagInputStyle = {
    width: '100%',
    padding: '13px 14px',
    borderRadius: 14,
    border: 0,
    outline: 'none',
    background: 'transparent',
    color: '#edf2ff'
};
const softPanelStyle = {
    display: 'grid',
    gap: 8,
    padding: '14px 15px',
    borderRadius: 16,
    background: 'rgba(9,14,22,0.85)',
    border: '1px solid rgba(255,255,255,0.05)'
};
