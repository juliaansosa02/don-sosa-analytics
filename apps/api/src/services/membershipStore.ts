import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import type { MembershipPlanId, MembershipStatus } from '@don-sosa/core';
import { env } from '../config/env.js';
import { ensureWrite } from '../utils/fs.js';

const accountsDir = fileURLToPath(new URL('../../data/membership/accounts', import.meta.url));
const linksDir = fileURLToPath(new URL('../../data/membership/profile-links', import.meta.url));
const pool = env.DATABASE_URL ? new Pool({ connectionString: env.DATABASE_URL }) : null;
let tableReady: Promise<void> | null = null;

export interface MembershipAccountRecord {
  viewerId: string;
  planId: MembershipPlanId;
  status: MembershipStatus;
  source: 'default' | 'dev_override' | 'stripe';
  billingProvider: 'stripe' | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  currentPeriodEnd?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ViewerProfileLinkRecord {
  id: string;
  viewerId: string;
  profileKey: string;
  gameName: string;
  tagLine: string;
  platform: string;
  lastSeenAt: string;
}

async function ensureTables() {
  if (!pool) return;
  if (!tableReady) {
    tableReady = Promise.all([
      pool.query(`
        CREATE TABLE IF NOT EXISTS membership_accounts (
          viewer_id TEXT PRIMARY KEY,
          plan_id TEXT NOT NULL,
          status TEXT NOT NULL,
          source TEXT NOT NULL,
          billing_provider TEXT,
          stripe_customer_id TEXT,
          stripe_subscription_id TEXT,
          stripe_price_id TEXT,
          current_period_end TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `),
      pool.query(`
        CREATE TABLE IF NOT EXISTS membership_profile_links (
          id TEXT PRIMARY KEY,
          viewer_id TEXT NOT NULL,
          profile_key TEXT NOT NULL,
          game_name TEXT NOT NULL,
          tag_line TEXT NOT NULL,
          platform TEXT NOT NULL,
          last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(viewer_id, profile_key)
        )
      `)
    ]).then(() => undefined);
  }

  await tableReady;
}

function accountPath(viewerId: string) {
  return `${accountsDir}/${viewerId}.json`;
}

function linksPath(viewerId: string) {
  return `${linksDir}/${viewerId}.json`;
}

export async function loadMembershipAccount(viewerId: string) {
  if (!pool) {
    try {
      const raw = await readFile(accountPath(viewerId), 'utf8');
      return JSON.parse(raw) as MembershipAccountRecord;
    } catch {
      return null;
    }
  }

  await ensureTables();
  const result = await pool.query<{
    viewer_id: string;
    plan_id: MembershipPlanId;
    status: MembershipStatus;
    source: 'default' | 'dev_override' | 'stripe';
    billing_provider: 'stripe' | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    stripe_price_id: string | null;
    current_period_end: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT * FROM membership_accounts WHERE viewer_id = $1 LIMIT 1`,
    [viewerId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    viewerId: row.viewer_id,
    planId: row.plan_id,
    status: row.status,
    source: row.source,
    billingProvider: row.billing_provider,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    stripePriceId: row.stripe_price_id,
    currentPeriodEnd: row.current_period_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  } satisfies MembershipAccountRecord;
}

export async function saveMembershipAccount(record: Omit<MembershipAccountRecord, 'createdAt' | 'updatedAt'> & {
  createdAt?: string;
  updatedAt?: string;
}) {
  const createdAt = record.createdAt ?? new Date().toISOString();
  const updatedAt = record.updatedAt ?? new Date().toISOString();
  const payload: MembershipAccountRecord = { ...record, createdAt, updatedAt };

  if (!pool) {
    await ensureWrite(accountPath(record.viewerId), JSON.stringify(payload, null, 2));
    return payload;
  }

  await ensureTables();
  await pool.query(
    `INSERT INTO membership_accounts (
      viewer_id, plan_id, status, source, billing_provider, stripe_customer_id,
      stripe_subscription_id, stripe_price_id, current_period_end, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    ON CONFLICT (viewer_id)
    DO UPDATE SET
      plan_id = EXCLUDED.plan_id,
      status = EXCLUDED.status,
      source = EXCLUDED.source,
      billing_provider = EXCLUDED.billing_provider,
      stripe_customer_id = EXCLUDED.stripe_customer_id,
      stripe_subscription_id = EXCLUDED.stripe_subscription_id,
      stripe_price_id = EXCLUDED.stripe_price_id,
      current_period_end = EXCLUDED.current_period_end,
      updated_at = EXCLUDED.updated_at`,
    [
      record.viewerId,
      record.planId,
      record.status,
      record.source,
      record.billingProvider,
      record.stripeCustomerId ?? null,
      record.stripeSubscriptionId ?? null,
      record.stripePriceId ?? null,
      record.currentPeriodEnd ?? null,
      createdAt,
      updatedAt
    ]
  );

  return payload;
}

export async function listViewerProfileLinks(viewerId: string) {
  if (!pool) {
    try {
      const raw = await readFile(linksPath(viewerId), 'utf8');
      return JSON.parse(raw) as ViewerProfileLinkRecord[];
    } catch {
      return [];
    }
  }

  await ensureTables();
  const result = await pool.query<{
    id: string;
    viewer_id: string;
    profile_key: string;
    game_name: string;
    tag_line: string;
    platform: string;
    last_seen_at: string;
  }>(
    `SELECT * FROM membership_profile_links WHERE viewer_id = $1 ORDER BY last_seen_at DESC`,
    [viewerId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    viewerId: row.viewer_id,
    profileKey: row.profile_key,
    gameName: row.game_name,
    tagLine: row.tag_line,
    platform: row.platform,
    lastSeenAt: row.last_seen_at
  }));
}

export async function touchViewerProfileLink(input: {
  viewerId: string;
  profileKey: string;
  gameName: string;
  tagLine: string;
  platform: string;
}) {
  const nextRecord: ViewerProfileLinkRecord = {
    id: randomUUID(),
    viewerId: input.viewerId,
    profileKey: input.profileKey,
    gameName: input.gameName,
    tagLine: input.tagLine,
    platform: input.platform,
    lastSeenAt: new Date().toISOString()
  };

  if (!pool) {
    const current = await listViewerProfileLinks(input.viewerId);
    const merged = [
      nextRecord,
      ...current.filter((record) => record.profileKey !== input.profileKey)
    ];
    await ensureWrite(linksPath(input.viewerId), JSON.stringify(merged, null, 2));
    return nextRecord;
  }

  await ensureTables();
  await pool.query(
    `INSERT INTO membership_profile_links (
      id, viewer_id, profile_key, game_name, tag_line, platform, last_seen_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT (viewer_id, profile_key)
    DO UPDATE SET
      game_name = EXCLUDED.game_name,
      tag_line = EXCLUDED.tag_line,
      platform = EXCLUDED.platform,
      last_seen_at = EXCLUDED.last_seen_at`,
    [
      nextRecord.id,
      input.viewerId,
      input.profileKey,
      input.gameName,
      input.tagLine,
      input.platform,
      nextRecord.lastSeenAt
    ]
  );

  return nextRecord;
}

export async function listMembershipAccounts() {
  if (!pool) {
    try {
      const files = await readdir(accountsDir);
      const entries = await Promise.all(files
        .filter((file) => file.endsWith('.json'))
        .map(async (file) => {
          try {
            const raw = await readFile(`${accountsDir}/${file}`, 'utf8');
            return JSON.parse(raw) as MembershipAccountRecord;
          } catch {
            return null;
          }
        }));
      return entries.filter((entry): entry is MembershipAccountRecord => Boolean(entry));
    } catch {
      return [];
    }
  }

  await ensureTables();
  const result = await pool.query<{
    viewer_id: string;
    plan_id: MembershipPlanId;
    status: MembershipStatus;
    source: 'default' | 'dev_override' | 'stripe';
    billing_provider: 'stripe' | null;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    stripe_price_id: string | null;
    current_period_end: string | null;
    created_at: string;
    updated_at: string;
  }>(`SELECT * FROM membership_accounts ORDER BY updated_at DESC`);

  return result.rows.map((row) => ({
    viewerId: row.viewer_id,
    planId: row.plan_id,
    status: row.status,
    source: row.source,
    billingProvider: row.billing_provider,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    stripePriceId: row.stripe_price_id,
    currentPeriodEnd: row.current_period_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  } satisfies MembershipAccountRecord));
}

export async function loadMembershipAccountByStripeCustomerId(stripeCustomerId: string) {
  const accounts = await listMembershipAccounts();
  return accounts.find((account) => account.stripeCustomerId === stripeCustomerId) ?? null;
}

export async function loadMembershipAccountByStripeSubscriptionId(stripeSubscriptionId: string) {
  const accounts = await listMembershipAccounts();
  return accounts.find((account) => account.stripeSubscriptionId === stripeSubscriptionId) ?? null;
}

export async function transferMembershipState(fromViewerId: string, toViewerId: string) {
  if (!fromViewerId || fromViewerId === toViewerId) return;

  const sourceAccount = await loadMembershipAccount(fromViewerId);
  const targetAccount = await loadMembershipAccount(toViewerId);
  if (sourceAccount && !targetAccount) {
    await saveMembershipAccount({
      viewerId: toViewerId,
      planId: sourceAccount.planId,
      status: sourceAccount.status,
      source: sourceAccount.source,
      billingProvider: sourceAccount.billingProvider,
      stripeCustomerId: sourceAccount.stripeCustomerId ?? null,
      stripeSubscriptionId: sourceAccount.stripeSubscriptionId ?? null,
      stripePriceId: sourceAccount.stripePriceId ?? null,
      currentPeriodEnd: sourceAccount.currentPeriodEnd ?? null,
      createdAt: sourceAccount.createdAt
    });
  }

  const sourceLinks = await listViewerProfileLinks(fromViewerId);
  const targetLinks = await listViewerProfileLinks(toViewerId);
  const targetKeys = new Set(targetLinks.map((entry) => entry.profileKey));
  for (const entry of sourceLinks) {
    if (targetKeys.has(entry.profileKey)) continue;
    await touchViewerProfileLink({
      viewerId: toViewerId,
      profileKey: entry.profileKey,
      gameName: entry.gameName,
      tagLine: entry.tagLine,
      platform: entry.platform
    });
  }
}
