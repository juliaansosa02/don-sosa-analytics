# Patch Sync Automation

This project can keep Riot patch context updated automatically without manual intervention from the chat.

## What updates automatically

- Official Riot patch note discovery from the Riot patch notes tag page
- Patch summary ingestion used by coaching
- Champion and system update snippets used by patch-aware reads
- Current live patch context returned by the API

## Architecture

There are now two layers:

1. API-side scheduler
   - When the Render web service is awake, the API keeps polling the Riot patch notes feed every `PATCH_NOTES_SYNC_INTERVAL_HOURS`.

2. GitHub Actions wakeup + sync
   - A scheduled GitHub Actions workflow runs every 6 hours.
   - It calls the internal sync endpoint on Render.
   - This wakes the free Render service if it is sleeping and forces a patch refresh.

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

## Important limitation

This automation keeps patch context fresh automatically.

It does **not** magically rewrite every curated champion intelligence card on patch day. Curated reads that depend on human judgment should still be reviewed when Riot ships large champion or system overhauls.

What the system *does* update automatically:

- current patch number
- patch summary
- detected champion updates
- detected system updates
- patch-aware emphasis in coaching context
