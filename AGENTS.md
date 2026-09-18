# JeremAI — agent notes

You are driving an **ops CLI**, not a web app. Nutra ads. Confirm-before-spend. Never auto-publish.

## Product shape
Human brief (10–15%) → agent script / B-roll reuse / generate / assemble (~90%) → human editor polish (~10%) → **human** publish.

## Commands
```
jeremai brief --client <id> --file <path>
jeremai search-broll --client <id> --query "..."
jeremai script --client <id>            # lint; does not approve
jeremai script --client <id> --approve  # human gate
jeremai estimate --client <id> --seconds 5 --backend runpod-h3
jeremai generate --client <id>          # MUST refuse
jeremai generate --client <id> --confirm
jeremai assemble --client <id>
jeremai cost --client <id>
```

`pnpm demo` runs that path on `aether-wellness`.

## Hard rules
1. Search the SQLite index (Drive/R2/local) **before** generate.
2. Claims allowlist is law.
3. `generate` without `--confirm` is a failure, not a nudge.
4. Soft-warn 80% of `budget_cap_usd`. Hard-stop 100%.
5. Both video backends are **dry-run stubs**. Do not rent GPUs. Do not call MiniMax paygo.
6. Knowledge = `knowledge/clients/<id>/` (HQ by Indigo stand-in). Ignore indigohq.com.
7. Never add a web UI. Never wire media-buying.
