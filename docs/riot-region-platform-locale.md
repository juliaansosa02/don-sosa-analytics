# Riot Region, Platform and Locale Model

Don Sosa Coach now separates three concerns that used to get mixed together:

- `locale`: UI and coaching language only. Today this is `es` or `en`.
- `platform`: the Riot gameplay server where the account actually plays, for example `EUW1`, `KR`, `NA1`, `LA1`, `LA2`, `BR1`.
- `regionalRoute`: the Riot routing cluster used by account and match-v5 APIs, derived from the selected platform. Examples: `americas`, `europe`, `asia`, `sea`.

## Rules

- The frontend always asks for a visible Riot platform selection.
- The backend derives the regional route from that platform instead of trusting a hidden locale-based guess.
- Snapshots, cached profiles and AI coaching generations are keyed by `platform + gameName + tagLine`, so the same Riot ID can coexist across different servers without collisions.
- Legacy saved profiles without platform still load through fallback lookup and are upgraded when possible from cached data.

## Practical examples

- `DonSosa#LAS` on `LA2` routes through `americas`.
- `Faker#KR1` on `KR` routes through `asia`.
- `Player#EUW` on `EUW1` routes through `europe`.

This keeps UI language independent from Riot infrastructure while preserving compatibility with snapshots, caching, coaching and saved profiles.
