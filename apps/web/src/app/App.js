var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { buildAggregateSummary } from "@don-sosa/core";
import { Component, useEffect, useMemo, useState } from "react";
import {
  addCoachPlayer,
  changePassword,
  collectProfile,
  createBillingPortalSession,
  createCheckoutSession,
  fetchAdminUsers,
  fetchAuthMe,
  fetchCachedProfile,
  fetchCoachPlayers,
  fetchMembershipCatalog,
  fetchRoleReferences,
  generateAICoach,
  login,
  logout,
  removeCoachPlayer,
  requestPasswordReset,
  resetPassword,
  sendAICoachFeedback,
  setMembershipPlanDev,
  signup,
  startAdminImpersonation,
  stopAdminImpersonation,
  updateAdminUserPlan,
  updateAdminUserRole
} from "../lib/api";
import { Shell, Card, Badge } from "../components/ui";
import { CoachingHome } from "../features/coach/CoachingHome";
import { AccountCenter } from "../features/account/AccountCenter";
import { RankBadge, RankEmblem } from "../features/profile/ProfilePrimitives";
import { OverviewTab } from "../features/overview/OverviewTab";
import { StatsTab } from "../features/stats/StatsTab";
import { MatchupsTab } from "../features/matchups/MatchupsTab";
import { RunesTab } from "../features/runes/RunesTab";
import { BuildsTab } from "../features/builds/BuildsTab";
import { ChampionPoolTab } from "../features/champion-pool/ChampionPoolTab";
import { MatchesTab } from "../features/matches/MatchesTab";
import { detectLocale, translateRole } from "../lib/i18n";
import { buildProfileIdentityKey, getProfileIconUrl, getQueueBucket, getQueueLabel, getRiotPlatformInfo, getRoleLabel, guessDefaultRiotPlatform, supportedRiotPlatforms } from "../lib/lol";
import { buildCs15Benchmark } from "../lib/benchmarks";
const tabs = [
  { id: "overview", label: { es: "Overview", en: "Overview" } },
  { id: "coach", label: { es: "Coaching", en: "Coaching" } },
  { id: "stats", label: { es: "M\xE9tricas", en: "Stats" } },
  { id: "matchups", label: { es: "Cruces", en: "Matchups" } },
  { id: "runes", label: { es: "Runas", en: "Runes" } },
  { id: "builds", label: { es: "Builds / Items", en: "Builds / Items" } },
  { id: "champions", label: { es: "Campeones", en: "Champions" } },
  { id: "matches", label: { es: "Partidas", en: "Matches" } }
];
const savedProfilesStorageKey = "don-sosa:saved-profiles";
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
    if (!raw) continue;
    try {
      return JSON.parse(raw);
    } catch {
      window.localStorage.removeItem(key);
    }
  }
  return null;
}
function removeCachedDataset(gameName, tagLine, platform) {
  window.localStorage.removeItem(datasetStorageKey(gameName, tagLine, platform));
  window.localStorage.removeItem(legacyDatasetStorageKey(gameName, tagLine));
}
function datasetNeedsBuildRehydration(dataset) {
  if (!dataset) return true;
  if (!dataset.itemCatalog || !Object.keys(dataset.itemCatalog).length) return true;
  return !dataset.matches.some((match) => (match.items?.purchaseEvents?.length ?? 0) > 0);
}
function mergeDatasets(current, incoming, locale) {
  if (!current) return incoming;
  const matchMap = /* @__PURE__ */ new Map();
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
  return value.replace(/^#+/, "").trim();
}
function limitDatasetMatches(dataset, maxMatches, locale) {
  if (dataset.matches.length <= maxMatches) return dataset;
  const limitedMatches = [...dataset.matches].sort((a, b) => b.gameCreation - a.gameCreation).slice(0, maxMatches);
  return {
    ...dataset,
    matches: limitedMatches,
    summary: buildAggregateSummary(dataset.player, dataset.tagLine, dataset.summary.region, dataset.summary.platform, limitedMatches, locale)
  };
}
function serializeCoachRoles(roles) {
  return [...new Set(roles.map((role) => role.trim().toUpperCase()).filter(Boolean))].sort().join("+");
}
function formatCoachScopeLabel(roles, locale) {
  if (!roles.length) return locale === "en" ? "Choose 1 or 2 roles" : "Eleg\xED 1 o 2 roles";
  return roles.map((role) => locale === "en" ? translateRole(role, "en") : getRoleLabel(role)).join(" + ");
}
function formatRelativeSyncTime(timestamp, locale) {
  const elapsedMinutes = Math.max(1, Math.round((Date.now() - timestamp) / 6e4));
  if (elapsedMinutes < 60) return locale === "en" ? `${elapsedMinutes}m ago` : `hace ${elapsedMinutes} min`;
  const elapsedHours = Math.round(elapsedMinutes / 60);
  if (elapsedHours < 48) return locale === "en" ? `${elapsedHours}h ago` : `hace ${elapsedHours} h`;
  const elapsedDays = Math.round(elapsedHours / 24);
  return locale === "en" ? `${elapsedDays}d ago` : `hace ${elapsedDays} d`;
}
function formatSavedProfileCoverage(profile, locale) {
  const baselineTarget = Math.max(profile.matchCount, profile.matches);
  return locale === "en" ? `${profile.matches}/${baselineTarget} matches ready` : `${profile.matches}/${baselineTarget} partidas listas`;
}
function getSavedProfileReadinessLabel(profile, locale) {
  const completion = profile.matches / Math.max(profile.matchCount, 1);
  if (completion >= 1) return locale === "en" ? "Baseline ready" : "Base lista";
  if (completion >= 0.75) return locale === "en" ? "Almost complete" : "Casi completa";
  if (completion >= 0.45) return locale === "en" ? "Growing sample" : "Muestra creciendo";
  return locale === "en" ? "Needs more depth" : "Le falta profundidad";
}
function getSavedProfileReadinessTone(profile) {
  const completion = profile.matches / Math.max(profile.matchCount, 1);
  if (completion >= 1) return "low";
  if (completion >= 0.6) return "default";
  return "medium";
}
function buildDefaultCoachRoles(dataset) {
  const roleCounts = /* @__PURE__ */ new Map();
  for (const match of dataset.matches) {
    const role = (match.role || "NONE").toUpperCase();
    if (!role || role === "NONE") continue;
    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
  }
  const rankedRoles = Array.from(roleCounts.entries()).sort((a, b) => b[1] - a[1]);
  const [primary, secondary] = rankedRoles;
  if (!primary) return [];
  if (!secondary) return [primary[0]];
  const total = rankedRoles.reduce((sum, [, count]) => sum + count, 0);
  const primaryShare = primary[1] / Math.max(total, 1);
  if (primaryShare >= 0.7 || primary[1] >= secondary[1] * 2) {
    return [primary[0]];
  }
  return [primary[0], secondary[0]];
}
function filterMatchesByRoles(dataset, roles) {
  if (!roles.length) return dataset.matches;
  const normalizedRoles = roles.map((role) => role.trim().toUpperCase()).filter(Boolean);
  return dataset.matches.filter((match) => normalizedRoles.includes((match.role || "NONE").toUpperCase()));
}
function buildTargetOptions(currentMatches, maxMatchesPerProfile) {
  const baseOptions = initialMatchOptions.filter((option) => option <= maxMatchesPerProfile);
  const premiumOptions = [150, 250, 500, 1e3].filter((option) => option <= maxMatchesPerProfile);
  const optionSeed = [...baseOptions, ...premiumOptions, maxMatchesPerProfile];
  if (!currentMatches) return Array.from(new Set(optionSeed)).sort((a, b) => a - b);
  const options = /* @__PURE__ */ new Set([currentMatches, maxMatchesPerProfile]);
  [1, 5, 10].forEach((delta) => {
    const next = Math.min(maxMatchesPerProfile, currentMatches + delta);
    if (next > currentMatches) options.add(next);
  });
  for (const option of optionSeed) {
    if (option >= currentMatches) {
      options.add(option);
    }
  }
  return Array.from(options).sort((a, b) => a - b);
}
function buildQuickRefreshActions(currentMatches, maxMatchesPerProfile) {
  if (!currentMatches || currentMatches >= maxMatchesPerProfile) return [];
  const candidates = [
    { id: "plus-1", target: Math.min(maxMatchesPerProfile, currentMatches + 1), label: "+1" },
    { id: "plus-5", target: Math.min(maxMatchesPerProfile, currentMatches + 5), label: "+5" },
    { id: "plus-10", target: Math.min(maxMatchesPerProfile, currentMatches + 10), label: "+10" },
    { id: "complete", target: maxMatchesPerProfile, label: String(maxMatchesPerProfile) }
  ];
  const seen = /* @__PURE__ */ new Set();
  return candidates.filter((action) => {
    if (action.target <= currentMatches || seen.has(action.target)) return false;
    seen.add(action.target);
    return true;
  });
}
function formatQueueSummary(dataset, locale) {
  const queueCounts = /* @__PURE__ */ new Map();
  for (const match of dataset.matches) {
    const bucket = getQueueBucket(match.queueId);
    queueCounts.set(bucket, (queueCounts.get(bucket) ?? 0) + 1);
  }
  const solo = queueCounts.get("RANKED_SOLO") ?? 0;
  const flex = queueCounts.get("RANKED_FLEX") ?? 0;
  if (solo && flex) {
    return locale === "en" ? "Solo + Flex" : "Solo + Flex";
  }
  if (solo) return "Solo/Duo";
  if (flex) return "Flex";
  return locale === "en" ? "Mixed queue" : "Cola mixta";
}
function extractRankTierFromLabel(rankLabel) {
  if (!rankLabel) return void 0;
  return rankLabel.split(" ")[0]?.toUpperCase();
}
function AppShell() {
  const [locale] = useState(() => detectLocale());
  const [platform, setPlatform] = useState(() => guessDefaultRiotPlatform(detectLocale()));
  const [activeTab, setActiveTab] = useState("coach");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [coachRoles, setCoachRoles] = useState([]);
  const [queueFilter, setQueueFilter] = useState("ALL");
  const [windowFilter, setWindowFilter] = useState("ALL");
  const [matchCount, setMatchCount] = useState(50);
  const [gameName, setGameName] = useState("");
  const [tagLine, setTagLine] = useState("");
  const [showAccountControls, setShowAccountControls] = useState(true);
  const [accountPanelOpen, setAccountPanelOpen] = useState(false);
  const [accountPanelTab, setAccountPanelTab] = useState("auth");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState(null);
  const [syncMessage, setSyncMessage] = useState(null);
  const [dataset, setDataset] = useState(null);
  const [savedProfiles, setSavedProfiles] = useState([]);
  const [aiCoach, setAICoach] = useState(null);
  const [aiCoachLoading, setAICoachLoading] = useState(false);
  const [aiCoachError, setAICoachError] = useState(null);
  const [roleReferences, setRoleReferences] = useState([]);
  const [roleReferencesLoading, setRoleReferencesLoading] = useState(false);
  const [roleReferencesError, setRoleReferencesError] = useState(null);
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
  const [authMode, setAuthMode] = useState("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDisplayName, setAuthDisplayName] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetTokenPreview, setResetTokenPreview] = useState(null);
  const [resetLinkPreview, setResetLinkPreview] = useState(null);
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [coachRoster, setCoachRoster] = useState([]);
  const [coachRosterLoading, setCoachRosterLoading] = useState(false);
  const [coachPlayerEmail, setCoachPlayerEmail] = useState("");
  const [coachPlayerGameName, setCoachPlayerGameName] = useState("");
  const [coachPlayerTagLine, setCoachPlayerTagLine] = useState("");
  const [coachPlayerPlatform, setCoachPlayerPlatform] = useState(() => guessDefaultRiotPlatform(detectLocale()));
  const [coachPlayerNote, setCoachPlayerNote] = useState("");
  const currentPlan = membership?.plan ?? null;
  const planEntitlements = currentPlan?.entitlements ?? null;
  const authUser = authMe?.user ?? null;
  const actorUser = authMe?.actorUser ?? null;
  const safeAdminUsers = useMemo(
    () => adminUsers.filter((entry) => entry?.user && entry?.membership?.plan && entry?.membership?.account && entry?.usage),
    [adminUsers]
  );
  const safeCoachRoster = useMemo(
    () => coachRoster.filter((entry) => entry?.assignmentId && (entry?.user || entry?.profile)),
    [coachRoster]
  );
  const billingReady = membershipCatalog?.billing.ready ?? false;
  const currentPlanPriceLabel = currentPlan ? currentPlan.monthlyUsd === 0 ? locale === "en" ? "Free" : "Gratis" : locale === "en" ? `US$${currentPlan.monthlyUsd}/month` : `US$${currentPlan.monthlyUsd}/mes` : null;
  const canOpenBillingPortal = Boolean(membership?.account.stripeCustomerId && billingReady);
  const canManageCoachRoster = Boolean(actorUser && (actorUser.role === "coach" || actorUser.role === "admin"));
  const isAdmin = actorUser?.role === "admin";
  function openAccountPanel(nextTab) {
    setAccountPanelTab(nextTab ?? (authUser ? "profile" : "auth"));
    setAccountPanelOpen(true);
  }
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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setMembershipError(message);
      setAuthError(message);
    } finally {
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
    } catch (err) {
      setMembershipError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setMembershipActionLoading(false);
    }
  }
  async function handleAuthSubmit(event) {
    event.preventDefault();
    setAuthActionLoading(true);
    setAuthError(null);
    try {
      if (authMode === "signup") {
        await signup({
          email: authEmail,
          password: authPassword,
          displayName: authDisplayName,
          locale
        });
      } else if (authMode === "login") {
        await login({
          email: authEmail,
          password: authPassword
        });
      } else {
        const result = await requestPasswordReset({ email: authEmail });
        setResetTokenPreview(result.devResetToken);
        setResetLinkPreview(result.devResetUrl);
        if (result.devResetToken) {
          setResetToken(result.devResetToken);
        }
        setSyncMessage(locale === "en" ? result.devResetUrl ? "If the account exists, we generated the recovery flow. In dev, the reset link is ready and the token was autofilled so you can finish the reset now." : "If the account exists, we generated the recovery flow. Check your email for the reset link or token." : result.devResetUrl ? "Si la cuenta existe, generamos el flujo de recuperaci\xF3n. En dev, el link qued\xF3 listo y el token se autocomplet\xF3 para que puedas terminar el reset ahora." : "Si la cuenta existe, generamos el flujo de recuperaci\xF3n. Revis\xE1 tu email para seguir con el reset.");
      }
      if (authMode !== "reset") {
        setAuthPassword("");
        setNewPassword("");
        setResetToken("");
        setResetLinkPreview(null);
        await refreshIdentity();
      }
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Unknown error");
    } finally {
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
      setSyncMessage(locale === "en" ? "Password updated. You can log in now." : "Contrase\xF1a actualizada. Ya pod\xE9s iniciar sesi\xF3n.");
      setAuthMode("login");
      setResetToken("");
      setNewPassword("");
      setResetTokenPreview(null);
      setResetLinkPreview(null);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAuthActionLoading(false);
    }
  }
  async function handleLogout() {
    setAuthActionLoading(true);
    setAuthError(null);
    try {
      await logout();
      await refreshIdentity();
      setSyncMessage(locale === "en" ? "Session closed." : "Sesi\xF3n cerrada.");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Unknown error");
    } finally {
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
      setAuthPassword("");
      setNewPassword("");
      setSyncMessage(locale === "en" ? "Password changed." : "Contrase\xF1a actualizada.");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAuthActionLoading(false);
    }
  }
  async function handleCheckout(planId) {
    setMembershipActionLoading(true);
    setMembershipError(null);
    try {
      const result = await createCheckoutSession(planId);
      window.location.href = result.session.url;
    } catch (err) {
      setMembershipError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setMembershipActionLoading(false);
    }
  }
  async function handleBillingPortal() {
    setMembershipActionLoading(true);
    setMembershipError(null);
    try {
      const result = await createBillingPortalSession();
      window.location.href = result.session.url;
    } catch (err) {
      setMembershipError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setMembershipActionLoading(false);
    }
  }
  async function refreshAdminUsers() {
    if (actorUser?.role !== "admin") {
      setAdminUsers([]);
      return;
    }
    setAdminLoading(true);
    try {
      const response = await fetchAdminUsers();
      setAdminUsers(response.users);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAdminLoading(false);
    }
  }
  async function refreshCoachRoster() {
    if (!(actorUser?.role === "coach" || actorUser?.role === "admin")) {
      setCoachRoster([]);
      return;
    }
    setCoachRosterLoading(true);
    try {
      const response = await fetchCoachPlayers();
      setCoachRoster(response.players);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCoachRosterLoading(false);
    }
  }
  useEffect(() => {
    if (!actorUser) {
      setAdminUsers([]);
      setCoachRoster([]);
      return;
    }
    if (actorUser.role === "admin") {
      void refreshAdminUsers();
      void refreshCoachRoster();
      return;
    }
    if (actorUser.role === "coach") {
      void refreshCoachRoster();
      return;
    }
    setAdminUsers([]);
    setCoachRoster([]);
  }, [actorUser?.id, actorUser?.role]);
  useEffect(() => {
    if (!authUser) {
      setAccountPanelTab("auth");
      return;
    }
    if (accountPanelTab === "auth") {
      setAccountPanelTab("profile");
    }
  }, [authUser?.id]);
  async function hydrateFromServer(gameNameValue, tagLineValue, platformValue) {
    try {
      const serverDataset = await fetchCachedProfile(gameNameValue, tagLineValue, platformValue, locale);
      if (!serverDataset) return false;
      setDataset(serverDataset);
      setPlatform(serverDataset.summary.platform ?? platformValue);
      setShowAccountControls(false);
      window.localStorage.setItem(datasetStorageKey(gameNameValue, tagLineValue, serverDataset.summary.platform), JSON.stringify(serverDataset));
      window.localStorage.setItem("don-sosa:last-profile", JSON.stringify({
        gameName: gameNameValue,
        tagLine: tagLineValue,
        platform: serverDataset.summary.platform,
        matchCount
      }));
      persistSavedProfile(serverDataset, matchCount);
      setSyncMessage(locale === "en" ? "We recovered a saved version from the server so you do not have to start from zero on this device." : "Recuperamos una versi\xF3n guardada en el servidor para que no arranques de cero en este dispositivo.");
      void refreshIdentity();
      return true;
    } catch {
      return false;
    }
  }
  useEffect(() => {
    void refreshIdentity();
  }, []);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    let touched = false;
    const billingState = params.get("billing");
    if (billingState === "success") {
      setSyncMessage(locale === "en" ? "Billing confirmed. We are refreshing your account state and membership." : "Facturaci\xF3n confirmada. Estamos refrescando el estado de tu cuenta y tu membres\xEDa.");
      openAccountPanel("membership");
      touched = true;
      params.delete("billing");
    } else if (billingState === "cancel") {
      setSyncMessage(locale === "en" ? "Checkout was canceled. Your current plan stays unchanged." : "El checkout se cancel\xF3. Tu plan actual sigue igual.");
      openAccountPanel("membership");
      touched = true;
      params.delete("billing");
    }
    const resetTokenFromUrl = params.get("resetToken");
    const authModeFromUrl = params.get("authMode");
    if (resetTokenFromUrl || authModeFromUrl === "reset") {
      setAuthMode("reset");
      if (resetTokenFromUrl) {
        setResetToken(resetTokenFromUrl);
      }
      setAccountPanelTab("auth");
      setAccountPanelOpen(true);
      touched = true;
      params.delete("resetToken");
      params.delete("authMode");
      params.delete("account");
    }
    if (touched) {
      const nextQuery = params.toString();
      const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
      window.history.replaceState({}, "", nextUrl);
    }
  }, [locale]);
  useEffect(() => {
    const rawProfiles = window.localStorage.getItem(savedProfilesStorageKey);
    if (rawProfiles) {
      try {
        const parsedProfiles = JSON.parse(rawProfiles);
        const normalizedProfiles = parsedProfiles.map((profile) => {
          if (profile.platform) return profile;
          const cachedDataset = readCachedDataset(profile.gameName, profile.tagLine);
          return {
            ...profile,
            platform: cachedDataset?.summary.platform
          };
        });
        setSavedProfiles(normalizedProfiles);
        window.localStorage.setItem(savedProfilesStorageKey, JSON.stringify(normalizedProfiles));
      } catch {
        window.localStorage.removeItem(savedProfilesStorageKey);
      }
    }
    const savedProfile = window.localStorage.getItem("don-sosa:last-profile");
    if (!savedProfile) return;
    try {
      const parsed = JSON.parse(savedProfile);
      if (parsed.gameName) setGameName(parsed.gameName);
      if (parsed.tagLine) setTagLine(parsed.tagLine);
      if (parsed.platform && supportedRiotPlatforms.includes(parsed.platform)) {
        setPlatform(parsed.platform);
      }
      if (parsed.matchCount) setMatchCount(parsed.matchCount);
      if (parsed.gameName && parsed.tagLine) {
        const savedDataset = readCachedDataset(parsed.gameName, parsed.tagLine, parsed.platform);
        if (savedDataset) {
          try {
            setDataset(savedDataset);
            setPlatform(savedDataset.summary.platform ?? guessDefaultRiotPlatform(locale));
            setShowAccountControls(false);
          } catch {
            removeCachedDataset(parsed.gameName, parsed.tagLine, parsed.platform);
            setShowAccountControls(true);
          }
        } else {
          setShowAccountControls(true);
          void hydrateFromServer(parsed.gameName, parsed.tagLine, parsed.platform ?? guessDefaultRiotPlatform(locale));
        }
      }
    } catch {
      window.localStorage.removeItem("don-sosa:last-profile");
    }
  }, [locale]);
  useEffect(() => {
    if (!planEntitlements) return;
    if (savedProfiles.length <= planEntitlements.maxStoredProfiles) return;
    const trimmed = savedProfiles.slice(0, planEntitlements.maxStoredProfiles);
    setSavedProfiles(trimmed);
    window.localStorage.setItem(savedProfilesStorageKey, JSON.stringify(trimmed));
  }, [savedProfiles, planEntitlements]);
  useEffect(() => {
    if (!dataset || !planEntitlements) return;
    if (dataset.matches.length <= planEntitlements.maxStoredMatchesPerProfile) return;
    const limited = limitDatasetMatches(dataset, planEntitlements.maxStoredMatchesPerProfile, locale);
    setDataset(limited);
    window.localStorage.setItem(datasetStorageKey(limited.player, limited.tagLine, limited.summary.platform), JSON.stringify(limited));
    persistSavedProfile(limited, Math.min(matchCount, planEntitlements.maxStoredMatchesPerProfile));
  }, [dataset, planEntitlements, locale, matchCount]);
  const availableRoles = useMemo(() => {
    if (!dataset) return ["ALL"];
    const roles = Array.from(new Set(dataset.matches.map((match) => match.role || "NONE"))).filter((role) => Boolean(role) && role !== "NONE");
    return ["ALL", ...roles];
  }, [dataset]);
  const coachRoleOptions = useMemo(
    () => availableRoles.filter((role) => role !== "ALL" && role !== "NONE"),
    [availableRoles]
  );
  const coachScopeKey = useMemo(() => serializeCoachRoles(coachRoles), [coachRoles]);
  const coachScopeLabel = useMemo(() => formatCoachScopeLabel(coachRoles, locale), [coachRoles, locale]);
  const coachDataset = useMemo(() => {
    if (!dataset) return null;
    if (!coachRoles.length) return dataset;
    const scopedMatches = filterMatchesByRoles(dataset, coachRoles);
    return {
      ...dataset,
      matches: scopedMatches,
      summary: buildAggregateSummary(dataset.player, dataset.tagLine, dataset.summary.region, dataset.summary.platform, scopedMatches, locale)
    };
  }, [dataset, coachRoles, locale]);
  const coachHasSample = (coachDataset?.summary.matches ?? 0) > 0;
  useEffect(() => {
    if (!planEntitlements) return;
    if (matchCount > planEntitlements.maxStoredMatchesPerProfile) {
      setMatchCount(planEntitlements.maxStoredMatchesPerProfile);
    }
  }, [matchCount, planEntitlements]);
  useEffect(() => {
    if (!planEntitlements) return;
    if (coachRoles.length <= planEntitlements.maxCoachRoles) return;
    setCoachRoles((current) => current.slice(0, planEntitlements.maxCoachRoles));
  }, [coachRoles, planEntitlements]);
  const availableQueueFilters = useMemo(() => {
    if (!dataset) return ["ALL"];
    const buckets = new Set(dataset.matches.map((match) => getQueueBucket(match.queueId)));
    const options = ["ALL"];
    if (buckets.has("RANKED_SOLO") || buckets.has("RANKED_FLEX")) options.push("RANKED");
    if (buckets.has("RANKED_SOLO")) options.push("RANKED_SOLO");
    if (buckets.has("RANKED_FLEX")) options.push("RANKED_FLEX");
    if (buckets.has("OTHER")) options.push("OTHER");
    return options;
  }, [dataset]);
  const viewDataset = useMemo(() => {
    if (!dataset) return null;
    let filteredMatches = [...dataset.matches];
    if (roleFilter !== "ALL") {
      filteredMatches = filteredMatches.filter((match) => (match.role || "NONE") === roleFilter);
    }
    if (queueFilter !== "ALL") {
      filteredMatches = filteredMatches.filter((match) => {
        const bucket = getQueueBucket(match.queueId);
        if (queueFilter === "RANKED") return bucket === "RANKED_SOLO" || bucket === "RANKED_FLEX";
        return bucket === queueFilter;
      });
    }
    filteredMatches.sort((a, b) => b.gameCreation - a.gameCreation);
    if (windowFilter === "LAST_20") filteredMatches = filteredMatches.slice(0, 20);
    if (windowFilter === "LAST_8") filteredMatches = filteredMatches.slice(0, 8);
    const filteredSummary = buildAggregateSummary(dataset.player, dataset.tagLine, dataset.summary.region, dataset.summary.platform, filteredMatches, locale);
    return {
      ...dataset,
      matches: filteredMatches,
      summary: filteredSummary
    };
  }, [dataset, roleFilter, queueFilter, windowFilter, locale]);
  const coachRequestKey = useMemo(() => {
    if (!coachDataset || !coachHasSample || !gameName || !tagLine || !coachScopeKey || !platform) return null;
    return [
      gameName.trim().toLowerCase(),
      tagLine.trim().toLowerCase(),
      platform.trim().toLowerCase(),
      locale,
      coachScopeKey,
      coachDataset.summary.matches,
      coachDataset.matches[0]?.matchId ?? "no-latest-match"
    ].join("|");
  }, [coachDataset, coachHasSample, gameName, tagLine, platform, locale, coachScopeKey]);
  const coachScopeDirty = useMemo(() => {
    if (!coachScopeKey) return false;
    if (!lastGeneratedCoachScopeKey) return false;
    return coachScopeKey !== lastGeneratedCoachScopeKey;
  }, [coachScopeKey, lastGeneratedCoachScopeKey]);
  const coachReferenceRole = useMemo(() => {
    const scopedRole = coachDataset?.summary.primaryRole?.toUpperCase();
    if (scopedRole && scopedRole !== "ALL" && scopedRole !== "NONE") {
      return scopedRole;
    }
    const firstCoachRole = coachRoles[0]?.toUpperCase();
    if (firstCoachRole && firstCoachRole !== "ALL" && firstCoachRole !== "NONE") {
      return firstCoachRole;
    }
    return null;
  }, [coachDataset?.summary.primaryRole, coachRoles]);
  useEffect(() => {
    let cancelled = false;
    if (!dataset?.summary.platform || !coachReferenceRole) {
      setRoleReferences([]);
      setRoleReferencesError(null);
      setRoleReferencesLoading(false);
      return;
    }
    setRoleReferencesLoading(true);
    setRoleReferencesError(null);
    void fetchRoleReferences({
      platform: dataset.summary.platform,
      role: coachReferenceRole,
      locale
    }).then((result) => {
      if (cancelled) return;
      setRoleReferences(result.references);
    }).catch((err) => {
      if (cancelled) return;
      setRoleReferences([]);
      setRoleReferencesError(err instanceof Error ? err.message : "Unknown error");
    }).finally(() => {
      if (cancelled) return;
      setRoleReferencesLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [dataset?.summary.platform, coachReferenceRole, locale]);
  const renderedTab = useMemo(() => {
    if (activeTab === "coach") {
      if (!coachDataset) return null;
      return /* @__PURE__ */ jsx(
        CoachingHome,
        {
          dataset: coachDataset,
          locale,
          aiCoach,
          generatingAICoach: aiCoachLoading,
          aiCoachError,
          roleReferences,
          roleReferencesLoading,
          roleReferencesError,
          coachRosterPlayers: coachWorkspaceRosterPlayers,
          canManageCoachRoster,
          onGenerateAICoach: () => void handleGenerateAICoach(true),
          onSendFeedback: (verdict) => void handleAICoachFeedback(verdict)
        }
      );
    }
    if (!viewDataset) return null;
    switch (activeTab) {
      case "overview":
        return /* @__PURE__ */ jsx(OverviewTab, { dataset: viewDataset, locale });
      case "stats":
        return /* @__PURE__ */ jsx(StatsTab, { dataset: viewDataset, locale });
      case "matchups":
        return /* @__PURE__ */ jsx(MatchupsTab, { dataset: viewDataset, locale });
      case "runes":
        return /* @__PURE__ */ jsx(RunesTab, { dataset: viewDataset, locale });
      case "builds":
        return /* @__PURE__ */ jsx(BuildsTab, { dataset: viewDataset, locale });
      case "champions":
        return /* @__PURE__ */ jsx(ChampionPoolTab, { dataset: viewDataset, locale });
      case "matches":
        return /* @__PURE__ */ jsx(MatchesTab, { dataset: viewDataset, locale });
    }
  }, [activeTab, coachDataset, viewDataset, locale, aiCoach, aiCoachLoading, aiCoachError, roleReferences, roleReferencesLoading, roleReferencesError]);
  const csBenchmark = useMemo(() => {
    if (!viewDataset?.rank) return null;
    return buildCs15Benchmark(roleFilter, viewDataset.rank.highest.tier, viewDataset.summary.avgCsAt15, locale);
  }, [roleFilter, viewDataset, locale]);
  const preferredRoles = useMemo(() => {
    if (!availableRoles.length) return ["ALL"];
    const priority = ["ALL", "JUNGLE", "TOP", "MIDDLE", "BOTTOM", "UTILITY", "NONE"];
    return [...availableRoles].sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
  }, [availableRoles]);
  const needsSampleBackfill = useMemo(() => {
    if (!dataset) return false;
    return dataset.matches.length < matchCount;
  }, [dataset, matchCount]);
  const needsBuildRehydration = useMemo(() => datasetNeedsBuildRehydration(dataset), [dataset]);
  const missingMatchesToTarget = useMemo(() => {
    if (!dataset) return 0;
    return Math.max(0, matchCount - dataset.matches.length);
  }, [dataset, matchCount]);
  const targetCountOptions = useMemo(
    () => buildTargetOptions(dataset?.matches.length ?? null, planEntitlements?.maxStoredMatchesPerProfile ?? 100),
    [dataset?.matches.length, planEntitlements?.maxStoredMatchesPerProfile]
  );
  const quickRefreshActions = useMemo(
    () => buildQuickRefreshActions(dataset?.matches.length ?? null, planEntitlements?.maxStoredMatchesPerProfile ?? 100),
    [dataset?.matches.length, planEntitlements?.maxStoredMatchesPerProfile]
  );
  const profileIconUrl = useMemo(
    () => getProfileIconUrl(dataset?.profile?.profileIconId, dataset?.ddragonVersion),
    [dataset?.profile?.profileIconId, dataset?.ddragonVersion]
  );
  const currentPlatformInfo = useMemo(
    () => getRiotPlatformInfo(dataset?.summary.platform ?? platform),
    [dataset?.summary.platform, platform]
  );
  const searchPreviewLabel = useMemo(() => {
    const trimmedGameName = gameName.trim() || (locale === "en" ? "GameName" : "Nombre");
    const trimmedTag = tagLine.trim() || (locale === "en" ? "TAG" : "TAG");
    const info = getRiotPlatformInfo(platform);
    return `${trimmedGameName}#${trimmedTag}${info ? ` \xB7 ${info.platform}` : ""}`;
  }, [gameName, tagLine, platform, locale]);
  useEffect(() => {
    if (!dataset || !gameName || !tagLine || !platform) {
      setCoachRoles([]);
      setLastGeneratedCoachScopeKey(null);
      return;
    }
    const defaultRoles = buildDefaultCoachRoles(dataset);
    try {
      const raw = window.localStorage.getItem(coachScopeStorageKey(gameName, tagLine, platform)) ?? window.localStorage.getItem(legacyCoachScopeStorageKey(gameName, tagLine));
      if (!raw) {
        setCoachRoles(defaultRoles);
        setLastGeneratedCoachScopeKey(null);
        return;
      }
      const parsed = JSON.parse(raw);
      const nextRoles = parsed.map((role) => role.trim().toUpperCase()).filter((role) => coachRoleOptions.includes(role)).slice(0, planEntitlements?.maxCoachRoles ?? 2);
      setCoachRoles(nextRoles.length ? nextRoles : defaultRoles);
      setLastGeneratedCoachScopeKey(null);
    } catch {
      setCoachRoles(defaultRoles);
      setLastGeneratedCoachScopeKey(null);
    }
  }, [dataset, gameName, tagLine, platform, coachRoleOptions, planEntitlements?.maxCoachRoles]);
  useEffect(() => {
    if (!availableRoles.includes(roleFilter)) {
      setRoleFilter("ALL");
    }
  }, [availableRoles, roleFilter]);
  useEffect(() => {
    setAICoach(null);
    setAICoachError(null);
    setLastAICoachRequestKey(null);
    setLastGeneratedCoachScopeKey(null);
  }, [gameName, tagLine, platform, locale, dataset?.summary.matches]);
  useEffect(() => {
    if (activeTab !== "coach" || !coachRequestKey || aiCoachLoading || coachScopeDirty) return;
    if (lastAICoachRequestKey === coachRequestKey) return;
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
        window.localStorage.setItem("don-sosa:last-profile", JSON.stringify({
          gameName: profile.gameName,
          tagLine: profile.tagLine,
          platform: profile.platform,
          matchCount: profile.matchCount
        }));
        return;
      } catch {
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
    setProgress({ stage: "queued", current: 0, total: 1, message: locale === "en" ? "Preparing analysis" : "Preparando an\xE1lisis" });
    try {
      const previousDataset = readCachedDataset(gameName, tagLine, platform);
      const shouldRefreshFullSample = !previousDataset || previousDataset.matches.length < cappedRequestedCount || datasetNeedsBuildRehydration(previousDataset);
      const result = await collectProfile(gameName, tagLine, cappedRequestedCount, {
        platform,
        locale,
        onProgress: (nextProgress) => setProgress(nextProgress),
        knownMatchIds: shouldRefreshFullSample ? [] : previousDataset.matches.map((match) => match.matchId)
      });
      const mergedDataset = shouldRefreshFullSample ? result : mergeDatasets(previousDataset, result, locale);
      setDataset(mergedDataset);
      setShowAccountControls(false);
      if (previousDataset && !shouldRefreshFullSample) {
        const addedMatches = mergedDataset.matches.length - previousDataset.matches.length;
        setSyncMessage(addedMatches > 0 ? locale === "en" ? `${addedMatches} new matches were added. The analysis keeps your previous history and recalculates everything by real date.` : `Se agregaron ${addedMatches} partidas nuevas. El an\xE1lisis mantiene el historial previo y recalcula todo por fecha real.` : locale === "en" ? "No new matches were found to add. The analysis keeps your current history without overwriting it." : "No aparecieron partidas nuevas para sumar. El an\xE1lisis mantiene tu hist\xF3rico actual sin sobrescribirlo.");
      } else if (previousDataset && shouldRefreshFullSample) {
        setSyncMessage(datasetNeedsBuildRehydration(previousDataset) ? locale === "en" ? `The sample was rebuilt with enriched timelines across ${mergedDataset.summary.matches} valid matches, so builds and item timings can refresh correctly.` : `Se reconstruy\xF3 la muestra con timelines enriquecidos en ${mergedDataset.summary.matches} partidas v\xE1lidas, para que builds y timings de items se refresquen bien.` : locale === "en" ? `The sample was rebuilt to ${mergedDataset.summary.matches} valid matches so the analysis is not biased by a smaller cache.` : `Se reconstruy\xF3 la muestra hasta ${mergedDataset.summary.matches} partidas v\xE1lidas para que el an\xE1lisis no quede sesgado por una cache m\xE1s chica.`);
      } else {
        setSyncMessage(locale === "en" ? `${mergedDataset.summary.matches} valid matches were loaded to build your first sample.` : `Se cargaron ${mergedDataset.summary.matches} partidas v\xE1lidas para construir tu primera muestra.`);
      }
      setMatchCount(cappedRequestedCount);
      setPlatform(mergedDataset.summary.platform ?? platform);
      window.localStorage.setItem("don-sosa:last-profile", JSON.stringify({ gameName, tagLine, platform: mergedDataset.summary.platform, matchCount: cappedRequestedCount }));
      window.localStorage.setItem(datasetStorageKey(gameName, tagLine, mergedDataset.summary.platform), JSON.stringify(mergedDataset));
      persistSavedProfile(mergedDataset, cappedRequestedCount);
      await refreshIdentity();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
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
      const next = current.includes(normalizedRole) ? current.filter((item) => item !== normalizedRole) : [...current, normalizedRole].slice(0, maxCoachRoles);
      if (gameName && tagLine && platform) {
        window.localStorage.setItem(coachScopeStorageKey(gameName, tagLine, platform), JSON.stringify(next));
      }
      return next;
    });
  }
  async function handleGenerateAICoach(force = false) {
    if (!gameName || !tagLine || !platform) return;
    if (!coachRoles.length) {
      setAICoachError(locale === "en" ? "Choose at least one role for coaching before generating the analysis." : "Eleg\xED al menos un rol para coaching antes de generar el an\xE1lisis.");
      return;
    }
    if (!coachHasSample) {
      setAICoachError(locale === "en" ? "The current coaching scope has no valid matches yet. Pick a role with sample or refresh the account first." : "El scope actual de coaching todav\xEDa no tiene partidas v\xE1lidas. Eleg\xED un rol con muestra o refresc\xE1 la cuenta primero.");
      return;
    }
    if (!coachRequestKey) return;
    if (!force && lastAICoachRequestKey === coachRequestKey) return;
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
        queueFilter: "ALL",
        windowFilter: "ALL"
      });
      setAICoach(result);
      setLastGeneratedCoachScopeKey(coachScopeKey);
      window.localStorage.setItem(coachScopeStorageKey(gameName, tagLine, platform), JSON.stringify(coachRoles));
      await refreshIdentity();
    } catch (err) {
      setAICoachError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAICoachLoading(false);
    }
  }
  async function handleAICoachFeedback(verdict) {
    if (!aiCoach?.generationId) return;
    try {
      await sendAICoachFeedback({
        generationId: aiCoach.generationId,
        verdict
      });
      setSyncMessage(locale === "en" ? "AI feedback saved. This will help us tighten future coaching blocks." : "Feedback de IA guardado. Esto nos va a ayudar a afinar futuros bloques de coaching.");
    } catch (err) {
      setAICoachError(err instanceof Error ? err.message : "Unknown error");
    }
  }
  async function handleStopImpersonation() {
    setAuthActionLoading(true);
    setAuthError(null);
    try {
      await stopAdminImpersonation();
      await refreshIdentity();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAuthActionLoading(false);
    }
  }
  async function handleAddCoachPlayer(mode) {
    setCoachRosterLoading(true);
    setAuthError(null);
    try {
      if (mode === "email") {
        if (!coachPlayerEmail.trim()) return;
        await addCoachPlayer({
          playerEmail: coachPlayerEmail.trim(),
          note: coachPlayerNote.trim() || void 0
        });
        setCoachPlayerEmail("");
      } else {
        if (!coachPlayerGameName.trim() || !coachPlayerTagLine.trim()) return;
        await addCoachPlayer({
          gameName: coachPlayerGameName.trim(),
          tagLine: coachPlayerTagLine.trim(),
          platform: coachPlayerPlatform,
          note: coachPlayerNote.trim() || void 0
        });
        setCoachPlayerGameName("");
        setCoachPlayerTagLine("");
      }
      setCoachPlayerNote("");
      await refreshCoachRoster();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCoachRosterLoading(false);
    }
  }
  async function handleRemoveCoachRosterPlayer(assignmentId) {
    setCoachRosterLoading(true);
    setAuthError(null);
    try {
      await removeCoachPlayer(assignmentId);
      await refreshCoachRoster();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setCoachRosterLoading(false);
    }
  }
  async function handleAdminRoleUpdate(userId, role) {
    setAuthActionLoading(true);
    setAuthError(null);
    try {
      await updateAdminUserRole(userId, role);
      await refreshAdminUsers();
      await refreshIdentity();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAuthActionLoading(false);
    }
  }
  async function handleAdminPlanUpdate(userId, planId) {
    setMembershipActionLoading(true);
    setAuthError(null);
    try {
      await updateAdminUserPlan(userId, planId);
      await refreshAdminUsers();
      await refreshIdentity();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setMembershipActionLoading(false);
    }
  }
  async function handleAdminImpersonation(userId) {
    setAuthActionLoading(true);
    setAuthError(null);
    try {
      await startAdminImpersonation(userId);
      await refreshIdentity();
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setAuthActionLoading(false);
    }
  }
  const progressStatusLabel = progress?.message ?? (matchCount >= 75 ? locale === "en" ? "Analyzing a large sample. This can take several minutes because of Riot rate limits." : "Analizando una muestra grande. Esto puede tardar varios minutos por los l\xEDmites de Riot." : locale === "en" ? "Analyzing matches. This can take anywhere from a few seconds to about a minute." : "Analizando partidas. Esto puede tardar entre unos segundos y alrededor de un minuto.");
  const progressPanel = loading && progress ? /* @__PURE__ */ jsxs("div", { style: progressPanelStyle, children: [
    /* @__PURE__ */ jsx("div", { style: { color: "#d8fdf1", fontSize: 13, lineHeight: 1.6 }, children: progressStatusLabel }),
    /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 8 }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", color: "#9eb0c7", fontSize: 12 }, children: [
        /* @__PURE__ */ jsx("span", { children: progress.stage }),
        /* @__PURE__ */ jsx("span", { children: `${Math.min(progress.current, progress.total)} / ${progress.total}` })
      ] }),
      /* @__PURE__ */ jsx("div", { style: { height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }, children: /* @__PURE__ */ jsx("div", { style: { width: `${Math.max(8, progress.current / Math.max(progress.total, 1) * 100)}%`, height: "100%", background: "#67d6a4" } }) })
    ] })
  ] }) : null;
  const activeProfileIdentity = dataset ? buildProfileIdentityKey(gameName || dataset.player, tagLine || dataset.tagLine, platform || dataset.summary.platform) : null;
  const activeSavedProfile = activeProfileIdentity ? savedProfiles.find((profile) => buildProfileIdentityKey(profile.gameName, profile.tagLine, profile.platform) === activeProfileIdentity) ?? null : null;
  const activeProfileCoverageLabel = activeSavedProfile ? formatSavedProfileCoverage(activeSavedProfile, locale) : locale === "en" ? `${dataset?.matches.length ?? 0} matches in the live block` : `${dataset?.matches.length ?? 0} partidas en el bloque activo`;
  const activeProfileFreshnessLabel = activeSavedProfile ? formatRelativeSyncTime(activeSavedProfile.lastSyncedAt, locale) : null;
  const activeProfileReadinessLabel = activeSavedProfile ? getSavedProfileReadinessLabel(activeSavedProfile, locale) : null;
  const linkedProfilesCount = membership?.linkedProfiles.length ?? savedProfiles.length;
  const coachWorkspaceRosterPlayers = useMemo(() => safeCoachRoster.map((entry) => {
    const rosterProfile = entry.profile ? {
      gameName: entry.profile.gameName,
      tagLine: entry.profile.tagLine,
      platform: entry.profile.platform
    } : null;
    const rosterProfileKey = rosterProfile ? buildProfileIdentityKey(rosterProfile.gameName, rosterProfile.tagLine, rosterProfile.platform) : null;
    const localProfile = rosterProfileKey ? savedProfiles.find((profile) => buildProfileIdentityKey(profile.gameName, profile.tagLine, profile.platform) === rosterProfileKey) ?? null : null;
    return {
      assignmentId: entry.assignmentId,
      displayName: rosterProfile ? `${rosterProfile.gameName}#${rosterProfile.tagLine}` : entry.user?.displayName ?? entry.user?.email ?? (locale === "en" ? "Roster player" : "Jugador del roster"),
      email: entry.user?.email ?? null,
      targetType: entry.targetType,
      linkedAt: entry.linkedAt,
      note: entry.note ?? null,
      isLoaded: Boolean(rosterProfileKey && activeProfileIdentity && rosterProfileKey === activeProfileIdentity),
      profile: rosterProfile,
      localProfile: localProfile ? {
        matches: localProfile.matches,
        targetMatches: Math.max(localProfile.matchCount, localProfile.matches),
        lastSyncedAt: localProfile.lastSyncedAt,
        rankLabel: localProfile.rankLabel,
        profileIconId: localProfile.profileIconId,
        ddragonVersion: localProfile.ddragonVersion
      } : null
    };
  }), [activeProfileIdentity, locale, safeCoachRoster, savedProfiles]);
  const accountHubTitle = !dataset ? locale === "en" ? "Load your next competitive profile" : "Carg\xE1 tu pr\xF3ximo perfil competitivo" : showAccountControls ? locale === "en" ? "Switch, recover or add another profile" : "Cambiar, recuperar o sumar otro perfil" : locale === "en" ? "Active improvement base" : "Base activa de mejora";
  const accountHubSubtitle = !dataset ? locale === "en" ? "Bring in the Riot profile you want to turn into a stable coaching base and choose how deep the first block should be." : "Tra\xE9 el perfil de Riot que quer\xE9s convertir en una base estable de coaching y eleg\xED qu\xE9 tan profundo quer\xE9s el primer bloque." : showAccountControls ? locale === "en" ? "Your live base stays pinned while you search another Riot ID, recover an old one or jump between saved profiles." : "Tu base activa queda fija mientras busc\xE1s otro Riot ID, recuper\xE1s uno anterior o salt\xE1s entre perfiles guardados." : locale === "en" ? "This profile is the live base for your dashboard, coaching and review decisions. Refresh only what is missing." : "Este perfil es la base activa para tu dashboard, tu coaching y tus decisiones de review. Refresc\xE1 solo lo que falte.";
  const savedProfilesPanel = savedProfiles.length ? /* @__PURE__ */ jsxs("div", { style: savedProfilesSectionStyle, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end", flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 3 }, children: [
        /* @__PURE__ */ jsx("div", { style: { color: "#8da0ba", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }, children: locale === "en" ? "Saved profiles" : "Perfiles guardados" }),
        /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 16, fontWeight: 800 }, children: locale === "en" ? "Your ready-to-switch profile locker" : "Tu locker listo para cambiar de perfil" })
      ] }),
      /* @__PURE__ */ jsx("div", { style: { color: "#8f9bad", fontSize: 13 }, children: locale === "en" ? `${savedProfiles.length} saved base${savedProfiles.length === 1 ? "" : "s"} on this device` : `${savedProfiles.length} base${savedProfiles.length === 1 ? "" : "s"} guardadas en este dispositivo` })
    ] }),
    /* @__PURE__ */ jsx("div", { style: savedProfilesGridStyle, children: savedProfiles.map((profile) => {
      const isActive = buildProfileIdentityKey(profile.gameName, profile.tagLine, profile.platform) === buildProfileIdentityKey(gameName, tagLine, platform);
      const rankTier = extractRankTierFromLabel(profile.rankLabel);
      const profileIcon = getProfileIconUrl(profile.profileIconId, profile.ddragonVersion ?? dataset?.ddragonVersion);
      const savedPlatformInfo = getRiotPlatformInfo(profile.platform);
      const readinessLabel = getSavedProfileReadinessLabel(profile, locale);
      const readinessTone = getSavedProfileReadinessTone(profile);
      const freshnessLabel = formatRelativeSyncTime(profile.lastSyncedAt, locale);
      const coverageLabel = formatSavedProfileCoverage(profile, locale);
      return /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: () => loadSavedProfile(profile),
          style: {
            ...savedProfileCardStyle,
            ...isActive ? activeSavedProfileCardStyle : {}
          },
          children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start" }, children: [
              /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: profileIcon ? "56px minmax(0, 1fr)" : "1fr", gap: 12, alignItems: "center", textAlign: "left", minWidth: 0 }, children: [
                profileIcon ? /* @__PURE__ */ jsx(
                  "img",
                  {
                    src: profileIcon,
                    alt: profile.gameName,
                    width: 56,
                    height: 56,
                    style: { ...profileIconStyle, width: 56, height: 56, objectFit: "cover", borderRadius: 14 }
                  }
                ) : null,
                /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 4, minWidth: 0 }, children: [
                  /* @__PURE__ */ jsxs("div", { style: { color: "#edf2ff", fontWeight: 800 }, children: [
                    profile.gameName,
                    /* @__PURE__ */ jsxs("span", { style: { color: "#8592a8" }, children: [
                      "#",
                      profile.tagLine
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, minWidth: 0 }, children: [
                    rankTier ? /* @__PURE__ */ jsx(RankEmblem, { tier: rankTier, label: profile.rankLabel ?? "", size: 40 }) : null,
                    /* @__PURE__ */ jsx("div", { style: { color: "#8390a6", fontSize: 12 }, children: profile.rankLabel ?? (locale === "en" ? "No visible rank" : "Sin rango visible") })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" }, children: [
                    savedPlatformInfo ? /* @__PURE__ */ jsx(Badge, { tone: "default", children: `${savedPlatformInfo.platform} \xB7 ${savedPlatformInfo.shortLabel}` }) : null,
                    /* @__PURE__ */ jsx(Badge, { tone: isActive ? "low" : readinessTone, children: isActive ? locale === "en" ? "Live base" : "Base activa" : readinessLabel })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsx(Badge, { tone: isActive ? "low" : "default", children: isActive ? locale === "en" ? "Active" : "Activa" : locale === "en" ? "Open" : "Abrir" })
            ] }),
            /* @__PURE__ */ jsxs("div", { className: "three-col-grid", style: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, textAlign: "left" }, children: [
              /* @__PURE__ */ jsxs("div", { style: savedProfileMetaStatStyle, children: [
                /* @__PURE__ */ jsx("div", { style: heroMetaLabelStyle, children: locale === "en" ? "Coverage" : "Cobertura" }),
                /* @__PURE__ */ jsx("div", { style: savedProfileMetaValueStyle, children: coverageLabel })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: savedProfileMetaStatStyle, children: [
                /* @__PURE__ */ jsx("div", { style: heroMetaLabelStyle, children: locale === "en" ? "Freshness" : "Actualizaci\xF3n" }),
                /* @__PURE__ */ jsx("div", { style: savedProfileMetaValueStyle, children: freshnessLabel })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: savedProfileMetaStatStyle, children: [
                /* @__PURE__ */ jsx("div", { style: heroMetaLabelStyle, children: locale === "en" ? "Target block" : "Bloque objetivo" }),
                /* @__PURE__ */ jsx("div", { style: savedProfileMetaValueStyle, children: locale === "en" ? `${profile.matchCount} target` : `${profile.matchCount} objetivo` })
              ] })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }, children: [
              /* @__PURE__ */ jsxs("div", { style: { color: "#748198", fontSize: 12, textAlign: "left" }, children: [
                locale === "en" ? "Last full sync" : "\xDAltima sync completa",
                " ",
                new Date(profile.lastSyncedAt).toLocaleDateString(locale === "en" ? "en-US" : "es-AR")
              ] }),
              /* @__PURE__ */ jsx("div", { style: { color: "#d8e6f7", fontSize: 12, fontWeight: 700 }, children: isActive ? locale === "en" ? "Currently driving your dashboard" : "Ahora est\xE1 manejando tu dashboard" : locale === "en" ? "Tap to switch the live base" : "Toc\xE1 para cambiar la base activa" })
            ] })
          ]
        },
        buildProfileIdentityKey(profile.gameName, profile.tagLine, profile.platform)
      );
    }) })
  ] }) : null;
  return /* @__PURE__ */ jsx(Shell, { children: /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 18, maxWidth: 1440, margin: "0 auto" }, children: [
    /* @__PURE__ */ jsxs("section", { style: topBarStyle, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 4 }, children: [
        /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em" }, children: "Don Sosa Coach" }),
        /* @__PURE__ */ jsx("div", { style: { color: "#8b96aa", fontSize: 13 }, children: locale === "en" ? "Premium coaching, review and progression tracking for League of Legends." : "Coaching premium, revisi\xF3n y seguimiento de progreso para League of Legends." })
      ] }),
      /* @__PURE__ */ jsx("div", { style: accountAccessStyle, children: authUser ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 6, minWidth: 0 }, children: [
          /* @__PURE__ */ jsx("div", { style: { color: "#7f90a8", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }, children: locale === "en" ? "Product account" : "Cuenta del producto" }),
          /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 15, fontWeight: 800 }, children: authUser.displayName }),
          /* @__PURE__ */ jsx("div", { style: { color: "#95a4b8", fontSize: 13, lineHeight: 1.55, maxWidth: 360 }, children: locale === "en" ? activeSavedProfile ? `${linkedProfilesCount} saved profiles, plan continuity and coaching history stay attached to your account while ${activeSavedProfile.gameName}#${activeSavedProfile.tagLine} remains the live base.` : "Your saved profiles, plan continuity and coaching history stay attached to this account across sessions." : activeSavedProfile ? `${linkedProfilesCount} perfiles guardados, continuidad del plan e historial de coaching quedan ligados a tu cuenta mientras ${activeSavedProfile.gameName}#${activeSavedProfile.tagLine} sigue siendo la base activa.` : "Tus perfiles guardados, la continuidad del plan y el historial de coaching quedan ligados a esta cuenta entre sesiones." }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
            authMe?.isImpersonating ? /* @__PURE__ */ jsx(Badge, { tone: "medium", children: locale === "en" ? "Impersonating" : "Suplantando" }) : null,
            actorUser ? /* @__PURE__ */ jsx(Badge, { tone: actorUser.role === "admin" ? "medium" : actorUser.role === "coach" ? "default" : "low", children: actorUser.role.toUpperCase() }) : null,
            currentPlan ? /* @__PURE__ */ jsx(Badge, { tone: "default", children: currentPlan.name }) : null,
            /* @__PURE__ */ jsx(Badge, { tone: "low", children: locale === "en" ? `${linkedProfilesCount} saved profiles` : `${linkedProfilesCount} perfiles guardados` })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("button", { type: "button", style: accountTriggerStyle, onClick: () => openAccountPanel(), children: [
          /* @__PURE__ */ jsxs("span", { style: { display: "flex", gap: 12, alignItems: "center", minWidth: 0 }, children: [
            /* @__PURE__ */ jsx("span", { style: accountAvatarStyle, children: (authUser.displayName || authUser.email || "D").slice(0, 1).toUpperCase() }),
            /* @__PURE__ */ jsxs("span", { style: { display: "grid", gap: 2, minWidth: 0, textAlign: "left" }, children: [
              /* @__PURE__ */ jsx("span", { style: { color: "#eef4ff", fontWeight: 800, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis" }, children: authUser.displayName }),
              /* @__PURE__ */ jsx("span", { style: { color: "#8692a7", fontSize: 11 }, children: locale === "en" ? "Account base, plan and settings" : "Base de cuenta, plan y ajustes" })
            ] })
          ] }),
          /* @__PURE__ */ jsx("span", { style: accountTriggerMetaStyle, children: locale === "en" ? "Open hub" : "Abrir hub" })
        ] })
      ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 4, minWidth: 0 }, children: [
          /* @__PURE__ */ jsx("div", { style: { color: "#7f90a8", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }, children: locale === "en" ? "Product account" : "Cuenta del producto" }),
          /* @__PURE__ */ jsx("div", { style: { color: "#95a4b8", fontSize: 13, lineHeight: 1.55, maxWidth: 300 }, children: locale === "en" ? "Save your competitive base, coaching history and plan continuity under one real account, not only in this browser." : "Guard\xE1 tu base competitiva, tu historial de coaching y la continuidad del plan en una cuenta real y no solo en este navegador." })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }, children: [
          /* @__PURE__ */ jsx("button", { type: "button", style: secondaryButtonStyle, onClick: () => {
            setAuthMode("login");
            openAccountPanel("auth");
          }, children: locale === "en" ? "Login" : "Ingresar" }),
          /* @__PURE__ */ jsx("button", { type: "button", style: buttonStyle, onClick: () => {
            setAuthMode("signup");
            openAccountPanel("auth");
          }, children: locale === "en" ? "Create account" : "Crear cuenta" })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx(
      AccountCenter,
      {
        open: accountPanelOpen,
        locale,
        authUser,
        actorUser,
        authMe,
        currentPlan,
        currentPlanPriceLabel,
        membership,
        membershipCatalog,
        billingReady,
        canOpenBillingPortal,
        canManageCoachRoster,
        isAdmin,
        accountPanelTab,
        authMode,
        authEmail,
        authPassword,
        authDisplayName,
        resetToken,
        newPassword,
        resetTokenPreview,
        resetLinkPreview,
        authActionLoading,
        membershipActionLoading,
        authError,
        membershipError,
        adminLoading,
        safeAdminUsers,
        coachRosterLoading,
        safeCoachRoster,
        coachPlayerEmail,
        coachPlayerGameName,
        coachPlayerTagLine,
        coachPlayerPlatform,
        coachPlayerNote,
        onClose: () => setAccountPanelOpen(false),
        onTabChange: setAccountPanelTab,
        onAuthModeChange: setAuthMode,
        onAuthEmailChange: setAuthEmail,
        onAuthPasswordChange: setAuthPassword,
        onAuthDisplayNameChange: setAuthDisplayName,
        onResetTokenChange: setResetToken,
        onNewPasswordChange: setNewPassword,
        onCoachPlayerEmailChange: setCoachPlayerEmail,
        onCoachPlayerGameNameChange: setCoachPlayerGameName,
        onCoachPlayerTagLineChange: setCoachPlayerTagLine,
        onCoachPlayerPlatformChange: (value) => setCoachPlayerPlatform(value),
        onCoachPlayerNoteChange: setCoachPlayerNote,
        onAuthSubmit: handleAuthSubmit,
        onResetPasswordConfirm: handleResetPasswordConfirm,
        onLogout: handleLogout,
        onPasswordChange: handlePasswordChange,
        onBillingPortal: handleBillingPortal,
        onCheckout: handleCheckout,
        onDevPlanChange: handleDevPlanChange,
        onStopImpersonation: handleStopImpersonation,
        onAddCoachPlayer: handleAddCoachPlayer,
        onRemoveCoachPlayer: handleRemoveCoachRosterPlayer,
        onAdminRoleChange: handleAdminRoleUpdate,
        onAdminPlanChange: handleAdminPlanUpdate,
        onAdminImpersonation: handleAdminImpersonation
      }
    ),
    /* @__PURE__ */ jsxs("section", { style: heroGridStyle, children: [
      !dataset ? /* @__PURE__ */ jsx("div", { style: heroIntroPanelStyle, children: /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 12 }, children: [
        /* @__PURE__ */ jsx("div", { style: { color: "#8b94a4", textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12 }, children: "Don Sosa Coach" }),
        /* @__PURE__ */ jsx("h1", { style: { margin: 0, fontSize: 46, letterSpacing: "-0.05em", maxWidth: 760 }, children: locale === "en" ? "A competitive read of your play, not just another stats page" : "Tu lectura competitiva para jugar mejor, no solo mirar stats" }),
        /* @__PURE__ */ jsx("p", { style: { margin: 0, color: "#9099aa", maxWidth: 760, lineHeight: 1.7 }, children: locale === "en" ? "Clear diagnosis, actionable decisions and an organized view of matchups, runes, champions and review. First you understand what to fix, then you go deeper." : "Diagn\xF3stico claro, decisiones accionables y una vista ordenada de matchups, runas, campeones y revisi\xF3n. Primero entend\xE9s qu\xE9 corregir; despu\xE9s entr\xE1s al detalle." }),
        !loading ? /* @__PURE__ */ jsx("div", { className: "three-col-grid", style: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }, children: [
          {
            title: locale === "en" ? "Coaching by role and live patch" : "Coaching por rol y parche live",
            body: locale === "en" ? "The product reads your account through role scope, champion context and the current Riot patch instead of recycling generic league advice." : "El producto lee tu cuenta a trav\xE9s del alcance por rol, el contexto del campe\xF3n y el parche actual de Riot en vez de reciclar consejos gen\xE9ricos."
          },
          {
            title: locale === "en" ? "One saved account, evolving reads" : "Una cuenta guardada, lecturas que evolucionan",
            body: locale === "en" ? "Snapshots, continuity and cached coaching keep the analysis stable while new matches update the story without wasting tokens." : "Snapshots, continuidad y coaching cacheado mantienen el an\xE1lisis estable mientras las partidas nuevas actualizan la historia sin gastar tokens de m\xE1s."
          },
          {
            title: locale === "en" ? "Built for players and coaches" : "Hecho para jugadores y coaches",
            body: locale === "en" ? "A serious player gets a cleaner improvement loop, and a coach gets the base to manage players, review progress and scale feedback." : "Un jugador serio consigue un loop de mejora m\xE1s claro, y un coach tiene la base para gestionar jugadores, revisar progreso y escalar feedback."
          }
        ].map((item) => /* @__PURE__ */ jsxs("div", { style: softPanelStyle, children: [
          /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontWeight: 800 }, children: item.title }),
          /* @__PURE__ */ jsx("div", { style: { color: "#8f9bad", fontSize: 13, lineHeight: 1.65 }, children: item.body })
        ] }, item.title)) }) : null
      ] }) }) : /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 16 }, children: [
        /* @__PURE__ */ jsx("div", { style: heroIntroPanelStyle, children: /* @__PURE__ */ jsxs("div", { style: profileHeroPanelStyle, children: [
          /* @__PURE__ */ jsxs("div", { className: "profile-hero-grid", style: { display: "grid", gridTemplateColumns: "minmax(0, 1.18fr) minmax(300px, 0.82fr)", gap: 20, alignItems: "start" }, children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 14 }, children: [
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }, children: [
                /* @__PURE__ */ jsx("div", { style: { color: "#8b94a4", textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12 }, children: locale === "en" ? "Live improvement base" : "Base activa de mejora" }),
                /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
                  /* @__PURE__ */ jsx(Badge, { tone: "low", children: locale === "en" ? "Saved competitive base" : "Base competitiva guardada" }),
                  activeProfileFreshnessLabel ? /* @__PURE__ */ jsx(Badge, { tone: "default", children: locale === "en" ? `Synced ${activeProfileFreshnessLabel}` : `Sync ${activeProfileFreshnessLabel}` }) : null
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: profileIconUrl ? "104px minmax(0, 1fr)" : "1fr", gap: 18, alignItems: "start" }, children: [
                profileIconUrl ? /* @__PURE__ */ jsx(
                  "img",
                  {
                    src: profileIconUrl,
                    alt: dataset.player,
                    width: 104,
                    height: 104,
                    style: { ...profileIconStyle, width: 104, height: 104, objectFit: "cover", borderRadius: 24, boxShadow: "0 18px 40px rgba(0,0,0,0.24)" }
                  }
                ) : null,
                /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 10, minWidth: 0, alignContent: "start" }, children: [
                  /* @__PURE__ */ jsxs("h1", { style: { margin: 0, fontSize: 38, letterSpacing: "-0.05em", lineHeight: 1.02 }, children: [
                    dataset.player,
                    /* @__PURE__ */ jsxs("span", { style: { color: "#8894ab" }, children: [
                      "#",
                      dataset.tagLine
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }, children: [
                    dataset.profile ? /* @__PURE__ */ jsx(Badge, { children: locale === "en" ? `Level ${dataset.profile.summonerLevel}` : `Nivel ${dataset.profile.summonerLevel}` }) : null,
                    currentPlatformInfo ? /* @__PURE__ */ jsx(Badge, { tone: "default", children: `${currentPlatformInfo.platform} \xB7 ${currentPlatformInfo.shortLabel}` }) : null
                  ] }),
                  /* @__PURE__ */ jsx("p", { style: { margin: 0, color: "#96a1b4", maxWidth: 620, lineHeight: 1.62 }, children: locale === "en" ? "This is the profile your dashboard, coaching queue and review priorities are anchored to. You can move across the product without losing the main competitive read." : "Este es el perfil sobre el que se anclan tu dashboard, la cola de coaching y las prioridades de review. Pod\xE9s moverte por el producto sin perder la lectura competitiva principal." }),
                  /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
                    /* @__PURE__ */ jsx(Badge, { tone: "default", children: activeProfileCoverageLabel }),
                    activeProfileReadinessLabel ? /* @__PURE__ */ jsx(Badge, { tone: "low", children: activeProfileReadinessLabel }) : null,
                    /* @__PURE__ */ jsx(Badge, { tone: coachScopeDirty ? "medium" : "default", children: coachScopeDirty ? locale === "en" ? "Focus changed, refresh pending" : "El foco cambi\xF3, falta refresh" : locale === "en" ? "Focus locked for coaching" : "Foco fijado para coaching" })
                  ] }),
                  /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, flexWrap: "wrap" }, children: [
                    /* @__PURE__ */ jsx("button", { type: "button", style: secondaryButtonStyle, onClick: () => setShowAccountControls(true), children: locale === "en" ? "Switch profile" : "Cambiar perfil" }),
                    /* @__PURE__ */ jsx("button", { type: "button", style: secondaryButtonStyle, onClick: () => openAccountPanel(authUser ? "profile" : "auth"), children: authUser ? locale === "en" ? "Open product account" : "Abrir cuenta del producto" : locale === "en" ? "Create product account" : "Crear cuenta del producto" })
                  ] })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { style: profileRankColumnStyle, children: dataset.rank ? /* @__PURE__ */ jsx(RankBadge, { rank: dataset.rank, compact: true, locale }) : /* @__PURE__ */ jsxs("div", { style: profileRankEmptyStyle, children: [
              /* @__PURE__ */ jsx("div", { style: { color: "#8ea0b6", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }, children: locale === "en" ? "Visible rank" : "Rango visible" }),
              /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 18, fontWeight: 800 }, children: locale === "en" ? "No rank loaded yet" : "Todav\xEDa no hay rango cargado" }),
              /* @__PURE__ */ jsx("div", { style: { color: "#8f9bad", fontSize: 13, lineHeight: 1.55 }, children: locale === "en" ? "The profile is still useful for coaching and scope decisions." : "El perfil igual sirve para coaching y para decidir el scope." })
            ] }) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "four-col-grid", style: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }, children: [
            /* @__PURE__ */ jsxs("div", { style: profileMetaCardStyle, children: [
              /* @__PURE__ */ jsx("div", { style: heroMetaLabelStyle, children: locale === "en" ? "Competitive block" : "Bloque competitivo" }),
              /* @__PURE__ */ jsx("div", { style: heroMetaValueStyle, children: coachDataset?.summary.matches ?? dataset.summary.matches }),
              /* @__PURE__ */ jsx("div", { style: heroMetaSubtleStyle, children: coachRoles.length ? coachScopeLabel : locale === "en" ? "all saved roles in the base" : "todos los roles guardados en la base" })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: profileMetaCardStyle, children: [
              /* @__PURE__ */ jsx("div", { style: heroMetaLabelStyle, children: locale === "en" ? "Current block WR" : "WR del bloque" }),
              /* @__PURE__ */ jsxs("div", { style: heroMetaValueStyle, children: [
                coachDataset?.summary.winRate ?? dataset.summary.winRate,
                "%"
              ] }),
              /* @__PURE__ */ jsx("div", { style: heroMetaSubtleStyle, children: `${coachDataset?.summary.wins ?? dataset.summary.wins}-${coachDataset?.summary.losses ?? dataset.summary.losses}` })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: profileMetaCardStyle, children: [
              /* @__PURE__ */ jsx("div", { style: heroMetaLabelStyle, children: locale === "en" ? "Form score" : "Score de forma" }),
              /* @__PURE__ */ jsx("div", { style: heroMetaValueStyle, children: coachDataset?.summary.avgPerformanceScore ?? dataset.summary.avgPerformanceScore }),
              /* @__PURE__ */ jsx("div", { style: heroMetaSubtleStyle, children: `CS@15 ${coachDataset?.summary.avgCsAt15 ?? dataset.summary.avgCsAt15} \xB7 Gold@15 ${coachDataset?.summary.avgGoldAt15 ?? dataset.summary.avgGoldAt15}` })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: profileMetaCardStyle, children: [
              /* @__PURE__ */ jsx("div", { style: heroMetaLabelStyle, children: locale === "en" ? "Ranked context" : "Contexto ranked" }),
              /* @__PURE__ */ jsx("div", { style: { ...heroMetaValueStyle, fontSize: 18 }, children: formatQueueSummary(dataset, locale) }),
              /* @__PURE__ */ jsx("div", { style: heroMetaSubtleStyle, children: locale === "en" ? "The queue mix behind this base" : "La mezcla de colas detr\xE1s de esta base" })
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ jsx(
          Card,
          {
            title: locale === "en" ? "Improvement focus" : "Foco de mejora",
            subtitle: locale === "en" ? "Choose the one or two roles you actually want to improve next. This focus changes the main coaching read, not your saved match history." : "Eleg\xED el o los dos roles que realmente quer\xE9s mejorar ahora. Este foco cambia la lectura principal del coaching, no tu historial guardado de partidas.",
            children: /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 14 }, children: [
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
                /* @__PURE__ */ jsx(Badge, { tone: "low", children: locale === "en" ? "Shapes the main coaching read" : "Moldea la lectura principal del coaching" }),
                /* @__PURE__ */ jsx(Badge, { tone: "default", children: locale === "en" ? "Stats, matchups and profile history stay intact" : "Stats, matchups e historial del perfil quedan intactos" })
              ] }),
              /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: coachRoleOptions.map((role) => {
                const selected = coachRoles.includes(role);
                const maxRolesReached = !selected && coachRoles.length >= (planEntitlements?.maxCoachRoles ?? 2);
                return /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    disabled: maxRolesReached,
                    onClick: () => toggleCoachRole(role),
                    style: {
                      ...rolePillStyle,
                      ...selected ? activeRolePillStyle : {},
                      borderColor: selected ? "rgba(216,253,241,0.26)" : "rgba(255,255,255,0.07)",
                      opacity: maxRolesReached ? 0.45 : 1,
                      cursor: maxRolesReached ? "not-allowed" : "pointer"
                    },
                    children: locale === "en" ? translateRole(role, "en") : getRoleLabel(role)
                  },
                  role
                );
              }) }),
              /* @__PURE__ */ jsxs("div", { className: "three-col-grid", style: { display: "grid", gridTemplateColumns: "1.2fr repeat(2, minmax(0, 1fr))", gap: 12 }, children: [
                /* @__PURE__ */ jsxs("div", { style: scopeMetaCardStyle, children: [
                  /* @__PURE__ */ jsx("div", { style: heroMetaLabelStyle, children: locale === "en" ? "Current focus" : "Foco actual" }),
                  /* @__PURE__ */ jsx("div", { style: { ...heroMetaValueStyle, fontSize: 20 }, children: coachScopeLabel }),
                  /* @__PURE__ */ jsx("div", { style: heroMetaSubtleStyle, children: coachRoles.length >= (planEntitlements?.maxCoachRoles ?? 2) ? locale === "en" ? "Maximum focus width for this plan" : "M\xE1ximo de amplitud para este plan" : locale === "en" ? `You can still add ${(planEntitlements?.maxCoachRoles ?? 2) - coachRoles.length} more role` : `Todav\xEDa pod\xE9s sumar ${(planEntitlements?.maxCoachRoles ?? 2) - coachRoles.length} rol m\xE1s` })
                ] }),
                /* @__PURE__ */ jsxs("div", { style: scopeMetaCardStyle, children: [
                  /* @__PURE__ */ jsx("div", { style: heroMetaLabelStyle, children: locale === "en" ? "Refresh behavior" : "Comportamiento del refresh" }),
                  /* @__PURE__ */ jsx("div", { style: { ...heroMetaValueStyle, fontSize: 20 }, children: locale === "en" ? "You decide when" : "Lo decid\xEDs vos" }),
                  /* @__PURE__ */ jsx("div", { style: heroMetaSubtleStyle, children: locale === "en" ? "Changing this focus does not regenerate coaching until you run a refresh." : "Cambiar este foco no regenera el coaching hasta que corras un refresh." })
                ] }),
                /* @__PURE__ */ jsxs("div", { style: scopeMetaCardStyle, children: [
                  /* @__PURE__ */ jsx("div", { style: heroMetaLabelStyle, children: locale === "en" ? "Saved queue context" : "Contexto guardado de colas" }),
                  /* @__PURE__ */ jsx("div", { style: { ...heroMetaValueStyle, fontSize: 20 }, children: formatQueueSummary(dataset, locale) }),
                  /* @__PURE__ */ jsx("div", { style: heroMetaSubtleStyle, children: locale === "en" ? "The ranked environment behind this coaching read" : "El entorno ranked detr\xE1s de esta lectura de coaching" })
                ] })
              ] }),
              coachScopeDirty ? /* @__PURE__ */ jsx("div", { style: scopeStatusStyle, children: locale === "en" ? `Your focus changed to ${coachScopeLabel}. Refresh when you want this role mix to become the new live coaching read.` : `Tu foco cambi\xF3 a ${coachScopeLabel}. Actualiz\xE1 cuando quieras que esta mezcla de roles pase a ser la nueva lectura viva del coaching.` }) : null
            ] })
          }
        )
      ] }),
      /* @__PURE__ */ jsxs(
        Card,
        {
          title: accountHubTitle,
          subtitle: accountHubSubtitle,
          children: [
            progressPanel,
            showAccountControls || !dataset ? /* @__PURE__ */ jsxs("form", { onSubmit: handleSubmit, style: { display: "grid", gap: 16 }, children: [
              dataset ? /* @__PURE__ */ jsx("div", { style: softPanelStyle, children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }, children: [
                /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 4 }, children: [
                  /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", lineHeight: 1.5, fontWeight: 700 }, children: gameName && tagLine ? `${gameName}#${tagLine}` : locale === "en" ? "Current active account" : "Cuenta activa actual" }),
                  /* @__PURE__ */ jsx("div", { style: { color: "#8a95a8", fontSize: 13, lineHeight: 1.6 }, children: locale === "en" ? "This live base stays in place while you look for another Riot ID or reopen one from your saved locker." : "Esta base activa queda en su lugar mientras busc\xE1s otro Riot ID o reabr\xEDs uno desde tu locker guardado." }),
                  /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
                    /* @__PURE__ */ jsx(Badge, { tone: "default", children: activeProfileCoverageLabel }),
                    activeProfileFreshnessLabel ? /* @__PURE__ */ jsx(Badge, { tone: "low", children: locale === "en" ? `Synced ${activeProfileFreshnessLabel}` : `Sync ${activeProfileFreshnessLabel}` }) : null
                  ] })
                ] }),
                /* @__PURE__ */ jsx("button", { type: "button", style: secondaryButtonStyle, onClick: () => setShowAccountControls(false), children: locale === "en" ? "Back to live base" : "Volver a la base activa" })
              ] }) }) : null,
              /* @__PURE__ */ jsxs("div", { style: riotSearchShellStyle, children: [
                /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 5 }, children: [
                  /* @__PURE__ */ jsx("div", { style: { color: "#8da0ba", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }, children: locale === "en" ? "Riot profile lookup" : "B\xFAsqueda de perfil Riot" }),
                  /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 16, fontWeight: 800 }, children: searchPreviewLabel })
                ] }),
                /* @__PURE__ */ jsxs("div", { className: "five-col-grid", style: riotSearchRowStyle, children: [
                  /* @__PURE__ */ jsxs("label", { style: { ...fieldBlockStyle, minWidth: 0 }, children: [
                    /* @__PURE__ */ jsx("span", { style: fieldLabelStyle, children: locale === "en" ? "Game name" : "Nombre en juego" }),
                    /* @__PURE__ */ jsx("input", { value: gameName, onChange: (e) => setGameName(e.target.value), placeholder: locale === "en" ? "For example, Faker" : "Por ejemplo, Don Sosa", style: riotSearchInputStyle })
                  ] }),
                  /* @__PURE__ */ jsxs("label", { style: { ...fieldBlockStyle, minWidth: 0 }, children: [
                    /* @__PURE__ */ jsx("span", { style: fieldLabelStyle, children: locale === "en" ? "Tag" : "Tag" }),
                    /* @__PURE__ */ jsxs("div", { style: tagInputShellStyle, children: [
                      /* @__PURE__ */ jsx("span", { style: tagPrefixStyle, children: "#" }),
                      /* @__PURE__ */ jsx("input", { value: tagLine, onChange: (e) => setTagLine(normalizeTagLineInput(e.target.value)), placeholder: locale === "en" ? "KR1" : "LAS", style: tagInputStyle })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxs("label", { style: { ...fieldBlockStyle, minWidth: 0 }, children: [
                    /* @__PURE__ */ jsx("span", { style: fieldLabelStyle, children: locale === "en" ? "Platform" : "Platform" }),
                    /* @__PURE__ */ jsx("select", { value: platform, onChange: (e) => setPlatform(e.target.value), style: riotSearchInputStyle, children: supportedRiotPlatforms.map((platformCode) => {
                      const info = getRiotPlatformInfo(platformCode);
                      return /* @__PURE__ */ jsx("option", { value: platformCode, children: info ? `${info.platform} \xB7 ${info.shortLabel}` : platformCode }, platformCode);
                    }) })
                  ] }),
                  /* @__PURE__ */ jsxs("label", { style: { ...fieldBlockStyle, minWidth: 0 }, children: [
                    /* @__PURE__ */ jsx("span", { style: fieldLabelStyle, children: locale === "en" ? "Sample" : "Muestra" }),
                    /* @__PURE__ */ jsx("select", { value: matchCount, onChange: (e) => setMatchCount(Number(e.target.value)), style: riotSearchInputStyle, children: targetCountOptions.map((count) => /* @__PURE__ */ jsxs("option", { value: count, children: [
                      count,
                      " ",
                      locale === "en" ? "matches" : "partidas"
                    ] }, count)) })
                  ] }),
                  /* @__PURE__ */ jsx("button", { type: "submit", style: { ...buttonStyle, minHeight: 52 }, children: loading ? locale === "en" ? "Analyzing..." : "Analizando..." : locale === "en" ? "Build first analysis" : "Construir primer an\xE1lisis" })
                ] })
              ] }),
              savedProfilesPanel,
              /* @__PURE__ */ jsxs("div", { className: "two-col-grid", style: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }, children: [
                /* @__PURE__ */ jsxs("div", { style: softPanelStyle, children: [
                  /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontWeight: 700 }, children: locale === "en" ? "Server route" : "Ruta del servidor" }),
                  /* @__PURE__ */ jsx("div", { style: { color: "#8f9bad", fontSize: 13, lineHeight: 1.6 }, children: currentPlatformInfo ? locale === "en" ? `${currentPlatformInfo.label} uses Riot regional route ${currentPlatformInfo.regionalRoute}. This only changes where we fetch the profile from, not the product language.` : `${currentPlatformInfo.label} usa el regional route ${currentPlatformInfo.regionalRoute} de Riot. Esto solo cambia desde d\xF3nde traemos el perfil, no el idioma del producto.` : locale === "en" ? "Choose the Riot platform where this player actually queues." : "Eleg\xED la platform de Riot donde este jugador realmente hace cola." })
                ] }),
                /* @__PURE__ */ jsxs("div", { style: softPanelStyle, children: [
                  /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 4 }, children: [
                    /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontWeight: 700 }, children: locale === "en" ? "How deep to start" : "Qu\xE9 tan profundo arrancar" }),
                    /* @__PURE__ */ jsx("div", { style: { color: "#8f9bad", fontSize: 13, lineHeight: 1.6 }, children: matchCount >= 100 ? locale === "en" ? `A ${Math.min(100, planEntitlements?.maxStoredMatchesPerProfile ?? 100)}-match baseline gives the cleanest first read, but it may take longer because of Riot rate limits.` : `Una base de ${Math.min(100, planEntitlements?.maxStoredMatchesPerProfile ?? 100)} partidas da la lectura inicial m\xE1s limpia, pero puede tardar m\xE1s por los l\xEDmites de Riot.` : locale === "en" ? "Start lighter if you want speed, then deepen the block when you want a more stable reference frame." : "Empez\xE1 m\xE1s liviano si quer\xE9s velocidad y profundiz\xE1 el bloque cuando quieras un marco de referencia m\xE1s estable." })
                  ] }),
                  !dataset && gameName && tagLine ? /* @__PURE__ */ jsx("div", { style: { color: "#a5b2c6", fontSize: 13, lineHeight: 1.6 }, children: locale === "en" ? "Once loaded, this profile stays saved here and later refreshes only fill what is missing instead of starting from zero." : "Una vez cargado, este perfil queda guardado ac\xE1 y los refreshes siguientes solo completan lo que falta en vez de empezar de cero." }) : null
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }, children: [
                /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
                  /* @__PURE__ */ jsx(Badge, { tone: "default", children: locale === "en" ? `${matchCount} match target` : `Objetivo de ${matchCount} partidas` }),
                  planEntitlements ? /* @__PURE__ */ jsx(Badge, { tone: "low", children: locale === "en" ? `Plan cap ${planEntitlements.maxStoredMatchesPerProfile}` : `Tope del plan ${planEntitlements.maxStoredMatchesPerProfile}` }) : null,
                  /* @__PURE__ */ jsx(Badge, { tone: "low", children: locale === "en" ? "Improvement focus is chosen after the profile loads" : "El foco de mejora se elige despu\xE9s de cargar el perfil" })
                ] }),
                /* @__PURE__ */ jsx("div", { style: { color: "#8f9bad", fontSize: 13 }, children: locale === "en" ? "You can search any supported Riot platform without changing the product language." : "Pod\xE9s buscar cualquier platform soportada de Riot sin cambiar el idioma del producto." })
              ] })
            ] }) : /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 14 }, children: [
              /* @__PURE__ */ jsxs("div", { style: softPanelStyle, children: [
                /* @__PURE__ */ jsx("div", { style: { color: "#e7eef8", lineHeight: 1.5, fontWeight: 700 }, children: gameName && tagLine ? `${gameName}#${tagLine}` : locale === "en" ? "Profile ready to grow" : "Perfil listo para crecer" }),
                /* @__PURE__ */ jsx("div", { style: { color: "#8a95a8", fontSize: 13, lineHeight: 1.6 }, children: locale === "en" ? `Saved block: ${dataset.matches.length} matches. Decide whether you want to top it up lightly, deepen it or complete the whole baseline.` : `Bloque guardado: ${dataset.matches.length} partidas. Decid\xED si quer\xE9s completarlo un poco, profundizarlo o cerrar toda la base.` }),
                currentPlatformInfo ? /* @__PURE__ */ jsx("div", { style: { color: "#748198", fontSize: 12 }, children: locale === "en" ? `Platform ${currentPlatformInfo.platform} \xB7 ${currentPlatformInfo.label}` : `Platform ${currentPlatformInfo.platform} \xB7 ${currentPlatformInfo.label}` }) : null
              ] }),
              syncMessage ? /* @__PURE__ */ jsx("div", { style: syncMessageStyle, children: syncMessage }) : null,
              /* @__PURE__ */ jsx("div", { style: { display: "grid", gap: 10 }, children: quickRefreshActions.length ? /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 8 }, children: [
                /* @__PURE__ */ jsx("div", { style: fieldLabelStyle, children: locale === "en" ? "Quick top-up" : "Carga r\xE1pida" }),
                /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: quickRefreshActions.map((action) => /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    style: secondaryButtonStyle,
                    onClick: () => void runAnalysis(action.target),
                    disabled: loading,
                    children: action.id === "complete" ? locale === "en" ? `Complete to ${action.target}` : `Completar a ${action.target}` : `${action.label} ${locale === "en" ? "match" : "partida"}${action.label === "+1" ? "" : "s"}`
                  },
                  action.id
                )) })
              ] }) : null }),
              /* @__PURE__ */ jsxs("div", { className: "two-col-grid", style: { display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 12 }, children: [
                /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 6 }, children: [
                  /* @__PURE__ */ jsx("div", { style: fieldLabelStyle, children: locale === "en" ? "Target block" : "Bloque objetivo" }),
                  /* @__PURE__ */ jsx("select", { value: matchCount, onChange: (e) => setMatchCount(Number(e.target.value)), style: selectStyle, children: targetCountOptions.map((count) => /* @__PURE__ */ jsxs("option", { value: count, children: [
                    count,
                    " ",
                    locale === "en" ? "matches" : "partidas"
                  ] }, count)) })
                ] }),
                /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 6 }, children: [
                  /* @__PURE__ */ jsx("div", { style: fieldLabelStyle, children: locale === "en" ? "Coaching scope" : "Alcance del coaching" }),
                  /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
                    /* @__PURE__ */ jsx(Badge, { tone: "default", children: coachScopeLabel }),
                    dataset?.remakesExcluded ? /* @__PURE__ */ jsx(Badge, { tone: "medium", children: locale === "en" ? `${dataset.remakesExcluded} remakes excluded` : `${dataset.remakesExcluded} remakes excluidos` }) : null,
                    needsSampleBackfill ? /* @__PURE__ */ jsx(Badge, { tone: "medium", children: locale === "en" ? `${missingMatchesToTarget} matches left to complete the base` : `Faltan ${missingMatchesToTarget} partidas para completar la base` }) : /* @__PURE__ */ jsx(Badge, { tone: "low", children: locale === "en" ? "Base already complete" : "Base ya completa" }),
                    needsBuildRehydration ? /* @__PURE__ */ jsx(Badge, { tone: "medium", children: locale === "en" ? "Build timelines need refresh" : "Las timelines de build necesitan refresh" }) : null,
                    currentPlatformInfo ? /* @__PURE__ */ jsx(Badge, { tone: "default", children: currentPlatformInfo.platform }) : null,
                    planEntitlements ? /* @__PURE__ */ jsx(Badge, { tone: "default", children: `${dataset.matches.length}/${planEntitlements.maxStoredMatchesPerProfile}` }) : null
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, flexWrap: "wrap" }, children: [
                /* @__PURE__ */ jsx("button", { type: "button", style: buttonStyle, onClick: () => void runAnalysis(), children: loading ? locale === "en" ? "Analyzing..." : "Analizando..." : needsBuildRehydration ? locale === "en" ? "Rebuild the enriched base" : "Reconstruir la base enriquecida" : needsSampleBackfill ? locale === "en" ? `Complete to ${matchCount} matches` : `Completar hasta ${matchCount} partidas` : locale === "en" ? "Check for new matches" : "Buscar partidas nuevas" }),
                /* @__PURE__ */ jsx("button", { type: "button", style: secondaryButtonStyle, onClick: () => setShowAccountControls(true), children: locale === "en" ? "Switch profile" : "Cambiar perfil" })
              ] })
            ] }),
            !showAccountControls && dataset ? savedProfilesPanel : null
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("section", { style: { display: "grid", gap: 12 }, children: [
      viewDataset && activeTab !== "coach" ? /* @__PURE__ */ jsxs("div", { style: roleFilterPanelStyle, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 3 }, children: [
          /* @__PURE__ */ jsx("div", { style: { color: "#8da0ba", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }, children: locale === "en" ? "Exploration scope" : "Scope de exploraci\xF3n" }),
          /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 16, fontWeight: 800 }, children: locale === "en" ? "Inspect the exact slice without touching the main coaching read" : "Inspeccion\xE1 el recorte exacto sin tocar la lectura principal del coaching" }),
          /* @__PURE__ */ jsx("div", { style: { color: "#8793a8", fontSize: 13 }, children: locale === "en" ? "These filters affect stats, matchups, runes, champions and match review only. Coaching keeps using its own saved role scope." : "Estos filtros afectan solo m\xE9tricas, cruces, runas, campeones y review de partidas. El coaching sigue usando su propio scope guardado de roles." })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsx(Badge, { tone: "default", children: locale === "en" ? "Affects: stats, matchups, runes, builds, champions, matches" : "Afecta: stats, matchups, runas, builds, campeones y partidas" }),
          /* @__PURE__ */ jsx(Badge, { tone: "low", children: locale === "en" ? `Coaching keeps ${coachScopeLabel}` : `El coaching sigue en ${coachScopeLabel}` })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "role-pill-grid", style: rolePillGridStyle, children: preferredRoles.map((role) => /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => setRoleFilter(role),
            style: {
              ...rolePillStyle,
              ...roleFilter === role ? activeRolePillStyle : {}
            },
            children: locale === "en" ? translateRole(role, "en") : getRoleLabel(role)
          },
          role
        )) }),
        /* @__PURE__ */ jsxs("div", { className: "three-col-grid", style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }, children: [
          /* @__PURE__ */ jsxs("div", { style: contextGroupStyle, children: [
            /* @__PURE__ */ jsx("div", { style: contextLabelStyle, children: locale === "en" ? "Queue type" : "Tipo de cola" }),
            /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: availableQueueFilters.map((queue) => /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => setQueueFilter(queue),
                style: {
                  ...contextChipStyle,
                  ...queueFilter === queue ? activeContextChipStyle : {}
                },
                children: queue === "ALL" ? locale === "en" ? "All" : "Todas" : queue === "RANKED" ? locale === "en" ? "Ranked" : "Rankeds" : queue === "RANKED_SOLO" ? "Solo/Duo" : queue === "RANKED_FLEX" ? "Flex" : locale === "en" ? "Other" : "Otras"
              },
              queue
            )) })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: contextGroupStyle, children: [
            /* @__PURE__ */ jsx("div", { style: contextLabelStyle, children: locale === "en" ? "Window" : "Ventana" }),
            /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
              { id: "ALL", label: locale === "en" ? "All" : "Todo" },
              { id: "LAST_20", label: locale === "en" ? "Last 20" : "\xDAltimas 20" },
              { id: "LAST_8", label: locale === "en" ? "Last 8" : "\xDAltimas 8" }
            ].map((windowOption) => /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => setWindowFilter(windowOption.id),
                style: {
                  ...contextChipStyle,
                  ...windowFilter === windowOption.id ? activeContextChipStyle : {}
                },
                children: windowOption.label
              },
              windowOption.id
            )) })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: contextGroupStyle, children: [
            /* @__PURE__ */ jsx("div", { style: contextLabelStyle, children: locale === "en" ? "Current exploration slice" : "Recorte actual de exploraci\xF3n" }),
            /* @__PURE__ */ jsx("div", { style: { color: "#dce7f9", fontSize: 13, lineHeight: 1.5 }, children: locale === "en" ? `${translateRole(roleFilter, "en")} \xB7 ${queueFilter === "ALL" ? "all queues" : queueFilter === "RANKED" ? "ranked queues" : queueFilter === "RANKED_SOLO" ? "solo/duo" : queueFilter === "RANKED_FLEX" ? "flex" : "other queues"}` : `${getRoleLabel(roleFilter)} \xB7 ${queueFilter === "ALL" ? "todas las colas" : queueFilter === "RANKED" ? "rankeds" : queueFilter === "RANKED_SOLO" ? "solo/duo" : queueFilter === "RANKED_FLEX" ? "flex" : "otras colas"}` }),
            /* @__PURE__ */ jsx("div", { style: { color: "#8390a6", fontSize: 12 }, children: locale === "en" ? windowFilter === "ALL" ? `${viewDataset.summary.matches} matches in sample` : `${viewDataset.summary.matches} recent matches` : windowFilter === "ALL" ? `${viewDataset.summary.matches} partidas en muestra` : `${viewDataset.summary.matches} partidas recientes` })
          ] })
        ] })
      ] }) : null,
      /* @__PURE__ */ jsxs("div", { style: navigationPanelStyle, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 3 }, children: [
          /* @__PURE__ */ jsx("div", { style: { color: "#8da0ba", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }, children: locale === "en" ? "Product navigation" : "Navegaci\xF3n del producto" }),
          /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 15, fontWeight: 800 }, children: locale === "en" ? "One coaching scope, several exploration layers" : "Un scope de coaching, varias capas de exploraci\xF3n" })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "tab-grid", style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: tabs.map((tab) => /* @__PURE__ */ jsx(
          "button",
          {
            onClick: () => setActiveTab(tab.id),
            style: {
              ...tabStyle,
              ...activeTab === tab.id ? activeTabStyle : {}
            },
            children: tab.label[locale]
          },
          tab.id
        )) }),
        viewDataset ? /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: activeTab === "coach" ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Badge, { children: locale === "en" ? `${coachDataset?.summary.matches ?? 0} matches in coaching scope` : `${coachDataset?.summary.matches ?? 0} partidas en el scope de coaching` }),
          /* @__PURE__ */ jsx(Badge, { children: coachScopeLabel }),
          /* @__PURE__ */ jsx(Badge, { tone: "low", children: locale === "en" ? "AI uses only this saved role scope" : "La IA usa solo este scope guardado de roles" })
        ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx(Badge, { children: locale === "en" ? `${viewDataset.summary.matches} visible matches` : `${viewDataset.summary.matches} partidas visibles` }),
          viewDataset.matches[0] ? /* @__PURE__ */ jsx(Badge, { children: getQueueLabel(viewDataset.matches[0].queueId) }) : null,
          /* @__PURE__ */ jsx(Badge, { tone: "default", children: locale === "en" ? translateRole(roleFilter, "en") : getRoleLabel(roleFilter) })
        ] }) }) : null
      ] })
    ] }),
    error ? /* @__PURE__ */ jsx(Card, { title: locale === "en" ? "Error" : "Error", children: error }) : null,
    viewDataset ? renderedTab : /* @__PURE__ */ jsx(Card, { title: locale === "en" ? "Waiting for analysis" : "Esperando an\xE1lisis", subtitle: locale === "en" ? "The goal is for the product to feel more like a premium personal account than a technical dashboard" : "La idea es que el producto se sienta m\xE1s cuenta personal premium que panel t\xE9cnico", children: /* @__PURE__ */ jsx("div", { style: { display: "grid", gap: 12, color: "#c7d4ea", lineHeight: 1.7 }, children: locale === "en" ? /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Overview:" }),
        " live pulse of the block, spotlight matches and what to review first."
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Coach:" }),
        " main blocker, evidence, impact and active plan."
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Stats:" }),
        " aggregated metrics and recent evolution."
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Matchups:" }),
        " real performance into direct opponents."
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Runes:" }),
        " same-champion micro-variants, keystone families and evidence tiers."
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Builds / items:" }),
        " build families, timings, item leverage and comp-fit watchpoints."
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Champions:" }),
        " tactical read with more visual context."
      ] })
    ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Overview:" }),
        " pulso vivo del bloque, partidas spotlight y qu\xE9 revisar primero."
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Coach:" }),
        " problema principal, evidencia, impacto y plan activo."
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Stats:" }),
        " m\xE9tricas agregadas y evoluci\xF3n."
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Matchups:" }),
        " rendimiento real frente a rivales directos."
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Runas:" }),
        " microvariantes del mismo campe\xF3n, familias de keystone y tiers de evidencia."
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Builds / items:" }),
        " familias de build, timings, leverage por item y watchpoints de comp-fit."
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("strong", { children: "Campeones:" }),
        " lectura t\xE1ctica con m\xE1s contexto visual."
      ] })
    ] }) }) }),
    /* @__PURE__ */ jsxs("footer", { style: footerStyle, children: [
      /* @__PURE__ */ jsx("div", { style: { color: "#7f8ca1", fontSize: 13 }, children: locale === "en" ? "Don Sosa Coach private beta for competitive coaching and review in League of Legends." : "Don Sosa Coach beta privada de coaching y an\xE1lisis competitivo para League of Legends." }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 14, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsx("a", { href: "/privacy.html", target: "_blank", rel: "noreferrer", style: footerLinkStyle, children: locale === "en" ? "Privacy Policy" : "Pol\xEDtica de privacidad" }),
        /* @__PURE__ */ jsx("a", { href: "/terms.html", target: "_blank", rel: "noreferrer", style: footerLinkStyle, children: locale === "en" ? "Terms of Service" : "T\xE9rminos del servicio" })
      ] })
    ] })
  ] }) });
}
class AppErrorBoundary extends Component {
  constructor() {
    super(...arguments);
    __publicField(this, "state", { error: null });
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return /* @__PURE__ */ jsx(Shell, { children: /* @__PURE__ */ jsx("div", { style: { maxWidth: 980, margin: "0 auto", display: "grid", gap: 16 }, children: /* @__PURE__ */ jsx(
        Card,
        {
          title: "La app encontr\xF3 un error inesperado",
          subtitle: "Evitamos que toda la pantalla quede en negro para que puedas ver qu\xE9 fall\xF3 y seguir depur\xE1ndolo.",
          children: /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 10 }, children: [
            /* @__PURE__ */ jsx("div", { style: softPanelStyle, children: this.state.error.message || "Unknown render error" }),
            /* @__PURE__ */ jsx("div", { style: { color: "#8f9bad", fontSize: 13, lineHeight: 1.6 }, children: "Prob\xE1 refrescar una vez. Si vuelve a aparecer, este mensaje ya nos deja una pista mucho m\xE1s clara que una pantalla totalmente negra." })
          ] })
        }
      ) }) });
    }
    return this.props.children;
  }
}
function App() {
  return /* @__PURE__ */ jsx(AppErrorBoundary, { children: /* @__PURE__ */ jsx(AppShell, {}) });
}
const topBarStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  alignItems: "center",
  flexWrap: "wrap",
  padding: "4px 2px 0"
};
const accountAccessStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 14,
  alignItems: "center",
  padding: "14px 16px",
  borderRadius: 24,
  background: "radial-gradient(circle at top left, rgba(78, 128, 176, 0.18), transparent 38%), linear-gradient(180deg, rgba(14,18,28,0.97), rgba(8,11,18,0.98))",
  border: "1px solid rgba(255,255,255,0.08)",
  width: "min(100%, 520px)",
  minHeight: 92,
  boxShadow: "0 22px 52px rgba(0,0,0,0.18)"
};
const accountTriggerStyle = {
  display: "flex",
  justifyContent: "space-between",
  gap: 14,
  alignItems: "center",
  minWidth: 238,
  padding: "11px 13px",
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))",
  color: "#eef4ff"
};
const accountAvatarStyle = {
  width: 38,
  height: 38,
  borderRadius: 999,
  display: "inline-grid",
  placeItems: "center",
  background: "linear-gradient(180deg, rgba(216,253,241,0.16), rgba(90,182,157,0.18))",
  color: "#eefcf3",
  fontWeight: 800
};
const accountTriggerMetaStyle = {
  color: "#90a0b7",
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.08em"
};
const accountPanelStyle = {
  display: "grid",
  gap: 14,
  padding: "20px 22px",
  borderRadius: 22,
  background: "linear-gradient(180deg, rgba(11,15,24,0.98), rgba(5,8,14,0.99))",
  border: "1px solid rgba(255,255,255,0.07)",
  boxShadow: "0 28px 70px rgba(0,0,0,0.2)"
};
const topBarGhostButtonStyle = {
  border: "1px solid rgba(255,255,255,0.08)",
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(255,255,255,0.02)",
  color: "#8996aa",
  fontWeight: 700,
  cursor: "not-allowed"
};
const topBarPrimaryButtonStyle = {
  border: "1px solid rgba(216,253,241,0.18)",
  padding: "10px 12px",
  borderRadius: 12,
  background: "rgba(216,253,241,0.08)",
  color: "#d7f9ea",
  fontWeight: 800,
  cursor: "not-allowed"
};
const heroGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.05fr) minmax(380px, 0.95fr)",
  gap: 20,
  alignItems: "start"
};
const heroIntroPanelStyle = {
  display: "grid",
  gap: 12,
  padding: 24,
  borderRadius: 28,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "radial-gradient(circle at top left, rgba(79, 56, 146, 0.34), transparent 42%), linear-gradient(180deg, rgba(17,20,31,0.96), rgba(7,10,16,0.98))",
  boxShadow: "0 28px 80px rgba(0,0,0,0.22)"
};
const accountCardStyle = {
  display: "grid",
  gap: 14,
  padding: "20px 22px",
  borderRadius: 20,
  background: "linear-gradient(180deg, rgba(16,20,30,0.98), rgba(8,11,18,0.98))",
  border: "1px solid rgba(255,255,255,0.07)"
};
const profileIconStyle = {
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.08)"
};
const inputStyle = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(7,11,18,0.92)",
  color: "#edf2ff",
  boxShadow: "0 0 0 1px rgba(255,255,255,0.02) inset"
};
const riotSearchShellStyle = {
  display: "grid",
  gap: 14,
  padding: "16px 18px",
  borderRadius: 18,
  background: "linear-gradient(180deg, rgba(9,13,21,0.98), rgba(6,9,15,0.98))",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "0 18px 40px rgba(0,0,0,0.16)"
};
const riotSearchRowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(220px, 1.1fr) minmax(130px, .7fr) minmax(180px, .9fr) minmax(120px, .62fr) auto",
  gap: 10,
  alignItems: "end"
};
const riotSearchInputStyle = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(7,11,18,0.92)",
  color: "#edf2ff",
  boxShadow: "0 0 0 1px rgba(255,255,255,0.02) inset"
};
const selectStyle = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(7,11,18,0.92)",
  color: "#edf2ff",
  boxShadow: "0 0 0 1px rgba(255,255,255,0.02) inset"
};
const buttonStyle = {
  border: "1px solid rgba(216,253,241,0.12)",
  padding: "12px 18px",
  borderRadius: 14,
  background: "linear-gradient(180deg, #d8fdf1, #b8f4df)",
  color: "#07111f",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "0 10px 28px rgba(87, 209, 162, 0.18)"
};
const secondaryButtonStyle = {
  border: "1px solid rgba(255,255,255,0.08)",
  padding: "12px 18px",
  borderRadius: 14,
  background: "#0a0f18",
  color: "#e8eef9",
  fontWeight: 700,
  cursor: "pointer"
};
const tabStyle = {
  border: "1px solid rgba(255,255,255,0.08)",
  padding: "10px 14px",
  borderRadius: 999,
  background: "#070b12",
  color: "#d7e3f5",
  cursor: "pointer",
  textAlign: "center"
};
const activeTabStyle = {
  background: "linear-gradient(180deg, rgba(49,55,86,0.95), rgba(16,23,35,1))",
  borderColor: "rgba(216,253,241,0.2)",
  color: "#ffffff"
};
const accountMetaRowStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 8
};
const recordPillStyle = {
  display: "grid",
  gap: 4,
  padding: "10px 12px",
  borderRadius: 12,
  background: "#080d15",
  border: "1px solid rgba(255,255,255,0.05)"
};
const roleFilterPanelStyle = {
  display: "grid",
  gap: 14,
  padding: "16px 18px",
  borderRadius: 18,
  background: "linear-gradient(180deg, rgba(13,18,28,0.98), rgba(7,10,16,0.98))",
  border: "1px solid rgba(216,253,241,0.1)",
  boxShadow: "0 18px 46px rgba(0,0,0,0.16)"
};
const rolePillGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
  gap: 8
};
const rolePillStyle = {
  padding: "12px 12px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "#080d15",
  color: "#d9e4f6",
  fontWeight: 700,
  cursor: "pointer",
  textAlign: "center"
};
const activeRolePillStyle = {
  background: "linear-gradient(180deg, rgba(216,253,241,0.14), rgba(26,39,50,0.92))",
  borderColor: "rgba(216,253,241,0.22)",
  color: "#ffffff",
  boxShadow: "0 0 0 1px rgba(216,253,241,0.08) inset"
};
const contextGroupStyle = {
  display: "grid",
  gap: 8,
  padding: "12px 14px",
  borderRadius: 14,
  background: "#080d15",
  border: "1px solid rgba(255,255,255,0.05)"
};
const contextLabelStyle = {
  color: "#7f8ca1",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.08em"
};
const contextChipStyle = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "#0a1018",
  color: "#d7e3f5",
  cursor: "pointer",
  fontWeight: 700
};
const activeContextChipStyle = {
  background: "linear-gradient(180deg, rgba(216,253,241,0.14), rgba(24,35,44,0.96))",
  borderColor: "rgba(216,253,241,0.22)",
  color: "#ffffff"
};
const syncMessageStyle = {
  padding: "12px 14px",
  borderRadius: 14,
  background: "rgba(216,253,241,0.08)",
  border: "1px solid rgba(216,253,241,0.14)",
  color: "#dff7eb",
  fontSize: 13,
  lineHeight: 1.5
};
const navigationPanelStyle = {
  display: "grid",
  gap: 12,
  padding: "16px 18px",
  borderRadius: 18,
  background: "#060a10",
  border: "1px solid rgba(255,255,255,0.06)",
  boxShadow: "0 18px 46px rgba(0,0,0,0.14)"
};
const savedProfilesSectionStyle = {
  display: "grid",
  gap: 12,
  padding: "16px 0 0",
  marginTop: 4,
  borderTop: "1px solid rgba(255,255,255,0.08)"
};
const savedProfilesGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10
};
const progressPanelStyle = {
  display: "grid",
  gap: 10,
  padding: "12px 14px",
  borderRadius: 16,
  background: "rgba(216,253,241,0.06)",
  border: "1px solid rgba(255,255,255,0.06)"
};
const savedProfileCardStyle = {
  display: "grid",
  gap: 12,
  padding: "15px 16px",
  borderRadius: 18,
  background: "linear-gradient(180deg, rgba(10,14,22,0.96), rgba(7,10,16,0.98))",
  border: "1px solid rgba(255,255,255,0.07)",
  cursor: "pointer"
};
const activeSavedProfileCardStyle = {
  background: "radial-gradient(circle at top left, rgba(216,253,241,0.12), transparent 42%), linear-gradient(180deg, rgba(216,253,241,0.08), rgba(24,35,44,0.96))",
  borderColor: "rgba(216,253,241,0.24)"
};
const savedProfileMetaStatStyle = {
  display: "grid",
  gap: 4,
  padding: "10px 11px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.05)",
  alignContent: "start"
};
const savedProfileMetaValueStyle = {
  color: "#eaf1fd",
  fontSize: 12,
  fontWeight: 700,
  lineHeight: 1.45
};
const adminUserCardStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.15fr) minmax(240px, 0.85fr)",
  gap: 14,
  alignItems: "start",
  padding: "14px 15px",
  borderRadius: 16,
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.06)"
};
const adminRowStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  gap: 12,
  alignItems: "start",
  padding: "12px 13px",
  borderRadius: 14,
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.05)"
};
const topStatStyle = {
  minWidth: 126,
  padding: "14px 15px",
  borderRadius: 16,
  background: "#060a10",
  border: "1px solid rgba(255,255,255,0.06)",
  display: "grid",
  gap: 4,
  alignContent: "start"
};
const topStatsPanelStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: 10,
  alignItems: "stretch"
};
const sparklineCardStyle = {
  gridColumn: "1 / -1",
  display: "grid",
  gap: 10,
  padding: "14px 15px",
  borderRadius: 16,
  background: "#060a10",
  border: "1px solid rgba(255,255,255,0.06)"
};
const heroMetaChipStyle = {
  display: "grid",
  gap: 4,
  minWidth: 128,
  padding: "12px 13px",
  borderRadius: 14,
  background: "rgba(8,12,20,0.88)",
  border: "1px solid rgba(255,255,255,0.06)"
};
const heroMetaLabelStyle = {
  color: "#7d889c",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.08em"
};
const heroMetaValueStyle = {
  color: "#edf2ff",
  fontSize: 16,
  fontWeight: 800
};
const heroMetaSubtleStyle = {
  color: "#8d98ad",
  fontSize: 12
};
const profileHeroPanelStyle = {
  display: "grid",
  gap: 18
};
const profileRankColumnStyle = {
  display: "grid",
  gap: 12,
  alignContent: "start"
};
const profileRankEmptyStyle = {
  display: "grid",
  gap: 8,
  minHeight: 124,
  padding: "18px 18px",
  borderRadius: 18,
  background: "linear-gradient(180deg, rgba(8,12,20,0.8), rgba(6,9,15,0.92))",
  border: "1px solid rgba(255,255,255,0.06)",
  alignContent: "start"
};
const profileMetaCardStyle = {
  ...heroMetaChipStyle,
  gap: 6,
  minHeight: 92,
  padding: "14px 14px",
  background: "linear-gradient(180deg, rgba(10,15,23,0.9), rgba(7,11,18,0.82))",
  alignContent: "start"
};
const rankQueuePillStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  padding: "5px 8px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.04)",
  color: "#aeb8ca",
  fontSize: 11,
  lineHeight: 1.2,
  border: "1px solid rgba(255,255,255,0.05)"
};
const scopeMetaCardStyle = {
  ...heroMetaChipStyle,
  gap: 6,
  minHeight: 92,
  background: "linear-gradient(180deg, rgba(10,15,23,0.92), rgba(8,12,20,0.86))",
  alignContent: "start"
};
const scopeStatusStyle = {
  padding: "12px 14px",
  borderRadius: 16,
  border: "1px solid rgba(216,253,241,0.12)",
  background: "rgba(14, 35, 29, 0.6)",
  color: "#d9f8eb",
  lineHeight: 1.6
};
const footerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  padding: "4px 4px 18px"
};
const footerLinkStyle = {
  color: "#b8c7de",
  textDecoration: "none",
  fontSize: 13
};
const fieldBlockStyle = {
  display: "grid",
  gap: 7
};
const fieldLabelStyle = {
  color: "#8da0ba",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.08em"
};
const tagInputShellStyle = {
  display: "grid",
  gridTemplateColumns: "36px minmax(0, 1fr)",
  alignItems: "center",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(7,11,18,0.92)",
  boxShadow: "0 0 0 1px rgba(255,255,255,0.02) inset"
};
const tagPrefixStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#7f8ca1",
  fontWeight: 800,
  fontSize: 13,
  borderRight: "1px solid rgba(255,255,255,0.06)",
  height: "100%"
};
const tagInputStyle = {
  width: "100%",
  padding: "13px 14px",
  borderRadius: 14,
  border: 0,
  outline: "none",
  background: "transparent",
  color: "#edf2ff"
};
const softPanelStyle = {
  display: "grid",
  gap: 8,
  padding: "14px 15px",
  borderRadius: 16,
  background: "rgba(9,14,22,0.85)",
  border: "1px solid rgba(255,255,255,0.05)"
};
export {
  App as default
};
