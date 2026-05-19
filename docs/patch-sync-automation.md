# Patch Sync Automation

This project can keep Riot patch context updated automatically without manual intervention from the chat.

## What updates automatically

- Official Riot patch note discovery from the Riot patch notes tag page
- Patch summary ingestion used by coaching
- Champion and system update snippets used by patch-aware reads
- Current live patch context returned by the API
- Automatic patch impact reports for changed runes, items, systems, and flagged synergies

## Architecture

There are now two layers:

1. API-side scheduler
   - When the Render web service is awake, the API keeps polling the Riot patch notes feed every `PATCH_NOTES_SYNC_INTERVAL_HOURS`.

2. GitHub Actions wakeup + sync
   - A scheduled GitHub Actions workflow runs every 6 hours.
   - It calls the internal sync endpoint on Render.
   - This wakes the free Render service if it is sleeping and forces a patch refresh.
   - It then triggers a patch impact analysis report.

This combination avoids depending on a paid Render cron job.

## Render env vars

Configure these on the `don-sosa` web service:

- `PATCH_NOTES_AUTO_SYNC=true`
- `PATCH_NOTES_SYNC_INTERVAL_HOURS=6`
- `PATCH_SYNC_SECRET=<random-long-secret>`

## GitHub repository secrets

Add these repository secrets:

- `PATCH_SYNC_URL`
  - Example: `https://don-sosa.onrender.com/api/internal/patch/sync`
- `PATCH_SYNC_SECRET`
  - Must exactly match the Render env var

## Internal endpoints

- `POST /api/internal/patch/sync`
  - Requires header `x-patch-sync-secret`
- `GET /api/internal/patch/status`
  - Requires header `x-patch-sync-secret`
- `POST /api/internal/patch/impact/analyze`
  - Requires header `x-patch-sync-secret`
- `GET /api/internal/patch/impact/status`
  - Requires header `x-patch-sync-secret`

You can also use `Authorization: Bearer <secret>` instead of the custom header.

## Manual verification

Run the GitHub Action manually with `workflow_dispatch`, or call:

```bash
curl -X POST \
  -H "x-patch-sync-secret: YOUR_SECRET" \
  https://don-sosa.onrender.com/api/internal/patch/sync
```

Then verify:

```bash
curl \
  -H "x-patch-sync-secret: YOUR_SECRET" \
  https://don-sosa.onrender.com/api/internal/patch/status
```

And optionally:

```bash
curl -X POST \
  -H "x-patch-sync-secret: YOUR_SECRET" \
  https://don-sosa.onrender.com/api/internal/patch/impact/analyze
```

## Important limitation

This automation keeps patch context fresh automatically.

It does **not** magically rewrite every curated champion intelligence card on patch day. Curated reads that depend on human judgment should still be reviewed when Riot ships large champion or system overhauls.

What the system *does* update automatically:

- current patch number
- patch summary
- detected champion updates
- detected system updates
- patch-aware emphasis in coaching context
- machine-generated impact signals for items, runes, systems, and flagged synergy shells
- external corroboration from Skill-Capped stats when a live patch already shows fast adoption on affected picks

## Example of the deeper layer

If Riot changes a rune like Deathfire Touch and the patch note explicitly mentions a follow-up interaction such as Black Cleaver + Deathfire Touch on Smolder, the impact report can:

- mark the rune change as official
- mark the item change context as official
- generate a derived synergy signal
- flag candidate champions that should be re-checked instead of treated as stable

This is meant to make the system say:

- “this interaction is unstable right now”

instead of pretending:

- “this build is still solved”

## External meta corroboration

The scheduled workflow also syncs a Skill-Capped stats snapshot.

It is used as a **secondary** source:

- Riot patch notes remain the primary source for official change detection
- Skill-Capped helps confirm rapid live adoption, tier shifts, and suspicious item shells

This layer should be used to say:

- “Riot changed this”
- “external live stats already show this pick/item shell spiking”

It should **not** be used to say:

- “Skill-Capped says it, therefore it is final truth”
