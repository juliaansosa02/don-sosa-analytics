# AI Coach Rollout Guide

This is the fastest serious path to add an AI coaching layer to Don Sosa Coach without losing grounding in match data.

## Product principle

The current stats engine remains the source of truth for:

- what is going wrong
- where it is happening
- how stable or unstable the pattern is

The AI layer should do this:

- explain the problem more deeply
- turn the diagnosis into review tasks
- convert the next 3 games into a focused improvement block
- use coach knowledge to sharpen recommendations

## Architecture

### 1. Signal engine

Already present in `packages/core`.

### 2. Knowledge layer

Located in:

`apps/api/data/coach-kb/`

This layer is curated manually at first.

### 3. AI generation layer

Main backend route:

`POST /api/ai/coach/generate`

Flow:

1. Load the stored player profile from cache/Postgres.
2. Apply role, queue and time filters.
3. Rebuild summary in the requested locale.
4. Retrieve the best local knowledge cards.
5. If `OPENAI_API_KEY` exists, call OpenAI Responses API.
6. If not, return a structured draft built from the current engine and local knowledge.

### 4. Feedback layer

Route:

`POST /api/ai/coach/feedback`

This lets you collect:

- useful
- mixed
- generic
- incorrect

Use this to build a future eval set and later fine-tuning dataset.

## Environment variables

Add these to Render when you are ready:

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
OPENAI_VECTOR_STORE_ID=
CURRENT_LOL_PATCH=
```

`CURRENT_LOL_PATCH` is optional for now, but it becomes important once you start mixing evergreen fundamentals with patch-sensitive cards.

## First milestone

Do this first before adding lots of content:

1. Create 20 to 40 good knowledge cards.
2. Cover these topics:
   - jungle tempo
   - wave/reset discipline
   - deaths before 14
   - objective setup
   - review heuristics
3. Test the AI output on 10 to 20 real player cases.
4. Collect feedback.

## How you should work with your cousin

You:

- choose the source material
- decide which ideas are real coaching value
- curate cards
- review AI outputs

Your cousin:

- keeps the ingestion pipeline clean
- maintains API/web integration
- adds tooling and storage

## What to do next after this scaffold

1. Add your first real coach transcript into `sources/raw`.
2. Turn it into 5 to 10 `cards/*.json`.
3. Run:

```powershell
npm run coach:knowledge:audit -w @don-sosa/api
```

4. Set `OPENAI_API_KEY`.
5. Start generating AI coaching blocks.
6. Save feedback every time the output feels generic or especially useful.

## Recommended operating loop for new videos

For each new video, use this sequence:

1. Archive the source.
2. Produce one cleaned processed note file.
3. Extract 5 to 12 card-worthy concepts.
4. Create one JSON card per concept.
5. Run the knowledge audit.
6. Test the AI coach on a real player profile where those concepts matter.
7. Record whether the generated advice felt useful, generic, or incorrect.

### What you should do

- choose the videos
- decide which concepts are truly high-value
- reject vague ideas
- approve the final cards

### What your cousin should do

- keep the API route stable
- keep storage and retrieval maintainable
- later add vector-store upload tooling
- later add eval dashboards and review queues

## Best order to feed knowledge

Start with:

1. Jungle tempo and pathing
2. Objective setup
3. Lane volatility / enemy jungle tracking
4. Deaths before 14 and unstable early games
5. Wave and reset discipline
6. Mid-game map trades
7. Champion-anchor matchup plans

Only after those packs are solid should you expand into:

- champion-specific micro
- niche matchup edges
- patch-specific details

## Patch awareness policy

Not every coaching rule should be treated equally across patches.

Use these categories on knowledge cards:

- `evergreen`: fundamentals that remain useful across most patches
- `meta_sensitive`: advice that depends on champion balance or the current meta
- `system_sensitive`: advice that depends on objectives, items, runes, map systems, or season rules

Recommended policy:

1. Keep the majority of the knowledge base evergreen.
2. Mark patch-sensitive cards explicitly.
3. Set `CURRENT_LOL_PATCH` in production.
4. Later, ingest official Riot patch notes as a separate layer.
5. When a champion or system changes a lot, refresh the old cards or add newer patch-bounded cards.

The goal is not to rewrite the whole coaching stack every patch. The goal is to stop old meta advice from being treated like a timeless truth.

### Recommended future patch workflow

When you are ready, add a second knowledge stream separate from coach videos:

1. Official Riot patch notes
2. Champion-specific buff/nerf summaries
3. System changes such as objectives, item systems, jungle economy, or lane swaps
4. A small "meta impact" summary written in your own words

That patch layer should not replace the evergreen KB. It should sit on top of it and modify emphasis:

- warn when a champion changed recently
- warn when an old meta-sensitive card is likely stale
- surface system-sensitive cards only when they match the current patch

## Important warning

Do not train on raw transcript dumps.

First build:

- clean cards
- eval set
- feedback loop

Only after you have strong reviewed outputs should you consider fine-tuning style or structure.
