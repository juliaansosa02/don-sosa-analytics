const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export class HttpError extends Error {
  status: number;
  url: string;
  responseText: string;

  constructor(status: number, url: string, responseText: string) {
    super(`HTTP ${status} for ${url}: ${responseText}`);
    this.name = 'HttpError';
    this.status = status;
    this.url = url;
    this.responseText = responseText;
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(header: string | null) {
  if (!header) return null;

  const seconds = Number(header);
  if (!Number.isNaN(seconds)) return Math.max(0, seconds * 1000);

  const retryAt = Date.parse(header);
  if (Number.isNaN(retryAt)) return null;
  return Math.max(0, retryAt - Date.now());
}

export async function httpJson<T>(
  url: string,
  init?: RequestInit,
  options?: {
    retries?: number;
    retryDelayMs?: number;
  }
): Promise<T> {
  const retries = options?.retries ?? 0;
  const retryDelayMs = options?.retryDelayMs ?? 1000;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const response = await fetch(url, init);

    if (response.ok) {
      return response.json() as Promise<T>;
    }

    const message = await response.text();
    const shouldRetry = RETRYABLE_STATUS.has(response.status) && attempt < retries;

    if (!shouldRetry) {
      throw new HttpError(response.status, url, message);
    }

    const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));
    const backoffMs = retryAfterMs ?? retryDelayMs * (attempt + 1);
    await delay(backoffMs);
  }

  throw new Error(`Unexpected retry exhaustion for ${url}`);
}
