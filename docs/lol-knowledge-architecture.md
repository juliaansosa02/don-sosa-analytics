# LoL Knowledge Architecture Audit

## 1. What exists today

### Signal engine

Current source of truth:

- `packages/core/src/index.ts`
- `apps/api/src/analysis/participantFactory.ts`
- `apps/api/src/analysis/timelineAnalysis.ts`
- `apps/api/src/services/collectionService.ts`

What it already does well:

- builds per-match snapshots from Riot match + timeline
- computes role-agnostic and role-adjusted summary metrics
- extracts early game signals such as CS, gold, XP, deaths before 10/14, objective-window deaths and lane opponent diff at 15
- generates a first pass of insights, review agenda and matchup alerts

Main limitation:

- the insight engine is still mostly metric-threshold driven
- champion meaning is shallow
- role differences are present but mostly as fixed targets and copy
- elo adaptation is indirect
- "real problem" detection is weak when a generic macro leak is technically true but not first-order

### Curated coaching knowledge

Current source:

- `apps/api/data/coach-kb/cards/*.json`
- `apps/api/data/coach-kb/sources/processed/*.md`

Strengths:

- reusable evergreen ideas already exist
- retrieval is local and deterministic
- patch sensitivity already exists on cards

Limitations:

- coverage is jungle-heavy
- champion identity is almost absent
- there is no explicit role identity layer separate from cards
- there is no elo identity layer
- cards do not express blocked heuristics when required data is missing

### Patch awareness

Current source:

- `apps/api/src/services/patchNotes.ts`
- `apps/api/data/patch-notes/*.json`

Strengths:

- official patch notes can be synced and filtered into champion/system context

Limitations:

- patch notes are not the same as live meta
- there was no explicit storage layer for tier/build/rune references by patch

### Reference players

Current source:

- `apps/api/src/data/roleReferenceSeeds.ts`
- `apps/api/src/services/roleReferenceService.ts`

Strengths:

- role benchmark/reference concept already exists

Limitations:

- references are player-profile based, not champion/patch/elo specific

## 2. New architecture introduced in this iteration

### Knowledge layers

The product should now be thought of as six stacked layers:

1. Evergreen game knowledge
   - stable fundamentals and coaching cards
2. Patch/meta knowledge
   - patch notes plus patch-scoped manual meta references
3. Champion identity
   - how value is created on the pick
   - what metrics are over/under-weighted
   - which heuristics are blocked by missing telemetry
4. Role identity
   - role-specific targets, blind spots and evaluation weights
5. Elo adaptation
   - what to teach first for this bracket
   - what to de-emphasize until fundamentals stabilize
6. Sample-specific diagnosis
   - current player block
   - dominant issue
   - suppressed generic explanations
   - data gaps

### New files and responsibilities

- `apps/api/src/services/coachKnowledgeSchemas.ts`
  - schemas/types for role identity, champion identity, elo profile and patch meta scaffolding
- `apps/api/src/services/coachKnowledgeService.ts`
  - loads declarative knowledge
  - derives skill bracket
  - builds localized identity context
  - ranks problems using role/champion/elo/sample evidence
  - exposes data gaps
- `apps/api/data/coach-kb/identities/roles.json`
  - role identity config
- `apps/api/data/coach-kb/identities/elos.json`
  - elo identity config
- `apps/api/data/coach-kb/identities/champions/*.json`
  - champion identity config and blocked heuristics
- `apps/api/data/coach-kb/meta/patches/*.json`
  - patch-scoped meta reference layer

## 3. What changed in behavior

### Champion identity

The system now has an explicit place to say:

- Shen is low-econ, global and side-pressure oriented
- Naafiri is snowball and early-state sensitive
- Corki/Neeko/Garen can carry champion-specific anti-patterns even if the current dataset cannot yet prove them directly
- Jinx and Leona should not be evaluated through the same economy lens

That identity is no longer prompt-only. It is config-backed and usable by the engine.

### Role identity

Role modeling is now declarative instead of living only in scattered helper functions.

Each role identity stores:

- target references
- evaluation weights
- role fundamentals
- blind spots
- review prompts

### Elo adaptation

The system now explicitly models:

- `low_elo`
- `mid_elo`
- `high_elo`
- `apex`

This matters because the engine can now de-emphasize:

- objective/setup talk when early deaths are the real blocker in low elo
- lead conversion talk when the player is not even creating leads yet
- matchup prep when the sample is still dominated by free fundamental errors

### Real-problem diagnosis

The AI coach context now includes:

- `knowledge`
- `diagnosis`

`diagnosis` does three important things:

- re-ranks top problems using role/champion/elo/sample evidence
- suppresses generic but badly-timed explanations
- surfaces blocked reads as data gaps instead of pretending certainty

This is the key guardrail against false coaching specificity.

## 4. Current data map

### Data we already use today

- Riot match summary
- Riot timeline snapshots
- role
- champion
- opponent champion
- queue type
- rank
- items
- runes
- early deaths
- lane opponent diff at 15
- objective-window deaths
- champion pool structure
- internal benchmark aggregates
- curated evergreen coaching cards
- official patch notes

### Data still missing today

These are the main blockers for high-confidence champion-specific diagnosis:

- spell cast usage
- ability order in specific windows
- dash/engage misuse detection
- disguise/form usage
- ward placement and clear events
- frame-level positioning around objective setups
- exact recall timestamps and recall quality
- lane state classification by wave shape

### Best future additions if Riot approves more scope or we add more ingestion

- richer timeline event indexing
- ward events and vision pathing
- cast-level ability telemetry
- position-frame sequences around fights
- spectator/live or replay-derived positional data
- champion mastery and long-term affinity signals
- more reliable patch/build/rune reference imports
- larger cross-player benchmark corpus segmented by role/champion/elo/patch

## 5. Guardrails to keep the system honest

Do not let the stack claim:

- "Neeko is not using passive"
- "Corki is suiciding with Valkyrie"
- "Garen is diveing level 1"

unless the required telemetry exists.

Instead, store those as champion heuristics with:

- `blocked_by_missing_data`
- required signals
- explicit note in `diagnosis.dataGaps`

That is much safer than hallucinating champion-specific certainty from broad aggregate stats.

## 6. Recommended next steps

1. Expand champion identity coverage for the real ranked pool of your users before trying to cover the entire roster.
2. Add more adc/support/top coaching cards so retrieval coverage matches the new identity layer.
3. Extend the snapshot model with event-level signals:
   - recalls
   - ward events
   - spell casts
   - fight entry positions
4. Add patch meta ingestion from trusted sources into `coach-kb/meta/patches/`.
5. Build a feedback dataset tying `generation -> verdict -> champion -> role -> elo -> patch`.
6. Use that dataset to learn which diagnosis weights are overfiring or underfiring.
7. Once enough labeled feedback exists, add automatic reweighting or a learned reranker on top of the current rule-based layer.

## 7. Strategic takeaway

The differentiator should not be "more text from AI."

It should be:

- stronger game ontology
- honest uncertainty
- champion/role/elo-aware prioritization
- patch awareness without brittle hardcoding
- a diagnosis engine that decides what matters first for this specific player block

That is the path from "stats plus some insights" to a real coaching system.
