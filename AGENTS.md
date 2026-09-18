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
jeremai estimate --client <id> --seconds 5 --backend runpod-h3|fal-ai|minimax-h3-api
jeremai generate --client <id>          # MUST refuse
jeremai generate --client <id> --confirm
jeremai assemble --client <id>
jeremai cost --client <id>
```

`pnpm demo` runs that path on `aether-wellness`, including the fal refuse/confirm gates.

## Skills (read the one that matches the step)

| Skill | Use |
| --- | --- |
| `skills/script.md` | Draft + approve |
| `skills/copywriting.md` | Nutra hooks, structure/function, beat map |
| `skills/compliance-lint.md` | Deterministic claims lint |
| `skills/storyboard.md` | Shot list after search |
| `skills/broll-reuse.md` | Drive/R2 index before generate |
| `skills/budget-meters.md` | estimate → confirm → ledger, 80/100 |
| `skills/runpod.md` | Self-host H3 / rented GPU (preferred pitch) |
| `skills/fal.md` | fal.ai closed-API alternative |
| `skills/comfyui.md` | H3 / Ref2VA graphs → assemble |
| `skills/assemble.md` | ffmpeg + Premiere/CapCut handoff |
| `skills/ship.md` | Never auto-publish |

## Hard rules
1. Search the SQLite index (Drive/R2/local) **before** generate.
2. Claims allowlist is law. Do not “improve” copy with disease or outcome language.
3. `generate` without `--confirm` is a failure, not a nudge.
4. Soft-warn 80% of `budget_cap_usd`. Hard-stop 100%.
5. All video backends are **dry-run stubs**. Do not rent GPUs. Do not call MiniMax or fal. Cost pitch: self-host H3 on RunPod **~$0.17 / ~5s** (hypothesis) vs fal H3 Max Turbo **$0.20 / 5s** vs API ceiling **$0.08/s @768P / $0.13/s @2K**.
6. Knowledge = `knowledge/clients/<id>/` (HQ by Indigo stand-in). Ignore indigohq.com.
7. Never add a web UI. Never wire media-buying.

## Client config
`knowledge/clients/<id>/config.yaml` — cap, claims path, Drive/R2 URIs, preferred backend (`runpod-h3` default). Per-job override: `--backend fal` / `fal-ai` / `minimax-h3-api`.

## When stuck
Prefer reuse over regen. Prefer refuse over spend. Prefer a failing lint over a shippable lie.
