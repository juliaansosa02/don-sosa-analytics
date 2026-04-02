import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { buildAggregateSummary } from '@don-sosa/core';
import { useEffect, useMemo, useState } from 'react';
import { addCoachPlayer, changePassword, collectProfile, createBillingPortalSession, createCheckoutSession, fetchAdminUsers, fetchAuthMe, fetchCachedProfile, fetchCoachPlayers, fetchMembershipCatalog, generateAICoach, login, logout, removeCoachPlayer, requestPasswordReset, resetPassword, sendAICoachFeedback, setMembershipPlanDev, signup, startAdminImpersonation, stopAdminImpersonation, updateAdminUserPlan, updateAdminUserRole } from '../lib/api';
import { Shell, Card, Badge } from '../components/ui';
import { CoachingHome } from '../features/coach/CoachingHome';
import { StatsTab } from '../features/stats/StatsTab';
import { MatchupsTab } from '../features/matchups/MatchupsTab';
import { RunesTab } from '../features/runes/RunesTab';
import { ChampionPoolTab } from '../features/champion-pool/ChampionPoolTab';
import { MatchesTab } from '../features/matches/MatchesTab';
import { detectLocale, translateRole } from '../lib/i18n';
import { buildProfileIdentityKey, getProfileIconUrl, getQueueBucket, getQueueLabel, getRankEmblemDataUrl, getRankPalette, getRiotPlatformInfo, getRoleLabel, guessDefaultRiotPlatform, supportedRiotPlatforms } from '../lib/lol';
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
const initialMatchOptions = [20, 30, 50, 100];
function legacyDatasetStorageKey(gameName, tagLine) {
    return `don-sosa:dataset:${gameName}#${tagLine}`.toLowerCase();
}
function datasetStorageKey(gameName, tagLine, platform) {
    return `don-sosa:dataset:${buildProfileIdentityKey(gameName, tagLine, platform)}`.toLowerCase();
}
function legacyCoachScopeStorageKey(gameName, tagLine) {
    return `don-sosa:coach-scope:${gameName}#${tagLine}`.toLowerCase();
}
function coachScopeStorageKey(gameName, tagLine, platform) {
    return `don-sosa:coach-scope:${buildProfileIdentityKey(gameName, tagLine, platform)}`.toLowerCase();
}
function lastProfileIdentityKey(gameName, tagLine, platform) {
    return buildProfileIdentityKey(gameName, tagLine, platform).toLowerCase();
}
function readCachedDataset(gameName, tagLine, platform) {
    const keys = [
        datasetStorageKey(gameName, tagLine, platform),
        legacyDatasetStorageKey(gameName, tagLine)
    ];
    for (const key of keys) {
        const raw = window.localStorage.getItem(key);
        if (!raw)
            continue;
        try {
            return JSON.parse(raw);
        }
        catch {
            window.localStorage.removeItem(key);
        }
    }
    return null;
}
function removeCachedDataset(gameName, tagLine, platform) {
    window.localStorage.removeItem(datasetStorageKey(gameName, tagLine, platform));
    window.localStorage.removeItem(legacyDatasetStorageKey(gameName, tagLine));
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
function limitDatasetMatches(dataset, maxMatches, locale) {
    if (dataset.matches.length <= maxMatches)
        return dataset;
    const limitedMatches = [...dataset.matches].sort((a, b) => b.gameCreation - a.gameCreation).slice(0, maxMatches);
    return {
        ...dataset,
        matches: limitedMatches,
        summary: buildAggregateSummary(dataset.player, dataset.tagLine, dataset.summary.region, dataset.summary.platform, limitedMatches, locale)
    };
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
function filterMatchesByRoles(dataset, roles) {
    if (!roles.length)
        return dataset.matches;
    const normalizedRoles = roles.map((role) => role.trim().toUpperCase()).filter(Boolean);
    return dataset.matches.filter((match) => normalizedRoles.includes((match.role || 'NONE').toUpperCase()));
}
function buildTargetOptions(currentMatches, maxMatchesPerProfile) {
    const baseOptions = initialMatchOptions.filter((option) => option <= maxMatchesPerProfile);
    const premiumOptions = [150, 250, 500, 1000].filter((option) => option <= maxMatchesPerProfile);
    const optionSeed = [...baseOptions, ...premiumOptions, maxMatchesPerProfile];
    if (!currentMatches)
        return Array.from(new Set(optionSeed)).sort((a, b) => a - b);
    const options = new Set([currentMatches, maxMatchesPerProfile]);
    [1, 5, 10].forEach((delta) => {
        const next = Math.min(maxMatchesPerProfile, currentMatches + delta);
        if (next > currentMatches)
            options.add(next);
    });
    for (const option of optionSeed) {
        if (option >= currentMatches) {
            options.add(option);
        }
    }
    return Array.from(options).sort((a, b) => a - b);
}
function buildQuickRefreshActions(currentMatches, maxMatchesPerProfile) {
    if (!currentMatches || currentMatches >= maxMatchesPerProfile)
        return [];
    const candidates = [
        { id: 'plus-1', target: Math.min(maxMatchesPerProfile, currentMatches + 1), label: '+1' },
        { id: 'plus-5', target: Math.min(maxMatchesPerProfile, currentMatches + 5), label: '+5' },
        { id: 'plus-10', target: Math.min(maxMatchesPerProfile, currentMatches + 10), label: '+10' },
        { id: 'complete', target: maxMatchesPerProfile, label: String(maxMatchesPerProfile) }
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
function extractRankTierFromLabel(rankLabel) {
    if (!rankLabel)
        return undefined;
    return rankLabel.split(' ')[0]?.toUpperCase();
}
export default function App() {
    const [locale] = useState(() => detectLocale());
    const [platform, setPlatform] = useState(() => guessDefaultRiotPlatform(detectLocale()));
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
    const [membershipCatalog, setMembershipCatalog] = useState(null);
    const [membership, setMembership] = useState(null);
    const [membershipLoading, setMembershipLoading] = useState(true);
    const [membershipError, setMembershipError] = useState(null);
    const [membershipActionLoading, setMembershipActionLoading] = useState(false);
    const [authMe, setAuthMe] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [authError, setAuthError] = useState(null);
    const [authActionLoading, setAuthActionLoading] = useState(false);
    const [authMode, setAuthMode] = useState('login');
    const [authEmail, setAuthEmail] = useState('');
    const [authPassword, setAuthPassword] = useState('');
    const [authDisplayName, setAuthDisplayName] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [resetTokenPreview, setResetTokenPreview] = useState(null);
    const [adminUsers, setAdminUsers] = useState([]);
    const [adminLoading, setAdminLoading] = useState(false);
    const [coachRoster, setCoachRoster] = useState([]);
    const [coachRosterLoading, setCoachRosterLoading] = useState(false);
    const [coachPlayerEmail, setCoachPlayerEmail] = useState('');
    const [coachPlayerNote, setCoachPlayerNote] = useState('');
    const currentPlan = membership?.plan ?? null;
    const planEntitlements = currentPlan?.entitlements ?? null;
    const authUser = authMe?.user ?? null;
    const actorUser = authMe?.actorUser ?? null;
    const billingReady = membershipCatalog?.billing.ready ?? false;
    const currentPlanPriceLabel = currentPlan
        ? currentPlan.monthlyUsd === 0
            ? (locale === 'en' ? 'Free' : 'Gratis')
            : (locale === 'en' ? `US$${currentPlan.monthlyUsd}/month` : `US$${currentPlan.monthlyUsd}/mes`)
        : null;
    const canOpenBillingPortal = Boolean(membership?.account.stripeCustomerId && billingReady);
    const canManageCoachRoster = Boolean(actorUser && (actorUser.role === 'coach' || actorUser.role === 'admin'));
    const isAdmin = actorUser?.role === 'admin';
    async function refreshIdentity() {
        setMembershipLoading(true);
        setAuthLoading(true);
        setMembershipError(null);
        setAuthError(null);
        try {
            const [catalog, me] = await Promise.all([
                fetchMembershipCatalog(),
                fetchAuthMe()
            ]);
            setMembershipCatalog(catalog);
            setAuthMe(me);
            setMembership(me.membership);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setMembershipError(message);
            setAuthError(message);
        }
        finally {
            setMembershipLoading(false);
            setAuthLoading(false);
        }
    }
    async function handleDevPlanChange(planId) {
        setMembershipActionLoading(true);
        setMembershipError(null);
        try {
            await setMembershipPlanDev(planId);
            await refreshIdentity();
        }
        catch (err) {
            setMembershipError(err instanceof Error ? err.message : 'Unknown error');
        }
        finally {
            setMembershipActionLoading(false);
        }
    }
    async function handleAuthSubmit(event) {
        event.preventDefault();
        setAuthActionLoading(true);
        setAuthError(null);
        try {
            if (authMode === 'signup') {
                await signup({
                    email: authEmail,
                    password: authPassword,
                    displayName: authDisplayName,
                    locale
                });
            }
            else if (authMode === 'login') {
                await login({
                    email: authEmail,
                    password: authPassword
                });
            }
            else {
                const result = await requestPasswordReset({ email: authEmail });
                setResetTokenPreview(result.devResetToken);
                setSyncMessage(locale === 'en'
                    ? 'If the account exists, we generated a reset flow. In dev, the reset token appears below.'
                    : 'Si la cuenta existe, generamos el flujo de recuperación. En dev, el token aparece abajo.');
            }
            if (authMode !== 'reset') {
                setAuthPassword('');
                setNewPassword('');
                setResetToken('');
                await refreshIdentity();
            }
        }
        catch (err) {
            setAuthError(err instanceof Error ? err.message : 'Unknown error');
        }
        finally {
            setAuthActionLoading(false);
        }
    }
    async function handleResetPasswordConfirm(event) {
        event.preventDefault();
        setAuthActionLoading(true);
        setAuthError(null);
        try {
            await resetPassword({
                token: resetToken,
                newPassword
            });
            setSyncMessage(locale === 'en' ? 'Password updated. You can log in now.' : 'Contraseña actualizada. Ya podés iniciar sesión.');
            setAuthMode('login');
            setResetToken('');
            setNewPassword('');
            setResetTokenPreview(null);
        }
        catch (err) {
            setAuthError(err instanceof Error ? err.message : 'Unknown error');
        }
        finally {
            setAuthActionLoading(false);
        }
    }
    async function handleLogout() {
        setAuthActionLoading(true);
        setAuthError(null);
        try {
            await logout();
            await refreshIdentity();
            setSyncMessage(locale === 'en' ? 'Session closed.' : 'Sesión cerrada.');
        }
        catch (err) {
            setAuthError(err instanceof Error ? err.message : 'Unknown error');
        }
        finally {
            setAuthActionLoading(false);
        }
    }
    async function handlePasswordChange(event) {
        event.preventDefault();
        setAuthActionLoading(true);
        setAuthError(null);
        try {
            await changePassword({
                currentPassword: authPassword,
                newPassword
            });
            setAuthPassword('');
            setNewPassword('');
            setSyncMessage(locale === 'en' ? 'Password changed.' : 'Contraseña actualizada.');
        }
        catch (err) {
            setAuthError(err instanceof Error ? err.message : 'Unknown error');
        }
        finally {
            setAuthActionLoading(false);
        }
    }
    async function handleCheckout(planId) {
        setMembershipActionLoading(true);
        setMembershipError(null);
        try {
            const result = await createCheckoutSession(planId);
            window.location.href = result.session.url;
        }
        catch (err) {
            setMembershipError(err instanceof Error ? err.message : 'Unknown error');
        }
        finally {
            setMembershipActionLoading(false);
        }
    }
    async function handleBillingPortal() {
        setMembershipActionLoading(true);
        setMembershipError(null);
        try {
            const result = await createBillingPortalSession();
            window.location.href = result.session.url;
        }
        catch (err) {
            setMembershipError(err instanceof Error ? err.message : 'Unknown error');
        }
        finally {
            setMembershipActionLoading(false);
        }
    }
    async function refreshAdminUsers() {
        if (actorUser?.role !== 'admin') {
            setAdminUsers([]);
            return;
        }
        setAdminLoading(true);
        try {
            const response = await fetchAdminUsers();
            setAdminUsers(response.users);
        }
        catch (err) {
            setAuthError(err instanceof Error ? err.message : 'Unknown error');
        }
        finally {
            setAdminLoading(false);
        }
    }
    async function refreshCoachRoster() {
        if (!(actorUser?.role === 'coach' || actorUser?.role === 'admin')) {
            setCoachRoster([]);
            return;
        }
        setCoachRosterLoading(true);
        try {
            const response = await fetchCoachPlayers();
            setCoachRoster(response.players);
        }
        catch (err) {
            setAuthError(err instanceof Error ? err.message : 'Unknown error');
        }
        finally {
            setCoachRosterLoading(false);
        }
    }
    useEffect(() => {
        if (!actorUser) {
            setAdminUsers([]);
            setCoachRoster([]);
            return;
        }
        if (actorUser.role === 'admin') {
            void refreshAdminUsers();
            void refreshCoachRoster();
            return;
        }
        if (actorUser.role === 'coach') {
            void refreshCoachRoster();
            return;
        }
        setAdminUsers([]);
        setCoachRoster([]);
    }, [actorUser?.id, actorUser?.role]);
    async function hydrateFromServer(gameNameValue, tagLineValue, platformValue) {
        try {
            const serverDataset = await fetchCachedProfile(gameNameValue, tagLineValue, platformValue, locale);
            if (!serverDataset)
                return false;
            setDataset(serverDataset);
            setPlatform(serverDataset.summary.platform ?? platformValue);
            setShowAccountControls(false);
            window.localStorage.setItem(datasetStorageKey(gameNameValue, tagLineValue, serverDataset.summary.platform), JSON.stringify(serverDataset));
            window.localStorage.setItem('don-sosa:last-profile', JSON.stringify({
                gameName: gameNameValue,
                tagLine: tagLineValue,
                platform: serverDataset.summary.platform,
                matchCount
            }));
            persistSavedProfile(serverDataset, matchCount);
            setSyncMessage(locale === 'en'
                ? 'We recovered a saved version from the server so you do not have to start from zero on this device.'
                : 'Recuperamos una versión guardada en el servidor para que no arranques de cero en este dispositivo.');
            void refreshIdentity();
            return true;
        }
        catch {
            return false;
        }
    }
    useEffect(() => {
        void refreshIdentity();
    }, []);
    useEffect(() => {
        const rawProfiles = window.localStorage.getItem(savedProfilesStorageKey);
        if (rawProfiles) {
            try {
                const parsedProfiles = JSON.parse(rawProfiles);
                const normalizedProfiles = parsedProfiles.map((profile) => {
                    if (profile.platform)
                        return profile;
                    const cachedDataset = readCachedDataset(profile.gameName, profile.tagLine);
                    return {
                        ...profile,
                        platform: cachedDataset?.summary.platform
                    };
                });
                setSavedProfiles(normalizedProfiles);
                window.localStorage.setItem(savedProfilesStorageKey, JSON.stringify(normalizedProfiles));
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
            if (parsed.platform && supportedRiotPlatforms.includes(parsed.platform)) {
                setPlatform(parsed.platform);
            }
            if (parsed.matchCount)
                setMatchCount(parsed.matchCount);
            if (parsed.gameName && parsed.tagLine) {
                const savedDataset = readCachedDataset(parsed.gameName, parsed.tagLine, parsed.platform);
                if (savedDataset) {
                    try {
                        setDataset(savedDataset);
                        setPlatform(savedDataset.summary.platform ?? guessDefaultRiotPlatform(locale));
                        setShowAccountControls(false);
                    }
                    catch {
                        removeCachedDataset(parsed.gameName, parsed.tagLine, parsed.platform);
                        setShowAccountControls(true);
                    }
                }
                else {
                    setShowAccountControls(true);
                    void hydrateFromServer(parsed.gameName, parsed.tagLine, parsed.platform ?? guessDefaultRiotPlatform(locale));
                }
            }
        }
        catch {
            window.localStorage.removeItem('don-sosa:last-profile');
        }
    }, [locale]);
    useEffect(() => {
        if (!planEntitlements)
            return;
        if (savedProfiles.length <= planEntitlements.maxStoredProfiles)
            return;
        const trimmed = savedProfiles.slice(0, planEntitlements.maxStoredProfiles);
        setSavedProfiles(trimmed);
        window.localStorage.setItem(savedProfilesStorageKey, JSON.stringify(trimmed));
    }, [savedProfiles, planEntitlements]);
    useEffect(() => {
        if (!dataset || !planEntitlements)
            return;
        if (dataset.matches.length <= planEntitlements.maxStoredMatchesPerProfile)
            return;
        const limited = limitDatasetMatches(dataset, planEntitlements.maxStoredMatchesPerProfile, locale);
        setDataset(limited);
        window.localStorage.setItem(datasetStorageKey(limited.player, limited.tagLine, limited.summary.platform), JSON.stringify(limited));
        persistSavedProfile(limited, Math.min(matchCount, planEntitlements.maxStoredMatchesPerProfile));
    }, [dataset, planEntitlements, locale, matchCount]);
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
    const coachScopeSummary = useMemo(() => {
        if (!dataset)
            return null;
        const scopedMatches = filterMatchesByRoles(dataset, coachRoles);
        if (!scopedMatches.length)
            return dataset.summary;
        return buildAggregateSummary(dataset.player, dataset.tagLine, dataset.summary.region, dataset.summary.platform, scopedMatches, locale);
    }, [dataset, coachRoles, locale]);
    useEffect(() => {
        if (!planEntitlements)
            return;
        if (matchCount > planEntitlements.maxStoredMatchesPerProfile) {
            setMatchCount(planEntitlements.maxStoredMatchesPerProfile);
        }
    }, [matchCount, planEntitlements]);
    useEffect(() => {
        if (!planEntitlements)
            return;
        if (coachRoles.length <= planEntitlements.maxCoachRoles)
            return;
        setCoachRoles((current) => current.slice(0, planEntitlements.maxCoachRoles));
    }, [coachRoles, planEntitlements]);
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
        if (!coachDataset || !gameName || !tagLine || !coachScopeKey || !platform)
            return null;
        return [
            gameName.trim().toLowerCase(),
            tagLine.trim().toLowerCase(),
            platform.trim().toLowerCase(),
            locale,
            coachScopeKey,
            coachDataset.summary.matches,
            coachDataset.matches[0]?.matchId ?? 'no-latest-match'
        ].join('|');
    }, [coachDataset, gameName, tagLine, platform, locale, coachScopeKey]);
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
    const targetCountOptions = useMemo(() => buildTargetOptions(dataset?.matches.length ?? null, planEntitlements?.maxStoredMatchesPerProfile ?? 100), [dataset?.matches.length, planEntitlements?.maxStoredMatchesPerProfile]);
    const quickRefreshActions = useMemo(() => buildQuickRefreshActions(dataset?.matches.length ?? null, planEntitlements?.maxStoredMatchesPerProfile ?? 100), [dataset?.matches.length, planEntitlements?.maxStoredMatchesPerProfile]);
    const profileIconUrl = useMemo(() => getProfileIconUrl(dataset?.profile?.profileIconId, dataset?.ddragonVersion), [dataset?.profile?.profileIconId, dataset?.ddragonVersion]);
    const currentPlatformInfo = useMemo(() => getRiotPlatformInfo(dataset?.summary.platform ?? platform), [dataset?.summary.platform, platform]);
    const searchPreviewLabel = useMemo(() => {
        const trimmedGameName = gameName.trim() || (locale === 'en' ? 'GameName' : 'Nombre');
        const trimmedTag = tagLine.trim() || (locale === 'en' ? 'TAG' : 'TAG');
        const info = getRiotPlatformInfo(platform);
        return `${trimmedGameName}#${trimmedTag}${info ? ` · ${info.platform}` : ''}`;
    }, [gameName, tagLine, platform, locale]);
    useEffect(() => {
        if (!dataset || !gameName || !tagLine || !platform) {
            setCoachRoles([]);
            setLastGeneratedCoachScopeKey(null);
            return;
        }
        const defaultRoles = buildDefaultCoachRoles(dataset);
        try {
            const raw = window.localStorage.getItem(coachScopeStorageKey(gameName, tagLine, platform))
                ?? window.localStorage.getItem(legacyCoachScopeStorageKey(gameName, tagLine));
            if (!raw) {
                setCoachRoles(defaultRoles);
                setLastGeneratedCoachScopeKey(null);
                return;
            }
            const parsed = JSON.parse(raw);
            const nextRoles = parsed
                .map((role) => role.trim().toUpperCase())
                .filter((role) => coachRoleOptions.includes(role))
                .slice(0, planEntitlements?.maxCoachRoles ?? 2);
            setCoachRoles(nextRoles.length ? nextRoles : defaultRoles);
            setLastGeneratedCoachScopeKey(null);
        }
        catch {
            setCoachRoles(defaultRoles);
            setLastGeneratedCoachScopeKey(null);
        }
    }, [dataset, gameName, tagLine, platform, coachRoleOptions, planEntitlements?.maxCoachRoles]);
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
    }, [gameName, tagLine, platform, locale, dataset?.summary.matches]);
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
            platform: nextDataset.summary.platform,
            matchCount: nextMatchCount,
            lastSyncedAt: Date.now(),
            matches: nextDataset.summary.matches,
            profileIconId: nextDataset.profile?.profileIconId,
            ddragonVersion: nextDataset.ddragonVersion,
            rankLabel: nextDataset.rank?.highest.label
        };
        const nextProfiles = [
            nextRecord,
            ...savedProfiles.filter((profile) => buildProfileIdentityKey(profile.gameName, profile.tagLine, profile.platform) !== buildProfileIdentityKey(nextRecord.gameName, nextRecord.tagLine, nextRecord.platform))
        ].slice(0, planEntitlements?.maxStoredProfiles ?? 8);
        setSavedProfiles(nextProfiles);
        window.localStorage.setItem(savedProfilesStorageKey, JSON.stringify(nextProfiles));
    }
    function loadSavedProfile(profile) {
        setGameName(profile.gameName);
        setTagLine(profile.tagLine);
        setPlatform(profile.platform ?? guessDefaultRiotPlatform(locale));
        setMatchCount(profile.matchCount);
        setError(null);
        setSyncMessage(null);
        const cachedDataset = readCachedDataset(profile.gameName, profile.tagLine, profile.platform);
        if (cachedDataset) {
            try {
                setDataset(cachedDataset);
                setPlatform(cachedDataset.summary.platform ?? profile.platform ?? guessDefaultRiotPlatform(locale));
                setShowAccountControls(false);
                window.localStorage.setItem('don-sosa:last-profile', JSON.stringify({
                    gameName: profile.gameName,
                    tagLine: profile.tagLine,
                    platform: profile.platform,
                    matchCount: profile.matchCount
                }));
                return;
            }
            catch {
                removeCachedDataset(profile.gameName, profile.tagLine, profile.platform);
            }
        }
        setDataset(null);
        setShowAccountControls(true);
        void hydrateFromServer(profile.gameName, profile.tagLine, profile.platform ?? guessDefaultRiotPlatform(locale));
    }
    async function runAnalysis(requestedCount = matchCount) {
        const cappedRequestedCount = Math.min(requestedCount, planEntitlements?.maxStoredMatchesPerProfile ?? requestedCount);
        setLoading(true);
        setError(null);
        setSyncMessage(null);
        setProgress({ stage: 'queued', current: 0, total: 1, message: locale === 'en' ? 'Preparing analysis' : 'Preparando análisis' });
        try {
            const previousDataset = readCachedDataset(gameName, tagLine, platform);
            const shouldRefreshFullSample = !previousDataset || previousDataset.matches.length < cappedRequestedCount;
            const result = await collectProfile(gameName, tagLine, cappedRequestedCount, {
                platform,
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
            setMatchCount(cappedRequestedCount);
            setPlatform(mergedDataset.summary.platform ?? platform);
            window.localStorage.setItem('don-sosa:last-profile', JSON.stringify({ gameName, tagLine, platform: mergedDataset.summary.platform, matchCount: cappedRequestedCount }));
            window.localStorage.setItem(datasetStorageKey(gameName, tagLine, mergedDataset.summary.platform), JSON.stringify(mergedDataset));
            persistSavedProfile(mergedDataset, cappedRequestedCount);
            await refreshIdentity();
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
        const maxCoachRoles = planEntitlements?.maxCoachRoles ?? 2;
        setCoachRoles((current) => {
            const next = current.includes(normalizedRole)
                ? current.filter((item) => item !== normalizedRole)
                : [...current, normalizedRole].slice(0, maxCoachRoles);
            if (gameName && tagLine && platform) {
                window.localStorage.setItem(coachScopeStorageKey(gameName, tagLine, platform), JSON.stringify(next));
            }
            return next;
        });
    }
    async function handleGenerateAICoach(force = false) {
        if (!gameName || !tagLine || !platform || !coachRequestKey)
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
                platform,
                locale,
                roleFilter: coachScopeKey,
                coachRoles,
                queueFilter: 'ALL',
                windowFilter: 'ALL'
            });
            setAICoach(result);
            setLastGeneratedCoachScopeKey(coachScopeKey);
            window.localStorage.setItem(coachScopeStorageKey(gameName, tagLine, platform), JSON.stringify(coachRoles));
            await refreshIdentity();
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
    return (_jsx(Shell, { children: _jsxs("div", { style: { display: 'grid', gap: 18, maxWidth: 1440, margin: '0 auto' }, children: [_jsxs("section", { style: topBarStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsx("div", { style: { color: '#eef4ff', fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em' }, children: "Don Sosa Coach" }), _jsx("div", { style: { color: '#8b96aa', fontSize: 13 }, children: locale === 'en' ? 'Premium coaching, review and progression tracking for League of Legends.' : 'Coaching premium, revisión y seguimiento de progreso para League of Legends.' })] }), _jsx("div", { style: accountAccessStyle, children: authUser ? (_jsxs("div", { style: { display: 'grid', gap: 12, width: '100%' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start', flexWrap: 'wrap' }, children: [_jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsx("div", { style: { color: '#dfe8f6', fontSize: 13, fontWeight: 700 }, children: locale === 'en' ? 'Signed in account' : 'Cuenta iniciada' }), _jsx("div", { style: { color: '#eef4ff', fontSize: 18, fontWeight: 800 }, children: authUser.displayName }), _jsx("div", { style: { color: '#8190a6', fontSize: 12 }, children: authUser.email })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }, children: [_jsx(Badge, { tone: "default", children: currentPlan?.name ?? (locale === 'en' ? 'Loading plan' : 'Cargando plan') }), actorUser ? _jsx(Badge, { tone: "low", children: actorUser.role.toUpperCase() }) : null, authMe?.isImpersonating ? _jsx(Badge, { tone: "medium", children: locale === 'en' ? 'Impersonating' : 'Suplantando' }) : null, membership?.overrideReason === 'admin_full_access' ? _jsx(Badge, { tone: "medium", children: locale === 'en' ? 'Admin full access' : 'Admin full access' }) : null] })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }, children: [currentPlanPriceLabel ? _jsx(Badge, { tone: "default", children: currentPlanPriceLabel }) : null, membership ? _jsx(Badge, { tone: "low", children: locale === 'en' ? `${membership.linkedProfiles.length}/${membership.plan.entitlements.maxStoredProfiles} profiles` : `${membership.linkedProfiles.length}/${membership.plan.entitlements.maxStoredProfiles} perfiles` }) : null, membership ? _jsx(Badge, { tone: "low", children: locale === 'en' ? `${membership.usage.openaiGenerations}/${membership.plan.entitlements.maxAICoachRunsPerMonth} AI runs` : `${membership.usage.openaiGenerations}/${membership.plan.entitlements.maxAICoachRunsPerMonth} corridas IA` }) : null, membership ? _jsx(Badge, { tone: "default", children: membership.account.status }) : null] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [canOpenBillingPortal ? (_jsx("button", { type: "button", style: secondaryButtonStyle, disabled: membershipActionLoading, onClick: () => void handleBillingPortal(), children: membershipActionLoading ? (locale === 'en' ? 'Opening...' : 'Abriendo...') : (locale === 'en' ? 'Manage billing' : 'Gestionar billing') })) : null, authMe?.isImpersonating ? (_jsx("button", { type: "button", style: secondaryButtonStyle, disabled: authActionLoading, onClick: async () => {
                                                    setAuthActionLoading(true);
                                                    setAuthError(null);
                                                    try {
                                                        await stopAdminImpersonation();
                                                        await refreshIdentity();
                                                    }
                                                    catch (err) {
                                                        setAuthError(err instanceof Error ? err.message : 'Unknown error');
                                                    }
                                                    finally {
                                                        setAuthActionLoading(false);
                                                    }
                                                }, children: locale === 'en' ? 'Stop impersonation' : 'Salir de la suplantación' })) : null, _jsx("button", { type: "button", style: secondaryButtonStyle, disabled: authActionLoading, onClick: () => void handleLogout(), children: authActionLoading ? (locale === 'en' ? 'Closing...' : 'Cerrando...') : (locale === 'en' ? 'Log out' : 'Cerrar sesión') })] })] })) : (_jsxs("div", { style: { display: 'grid', gap: 12, width: '100%' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start', flexWrap: 'wrap' }, children: [_jsxs("div", { style: { display: 'grid', gap: 3 }, children: [_jsx("div", { style: { color: '#dfe8f6', fontSize: 13, fontWeight: 700 }, children: locale === 'en' ? 'Account and membership' : 'Cuenta y membresía' }), _jsx("div", { style: { color: '#8190a6', fontSize: 12, maxWidth: 280 }, children: locale === 'en'
                                                            ? 'Create your account to persist coaching, plans and future billing.'
                                                            : 'Creá tu cuenta para persistir coaching, planes y billing futuro.' })] }), _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: ['login', 'signup', 'reset'].map((mode) => (_jsx("button", { type: "button", onClick: () => setAuthMode(mode), style: {
                                                        ...smallActionButtonStyle,
                                                        ...(authMode === mode ? activeSmallActionButtonStyle : {})
                                                    }, children: mode === 'login'
                                                        ? (locale === 'en' ? 'Login' : 'Ingresar')
                                                        : mode === 'signup'
                                                            ? (locale === 'en' ? 'Create account' : 'Crear cuenta')
                                                            : (locale === 'en' ? 'Reset password' : 'Recuperar') }, mode))) })] }), _jsxs("form", { onSubmit: handleAuthSubmit, style: { display: 'grid', gap: 10 }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: authMode === 'signup' ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))', gap: 10 }, children: [authMode === 'signup' ? (_jsxs("label", { style: { ...fieldBlockStyle, minWidth: 0 }, children: [_jsx("span", { style: fieldLabelStyle, children: locale === 'en' ? 'Display name' : 'Nombre visible' }), _jsx("input", { value: authDisplayName, onChange: (e) => setAuthDisplayName(e.target.value), style: inputStyle, placeholder: locale === 'en' ? 'For example, Don Sosa' : 'Por ejemplo, Don Sosa' })] })) : null, _jsxs("label", { style: { ...fieldBlockStyle, minWidth: 0 }, children: [_jsx("span", { style: fieldLabelStyle, children: "Email" }), _jsx("input", { type: "email", value: authEmail, onChange: (e) => setAuthEmail(e.target.value), style: inputStyle, placeholder: "vos@email.com" })] }), authMode !== 'reset' ? (_jsxs("label", { style: { ...fieldBlockStyle, minWidth: 0 }, children: [_jsx("span", { style: fieldLabelStyle, children: locale === 'en' ? 'Password' : 'Contraseña' }), _jsx("input", { type: "password", value: authPassword, onChange: (e) => setAuthPassword(e.target.value), style: inputStyle, placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" })] })) : null] }), _jsxs("div", { style: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsx("button", { type: "submit", style: buttonStyle, disabled: authActionLoading, children: authActionLoading
                                                            ? (locale === 'en' ? 'Processing...' : 'Procesando...')
                                                            : authMode === 'login'
                                                                ? (locale === 'en' ? 'Log in' : 'Iniciar sesión')
                                                                : authMode === 'signup'
                                                                    ? (locale === 'en' ? 'Create account' : 'Crear cuenta')
                                                                    : (locale === 'en' ? 'Send recovery' : 'Enviar recuperación') }), currentPlan ? _jsx(Badge, { tone: "default", children: currentPlan.name }) : null, membership ? _jsx(Badge, { tone: "low", children: locale === 'en' ? `${membership.linkedProfiles.length} temporary profiles` : `${membership.linkedProfiles.length} perfiles temporales` }) : null] })] }), authMode === 'reset' ? (_jsxs("form", { onSubmit: handleResetPasswordConfirm, style: { display: 'grid', gap: 10, paddingTop: 2 }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }, children: [_jsxs("label", { style: { ...fieldBlockStyle, minWidth: 0 }, children: [_jsx("span", { style: fieldLabelStyle, children: locale === 'en' ? 'Reset token' : 'Token de recuperación' }), _jsx("input", { value: resetToken, onChange: (e) => setResetToken(e.target.value), style: inputStyle, placeholder: locale === 'en' ? 'Paste the token here' : 'Pegá el token acá' })] }), _jsxs("label", { style: { ...fieldBlockStyle, minWidth: 0 }, children: [_jsx("span", { style: fieldLabelStyle, children: locale === 'en' ? 'New password' : 'Nueva contraseña' }), _jsx("input", { type: "password", value: newPassword, onChange: (e) => setNewPassword(e.target.value), style: inputStyle, placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022" })] })] }), _jsxs("div", { style: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsx("button", { type: "submit", style: secondaryButtonStyle, disabled: authActionLoading, children: authActionLoading ? (locale === 'en' ? 'Saving...' : 'Guardando...') : (locale === 'en' ? 'Apply new password' : 'Aplicar nueva contraseña') }), resetTokenPreview ? _jsx(Badge, { tone: "medium", children: locale === 'en' ? `Dev token: ${resetTokenPreview}` : `Token dev: ${resetTokenPreview}` }) : null] })] })) : null] })) })] }), membershipCatalog?.plans?.length ? (_jsxs("section", { style: planSectionStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsx("div", { style: { color: '#8da0ba', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: locale === 'en' ? 'Memberships' : 'Membresías' }), _jsx("div", { style: { color: '#eef4ff', fontSize: 16, fontWeight: 800 }, children: locale === 'en' ? 'Limits, upgrades and entitlement model' : 'Límites, upgrades y modelo de entitlements' }), membership ? (_jsx("div", { style: { color: '#8793a8', fontSize: 13, lineHeight: 1.6 }, children: locale === 'en'
                                        ? `Current status: ${membership.account.status}. Effective plan: ${membership.plan.name}${membership.actualPlan && membership.actualPlan.id !== membership.plan.id ? ` · actual subscription: ${membership.actualPlan.name}` : ''}.`
                                        : `Estado actual: ${membership.account.status}. Plan efectivo: ${membership.plan.name}${membership.actualPlan && membership.actualPlan.id !== membership.plan.id ? ` · suscripción real: ${membership.actualPlan.name}` : ''}.` })) : null] }), _jsx("div", { style: planCardsGridStyle, children: membershipCatalog.plans.map((plan) => {
                                const isCurrent = membership?.plan.id === plan.id;
                                const isActualSubscription = membership?.actualPlan?.id === plan.id;
                                return (_jsxs("div", { style: { ...planCardStyle, ...(isCurrent ? activePlanCardStyle : {}) }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' }, children: [_jsxs("div", { style: { display: 'grid', gap: 5 }, children: [_jsx("div", { style: { color: '#eef4ff', fontWeight: 800, fontSize: 16 }, children: plan.name }), _jsx("div", { style: { color: '#8a97ab', fontSize: 13, lineHeight: 1.5 }, children: plan.description })] }), _jsx(Badge, { tone: isCurrent ? 'low' : 'default', children: isCurrent ? (locale === 'en' ? 'Current' : 'Actual') : plan.badge })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { tone: "low", children: plan.monthlyUsd === 0 ? (locale === 'en' ? 'Free' : 'Gratis') : (locale === 'en' ? `US$${plan.monthlyUsd}/month` : `US$${plan.monthlyUsd}/mes`) }), _jsx(Badge, { tone: "default", children: `${plan.entitlements.maxStoredMatchesPerProfile} ${locale === 'en' ? 'matches/profile' : 'partidas/perfil'}` }), _jsx(Badge, { tone: "default", children: `${plan.entitlements.maxStoredProfiles} ${locale === 'en' ? 'profiles' : 'perfiles'}` })] }), _jsx("div", { style: { display: 'grid', gap: 6 }, children: plan.featureHighlights.slice(0, 4).map((feature) => (_jsxs("div", { style: { color: '#d5dfef', fontSize: 13, lineHeight: 1.5 }, children: ["\u2022 ", feature] }, feature))) }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }, children: [isCurrent ? (_jsx("button", { type: "button", style: topBarPrimaryButtonStyle, disabled: true, children: locale === 'en' ? 'Current effective plan' : 'Plan efectivo actual' })) : plan.id !== 'free' && authUser && billingReady ? (_jsx("button", { type: "button", style: buttonStyle, disabled: membershipActionLoading, onClick: () => void handleCheckout(plan.id), children: membershipActionLoading
                                                        ? (locale === 'en' ? 'Opening Stripe...' : 'Abriendo Stripe...')
                                                        : locale === 'en'
                                                            ? `Upgrade to ${plan.name}`
                                                            : `Mejorar a ${plan.name}` })) : (_jsx("button", { type: "button", style: secondaryButtonStyle, disabled: !membership?.devToolsEnabled || membershipActionLoading || isCurrent, onClick: () => void handleDevPlanChange(plan.id), children: membership?.devToolsEnabled
                                                        ? (locale === 'en' ? 'Activate in dev' : 'Activar en dev')
                                                        : authUser
                                                            ? (billingReady ? (locale === 'en' ? 'Unavailable' : 'No disponible') : (locale === 'en' ? 'Billing pending' : 'Billing pendiente'))
                                                            : (locale === 'en' ? 'Login to upgrade' : 'Iniciá sesión para mejorar') })), isActualSubscription && membership?.overrideReason === 'admin_full_access' ? (_jsx(Badge, { tone: "medium", children: locale === 'en' ? 'Underlying subscription' : 'Suscripción real' })) : null] })] }, plan.id));
                            }) }), membershipError ? _jsx("div", { style: softPanelStyle, children: membershipError }) : null] })) : null, authError ? (_jsx("section", { style: planSectionStyle, children: _jsx("div", { style: softPanelStyle, children: authError }) })) : null, authUser ? (_jsxs("section", { style: planSectionStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsx("div", { style: { color: '#8da0ba', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: locale === 'en' ? 'Account center' : 'Centro de cuenta' }), _jsx("div", { style: { color: '#eef4ff', fontSize: 16, fontWeight: 800 }, children: locale === 'en' ? 'Identity, plan and billing actions' : 'Identidad, plan y acciones de billing' })] }), _jsxs("div", { className: "three-col-grid", style: { display: 'grid', gridTemplateColumns: '1.1fr repeat(2, minmax(0, 1fr))', gap: 12 }, children: [_jsxs("div", { style: softPanelStyle, children: [_jsx("div", { style: { color: '#eef4ff', fontWeight: 700 }, children: authUser.displayName }), _jsx("div", { style: { color: '#8f9bad', fontSize: 13 }, children: authUser.email }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { tone: "default", children: actorUser?.role.toUpperCase() ?? 'USER' }), _jsx(Badge, { tone: "low", children: currentPlan?.name ?? 'Free' }), membership?.overrideReason === 'admin_full_access' ? _jsx(Badge, { tone: "medium", children: locale === 'en' ? 'Full admin access' : 'Acceso admin completo' }) : null] })] }), _jsxs("div", { style: softPanelStyle, children: [_jsx("div", { style: { color: '#eef4ff', fontWeight: 700 }, children: locale === 'en' ? 'Billing status' : 'Estado de billing' }), _jsx("div", { style: { color: '#8f9bad', fontSize: 13, lineHeight: 1.6 }, children: membership
                                                ? (locale === 'en'
                                                    ? `${membership.account.status} · ${membership.plan.entitlements.maxStoredProfiles} profiles · ${membership.plan.entitlements.maxStoredMatchesPerProfile} matches per profile`
                                                    : `${membership.account.status} · ${membership.plan.entitlements.maxStoredProfiles} perfiles · ${membership.plan.entitlements.maxStoredMatchesPerProfile} partidas por perfil`)
                                                : (locale === 'en' ? 'Loading membership...' : 'Cargando membresía...') }), _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: canOpenBillingPortal ? (_jsx("button", { type: "button", style: secondaryButtonStyle, disabled: membershipActionLoading, onClick: () => void handleBillingPortal(), children: locale === 'en' ? 'Open billing portal' : 'Abrir portal de billing' })) : (_jsx(Badge, { tone: "default", children: billingReady ? (locale === 'en' ? 'Stripe ready' : 'Stripe listo') : (locale === 'en' ? 'Stripe pending' : 'Stripe pendiente') })) })] }), _jsxs("form", { onSubmit: handlePasswordChange, style: softPanelStyle, children: [_jsx("div", { style: { color: '#eef4ff', fontWeight: 700 }, children: locale === 'en' ? 'Password' : 'Contraseña' }), _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsx("input", { type: "password", value: authPassword, onChange: (e) => setAuthPassword(e.target.value), style: inputStyle, placeholder: locale === 'en' ? 'Current password' : 'Contraseña actual' }), _jsx("input", { type: "password", value: newPassword, onChange: (e) => setNewPassword(e.target.value), style: inputStyle, placeholder: locale === 'en' ? 'New password' : 'Nueva contraseña' })] }), _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: _jsx("button", { type: "submit", style: secondaryButtonStyle, disabled: authActionLoading, children: authActionLoading ? (locale === 'en' ? 'Saving...' : 'Guardando...') : (locale === 'en' ? 'Change password' : 'Cambiar contraseña') }) })] })] })] })) : null, canManageCoachRoster ? (_jsxs("section", { style: planSectionStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsx("div", { style: { color: '#8da0ba', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: locale === 'en' ? 'Coach workspace' : 'Workspace de coach' }), _jsx("div", { style: { color: '#eef4ff', fontSize: 16, fontWeight: 800 }, children: locale === 'en' ? 'Roster, player linking and future staff workflows' : 'Roster, vínculo de jugadores y futuros workflows de staff' })] }), _jsxs("div", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: '0.95fr 1.05fr', gap: 12 }, children: [_jsxs("form", { onSubmit: async (event) => {
                                        event.preventDefault();
                                        if (!coachPlayerEmail.trim())
                                            return;
                                        setCoachRosterLoading(true);
                                        setAuthError(null);
                                        try {
                                            await addCoachPlayer({ playerEmail: coachPlayerEmail.trim(), note: coachPlayerNote.trim() || undefined });
                                            setCoachPlayerEmail('');
                                            setCoachPlayerNote('');
                                            await refreshCoachRoster();
                                        }
                                        catch (err) {
                                            setAuthError(err instanceof Error ? err.message : 'Unknown error');
                                        }
                                        finally {
                                            setCoachRosterLoading(false);
                                        }
                                    }, style: softPanelStyle, children: [_jsx("div", { style: { color: '#eef4ff', fontWeight: 700 }, children: locale === 'en' ? 'Add player by account email' : 'Agregar jugador por email de cuenta' }), _jsx("div", { style: { color: '#8f9bad', fontSize: 13, lineHeight: 1.6 }, children: locale === 'en'
                                                ? 'The coach-player relation is stored independently from Riot profiles so you can manage people, not only accounts.'
                                                : 'La relación coach-jugador se guarda separada de los perfiles de Riot para que puedas gestionar personas, no solo cuentas.' }), _jsx("input", { type: "email", value: coachPlayerEmail, onChange: (e) => setCoachPlayerEmail(e.target.value), style: inputStyle, placeholder: "player@email.com" }), _jsx("textarea", { value: coachPlayerNote, onChange: (e) => setCoachPlayerNote(e.target.value), style: { ...inputStyle, minHeight: 94, resize: 'vertical' }, placeholder: locale === 'en' ? 'Optional note about this player' : 'Nota opcional sobre este jugador' }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsx("button", { type: "submit", style: buttonStyle, disabled: coachRosterLoading, children: coachRosterLoading ? (locale === 'en' ? 'Saving...' : 'Guardando...') : (locale === 'en' ? 'Link player' : 'Vincular jugador') }), membership ? _jsx(Badge, { tone: "low", children: `${coachRoster.length}/${membership.plan.entitlements.maxManagedPlayers}` }) : null] })] }), _jsxs("div", { style: { ...softPanelStyle, alignContent: 'start' }, children: [_jsx("div", { style: { color: '#eef4ff', fontWeight: 700 }, children: locale === 'en' ? 'Current roster' : 'Roster actual' }), coachRosterLoading ? _jsx("div", { style: { color: '#8f9bad', fontSize: 13 }, children: locale === 'en' ? 'Loading roster...' : 'Cargando roster...' }) : null, !coachRosterLoading && !coachRoster.length ? (_jsx("div", { style: { color: '#8f9bad', fontSize: 13, lineHeight: 1.6 }, children: locale === 'en' ? 'No linked players yet. This base is ready for the coach desk.' : 'Todavía no hay jugadores vinculados. Esta base ya está lista para el coach desk.' })) : null, _jsx("div", { style: { display: 'grid', gap: 10 }, children: coachRoster.map((entry) => (_jsxs("div", { style: adminRowStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsx("div", { style: { color: '#eef4ff', fontWeight: 700 }, children: entry.user.displayName }), _jsx("div", { style: { color: '#8f9bad', fontSize: 12 }, children: entry.user.email }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { tone: "default", children: entry.user.role.toUpperCase() }), _jsx(Badge, { tone: "low", children: new Date(entry.linkedAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-AR') })] }), entry.note ? _jsx("div", { style: { color: '#a8b4c8', fontSize: 12, lineHeight: 1.5 }, children: entry.note }) : null] }), _jsx("button", { type: "button", style: secondaryButtonStyle, onClick: async () => {
                                                            setCoachRosterLoading(true);
                                                            setAuthError(null);
                                                            try {
                                                                await removeCoachPlayer(entry.user.id);
                                                                await refreshCoachRoster();
                                                            }
                                                            catch (err) {
                                                                setAuthError(err instanceof Error ? err.message : 'Unknown error');
                                                            }
                                                            finally {
                                                                setCoachRosterLoading(false);
                                                            }
                                                        }, children: locale === 'en' ? 'Remove' : 'Quitar' })] }, entry.assignmentId))) })] })] })] })) : null, isAdmin ? (_jsxs("section", { style: planSectionStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsx("div", { style: { color: '#8da0ba', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: locale === 'en' ? 'Admin area' : 'Área admin' }), _jsx("div", { style: { color: '#eef4ff', fontSize: 16, fontWeight: 800 }, children: locale === 'en' ? 'Users, plans, usage and impersonation' : 'Usuarios, planes, uso y suplantación' })] }), _jsxs("div", { style: { display: 'grid', gap: 10 }, children: [adminLoading ? _jsx("div", { style: softPanelStyle, children: locale === 'en' ? 'Loading users...' : 'Cargando usuarios...' }) : null, !adminLoading && !adminUsers.length ? _jsx("div", { style: softPanelStyle, children: locale === 'en' ? 'No users available yet.' : 'Todavía no hay usuarios disponibles.' }) : null, adminUsers.map((entry) => (_jsxs("div", { style: adminUserCardStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsx("div", { style: { color: '#eef4ff', fontWeight: 800 }, children: entry.user.displayName }), _jsx("div", { style: { color: '#8f9bad', fontSize: 12 }, children: entry.user.email }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { tone: "default", children: entry.user.role.toUpperCase() }), _jsx(Badge, { tone: "low", children: entry.membership.plan.name }), _jsx(Badge, { tone: "low", children: locale === 'en' ? `${entry.usage.openaiGenerations} AI` : `${entry.usage.openaiGenerations} IA` }), _jsx(Badge, { tone: "default", children: entry.membership.account.status })] })] }), _jsxs("div", { style: { display: 'grid', gap: 8, justifyItems: 'end' }, children: [_jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }, children: [_jsxs("select", { defaultValue: entry.user.role, style: selectStyle, onChange: async (event) => {
                                                                setAuthActionLoading(true);
                                                                setAuthError(null);
                                                                try {
                                                                    await updateAdminUserRole(entry.user.id, event.target.value);
                                                                    await refreshAdminUsers();
                                                                    await refreshIdentity();
                                                                }
                                                                catch (err) {
                                                                    setAuthError(err instanceof Error ? err.message : 'Unknown error');
                                                                }
                                                                finally {
                                                                    setAuthActionLoading(false);
                                                                }
                                                            }, children: [_jsx("option", { value: "user", children: "user" }), _jsx("option", { value: "coach", children: "coach" }), _jsx("option", { value: "admin", children: "admin" })] }), _jsx("select", { defaultValue: entry.membership.actualPlan?.id ?? entry.membership.plan.id, style: selectStyle, onChange: async (event) => {
                                                                setMembershipActionLoading(true);
                                                                setAuthError(null);
                                                                try {
                                                                    await updateAdminUserPlan(entry.user.id, event.target.value);
                                                                    await refreshAdminUsers();
                                                                    await refreshIdentity();
                                                                }
                                                                catch (err) {
                                                                    setAuthError(err instanceof Error ? err.message : 'Unknown error');
                                                                }
                                                                finally {
                                                                    setMembershipActionLoading(false);
                                                                }
                                                            }, children: membershipCatalog?.order.map((planId) => {
                                                                const plan = membershipCatalog.plans.find((item) => item.id === planId);
                                                                return _jsx("option", { value: planId, children: plan?.name ?? planId }, planId);
                                                            }) })] }), authMe?.isImpersonating && authMe.actorUser?.id === entry.user.id ? null : (_jsx("button", { type: "button", style: secondaryButtonStyle, onClick: async () => {
                                                        setAuthActionLoading(true);
                                                        setAuthError(null);
                                                        try {
                                                            await startAdminImpersonation(entry.user.id);
                                                            await refreshIdentity();
                                                        }
                                                        catch (err) {
                                                            setAuthError(err instanceof Error ? err.message : 'Unknown error');
                                                        }
                                                        finally {
                                                            setAuthActionLoading(false);
                                                        }
                                                    }, children: locale === 'en' ? 'Impersonate' : 'Suplantar' }))] })] }, entry.user.id)))] })] })) : null, _jsxs("section", { style: heroGridStyle, children: [!dataset ? (_jsx("div", { style: heroIntroPanelStyle, children: _jsxs("div", { style: { display: 'grid', gap: 12 }, children: [_jsx("div", { style: { color: '#8b94a4', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: 12 }, children: "Don Sosa Coach" }), _jsx("h1", { style: { margin: 0, fontSize: 46, letterSpacing: '-0.05em', maxWidth: 760 }, children: locale === 'en'
                                            ? 'A competitive read of your play, not just another stats page'
                                            : 'Tu lectura competitiva para jugar mejor, no solo mirar stats' }), _jsx("p", { style: { margin: 0, color: '#9099aa', maxWidth: 760, lineHeight: 1.7 }, children: locale === 'en'
                                            ? 'Clear diagnosis, actionable decisions and an organized view of matchups, runes, champions and review. First you understand what to fix, then you go deeper.'
                                            : 'Diagnóstico claro, decisiones accionables y una vista ordenada de matchups, runas, campeones y revisión. Primero entendés qué corregir; después entrás al detalle.' }), loading ? (_jsx("div", { style: { color: '#d8fdf1', fontSize: 13, lineHeight: 1.6 }, children: progress?.message ?? (matchCount >= 75
                                            ? (locale === 'en' ? 'Analyzing a large sample. This can take several minutes because of Riot rate limits.' : 'Analizando una muestra grande. Esto puede tardar varios minutos por los límites de Riot.')
                                            : (locale === 'en' ? 'Analyzing matches. This can take anywhere from a few seconds to about a minute.' : 'Analizando partidas. Esto puede tardar entre unos segundos y alrededor de un minuto.')) })) : null, loading && progress ? (_jsxs("div", { style: { display: 'grid', gap: 8, maxWidth: 460 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', color: '#9eb0c7', fontSize: 12 }, children: [_jsx("span", { children: progress.stage }), _jsx("span", { children: `${Math.min(progress.current, progress.total)} / ${progress.total}` })] }), _jsx("div", { style: { height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }, children: _jsx("div", { style: { width: `${Math.max(8, (progress.current / Math.max(progress.total, 1)) * 100)}%`, height: '100%', background: '#67d6a4' } }) })] })) : null] }) })) : (_jsxs("div", { style: { display: 'grid', gap: 16 }, children: [_jsx("div", { style: heroIntroPanelStyle, children: _jsxs("div", { style: { display: 'grid', gap: 16 }, children: [_jsxs("div", { style: { display: 'grid', gap: 10 }, children: [_jsx("div", { style: { color: '#8b94a4', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: 12 }, children: locale === 'en' ? 'Current profile' : 'Perfil actual' }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: profileIconUrl ? '88px minmax(0, 1fr)' : '1fr', gap: 16, alignItems: 'center' }, children: [profileIconUrl ? (_jsx("img", { src: profileIconUrl, alt: dataset.player, width: 88, height: 88, style: { ...profileIconStyle, width: 88, height: 88, objectFit: 'cover', boxShadow: '0 16px 32px rgba(0,0,0,0.22)' } })) : null, _jsxs("div", { style: { display: 'grid', gap: 6, minWidth: 0 }, children: [_jsxs("h1", { style: { margin: 0, fontSize: 38, letterSpacing: '-0.05em', lineHeight: 1.05 }, children: [dataset.player, _jsxs("span", { style: { color: '#8894ab' }, children: ["#", dataset.tagLine] })] }), dataset.profile ? (_jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsx(Badge, { children: locale === 'en' ? `Level ${dataset.profile.summonerLevel}` : `Nivel ${dataset.profile.summonerLevel}` }), currentPlatformInfo ? _jsx(Badge, { tone: "default", children: `${currentPlatformInfo.platform} · ${currentPlatformInfo.shortLabel}` }) : null] })) : null, _jsx("p", { style: { margin: 0, color: '#96a1b4', maxWidth: 760, lineHeight: 1.65 }, children: locale === 'en'
                                                                            ? 'The coaching block uses this saved sample as its base. You can explore the rest of the product without spending tokens again on every visual filter change.'
                                                                            : 'El bloque de coaching usa esta muestra guardada como base. Podés explorar el resto del producto sin volver a gastar tokens por cada cambio visual de filtros.' })] })] })] }), _jsxs("div", { className: "three-col-grid", style: { display: 'grid', gridTemplateColumns: 'minmax(220px, .92fr) repeat(3, minmax(0, 1fr))', gap: 12 }, children: [dataset.rank ? _jsx(RankBadge, { rank: dataset.rank, compact: true, locale: locale }) : null, _jsxs("div", { style: heroMetaChipStyle, children: [_jsx("div", { style: heroMetaLabelStyle, children: locale === 'en' ? 'Scope sample' : 'Muestra del scope' }), _jsx("div", { style: heroMetaValueStyle, children: coachScopeSummary?.matches ?? dataset.summary.matches }), _jsx("div", { style: heroMetaSubtleStyle, children: coachRoles.length ? coachScopeLabel : (locale === 'en' ? 'all saved roles' : 'todos los roles guardados') })] }), _jsxs("div", { style: heroMetaChipStyle, children: [_jsx("div", { style: heroMetaLabelStyle, children: locale === 'en' ? 'Win rate' : 'WR' }), _jsxs("div", { style: heroMetaValueStyle, children: [coachScopeSummary?.winRate ?? dataset.summary.winRate, "%"] }), _jsx("div", { style: heroMetaSubtleStyle, children: `${coachScopeSummary?.wins ?? dataset.summary.wins}-${coachScopeSummary?.losses ?? dataset.summary.losses}` })] }), _jsxs("div", { style: heroMetaChipStyle, children: [_jsx("div", { style: heroMetaLabelStyle, children: locale === 'en' ? 'Performance' : 'Rendimiento' }), _jsx("div", { style: heroMetaValueStyle, children: coachScopeSummary?.avgPerformanceScore ?? dataset.summary.avgPerformanceScore }), _jsx("div", { style: heroMetaSubtleStyle, children: locale === 'en'
                                                                    ? `CS@15 ${coachScopeSummary?.avgCsAt15 ?? dataset.summary.avgCsAt15}`
                                                                    : `CS@15 ${coachScopeSummary?.avgCsAt15 ?? dataset.summary.avgCsAt15}` })] })] })] }) }), _jsx(Card, { title: locale === 'en' ? 'Coaching scope' : 'Alcance del coaching', subtitle: locale === 'en'
                                        ? 'Choose the one or two roles you truly want to improve. The AI block is generated only from this scope.'
                                        : 'Elegí el o los dos roles que de verdad querés mejorar. El bloque de IA se genera solo sobre este alcance.', children: _jsxs("div", { style: { display: 'grid', gap: 14 }, children: [_jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: coachRoleOptions.map((role) => {
                                                    const selected = coachRoles.includes(role);
                                                    const maxRolesReached = !selected && coachRoles.length >= (planEntitlements?.maxCoachRoles ?? 2);
                                                    return (_jsx("button", { type: "button", disabled: maxRolesReached, onClick: () => toggleCoachRole(role), style: {
                                                            ...rolePillStyle,
                                                            ...(selected ? activeRolePillStyle : {}),
                                                            borderColor: selected ? 'rgba(216,253,241,0.26)' : 'rgba(255,255,255,0.07)',
                                                            opacity: maxRolesReached ? 0.45 : 1,
                                                            cursor: maxRolesReached ? 'not-allowed' : 'pointer'
                                                        }, children: locale === 'en' ? translateRole(role, 'en') : getRoleLabel(role) }, role));
                                                }) }), _jsxs("div", { className: "three-col-grid", style: { display: 'grid', gridTemplateColumns: '1.2fr repeat(2, minmax(0, 1fr))', gap: 12 }, children: [_jsxs("div", { style: scopeMetaCardStyle, children: [_jsx("div", { style: heroMetaLabelStyle, children: locale === 'en' ? 'Current scope' : 'Alcance actual' }), _jsx("div", { style: { ...heroMetaValueStyle, fontSize: 20 }, children: coachScopeLabel }), _jsx("div", { style: heroMetaSubtleStyle, children: coachRoles.length >= (planEntitlements?.maxCoachRoles ?? 2)
                                                                    ? (locale === 'en' ? 'Maximum scope selected for this plan' : 'Máximo de alcance para este plan')
                                                                    : locale === 'en'
                                                                        ? `You can add up to ${(planEntitlements?.maxCoachRoles ?? 2) - coachRoles.length} more role`
                                                                        : `Podés sumar hasta ${(planEntitlements?.maxCoachRoles ?? 2) - coachRoles.length} rol más` })] }), _jsxs("div", { style: scopeMetaCardStyle, children: [_jsx("div", { style: heroMetaLabelStyle, children: locale === 'en' ? 'Token policy' : 'Política de tokens' }), _jsx("div", { style: { ...heroMetaValueStyle, fontSize: 20 }, children: locale === 'en' ? 'Manual refresh' : 'Refresh manual' }), _jsx("div", { style: heroMetaSubtleStyle, children: locale === 'en' ? 'Changing this scope does not regenerate coaching until you refresh.' : 'Cambiar este alcance no regenera coaching hasta que vos actualices.' })] }), _jsxs("div", { style: scopeMetaCardStyle, children: [_jsx("div", { style: heroMetaLabelStyle, children: locale === 'en' ? 'Current queue read' : 'Lectura de colas' }), _jsx("div", { style: { ...heroMetaValueStyle, fontSize: 20 }, children: formatQueueSummary(dataset, locale) }), _jsx("div", { style: heroMetaSubtleStyle, children: locale === 'en' ? 'Saved ranked context' : 'Contexto ranked guardado' })] })] }), coachScopeDirty ? (_jsx("div", { style: scopeStatusStyle, children: locale === 'en'
                                                    ? `The coaching scope changed to ${coachScopeLabel}. Refresh the coaching block when you want this role selection to become the new main read.`
                                                    : `El alcance del coaching cambió a ${coachScopeLabel}. Actualizá el bloque cuando quieras que esta selección de roles pase a ser la lectura principal.` })) : null] }) })] })), _jsx(Card, { title: showAccountControls ? (locale === 'en' ? 'Load Riot account' : 'Cargar cuenta de Riot') : (locale === 'en' ? 'Active account' : 'Cuenta activa'), subtitle: showAccountControls
                                ? (locale === 'en' ? 'Enter the Riot ID you want to analyze and choose the depth of the first sample.' : 'Ingresá el Riot ID que querés analizar y elegí la profundidad de la primera muestra.')
                                : (locale === 'en' ? 'Your account is ready. Refresh only what is missing or switch profiles whenever you want.' : 'Tu cuenta ya está lista. Refrescá solo lo que falta o cambiá de perfil cuando quieras.'), children: showAccountControls || !dataset ? (_jsxs("form", { onSubmit: handleSubmit, style: { display: 'grid', gap: 16 }, children: [_jsxs("div", { style: riotSearchShellStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 5 }, children: [_jsx("div", { style: { color: '#8da0ba', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: locale === 'en' ? 'Riot account lookup' : 'Búsqueda de cuenta Riot' }), _jsx("div", { style: { color: '#eef4ff', fontSize: 16, fontWeight: 800 }, children: searchPreviewLabel })] }), _jsxs("div", { className: "five-col-grid", style: riotSearchRowStyle, children: [_jsxs("label", { style: { ...fieldBlockStyle, minWidth: 0 }, children: [_jsx("span", { style: fieldLabelStyle, children: locale === 'en' ? 'Game name' : 'Nombre en juego' }), _jsx("input", { value: gameName, onChange: (e) => setGameName(e.target.value), placeholder: locale === 'en' ? 'For example, Faker' : 'Por ejemplo, Don Sosa', style: riotSearchInputStyle })] }), _jsxs("label", { style: { ...fieldBlockStyle, minWidth: 0 }, children: [_jsx("span", { style: fieldLabelStyle, children: locale === 'en' ? 'Tag' : 'Tag' }), _jsxs("div", { style: tagInputShellStyle, children: [_jsx("span", { style: tagPrefixStyle, children: "#" }), _jsx("input", { value: tagLine, onChange: (e) => setTagLine(normalizeTagLineInput(e.target.value)), placeholder: locale === 'en' ? 'KR1' : 'LAS', style: tagInputStyle })] })] }), _jsxs("label", { style: { ...fieldBlockStyle, minWidth: 0 }, children: [_jsx("span", { style: fieldLabelStyle, children: locale === 'en' ? 'Platform' : 'Platform' }), _jsx("select", { value: platform, onChange: (e) => setPlatform(e.target.value), style: riotSearchInputStyle, children: supportedRiotPlatforms.map((platformCode) => {
                                                                    const info = getRiotPlatformInfo(platformCode);
                                                                    return (_jsx("option", { value: platformCode, children: info ? `${info.platform} · ${info.shortLabel}` : platformCode }, platformCode));
                                                                }) })] }), _jsxs("label", { style: { ...fieldBlockStyle, minWidth: 0 }, children: [_jsx("span", { style: fieldLabelStyle, children: locale === 'en' ? 'Sample' : 'Muestra' }), _jsx("select", { value: matchCount, onChange: (e) => setMatchCount(Number(e.target.value)), style: riotSearchInputStyle, children: targetCountOptions.map((count) => (_jsxs("option", { value: count, children: [count, " ", locale === 'en' ? 'matches' : 'partidas'] }, count))) })] }), _jsx("button", { type: "submit", style: { ...buttonStyle, minHeight: 52 }, children: loading ? (locale === 'en' ? 'Analyzing...' : 'Analizando...') : (locale === 'en' ? 'Build first analysis' : 'Construir primer análisis') })] })] }), _jsx("div", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 12 }, children: _jsxs("div", { style: softPanelStyle, children: [_jsx("div", { style: { color: '#eef4ff', fontWeight: 700 }, children: locale === 'en' ? 'Routing context' : 'Contexto de routing' }), _jsx("div", { style: { color: '#8f9bad', fontSize: 13, lineHeight: 1.6 }, children: currentPlatformInfo
                                                        ? (locale === 'en'
                                                            ? `${currentPlatformInfo.label} uses Riot regional route ${currentPlatformInfo.regionalRoute}. UI language stays independent from this selection.`
                                                            : `${currentPlatformInfo.label} usa el regional route ${currentPlatformInfo.regionalRoute} de Riot. El idioma de la UI sigue separado de esta elección.`)
                                                        : (locale === 'en'
                                                            ? 'Choose the Riot platform where this account actually plays.'
                                                            : 'Elegí la platform de Riot donde realmente juega esta cuenta.') })] }) }), _jsxs("div", { style: softPanelStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsx("div", { style: { color: '#eef4ff', fontWeight: 700 }, children: locale === 'en' ? 'Recommended start' : 'Inicio recomendado' }), _jsx("div", { style: { color: '#8f9bad', fontSize: 13, lineHeight: 1.6 }, children: matchCount >= 100
                                                            ? (locale === 'en' ? `A ${Math.min(100, planEntitlements?.maxStoredMatchesPerProfile ?? 100)}-match baseline gives the sharpest first read, but it can take longer because of Riot rate limits.` : `Una base de ${Math.min(100, planEntitlements?.maxStoredMatchesPerProfile ?? 100)} partidas da la lectura inicial más filosa, pero puede tardar más por los límites de Riot.`)
                                                            : (locale === 'en' ? 'Start smaller if you want speed, then scale the sample when you want a more stable baseline.' : 'Empezá más chico si querés velocidad y después escalá la muestra cuando quieras una base más estable.') })] }), !dataset && gameName && tagLine ? (_jsx("div", { style: { color: '#a5b2c6', fontSize: 13, lineHeight: 1.6 }, children: locale === 'en'
                                                    ? 'Once this account is loaded, it will stay saved here and future refreshes will only complete what is missing.'
                                                    : 'Una vez que cargues esta cuenta, va a quedar guardada acá y los próximos refreshes solo completarán lo que falte.' })) : null] }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }, children: [_jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { tone: "default", children: locale === 'en' ? `${matchCount} match target` : `Objetivo de ${matchCount} partidas` }), planEntitlements ? _jsx(Badge, { tone: "low", children: locale === 'en' ? `Plan cap ${planEntitlements.maxStoredMatchesPerProfile}` : `Tope del plan ${planEntitlements.maxStoredMatchesPerProfile}` }) : null, _jsx(Badge, { tone: "low", children: locale === 'en' ? 'Coaching scope is chosen after loading the account' : 'El alcance del coaching se elige después de cargar la cuenta' })] }), _jsx("div", { style: { color: '#8f9bad', fontSize: 13 }, children: locale === 'en'
                                                    ? 'You can search any supported Riot platform without changing the UI language.'
                                                    : 'Podés buscar cualquier platform soportada de Riot sin cambiar el idioma de la UI.' })] })] })) : (_jsxs("div", { style: { display: 'grid', gap: 14 }, children: [_jsxs("div", { style: softPanelStyle, children: [_jsx("div", { style: { color: '#e7eef8', lineHeight: 1.5, fontWeight: 700 }, children: gameName && tagLine ? `${gameName}#${tagLine}` : (locale === 'en' ? 'Account ready to analyze' : 'Cuenta lista para analizar') }), _jsx("div", { style: { color: '#8a95a8', fontSize: 13, lineHeight: 1.6 }, children: locale === 'en'
                                                    ? `Saved sample: ${dataset.matches.length} matches. Choose whether you want to add a little, a lot or complete the block.`
                                                    : `Muestra guardada: ${dataset.matches.length} partidas. Elegí si querés sumar un poco, bastante o completar el bloque.` }), currentPlatformInfo ? (_jsx("div", { style: { color: '#748198', fontSize: 12 }, children: locale === 'en'
                                                    ? `Platform ${currentPlatformInfo.platform} · ${currentPlatformInfo.label}`
                                                    : `Platform ${currentPlatformInfo.platform} · ${currentPlatformInfo.label}` })) : null] }), syncMessage ? _jsx("div", { style: syncMessageStyle, children: syncMessage }) : null, _jsx("div", { style: { display: 'grid', gap: 10 }, children: quickRefreshActions.length ? (_jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsx("div", { style: fieldLabelStyle, children: locale === 'en' ? 'Quick refresh' : 'Refresh rápido' }), _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: quickRefreshActions.map((action) => (_jsx("button", { type: "button", style: secondaryButtonStyle, onClick: () => void runAnalysis(action.target), disabled: loading, children: action.id === 'complete'
                                                            ? (locale === 'en' ? `Complete to ${action.target}` : `Completar a ${action.target}`)
                                                            : `${action.label} ${locale === 'en' ? 'match' : 'partida'}${action.label === '+1' ? '' : 's'}` }, action.id))) })] })) : null }), _jsxs("div", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: '1.1fr .9fr', gap: 12 }, children: [_jsxs("div", { style: { display: 'grid', gap: 6 }, children: [_jsx("div", { style: fieldLabelStyle, children: locale === 'en' ? 'Target block' : 'Bloque objetivo' }), _jsx("select", { value: matchCount, onChange: (e) => setMatchCount(Number(e.target.value)), style: selectStyle, children: targetCountOptions.map((count) => (_jsxs("option", { value: count, children: [count, " ", locale === 'en' ? 'matches' : 'partidas'] }, count))) })] }), _jsxs("div", { style: { display: 'grid', gap: 6 }, children: [_jsx("div", { style: fieldLabelStyle, children: locale === 'en' ? 'Coaching scope' : 'Alcance del coaching' }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { tone: "default", children: coachScopeLabel }), dataset?.remakesExcluded ? _jsx(Badge, { tone: "medium", children: locale === 'en' ? `${dataset.remakesExcluded} remakes excluded` : `${dataset.remakesExcluded} remakes excluidos` }) : null, needsSampleBackfill ? _jsx(Badge, { tone: "medium", children: locale === 'en' ? 'Needs backfill' : 'Le falta backfill' }) : _jsx(Badge, { tone: "low", children: locale === 'en' ? 'Only new matches' : 'Solo nuevas partidas' }), currentPlatformInfo ? _jsx(Badge, { tone: "default", children: currentPlatformInfo.platform }) : null, planEntitlements ? _jsx(Badge, { tone: "default", children: `${dataset.matches.length}/${planEntitlements.maxStoredMatchesPerProfile}` }) : null] })] })] }), _jsxs("div", { style: { display: 'flex', gap: 10, flexWrap: 'wrap' }, children: [_jsx("button", { type: "button", style: buttonStyle, onClick: () => void runAnalysis(), children: loading
                                                    ? (locale === 'en' ? 'Analyzing...' : 'Analizando...')
                                                    : needsSampleBackfill
                                                        ? (locale === 'en' ? `Backfill to ${matchCount} matches` : `Completar a ${matchCount} partidas`)
                                                        : (locale === 'en' ? 'Check for new matches' : 'Buscar nuevas partidas') }), _jsx("button", { type: "button", style: secondaryButtonStyle, onClick: () => setShowAccountControls(true), children: locale === 'en' ? 'Switch account' : 'Cambiar cuenta' })] })] })) })] }), savedProfiles.length ? (_jsxs("section", { style: savedProfilesSectionStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 3 }, children: [_jsx("div", { style: { color: '#8da0ba', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: locale === 'en' ? 'Saved profiles' : 'Perfiles guardados' }), _jsx("div", { style: { color: '#eef4ff', fontSize: 16, fontWeight: 800 }, children: locale === 'en' ? 'Jump back into accounts you already analyzed' : 'Volvé rápido a cuentas que ya analizaste' })] }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }, children: savedProfiles.map((profile) => {
                                const isActive = buildProfileIdentityKey(profile.gameName, profile.tagLine, profile.platform) === buildProfileIdentityKey(gameName, tagLine, platform);
                                const rankTier = extractRankTierFromLabel(profile.rankLabel);
                                const profileIcon = getProfileIconUrl(profile.profileIconId, profile.ddragonVersion ?? dataset?.ddragonVersion);
                                const savedPlatformInfo = getRiotPlatformInfo(profile.platform);
                                return (_jsxs("button", { type: "button", onClick: () => loadSavedProfile(profile), style: {
                                        ...savedProfileCardStyle,
                                        ...(isActive ? activeSavedProfileCardStyle : {})
                                    }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: profileIcon ? '56px minmax(0, 1fr)' : '1fr', gap: 12, alignItems: 'center', textAlign: 'left', minWidth: 0 }, children: [profileIcon ? (_jsx("img", { src: profileIcon, alt: profile.gameName, width: 56, height: 56, style: { ...profileIconStyle, width: 56, height: 56, objectFit: 'cover', borderRadius: 14 } })) : null, _jsxs("div", { style: { display: 'grid', gap: 4, minWidth: 0 }, children: [_jsxs("div", { style: { color: '#edf2ff', fontWeight: 800 }, children: [profile.gameName, _jsxs("span", { style: { color: '#8592a8' }, children: ["#", profile.tagLine] })] }), _jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }, children: [rankTier ? _jsx(RankEmblem, { tier: rankTier, label: profile.rankLabel ?? '', size: 34 }) : null, _jsx("div", { style: { color: '#8390a6', fontSize: 12 }, children: profile.rankLabel ?? (locale === 'en' ? 'No visible rank' : 'Sin rango visible') })] }), savedPlatformInfo ? (_jsx("div", { style: { color: '#6f7c93', fontSize: 11 }, children: `${savedPlatformInfo.platform} · ${savedPlatformInfo.shortLabel}` })) : null] })] }), _jsx(Badge, { tone: isActive ? 'low' : 'default', children: locale === 'en' ? `${profile.matches} matches` : `${profile.matches} partidas` })] }), _jsxs("div", { style: { color: '#748198', fontSize: 12, textAlign: 'left' }, children: [locale === 'en' ? 'Last update' : 'Última actualización', " ", new Date(profile.lastSyncedAt).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-AR')] })] }, buildProfileIdentityKey(profile.gameName, profile.tagLine, profile.platform)));
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
const planSectionStyle = {
    display: 'grid',
    gap: 12,
    padding: '16px 18px',
    borderRadius: 18,
    background: 'linear-gradient(180deg, rgba(10,14,22,0.95), rgba(5,8,14,0.98))',
    border: '1px solid rgba(255,255,255,0.06)'
};
const planCardsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 12
};
const planCardStyle = {
    display: 'grid',
    gap: 12,
    padding: '16px 16px 18px',
    borderRadius: 18,
    background: '#090e16',
    border: '1px solid rgba(255,255,255,0.06)'
};
const activePlanCardStyle = {
    background: 'linear-gradient(180deg, rgba(216,253,241,0.08), rgba(12,18,27,0.98))',
    borderColor: 'rgba(216,253,241,0.18)'
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
const riotSearchShellStyle = {
    display: 'grid',
    gap: 14,
    padding: '16px 18px',
    borderRadius: 18,
    background: 'linear-gradient(180deg, rgba(9,13,21,0.98), rgba(6,9,15,0.98))',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 18px 40px rgba(0,0,0,0.16)'
};
const riotSearchRowStyle = {
    display: 'grid',
    gridTemplateColumns: 'minmax(220px, 1.1fr) minmax(130px, .7fr) minmax(180px, .9fr) minmax(120px, .62fr) auto',
    gap: 10,
    alignItems: 'end'
};
const riotSearchInputStyle = {
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
const smallActionButtonStyle = {
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '9px 12px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.02)',
    color: '#9fb0c7',
    fontWeight: 700,
    fontSize: 12,
    cursor: 'pointer'
};
const activeSmallActionButtonStyle = {
    background: 'rgba(216,253,241,0.08)',
    color: '#e9fff7',
    borderColor: 'rgba(216,253,241,0.2)'
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
const adminUserCardStyle = {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.15fr) minmax(240px, 0.85fr)',
    gap: 14,
    alignItems: 'start',
    padding: '14px 15px',
    borderRadius: 16,
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)'
};
const adminRowStyle = {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    gap: 12,
    alignItems: 'start',
    padding: '12px 13px',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.05)'
};
function TopStat({ label, value, hint }) {
    return (_jsxs("div", { style: topStatStyle, children: [_jsx("div", { style: { color: '#768091', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: label }), _jsx("div", { style: { fontSize: 21, fontWeight: 800, lineHeight: 1.05 }, children: value }), _jsx("div", { style: { color: '#8692a7', fontSize: 12 }, children: hint })] }));
}
function RankBadge({ rank, compact = false, locale = 'es' }) {
    const palette = getRankPalette(rank.highest.tier);
    const lpProgress = Math.max(0, Math.min(rank.highest.leaguePoints, 100));
    const showFlex = rank.flexQueue.tier !== 'UNRANKED';
    const title = `${locale === 'en' ? 'Solo/Duo' : 'Solo/Duo'}: ${rank.soloQueue.label} · ${rank.soloQueue.leaguePoints} LP · ${rank.soloQueue.winRate}% WR${showFlex ? `\nFlex: ${rank.flexQueue.label} · ${rank.flexQueue.leaguePoints} LP · ${rank.flexQueue.winRate}% WR` : ''}`;
    return (_jsxs("div", { title: title, style: {
            display: 'grid',
            gap: compact ? 8 : 10,
            minWidth: 0,
            padding: compact ? '12px 14px' : '16px 18px',
            borderRadius: 16,
            background: compact ? 'rgba(9, 14, 22, 0.86)' : 'linear-gradient(180deg, rgba(10,14,22,0.96), rgba(19,24,37,0.92))',
            border: `1px solid ${palette.primary}33`
        }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: `${compact ? 94 : 104}px minmax(0, 1fr)`, alignItems: 'center', gap: compact ? 4 : 10 }, children: [_jsx(RankEmblem, { tier: rank.highest.tier, label: rank.highest.label, size: compact ? 94 : 104 }), _jsxs("div", { style: { display: 'grid', gap: 3, minWidth: 0 }, children: [_jsx("div", { style: { color: '#8d97aa', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: rank.highest.queueLabel ?? (locale === 'en' ? 'Ranked' : 'Ranked') }), _jsxs("div", { style: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }, children: [_jsx("span", { style: { fontSize: compact ? 17 : 20, fontWeight: 800, color: '#edf2ff', letterSpacing: '-0.02em' }, children: rank.highest.label }), _jsx("span", { style: { color: palette.glow, fontSize: 13, fontWeight: 800 }, children: `${rank.highest.leaguePoints} LP` })] }), _jsxs("div", { style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsxs("span", { style: rankQueuePillStyle, children: [_jsx("strong", { children: locale === 'en' ? 'Solo' : 'Solo' }), " ", rank.soloQueue.label, " \u00B7 ", rank.soloQueue.leaguePoints, " LP"] }), showFlex ? (_jsxs("span", { style: rankQueuePillStyle, children: [_jsx("strong", { children: "Flex" }), " ", rank.flexQueue.label, " \u00B7 ", rank.flexQueue.leaguePoints, " LP"] })) : null] })] })] }), _jsxs("div", { style: { display: 'grid', gap: 5 }, children: [_jsx("div", { style: { height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }, children: _jsx("div", { style: { width: `${lpProgress}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${palette.primary}, ${palette.glow})` } }) }), !compact ? (_jsx("div", { style: { color: '#7e889b', fontSize: 11 }, children: locale === 'en' ? 'Hover to view Solo/Duo and Flex' : 'Hover para ver Solo/Duo y Flex' })) : null] })] }));
}
function RankEmblem({ tier, label, size }) {
    const emblem = getRankEmblemDataUrl(tier);
    const palette = getRankPalette(tier);
    const assetSize = Math.round(size * 3);
    return (_jsx("div", { "aria-hidden": "true", style: {
            width: size,
            height: size,
            overflow: 'hidden',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            filter: `drop-shadow(0 16px 32px ${palette.primary}24)`
        }, children: _jsx("img", { src: emblem, alt: label, width: assetSize, height: assetSize, style: {
                display: 'block',
                width: assetSize,
                height: assetSize,
                objectFit: 'contain',
                marginTop: Math.round(size * 0.04)
            } }) }));
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
const rankQueuePillStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 8px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.04)',
    color: '#aeb8ca',
    fontSize: 11,
    lineHeight: 1.2,
    border: '1px solid rgba(255,255,255,0.05)'
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
