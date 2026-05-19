import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { z } from 'zod';
import { env } from '../config/env.js';
import { getCurrentPatchNotes } from './patchNotes.js';
import { ensureWrite } from '../utils/fs.js';

const patchImpactDir = fileURLToPath(new URL('../../data/patch-impact', import.meta.url));
const interactionRulesPath = fileURLToPath(new URL('../../data/coach-kb/meta/interaction-rules.json', import.meta.url));
const pool = env.DATABASE_URL ? new Pool({ connectionString: env.DATABASE_URL }) : null;

let tableReady: Promise<void> | null = null;

const patchImpactSignalSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(['rune', 'item', 'champion', 'synergy', 'system']),
  title: z.object({
    en: z.string().min(1),
    es: z.string().min(1)
  }),
  summary: z.object({
    en: z.string().min(1),
    es: z.string().min(1)
  }),
  confidence: z.enum(['official', 'derived', 'hypothesis']),
  priority: z.enum(['high', 'medium', 'low']),
  champions: z.array(z.string().min(1)).default([]),
  items: z.array(z.string().min(1)).default([]),
  runes: z.array(z.string().min(1)).default([]),
  sources: z.array(z.string().url()).min(1)
});

const patchImpactReportSchema = z.object({
  patch: z.string().min(1),
  generatedAt: z.string().min(1),
  sourceUrl: z.string().url(),
  summary: z.object({
    en: z.string().min(1),
    es: z.string().min(1)
  }),
  signals: z.array(patchImpactSignalSchema)
});

const interactionRuleSchema = z.object({
  id: z.string().min(1),
  requiresRunes: z.array(z.string().min(1)).default([]),
  requiresItems: z.array(z.string().min(1)).default([]),
  candidateChampions: z.array(z.string().min(1)).default([]),
  triggersOnChampionNotes: z.array(z.string().min(1)).default([]),
  title: z.object({
    en: z.string().min(1),
    es: z.string().min(1)
  }),
  officialSummary: z.object({
    en: z.string().min(1),
    es: z.string().min(1)
  }),
  derivedSummary: z.object({
    en: z.string().min(1),
    es: z.string().min(1)
  }),
  priority: z.enum(['high', 'medium', 'low']).default('medium')
});

type PatchImpactSignal = z.infer<typeof patchImpactSignalSchema>;
type PatchImpactReport = z.infer<typeof patchImpactReportSchema>;
type InteractionRule = z.infer<typeof interactionRuleSchema>;

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function toLines(text: string) {
  return decodeHtmlEntities(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeToken(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

function sectionBounds(lines: string[], sectionTitle: string, endTitles: string[]) {
  const startIndex = lines.findIndex((line) => line === sectionTitle);
  if (startIndex === -1) return null;

  const endIndex = lines.findIndex((line, index) => index > startIndex && endTitles.includes(line));
  return {
    startIndex: startIndex + 1,
    endIndex: endIndex === -1 ? lines.length : endIndex
  };
}

function extractNamedSectionEntries(lines: string[], sectionTitle: string, endTitles: string[]) {
  const bounds = sectionBounds(lines, sectionTitle, endTitles);
  if (!bounds) return [] as Array<{ name: string; summary: string }>;

  const entries: Array<{ name: string; summary: string }> = [];
  let currentName: string | null = null;

  for (let index = bounds.startIndex; index < bounds.endIndex; index += 1) {
    const line = lines[index];
    if (!line) continue;

    const nextLine = lines[index + 1] ?? '';
    const isHeading =
      !line.startsWith('*')
      && !line.startsWith('>')
      && !/\d+ ⇒ \d+/.test(line)
      && line.length <= 48
      && !line.includes(':')
      && /^[A-Z0-9][A-Za-z0-9' /-]+$/.test(line);

    if (isHeading && nextLine && nextLine.length > 30) {
      currentName = line;
      entries.push({
        name: line,
        summary: nextLine
      });
      continue;
    }

    if (currentName && entries.length) {
      const current = entries[entries.length - 1];
      if (current.summary.length < 260 && line.length > 20 && !/^\*/.test(line) && !/^\d/.test(line)) {
        current.summary = `${current.summary} ${line}`.trim();
      }
    }
  }

  return entries;
}

async function ensureTables() {
  if (!pool) return;
  if (!tableReady) {
    tableReady = pool.query(`
      CREATE TABLE IF NOT EXISTS patch_impact_cache (
        patch TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).then(() => undefined);
  }

  await tableReady;
}

async function loadStoredPatchImpactReports() {
  if (!pool) return [] as PatchImpactReport[];
  await ensureTables();
  const result = await pool.query<{ payload: PatchImpactReport }>(`SELECT payload FROM patch_impact_cache`);
  return result.rows.map((row) => patchImpactReportSchema.parse(row.payload));
}

async function savePatchImpactReport(report: PatchImpactReport) {
  if (pool) {
    await ensureTables();
    await pool.query(
      `INSERT INTO patch_impact_cache (patch, payload, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (patch) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
      [report.patch, JSON.stringify(report)]
    );
    return;
  }

  await ensureWrite(`${patchImpactDir}/${report.patch}.auto.json`, `${JSON.stringify(report, null, 2)}\n`);
}

async function loadLocalPatchImpactReports() {
  try {
    await access(patchImpactDir);
  } catch {
    return [] as PatchImpactReport[];
  }

  return [];
}

async function loadInteractionRules() {
  const raw = await readFile(interactionRulesPath, 'utf8');
  return z.array(interactionRuleSchema).parse(JSON.parse(raw));
}

function buildChampionSignals(
  patch: string,
  sourceUrl: string,
  championUpdates: Array<{ championName: string; summary: string; impactLevel: 'low' | 'medium' | 'high' }>
) {
  return championUpdates.map((update) =>
    patchImpactSignalSchema.parse({
      id: `champion-${patch}-${normalizeToken(update.championName).replace(/\s+/g, '-')}`,
      kind: 'champion',
      title: {
        en: `${update.championName} changed in ${patch}`,
        es: `${update.championName} cambió en ${patch}`
      },
      summary: {
        en: update.summary,
        es: update.summary
      },
      confidence: 'official',
      priority: update.impactLevel,
      champions: [update.championName],
      items: [],
      runes: [],
      sources: [sourceUrl]
    })
  );
}

function buildSectionSignals(
  patch: string,
  sourceUrl: string,
  entries: Array<{ name: string; summary: string }>,
  kind: 'item' | 'rune'
) {
  return entries.map((entry) =>
    patchImpactSignalSchema.parse({
      id: `${kind}-${patch}-${normalizeToken(entry.name).replace(/\s+/g, '-')}`,
      kind,
      title: {
        en: `${entry.name} changed in ${patch}`,
        es: `${entry.name} cambió en ${patch}`
      },
      summary: {
        en: entry.summary,
        es: entry.summary
      },
      confidence: 'official',
      priority: /too strong|overpowered|nerf|changed/i.test(entry.summary) ? 'high' : 'medium',
      champions: [],
      items: kind === 'item' ? [entry.name] : [],
      runes: kind === 'rune' ? [entry.name] : [],
      sources: [sourceUrl]
    })
  );
}

function buildSystemSignals(
  patch: string,
  sourceUrl: string,
  systemUpdates: Array<{ category: string; summary: string; impactLevel: 'low' | 'medium' | 'high' }>
) {
  return systemUpdates.map((update) =>
    patchImpactSignalSchema.parse({
      id: `system-${patch}-${normalizeToken(update.category).replace(/\s+/g, '-')}`,
      kind: 'system',
      title: {
        en: `System change: ${update.category.replace(/_/g, ' ')}`,
        es: `Cambio de sistema: ${update.category.replace(/_/g, ' ')}`
      },
      summary: {
        en: update.summary,
        es: update.summary
      },
      confidence: 'official',
      priority: update.impactLevel,
      champions: [],
      items: [],
      runes: [],
      sources: [sourceUrl]
    })
  );
}

function ruleMatches(
  rule: InteractionRule,
  runeEntries: Array<{ name: string; summary: string }>,
  itemEntries: Array<{ name: string; summary: string }>,
  championUpdates: Array<{ championName: string; summary: string }>
) {
  const changedRunes = new Set(runeEntries.map((entry) => normalizeToken(entry.name)));
  const changedItems = new Set(itemEntries.map((entry) => normalizeToken(entry.name)));
  const changedChampions = championUpdates.map((entry) => normalizeToken(entry.championName));

  const hasRunes = rule.requiresRunes.every((name) => changedRunes.has(normalizeToken(name)));
  const hasItems = rule.requiresItems.every((name) => changedItems.has(normalizeToken(name)));
  const hasChampionSignal = rule.triggersOnChampionNotes.length
    ? rule.triggersOnChampionNotes.some((name) => changedChampions.includes(normalizeToken(name)))
    : true;

  return hasRunes && hasItems && hasChampionSignal;
}

function buildInteractionSignals(
  patch: string,
  sourceUrl: string,
  rules: InteractionRule[],
  runeEntries: Array<{ name: string; summary: string }>,
  itemEntries: Array<{ name: string; summary: string }>,
  championUpdates: Array<{ championName: string; summary: string }>
) {
  const signals: PatchImpactSignal[] = [];

  for (const rule of rules) {
    if (!ruleMatches(rule, runeEntries, itemEntries, championUpdates)) continue;

    signals.push(
      patchImpactSignalSchema.parse({
        id: `synergy-${patch}-${rule.id}`,
        kind: 'synergy',
        title: rule.title,
        summary: {
          en: `${rule.officialSummary.en} ${rule.derivedSummary.en}`,
          es: `${rule.officialSummary.es} ${rule.derivedSummary.es}`
        },
        confidence: 'derived',
        priority: rule.priority,
        champions: rule.candidateChampions,
        items: rule.requiresItems,
        runes: rule.requiresRunes,
        sources: [sourceUrl]
      })
    );
  }

  return signals;
}

function buildSummary(patch: string, signals: PatchImpactSignal[]) {
  const highPriority = signals.filter((signal) => signal.priority === 'high').length;
  const synergyCount = signals.filter((signal) => signal.kind === 'synergy').length;

  return {
    en: `Patch ${patch} impact report generated automatically. ${highPriority} high-priority signals and ${synergyCount} synergy reads need attention before claiming meta-stable guidance.`,
    es: `Reporte automático de impacto para el parche ${patch}. Hay ${highPriority} señales de prioridad alta y ${synergyCount} lecturas de sinergia que conviene revisar antes de vender una guía como meta-estable.`
  };
}

export async function analyzeCurrentPatchImpact(force = false) {
  const currentPatch = await getCurrentPatchNotes();
  if (!currentPatch) return null;

  const existingReports = await loadPatchImpactReports();
  const existing = existingReports.find((report) => report.patch === currentPatch.patch);
  if (existing && !force) return existing;

  const lines = currentPatch.rawText ? toLines(currentPatch.rawText) : [];
  const itemEntries = extractNamedSectionEntries(lines, 'Items', ['Runes', 'Game Systems', 'Arena']);
  const runeEntries = extractNamedSectionEntries(lines, 'Runes', ['Game Systems', 'Arena']);
  const rules = await loadInteractionRules();

  const signals = [
    ...buildChampionSignals(currentPatch.patch, currentPatch.sourceUrl, currentPatch.championUpdates),
    ...buildSectionSignals(currentPatch.patch, currentPatch.sourceUrl, itemEntries, 'item'),
    ...buildSectionSignals(currentPatch.patch, currentPatch.sourceUrl, runeEntries, 'rune'),
    ...buildSystemSignals(currentPatch.patch, currentPatch.sourceUrl, currentPatch.systemUpdates),
    ...buildInteractionSignals(currentPatch.patch, currentPatch.sourceUrl, rules, runeEntries, itemEntries, currentPatch.championUpdates)
  ];

  const report = patchImpactReportSchema.parse({
    patch: currentPatch.patch,
    generatedAt: new Date().toISOString(),
    sourceUrl: currentPatch.sourceUrl,
    summary: buildSummary(currentPatch.patch, signals),
    signals
  });

  await savePatchImpactReport(report);
  return report;
}

export async function loadPatchImpactReports() {
  const [localReports, storedReports] = await Promise.all([loadLocalPatchImpactReports(), loadStoredPatchImpactReports()]);
  const deduped = new Map<string, PatchImpactReport>();

  for (const report of [...localReports, ...storedReports]) {
    const existing = deduped.get(report.patch);
    if (!existing || report.generatedAt > existing.generatedAt) {
      deduped.set(report.patch, report);
    }
  }

  return Array.from(deduped.values()).sort((left, right) => right.patch.localeCompare(left.patch, undefined, { numeric: true }));
}

export async function getCurrentPatchImpactReport() {
  await analyzeCurrentPatchImpact(false);
  const reports = await loadPatchImpactReports();
  return reports[0] ?? null;
}
