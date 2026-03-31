const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://localhost:8787/api';
const REQUEST_TIMEOUT_MS = 300000;
const POLL_INTERVAL_MS = 1200;
function delay(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameName, tagLine, count, knownMatchIds: options?.knownMatchIds ?? [] }),
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
            throw new Error('El análisis tardó demasiado. Probá con menos partidas o revisá si la API está levantada.');
        }
        throw error;
    }
    finally {
        window.clearTimeout(timeout);
    }
}
