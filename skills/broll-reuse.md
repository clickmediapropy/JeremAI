# Skill: B-roll reuse (search before generate)

Unit economics die when you regenerate a kitchen window you already paid for.

## Rule
`search-broll` **before** `estimate` / `generate`. Paid-test target: **≥40% of final seconds from the library**.

## Index
SQLite (`JEREMAI_DATA_DIR` / `.data/jeremai.sqlite`) rows:

`tags, duration_s, claim_safe, hash, uri, source` where source ∈ drive | r2 | local | generated.

- **Drive** = client vault (source of truth). URI like `gdrive://aether-wellness/Creative/Footage/...`
- **R2** = working set / cheap egress.
- Seed for the demo: `fixtures/broll/aether-wellness.yaml`.

`claim_safe=false` (e.g. bathroom scale) may appear in search so you can **reject** it. Do not put it on a paid cut.

## Commands
```
jeremai search-broll --client aether-wellness --query "morning kitchen ritual scoop"
```

Rank: tag overlap, then claim-safe bonus, then library-over-generated. If a SAFE hit covers the shot, skip gen.

## After generate
Confirmed dry-run (or future live) clips are inserted as `source=generated`. Next search should still prefer Drive/R2 over those stubs.

## Failure modes
- Empty index → you will overspend. Seed or hash Drive before the first paid job.
- Stale SKU hash → product shot is worse than a miss. Stop; recapture pack.
- Query too cute (“golden hour wellness vibe”) → tokenize misses. Use object words: scoop, jar, stoop, kitchen.

Client URIs live in `knowledge/clients/<id>/config.yaml` (`drive_uri`, `r2_uri`).
