import express from 'express';
import cors from 'cors';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { Request, Response } from 'express';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { analyticsRouter } from './routes/analytics.js';
import { aiCoachRouter } from './routes/aiCoach.js';
import { refreshPatchNotesFromOfficialSource } from './services/patchNotes.js';

const app = express();
const webDistPath = fileURLToPath(new URL('../../web/dist', import.meta.url));
const hasWebBuild = existsSync(webDistPath);

app.use(cors({
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`Origin ${origin} not allowed by CORS`));
  }
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));

app.use('/api/health', healthRouter);

function readCookies(req: Request) {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return {};

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

function renderBetaAccessPage(errorMessage?: string) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Don Sosa Coach · Beta privada</title>
    <style>
      body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #05070c; color: #eef3ff; }
      .shell { min-height: 100vh; display: grid; place-items: center; padding: 32px; }
      .card { width: min(100%, 460px); display: grid; gap: 16px; padding: 28px; border-radius: 22px; background: linear-gradient(180deg, rgba(36,25,62,0.92), rgba(9,12,19,0.98)); border: 1px solid rgba(255,255,255,0.08); }
      .eyebrow { color: #99a6bd; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; }
      h1 { margin: 0; font-size: 34px; line-height: 1.05; letter-spacing: -.04em; }
      p { margin: 0; color: #9eabc0; line-height: 1.6; }
      form { display: grid; gap: 12px; }
      input { width: 100%; padding: 14px 16px; border-radius: 14px; border: 1px solid rgba(255,255,255,0.08); background: #08101a; color: #eef3ff; box-sizing: border-box; }
      button { border: 0; padding: 14px 18px; border-radius: 14px; background: #d8fdf1; color: #05111e; font-weight: 800; cursor: pointer; }
      .error { padding: 11px 13px; border-radius: 14px; background: rgba(255,107,107,0.12); border: 1px solid rgba(255,107,107,0.2); color: #ffd4d4; }
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="card">
        <div class="eyebrow">Don Sosa Coach</div>
        <h1>Beta privada</h1>
        <p>Esta versión está abierta solo para un grupo chico mientras terminamos de estabilizar el producto y la integración con Riot.</p>
        ${errorMessage ? `<div class="error">${errorMessage}</div>` : ''}
        <form method="post" action="/beta-access">
          <input type="password" name="code" placeholder="Código de acceso" autofocus />
          <button type="submit">Entrar</button>
        </form>
      </div>
    </div>
  </body>
</html>`;
}

function isBetaAuthorized(req: Request) {
  if (!env.BETA_ACCESS_CODE) return true;
  const cookies = readCookies(req);
  return cookies.don_sosa_beta === env.BETA_ACCESS_CODE;
}

function setBetaCookie(res: Response) {
  const isSecure = process.env.NODE_ENV === 'production';
  const parts = [
    `don_sosa_beta=${encodeURIComponent(env.BETA_ACCESS_CODE ?? '')}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${60 * 60 * 24 * 30}`
  ];

  if (isSecure) {
    parts.push('Secure');
  }

  res.setHeader('Set-Cookie', parts.join('; '));
}

if (env.BETA_ACCESS_CODE) {
  app.get('/beta-access', (req, res) => {
    if (isBetaAuthorized(req)) {
      res.redirect('/');
      return;
    }

    res.status(200).send(renderBetaAccessPage());
  });

  app.post('/beta-access', (req, res) => {
    const submittedCode = typeof req.body?.code === 'string' ? req.body.code : '';
    if (submittedCode === env.BETA_ACCESS_CODE) {
      setBetaCookie(res);
      res.redirect('/');
      return;
    }

    res.status(401).send(renderBetaAccessPage('El código no coincide. Probá de nuevo.'));
  });

  app.use((req, res, next) => {
    if (req.path === '/beta-access' || req.path.startsWith('/api/health')) {
      next();
      return;
    }

    if (isBetaAuthorized(req)) {
      next();
      return;
    }

    if (req.path.startsWith('/api/')) {
      res.status(401).json({ error: 'Esta beta es privada. Pedile el código de acceso al owner.' });
      return;
    }

    res.redirect('/beta-access');
  });
}

app.use('/api/analytics', analyticsRouter);
app.use('/api/ai/coach', aiCoachRouter);

if (hasWebBuild) {
  app.use(express.static(webDistPath));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(fileURLToPath(new URL('../../web/dist/index.html', import.meta.url)));
  });
}

app.listen(env.PORT, () => {
  console.log(`Don Sosa API listening on http://localhost:${env.PORT}`);
  void refreshPatchNotesFromOfficialSource(false);
});
