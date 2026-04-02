# Identity Layer

This folder defines champion, role and elo identity separately from evergreen cards.

Why it exists:

- a role target is not enough to explain what "good" means for every champion
- a champion identity is not enough without elo adaptation
- elo adaptation is not enough if the sample-specific problem is somewhere else

Use these files for:

- champion identity and anti-misread guardrails
- role-specific evaluation weights
- elo-specific coaching emphasis
- blocked heuristics that need future telemetry

Design rules:

- keep the majority of knowledge evergreen and declarative
- store champion-specific exceptions here instead of burying them in prompts
- mark heuristics as `blocked_by_missing_data` when the current Riot dataset cannot support them yet
- prefer a small number of high-signal identities over fake coverage for every champion
