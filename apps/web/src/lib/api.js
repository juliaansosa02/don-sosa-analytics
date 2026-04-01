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
export async function collectProfile(gameName, tagLine, count = 100, options) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const startResponse = await fetch(`${API_BASE}/analytics/collect/start`, {
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
            const jobResponse = await fetch(`${API_BASE}/analytics/collect/${startJob.jobId}`, {
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
    const response = await fetch(`${API_BASE}/analytics/profile/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?locale=${locale}&platform=${encodeURIComponent(platform)}`, {
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
export async function generateAICoach(input) {
    const response = await fetch(`${API_BASE}/ai/coach/generate`, {
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
    const response = await fetch(`${API_BASE}/ai/coach/feedback`, {
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
    const response = await fetch(`${API_BASE}/membership/catalog`, {
        headers: apiHeaders()
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response));
    }
    return response.json();
}
export async function fetchMembershipMe() {
    const response = await fetch(`${API_BASE}/membership/me`, {
        headers: apiHeaders()
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response));
    }
    return response.json();
}
export async function setMembershipPlanDev(planId) {
    const response = await fetch(`${API_BASE}/membership/dev/plan`, {
        method: 'POST',
        headers: apiHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ planId })
    });
    if (!response.ok) {
        throw new Error(await readErrorMessage(response));
    }
    return response.json();
}
