# Prompt: Challenger Reference Section

Implement a new premium section in Don Sosa Coach called `Referencias Challenger`.

Product intent:
- This is not a generic leaderboard.
- It should help a player quickly understand what “good” looks like in their role or on their champion.
- It must feel like part of the same minimal, premium, carefully designed product.
- It should be visually elegant, compact, and easy to scan.

Core experience:
- Show a lightweight comparative summary of 3 to 5 high-level players.
- The list should adapt to the user’s selected role and, when possible, their anchor champion.
- Allow slices such as:
  - same server
  - EUW
  - KR
  - NA
  - global mix
- Emphasize patterns, not celebrity for celebrity’s sake.

UX goals:
- No cluttered table.
- No giant empty cards.
- Strong hierarchy:
  - a short section header
  - a compact explanation of why these references matter
  - a row or grid of elegant player cards
  - one concise “what they have in common” synthesis block
- Use champion icons, rank emblems, and profile icons where they improve scanability.
- Preserve the current dark minimal look and avoid flashy esports-dashboard aesthetics.

Functional requirements:
- Work with the current account, snapshot, caching, and coaching architecture.
- Do not spend OpenAI tokens on every filter change.
- Prefer deterministic local aggregation for the reference cards.
- If AI is used, use it only for a single synthesized comparative read and cache it aggressively.
- Support the current locale model cleanly: Spanish or English, never mixed.
- Keep Riot platform/routing support global and aligned with the current platform model.

Suggested data model:
- reference player identity
- platform
- region cluster
- role focus
- optional anchor champion
- rank/tier
- sample size
- win rate
- performance score
- cs@15
- deaths pre14
- signature strengths

Suggested UX structure:
1. Header
   - `Referencias Challenger`
   - short subtitle explaining that this shows what strong execution tends to look like in the same role/champion space
2. Scope controls
   - role
   - optional champion
   - server cluster: current / EUW / KR / NA / global
3. Compact reference cards
   - profile icon
   - player name
   - platform
   - rank emblem
   - main champion or champion pool signal
   - 3 or 4 compact KPIs
4. Synthesis card
   - “Qué comparten”
   - 3 short bullets max
   - one clear takeaway for the current player

Implementation guidance:
- Reuse existing visual primitives and champion/rank helpers where possible.
- Add new helpers only when they reduce duplication.
- Keep components small and composable.
- Avoid deeply nested card structures.
- Make mobile and desktop layouts both feel intentional.
- If real challenger-source data is not yet available, scaffold the architecture cleanly with a realistic placeholder adapter so we can plug live data later without redesigning the section.

Deliverables:
- backend support if needed
- frontend section integrated into the current product
- caching strategy
- clear fallback behavior when no references are available
- premium UI with the same design language as the current refined Don Sosa Coach
