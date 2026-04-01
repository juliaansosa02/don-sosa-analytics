# AI Coach Knowledge Base

This folder is the source of truth for Don Sosa Coach's first knowledge system.

The goal is **not** to dump raw transcripts into the model. The goal is to convert coach knowledge into reusable, searchable units.

## Folder structure

```text
coach-kb/
  cards/
    *.json
  sources/
    raw/
    processed/
```

## How to feed knowledge

### 1. Raw source

Put the original material in `sources/raw/`:

- transcript text
- summarized notes
- video metadata

This layer is for archiving. It should not be what the model consumes directly.

### 2. Processed source

In `sources/processed/`, create a cleaned markdown file per video or topic:

- remove filler
- remove repeated phrases
- keep only real coaching ideas
- split by concept

This layer is what you can later upload to an OpenAI vector store if you want hosted retrieval.

### 3. Knowledge cards

In `cards/`, create one JSON file per coaching concept.

Each card should contain:

- one idea only
- clear metadata
- one coach concept
- actionable advice

## Good card example

Use:

- one concept
- one role
- one phase
- clear actionables

Avoid:

- giant transcript chunks
- motivational filler
- vague statements like "farm better"
- concepts that mix three different problems together

## Fast workflow for you and your cousin

1. Pick one coach video.
2. Extract 5 to 12 real ideas.
3. Turn each idea into a card.
4. Save the cards in `cards/`.
5. Run:

```powershell
npm run coach:knowledge:audit -w @don-sosa/api
```

6. When `OPENAI_API_KEY` is configured, the AI coach endpoint can already use those cards.

## Video-to-card operating workflow

Use this exact pipeline every time:

1. Save the source metadata in `sources/raw/`.
2. Write one cleaned markdown in `sources/processed/`.
3. Split the video into reusable concepts.
4. Create one card per concept in `cards/`.
5. Keep cards in English first so reviewer-facing AI output stays strong in English.
6. Only add champion-specific cards when the source is truly champion-specific.
7. Prefer 6 to 12 narrow cards over 1 giant card.

### What belongs in `sources/raw/`

- video title
- url
- coach name
- raw transcript or the user-provided transcript

### What belongs in `sources/processed/`

- cleaned summary
- repeated concepts removed
- sections by role / phase / concept
- a short list of "best concepts to turn into cards"

### What belongs in a card

- one coaching idea
- one main phase
- one main concept
- 2 to 3 actionables
- enough metadata that retrieval can find it
- if relevant, whether the idea is mainly for `soloq`, `coordinated play`, or both through tags

### What should not become a card

- motivational talk
- personal anecdotes
- repeated filler
- broad ideas like "play smarter"
- mixed concepts like "tempo, objectives, communication, and mechanics" all in one file
- sales claims, unverifiable results, or authority statements that do not teach gameplay

## Suggested first content packs

Start here:

- Jungle early tempo
- Objective setup
- Deaths before 14
- Wave and reset discipline
- Review heuristics
- Matchup preparation on main picks

Only after that, expand champion-specific material.
