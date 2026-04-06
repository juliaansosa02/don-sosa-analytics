import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webRoot = path.resolve(__dirname, '..');
const publicDir = path.join(webRoot, 'public');

const appName = process.env.VITE_SITE_NAME || 'Don Sosa Coach';
const siteUrl = (process.env.VITE_SITE_URL || 'https://don-sosa.onrender.com').replace(/\/$/, '');
const supportEmail = process.env.VITE_SUPPORT_EMAIL || 'juliaansosa02@gmail.com';
const legalEntity = process.env.LEGAL_ENTITY_NAME || appName;
const legalCountry = process.env.LEGAL_COUNTRY || 'Argentina';
const legalLastUpdated = process.env.LEGAL_LAST_UPDATED || '2026-04-06';
const defaultLocale = process.env.VITE_DEFAULT_LOCALE || 'es-AR';
const siteHost = siteUrl.replace(/^https?:\/\//, '');
const ogTitle = process.env.VITE_OG_TITLE || `${appName} | Coaching premium para mejorar en League of Legends`;
const ogDescription =
  process.env.VITE_OG_DESCRIPTION ||
  'Diagnóstico claro, coaching premium y progreso real para jugadores y coaches de League of Legends.';
const siteDescription =
  process.env.VITE_SITE_DESCRIPTION ||
  'Plataforma de coaching premium para League of Legends con analytics de partidas, lectura por rol, progreso, matchups, runas y mejora por campeón.';

mkdirSync(publicDir, { recursive: true });

const escapeHtml = (value) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const shell = (title, body) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <meta name="robots" content="index,follow" />
    <style>
      body { margin: 0; font-family: Inter, system-ui, sans-serif; background: #060910; color: #eef4ff; }
      .page { max-width: 920px; margin: 0 auto; padding: 48px 24px 72px; display: grid; gap: 24px; }
      .card { padding: 24px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.08); background: linear-gradient(180deg, rgba(24,31,46,0.9), rgba(8,12,20,0.98)); }
      h1, h2 { margin: 0 0 12px; }
      p, li { color: #c8d4e7; line-height: 1.7; }
      a { color: #d8fdf1; }
      ul { padding-left: 20px; }
      .eyebrow { color: #9db0c9; text-transform: uppercase; letter-spacing: 0.18em; font-size: 12px; margin-bottom: 10px; }
    </style>
  </head>
  <body>
    <main class="page">
      ${body}
    </main>
  </body>
</html>
`;

const privacyHtml = shell(
  `${appName} · Privacy Policy`,
  `
      <section class="card">
        <div class="eyebrow">${escapeHtml(appName)}</div>
        <h1>Privacy Policy</h1>
        <p>Last updated: ${escapeHtml(legalLastUpdated)}</p>
        <p>${escapeHtml(appName)} is a League of Legends coaching and analytics product that processes Riot ID information and gameplay data only to provide player-facing review, coaching, benchmarking and improvement workflows.</p>
      </section>

      <section class="card">
        <h2>Data We Process</h2>
        <ul>
          <li>Riot ID data submitted by the user, such as game name and tagline.</li>
          <li>Gameplay data returned by Riot APIs, including profile, match history, timelines, ranks, champions, runes, builds and related analytics inputs.</li>
          <li>Product account data needed to operate memberships, authentication, support, saved profiles and coaching workspace functionality.</li>
          <li>Billing metadata handled through Stripe for subscriptions and account management. Full card data is processed by Stripe, not stored by ${escapeHtml(legalEntity)}.</li>
        </ul>
      </section>

      <section class="card">
        <h2>How We Use Data</h2>
        <ul>
          <li>To analyze matches, generate coaching insights and personalize the product experience.</li>
          <li>To operate memberships, customer support, account security and coach-client workflows.</li>
          <li>To improve the product through aggregated and de-identified benchmarking, quality checks and internal product analytics.</li>
        </ul>
      </section>

      <section class="card">
        <h2>Retention and Deletion</h2>
        <p>User-submitted Riot IDs, fetched match snapshots and derived analytics may be stored while the account is active and for a reasonable period afterward to support continuity, renewals, support and fraud prevention. You can request deletion of account-linked data by contacting <a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a>.</p>
      </section>

      <section class="card">
        <h2>Third Parties</h2>
        <p>${escapeHtml(appName)} depends on Riot Games APIs, hosting providers, analytics infrastructure and Stripe for subscription billing. Each provider processes data as needed for the service to function.</p>
      </section>

      <section class="card">
        <h2>Controller Contact</h2>
        <p>${escapeHtml(legalEntity)} operates this product from ${escapeHtml(legalCountry)}. For privacy, billing or deletion requests, contact <a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a>.</p>
      </section>
`
);

const termsHtml = shell(
  `${appName} · Terms of Service`,
  `
      <section class="card">
        <div class="eyebrow">${escapeHtml(appName)}</div>
        <h1>Terms of Service</h1>
        <p>Last updated: ${escapeHtml(legalLastUpdated)}</p>
        <p>${escapeHtml(appName)} provides League of Legends analytics, coaching intelligence and account-based subscription features for players and coaches. By using the service, you agree to these terms.</p>
      </section>

      <section class="card">
        <h2>Eligibility and Account Responsibility</h2>
        <ul>
          <li>You may only submit Riot account information that you control or are authorized to review.</li>
          <li>You are responsible for maintaining access to your product account and for activity that occurs under it.</li>
          <li>You must not misuse the site, overload the service or attempt to bypass access restrictions, subscription limits or security controls.</li>
        </ul>
      </section>

      <section class="card">
        <h2>Billing and Renewals</h2>
        <p>Paid memberships renew automatically unless canceled through the customer portal or support workflow before the next billing cycle. Access levels, limits and included features can change as the product evolves, but active subscribers should receive commercially reasonable notice of material plan changes.</p>
      </section>

      <section class="card">
        <h2>No Competitive Guarantee</h2>
        <p>The service is designed to support self-review and coaching, not to guarantee improvement, match results or rank outcomes. Product insights may include measured signals, derived proxies and model-driven interpretation.</p>
      </section>

      <section class="card">
        <h2>Third-Party Policies</h2>
        <p>This product uses Riot Games APIs and Stripe. Riot Games does not endorse or sponsor ${escapeHtml(appName)}. Your use of the service is also subject to applicable Riot and payment-provider policies.</p>
      </section>

      <section class="card">
        <h2>Service Changes and Liability</h2>
        <p>${escapeHtml(legalEntity)} may modify, suspend or discontinue parts of the service. To the maximum extent permitted by law, the service is provided on an as-is and as-available basis.</p>
      </section>

      <section class="card">
        <h2>Support Contact</h2>
        <p>For billing, support or legal questions, contact <a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a>.</p>
      </section>
`
);

const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${siteUrl}/privacy.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${siteUrl}/terms.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>
`;

const webManifest = JSON.stringify(
  {
    name: appName,
    short_name: appName,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    lang: defaultLocale,
    background_color: '#05080d',
    theme_color: '#04070c',
    description: siteDescription
  },
  null,
  2
);

const ogCardSvg = `<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" rx="40" fill="#05080D"/>
  <rect width="1200" height="630" rx="40" fill="url(#paint0_radial)"/>
  <rect x="48" y="48" width="1104" height="534" rx="32" fill="url(#paint1_linear)" stroke="rgba(255,255,255,0.08)"/>
  <text x="92" y="148" fill="#91A0B5" font-family="Manrope, Arial, sans-serif" font-size="28" letter-spacing="5">${escapeHtml(appName.toUpperCase())}</text>
  <text x="92" y="240" fill="#EEF4FF" font-family="Manrope, Arial, sans-serif" font-size="60" font-weight="800">${escapeHtml(ogTitle.slice(0, 32))}</text>
  <text x="92" y="320" fill="#EEF4FF" font-family="Manrope, Arial, sans-serif" font-size="60" font-weight="800">${escapeHtml(ogTitle.slice(32, 68).trim() || 'League of Legends')}</text>
  <text x="92" y="412" fill="#A7B5C8" font-family="Manrope, Arial, sans-serif" font-size="28">${escapeHtml(ogDescription.slice(0, 78))}</text>
  <text x="92" y="454" fill="#A7B5C8" font-family="Manrope, Arial, sans-serif" font-size="28">${escapeHtml(ogDescription.slice(78, 156))}</text>
  <rect x="92" y="492" width="420" height="62" rx="18" fill="#D8FDF1"/>
  <text x="126" y="532" fill="#041017" font-family="Manrope, Arial, sans-serif" font-size="28" font-weight="800">${escapeHtml(siteHost)}</text>
  <defs>
    <radialGradient id="paint0_radial" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(182 78) rotate(38.2888) scale(589.919 904.912)">
      <stop stop-color="#46308B"/>
      <stop offset="1" stop-color="#05080D" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="paint1_linear" x1="600" y1="48" x2="600" y2="582" gradientUnits="userSpaceOnUse">
      <stop stop-color="#121827"/>
      <stop offset="1" stop-color="#090D15"/>
    </linearGradient>
  </defs>
</svg>
`;

writeFileSync(path.join(publicDir, 'privacy.html'), privacyHtml);
writeFileSync(path.join(publicDir, 'terms.html'), termsHtml);
writeFileSync(path.join(publicDir, 'robots.txt'), robotsTxt);
writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml);
writeFileSync(path.join(publicDir, 'site.webmanifest'), webManifest);
writeFileSync(path.join(publicDir, 'og-card.svg'), ogCardSvg);
