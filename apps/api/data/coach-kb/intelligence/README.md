# Coach Intelligence Layer

This folder holds the data-driven scaffolding for the contextual coaching layer.

The goal is to keep the "intelligence" layer explicit and inspectable instead of burying product decisions inside prompts.

## Files

- `problem-taxonomy.json`
  The player-error taxonomy used to classify leaks into real coaching buckets like tempo, spacing, reset timing or champion identity execution.
- `reference-registry.json`
  The registry of knowledge layers that the coach depends on, including versioning, justification and next-upgrade path.

## Design rule

The engine should always separate:

- evergreen knowledge
- patch knowledge
- champion-specific knowledge
- role-specific knowledge
- elo-specific knowledge
- sample-dependent evidence

If the current telemetry cannot directly support a read, the engine should mark that hypothesis as proxy-based or blocked instead of pretending it detected the issue.
