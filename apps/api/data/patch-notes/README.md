# Patch Notes Layer

This directory stores a small curated subset of official Riot patch notes.

Purpose:

- keep the AI coach aware of the current patch
- warn when the player's anchor champion or matchup changed recently
- surface system changes that materially alter advice

Rules:

- source from official Riot patch notes only
- keep summaries short and coaching-oriented
- do not dump the whole patch note article here
- prefer champion and system changes that affect real coaching recommendations

Suggested workflow for each new patch:

1. Add one JSON file named like `26.7.json`
2. Save the official Riot patch notes URL
3. Summarize the 2 to 5 most important patch themes
4. Add only the champion updates that are likely to matter for coaching
5. Add system updates only when they change objectives, items, lanes, jungle, or support economy
