# Patch Meta References

This folder is the patch-aware reference layer that sits on top of evergreen coaching knowledge.

The goal of this layer is different from `cards/`:

- `cards/` explain evergreen coaching concepts
- `meta/patches/*.json` store patch-bounded references such as role tier shifts, strong builds, rune trends or manual notes from external sources

Important rule:

- never fake current meta data
- if a patch file has no trusted tier/build import yet, keep it in `scaffold_only`
- patch notes can still power generic champion/system awareness even when this folder is not populated

Recommended workflow:

1. Create one JSON file per live patch.
2. Start in `scaffold_only`.
3. Add curated tier/build/rune notes only after you reviewed the source.
4. Keep the patch file small and role-scoped.
5. Let the AI coach use this layer as emphasis, not as truth that overrides evergreen fundamentals.
