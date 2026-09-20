# Skill: Budget meters (confirm-before-spend)

Spend tools are dangerous. HQ policy: human approval for workflows that **spend, publish, or contact customers**.

## Flow
1. `jeremai estimate --client <id> --seconds 5 --backend <id>`
   Prints model, seconds, unit rate, **retries buffer** (default 1.2×), billed live, remaining cap.
2. Human types `--confirm` or `--yes`.
3. `generate` executes the **stub**, ledgers estimate + actual.
4. Soft-warn at **80%** of `budget_cap_usd`. Hard-stop at **100%** (and if this job would cross the cap).

```
jeremai generate --client aether-wellness                  # exit 2
jeremai generate --client aether-wellness --confirm        # dry-run actual $0
jeremai generate --client aether-wellness --confirm --simulate-spend
# last one debits the estimate against the cap — still no cloud call
jeremai cost --client aether-wellness
```

## What counts
| Ledger | Counts against cap? |
| --- | --- |
| `kind=estimate` (always dry) | No |
| `kind=actual` + `dry_run=1` | No |
| `kind=actual` + `dry_run=0` (`--simulate-spend` or future live) | **Yes** |

## Backend quotes (stubs)
- `runpod-h3` — $0.17 / 5s hypothesis
- `fal-ai` — $0.20 / 5s H3 Max Turbo @768P
- `minimax-h3-api` — $0.40 / 5s official ceiling @768P

Retries buffer is on the **client** (`retries_buffer` in `config.yaml`), not the backend.

## Failure modes
- Confirming because the stub is free. The gate must stay real when adapters go live.
- Splitting a job across clients to dodge a cap.
- Ignoring 80% warn and burning the last 20% on retries.

Cap lives at `knowledge/clients/<id>/config.yaml` → `budget_cap_usd`.
