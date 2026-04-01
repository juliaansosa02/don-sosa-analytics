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
```

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

## Important warning

Do not train on raw transcript dumps.

First build:

- clean cards
- eval set
- feedback loop

Only after you have strong reviewed outputs should you consider fine-tuning style or structure.
