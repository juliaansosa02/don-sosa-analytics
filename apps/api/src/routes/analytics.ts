import { buildAggregateSummary, type SummaryLocale } from '@don-sosa/core';
import { Router } from 'express';
import { z, ZodError } from 'zod';
import { HttpError } from '../lib/http.js';
import { supportedRiotPlatformTuple } from '../lib/riotRouting.js';
import { collectPlayerSnapshot } from '../services/collectionService.js';
import { createJob, getJob, updateJob } from '../services/jobStore.js';
import { loadProfileSnapshot } from '../services/profileStore.js';
import { assertCollectionEntitlement, limitDatasetToMembership, registerViewedProfile, resolveMembershipContext } from '../services/membershipService.js';
import { getRoleReferenceProfiles } from '../services/roleReferenceService.js';

type CachedProfileDataset = Awaited<ReturnType<typeof collectPlayerSnapshot>>;

const bodySchema = z.object({
  gameName: z.string().trim().min(1).max(32),
  tagLine: z.string().trim().transform((value) => value.replace(/^#+/, '')).pipe(z.string().min(1).max(16)),
  platform: z.string().trim().transform((value) => value.toUpperCase()).pipe(z.enum(supportedRiotPlatformTuple)),
  count: z.number().int().positive().max(1000).optional(),
  knownMatchIds: z.array(z.string().min(1)).max(2000).optional(),
  locale: z.enum(['es', 'en']).optional()
});

const profileQuerySchema = z.object({
  locale: z.enum(['es', 'en']).optional(),
  platform: z.string().trim().transform((value) => value.toUpperCase()).pipe(z.enum(supportedRiotPlatformTuple)).optional()
});

const roleReferenceQuerySchema = z.object({
  locale: z.enum(['es', 'en']).optional(),
  platform: z.string().trim().transform((value) => value.toUpperCase()).pipe(z.enum(supportedRiotPlatformTuple)),
  role: z.enum(['TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY'])
});

export const analyticsRouter = Router();

function formatCollectionError(error: unknown, locale: SummaryLocale = 'es') {
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    const field = String(firstIssue?.path[0] ?? '');
    if (field === 'platform') {
      return locale === 'en'
        ? 'Choose a valid Riot server platform such as EUW1, EUN1, KR, NA1, LA1, LA2, BR1, JP1, OC1, TR1 or RU.'
        : 'Elegí una platform válida de Riot como EUW1, EUN1, KR, NA1, LA1, LA2, BR1, JP1, OC1, TR1 o RU.';
    }

    if (field === 'gameName' || field === 'tagLine') {
      return locale === 'en'
        ? 'Check the Riot ID fields and try again. The game name and tag must be valid and not empty.'
        : 'Revisá los campos del Riot ID y volvé a intentar. El game name y el tag tienen que ser válidos y no estar vacíos.';
    }
  }

  if (error instanceof HttpError) {
    if (error.status === 401) {
      return locale === 'en'
        ? 'The Riot API key is invalid or expired. Update RIOT_API_KEY before analyzing again.'
        : 'La Riot API key es inválida o expiró. Actualizá RIOT_API_KEY antes de volver a analizar.';
    }

    if (error.status === 403) {
      if (error.url.startsWith('membership://')) {
        return error.responseText;
      }

      return locale === 'en'
        ? 'The server Riot API key is not valid anymore or already expired. Update it in Render before analyzing again.'
        : 'La Riot API key del servidor no es válida o ya expiró. Actualizala en Render antes de seguir analizando.';
    }

    if (error.status === 429) {
      return locale === 'en'
        ? 'Riot temporarily rate-limited the requests. Wait a bit and try again with fewer matches if needed.'
        : 'Riot limitó temporalmente las requests. Esperá un poco y probá otra vez con menos partidas si hace falta.';
    }

    if (error.status === 404) {
      return locale === 'en'
        ? 'We could not find that account or one of its matches. Check the Riot ID and try again.'
        : 'No pudimos encontrar esa cuenta o alguna de sus partidas. Revisá el Riot ID y volvé a intentar.';
    }
  }

  return error instanceof Error ? error.message : 'Unknown error';
}

analyticsRouter.post('/collect', async (req, res) => {
  try {
    const input = bodySchema.parse(req.body);
    const membership = await resolveMembershipContext(req);
    const collectionAccess = assertCollectionEntitlement(membership, {
      gameName: input.gameName,
      tagLine: input.tagLine,
      platform: input.platform,
      count: input.count ?? 100,
      locale: input.locale
    });
    const dataset = await collectPlayerSnapshot(input);
    const limitedDataset = limitDatasetToMembership(dataset, membership.plan, input.locale ?? 'es');
    await registerViewedProfile(membership, {
      gameName: dataset.player,
      tagLine: dataset.tagLine,
      platform: limitedDataset.summary.platform
    });
    res.json({
      ...limitedDataset,
      membership: {
        planId: membership.plan.id,
        matchedExistingProfile: collectionAccess.alreadyLinked
      }
    });
  } catch (error) {
    const locale = bodySchema.safeParse(req.body).success ? bodySchema.parse(req.body).locale ?? 'es' : 'es';
    res.status(error instanceof HttpError ? error.status : 400).json({ error: formatCollectionError(error, locale) });
  }
});

analyticsRouter.post('/collect/start', async (req, res) => {
  try {
    const input = bodySchema.parse(req.body);
    const membership = await resolveMembershipContext(req);
    assertCollectionEntitlement(membership, {
      gameName: input.gameName,
      tagLine: input.tagLine,
      platform: input.platform,
      count: input.count ?? 100,
      locale: input.locale
    });
    const job = createJob();

    void collectPlayerSnapshot({
      ...input,
      onProgress: (progress) => updateJob(job.id, { status: 'running', progress })
    })
      .then((dataset) => {
        const limitedDataset = limitDatasetToMembership(dataset, membership.plan, input.locale ?? 'es');
        void registerViewedProfile(membership, {
          gameName: dataset.player,
          tagLine: dataset.tagLine,
          platform: limitedDataset.summary.platform
        });
        updateJob(job.id, {
          status: 'completed',
          progress: {
            stage: 'completed',
            current: limitedDataset.summary.matches,
            total: limitedDataset.summary.matches || 1,
            message: input.locale === 'en' ? 'Analysis completed' : 'Análisis completado'
          },
          result: limitedDataset
        });
      })
      .catch((error) => {
        updateJob(job.id, {
          status: 'failed',
          error: formatCollectionError(error, input.locale ?? 'es')
        });
      });

    res.json({
      jobId: job.id,
      status: job.status,
      progress: job.progress
    });
  } catch (error) {
    const locale = bodySchema.safeParse(req.body).success ? bodySchema.parse(req.body).locale ?? 'es' : 'es';
    res.status(error instanceof HttpError ? error.status : 400).json({ error: formatCollectionError(error, locale) });
  }
});

analyticsRouter.get('/collect/:jobId', (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.json(job);
});

analyticsRouter.get('/profile/:gameName/:tagLine', async (req, res) => {
  const query = profileQuerySchema.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: formatCollectionError(query.error, req.query.locale === 'en' ? 'en' : 'es') });
    return;
  }

  const dataset = await loadProfileSnapshot<CachedProfileDataset>(req.params.gameName, req.params.tagLine, query.data.platform);
  if (!dataset) {
    res.status(404).json({ error: 'No cached profile found' });
    return;
  }

  const locale = query.data.locale === 'en' ? 'en' : 'es';
  const membership = await resolveMembershipContext(req);
  assertCollectionEntitlement(membership, {
    gameName: dataset.player,
    tagLine: dataset.tagLine,
    platform: dataset.summary.platform,
    count: Math.min(dataset.matches.length, membership.plan.entitlements.maxStoredMatchesPerProfile),
    locale
  });
  const limitedDataset = limitDatasetToMembership(dataset, membership.plan, locale);
  await registerViewedProfile(membership, {
    gameName: dataset.player,
    tagLine: dataset.tagLine,
    platform: limitedDataset.summary.platform
  });
  res.json({
    ...limitedDataset,
    summary: buildAggregateSummary(limitedDataset.player, limitedDataset.tagLine, limitedDataset.summary.region, limitedDataset.summary.platform, limitedDataset.matches, locale)
  });
});

analyticsRouter.get('/role-references', async (req, res) => {
  const query = roleReferenceQuerySchema.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: formatCollectionError(query.error, req.query.locale === 'en' ? 'en' : 'es') });
    return;
  }

  try {
    const result = await getRoleReferenceProfiles({
      role: query.data.role,
      platform: query.data.platform,
      locale: query.data.locale ?? 'es'
    });

    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});
