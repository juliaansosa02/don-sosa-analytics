import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distIndexPath = path.resolve(__dirname, '..', 'dist', 'index.html');

const siteUrl = (process.env.VITE_SITE_URL || 'https://don-sosa.onrender.com').replace(/\/$/, '');
const appName = process.env.VITE_SITE_NAME || 'Don Sosa Coach';
const siteDescription =
  process.env.VITE_SITE_DESCRIPTION ||
  'Don Sosa Coach convierte tus partidas de League of Legends en coaching accionable: diagnostico real, analytics, progreso, matchups, runas y mejora por rol, campeon y parche.';
const ogTitle = process.env.VITE_OG_TITLE || `${appName} | Coaching premium para mejorar en League of Legends`;
const ogDescription =
  process.env.VITE_OG_DESCRIPTION ||
  'Diagnostico claro, coaching premium y progreso real para jugadores y coaches de League of Legends.';

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');

let html = readFileSync(distIndexPath, 'utf8');

html = html
  .replace(/https:\/\/don-sosa\.onrender\.com\/og-card\.svg/g, `${siteUrl}/og-card.svg`)
  .replace(/https:\/\/don-sosa\.onrender\.com\//g, `${siteUrl}/`)
  .replace(
    /<title>.*?<\/title>/,
    `<title>${escapeHtml(ogTitle)}</title>`
  )
  .replace(
    /<meta\s+name="description"\s+content=".*?"\s*\/>/,
    `<meta name="description" content="${escapeHtml(siteDescription)}" />`
  )
  .replace(
    /<meta\s+name="application-name"\s+content=".*?"\s*\/>/,
    `<meta name="application-name" content="${escapeHtml(appName)}" />`
  )
  .replace(
    /<meta\s+property="og:site_name"\s+content=".*?"\s*\/>/,
    `<meta property="og:site_name" content="${escapeHtml(appName)}" />`
  )
  .replace(
    /<meta\s+property="og:title"\s+content=".*?"\s*\/>/,
    `<meta property="og:title" content="${escapeHtml(ogTitle)}" />`
  )
  .replace(
    /<meta\s+property="og:description"\s+content=".*?"\s*\/>/,
    `<meta property="og:description" content="${escapeHtml(ogDescription)}" />`
  )
  .replace(
    /<meta\s+name="twitter:title"\s+content=".*?"\s*\/>/,
    `<meta name="twitter:title" content="${escapeHtml(appName)}" />`
  )
  .replace(
    /<meta\s+name="twitter:description"\s+content=".*?"\s*\/>/,
    `<meta name="twitter:description" content="${escapeHtml(ogDescription)}" />`
  );

writeFileSync(distIndexPath, html);
