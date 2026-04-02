const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:8787/api';
const REQUEST_TIMEOUT_MS = 300000;
const POLL_INTERVAL_MS = 1200;
const CLIENT_ID_STORAGE_KEY = 'don-sosa:client-id';
function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
}
function generateClientId() {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return crypto.randomUUID();
    }
    return `viewer-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}
export function getOrCreateClientId() {
    const existing = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
    if (existing)
        return existing;
    const next = generateClientId();
    window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, next);
    return next;
}
function apiHeaders(extra) {
    return {
        'x-don-sosa-client-id': getOrCreateClientId(),
        ...(extra ?? {})
    };
}
async function readErrorMessage(response) {
    const text = await response.text();
    try {
        const parsed = JSON.parse(text);
        return parsed.error ?? text;
    }
    catch {
        return text;
    }
}
async function apiFetch(input, init) {
    return fetch(input, {
        credentials: 'include',
        ...init
    });
}
export async function collectProfile(gameName, tagLine, count = 100, options) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const startResponse = await apiFetch(`${API_BASE}/analytics/collect/start`, {
            method: 'POST',
            headers: apiHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ gameName, tagLine, platform: options?.platform, count, knownMatchIds: options?.knownMatchIds ?? [], locale: options?.locale ?? 'es' }),
            signal: controller.signal
        });
        if (!startResponse.ok) {
            throw new Error(await readErrorMessage(startResponse));
        }
        const startJob = (await startResponse.json());
        options?.onProgress?.(startJob.progress);
        while (true) {
            await delay(POLL_INTERVAL_MS);
            const jobResponse = await apiFetch(`${API_BASE}/analytics/collect/${startJob.jobId}`, {
                headers: apiHeaders(),
                signal: controller.signal
            });
            if (!jobResponse.ok) {
                throw new Error(await readErrorMessage(jobResponse));
            }
            const job = (await jobResponse.json());
            options?.onProgress?.(job.progress);
            if (job.status === 'completed' && job.result) {
                return job.result;
            }
            if (job.status === 'failed') {
                throw new Error(job.error ?? 'Unknown error');
            }
        }
    }
    catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            throw new Error(options?.locale === 'en'
                ? 'The analysis took too long. Try fewer matches or make sure the API is running.'
                : 'El análisis tardó demasiado. Probá con menos partidas o revisá si la API está levantada.');
        }
        throw error;
    }
    finally {
        window.clearTimeout(timeout);
    }
}
export async function fetchCachedProfile(gameName, tagLine, platform, locale = 'es') {
    const response = await apiFetch(`${API_BASE}/analytics/profile/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?locale=${locale}&platform=${encodeURIComponent(platform)}`, {
        headers: apiHeaders()
    });
    if (response.status === 404) {
        return null;
    }
    if (!response.ok) {
        throw new Error(await readErrorMessage(response));
    }
    return response.json();
}
export async function fetchRoleReferences(input) {
    const params = new URLSearchParams({
        platform: input.platform,
        role: input.role,
        locale: input.locale
    });
    const response = await apiFetch(`${API_BASE}/analytics/role-references?${params.toString()}`, {
        headers: apiHeaders()
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response));
    }
    return response.json();
}
export async function generateAICoach(input) {
    const response = await apiFetch(`${API_BASE}/ai/coach/generate`, {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(input)
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response));
    }
    return response.json();
}
export async function sendAICoachFeedback(input) {
    const response = await apiFetch(`${API_BASE}/ai/coach/feedback`, {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(input)
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response));
    }
    return response.json();
}
export async function fetchMembershipCatalog() {
    const response = await apiFetch(`${API_BASE}/membership/catalog`, {
        headers: apiHeaders()
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response));
    }
    return response.json();
}
export async function fetchMembershipMe() {
    const response = await apiFetch(`${API_BASE}/membership/me`, {
        headers: apiHeaders()
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response));
    }
    return response.json();
}
export async function setMembershipPlanDev(planId) {
    const response = await apiFetch(`${API_BASE}/membership/dev/plan`, {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ planId })
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response));
    }
    return response.json();
}
export async function fetchAuthMe() {
    const response = await apiFetch(`${API_BASE}/auth/me`, {
        headers: apiHeaders()
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response));
    }
    return response.json();
}
export async function signup(input) {
    const response = await apiFetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(input)
    });
    if (!response.ok)
        throw new Error(await readErrorMessage(response));
    return response.json();
}
export async function login(input) {
    const response = await apiFetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(input)
    });
    if (!response.ok)
        throw new Error(await readErrorMessage(response));
    return response.json();
}
export async function logout() {
    const response = await apiFetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers: apiHeaders()
    });
    if (!response.ok)
        throw new Error(await readErrorMessage(response));
    return response.json();
}
export async function requestPasswordReset(input) {
    const response = await apiFetch(`${API_BASE}/auth/password/request-reset`, {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(input)
    });
    if (!response.ok)
        throw new Error(await readErrorMessage(response));
    return response.json();
}
export async function resetPassword(input) {
    const response = await apiFetch(`${API_BASE}/auth/password/reset`, {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(input)
    });
    if (!response.ok)
        throw new Error(await readErrorMessage(response));
    return response.json();
}
export async function changePassword(input) {
    const response = await apiFetch(`${API_BASE}/auth/password/change`, {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(input)
    });
    if (!response.ok)
        throw new Error(await readErrorMessage(response));
    return response.json();
}
export async function fetchAdminUsers() {
    const response = await apiFetch(`${API_BASE}/admin/users`, {
        headers: apiHeaders()
    });
    if (!response.ok)
        throw new Error(await readErrorMessage(response));
    return response.json();
}
export async function updateAdminUserRole(userId, role) {
    const response = await apiFetch(`${API_BASE}/admin/users/${encodeURIComponent(userId)}/role`, {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ role })
    });
    if (!response.ok)
        throw new Error(await readErrorMessage(response));
    return response.json();
}
export async function updateAdminUserPlan(userId, planId) {
    const response = await apiFetch(`${API_BASE}/admin/users/${encodeURIComponent(userId)}/plan`, {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ planId })
    });
    if (!response.ok)
        throw new Error(await readErrorMessage(response));
    return response.json();
}
export async function startAdminImpersonation(userId) {
    const response = await apiFetch(`${API_BASE}/admin/impersonate`, {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ userId })
    });
    if (!response.ok)
        throw new Error(await readErrorMessage(response));
    return response.json();
}
export async function stopAdminImpersonation() {
    const response = await apiFetch(`${API_BASE}/admin/impersonate/stop`, {
        method: 'POST',
        headers: apiHeaders()
    });
    if (!response.ok)
        throw new Error(await readErrorMessage(response));
    return response.json();
}
export async function fetchCoachPlayers() {
    const response = await apiFetch(`${API_BASE}/coach/players`, {
        headers: apiHeaders()
    });
    if (!response.ok)
        throw new Error(await readErrorMessage(response));
    return response.json();
}
export async function addCoachPlayer(input) {
    const response = await apiFetch(`${API_BASE}/coach/players`, {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(input)
    });
    if (!response.ok)
        throw new Error(await readErrorMessage(response));
    return response.json();
}
export async function removeCoachPlayer(assignmentId) {
    const response = await apiFetch(`${API_BASE}/coach/players/${encodeURIComponent(assignmentId)}`, {
        method: 'DELETE',
        headers: apiHeaders()
    });
    if (!response.ok)
        throw new Error(await readErrorMessage(response));
    return response.json();
}
export async function createCheckoutSession(planId) {
    const response = await apiFetch(`${API_BASE}/billing/checkout-session`, {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ planId })
    });
    if (!response.ok)
        throw new Error(await readErrorMessage(response));
    return response.json();
}
export async function createBillingPortalSession() {
    const response = await apiFetch(`${API_BASE}/billing/portal-session`, {
        method: 'POST',
        headers: apiHeaders()
    });
    if (!response.ok)
        throw new Error(await readErrorMessage(response));
    return response.json();
}
