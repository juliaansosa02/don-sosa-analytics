import type { Response, Request } from 'express';

export function readCookies(req: Request) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return {} as Record<string, string>;

  return Object.fromEntries(
    cookieHeader
      .split(';')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separator = entry.indexOf('=');
        const key = separator === -1 ? entry : entry.slice(0, separator);
        const value = separator === -1 ? '' : entry.slice(separator + 1);
        return [decodeURIComponent(key), decodeURIComponent(value)];
      })
  );
}

export function setCookie(res: Response, name: string, value: string, options?: {
  maxAgeSeconds?: number;
  httpOnly?: boolean;
  sameSite?: 'Lax' | 'Strict' | 'None';
  secure?: boolean;
  path?: string;
}) {
  const parts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `Path=${options?.path ?? '/'}`
  ];

  if (typeof options?.maxAgeSeconds === 'number') {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAgeSeconds))}`);
  }

  if (options?.httpOnly !== false) {
    parts.push('HttpOnly');
  }

  parts.push(`SameSite=${options?.sameSite ?? 'Lax'}`);

  if (options?.secure) {
    parts.push('Secure');
  }

  res.append('Set-Cookie', parts.join('; '));
}

export function clearCookie(res: Response, name: string, options?: {
  secure?: boolean;
  path?: string;
}) {
  setCookie(res, name, '', {
    maxAgeSeconds: 0,
    httpOnly: true,
    sameSite: 'Lax',
    secure: options?.secure,
    path: options?.path ?? '/'
  });
}
