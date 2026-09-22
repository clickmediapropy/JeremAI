# Skill: user guide

**Start here.** End-to-end how to run JeremAI. Other skills go deep; this one is the map.

## When
- First time on the repo (media buyer, editor, or agent)
- You need the happy path, not architecture
- Something failed and you want the short fix

## What it is / is not

| Is | Is not |
| --- | --- |
| An **ops CLI** for Nutra ad creatives | A web app / Creatify / Ads Manager |
| Brief → search B-roll → script → estimate → confirm → stub generate → assemble → cost | Auto-publish to Meta or Google |
| Dry-run stubs (no GPU, no fal/MiniMax spend) | A live render farm |

Pipeline: human brief (10–15%) → agent ~90% → **human** editor polish (~10%) → **human** publish.

## Prerequisites
- Node **20.18+** (22+ better)
- **pnpm** (or npm)
- **ffmpeg** on `PATH` (assemble writes `rough-cut.mp4`; without it you still get `handoff.json` / `EDITOR.md`)
- No API keys. Do not put secrets in the repo. `.env.example` is reserved only.

```bash
node -v
ffmpeg -version
pnpm install
pnpm demo
```

`pnpm demo` is the first-run check. It must refuse `generate` without `--confirm`, then dry-run actual **$0**.

## Client brain
Per-client files (HQ-by-Indigo stand-in). Ignore indigohq.com.

```
knowledge/clients/<id>/
  config.yaml              # cap, Drive/R2 URIs, preferred backend
  brand.md                 # voice + visual
  claims-allowlist.yaml    # only these claims
  policies.md              # spend / publish gates
```

Demo client: `aether-wellness`. Cap `$25`. Preferred backend `runpod-h3`.

## Happy path (copy-paste)

Use `aether-wellness` until you add another folder under `knowledge/clients/`.

```bash
pnpm jeremai init --client aether-wellness
pnpm jeremai brief --client aether-wellness --file fixtures/briefs/aether-morning.md
pnpm jeremai search-broll --client aether-wellness --query "morning kitchen ritual scoop"
pnpm jeremai script --client aether-wellness
pnpm jeremai script --client aether-wellness --approve
pnpm jeremai estimate --client aether-wellness --seconds 5 --backend runpod-h3
pnpm jeremai generate --client aether-wellness
# ↑ must refuse (exit 2). That is correct.
pnpm jeremai generate --client aether-wellness --confirm
pnpm jeremai assemble --client aether-wellness
pnpm jeremai cost --client aether-wellness
```

Optional fal path (same gates):

```bash
pnpm jeremai estimate --client aether-wellness --seconds 5 --backend fal
pnpm jeremai generate --client aether-wellness --backend fal-ai            # refuse
pnpm jeremai generate --client aether-wellness --backend fal-ai --confirm  # $0
```

| Step | Command | You do |
| --- | --- | --- |
| 1 | `init` | Seed the local SQLite index |
| 2 | `brief` | Ingest winning-ad notes (human 10–15%) |
| 3 | `search-broll` | Reuse library **before** generate |
| 4 | `script` | Draft + lint. Not approved yet |
| 5 | `script --approve` | Human reads it. Then approve |
| 6 | `estimate` | Print $ / seconds / remaining cap. No spend |
| 7 | `generate` | Must fail without `--confirm` |
| 8 | `generate --confirm` | Dry-run stub clip. Actual **$0** |
| 9 | `assemble` | ffmpeg rough cut + editor handoff |
| 10 | `cost` | Ledger vs cap |

State lives in `.data/` (gitignored). Override: `--data-dir` or `JEREMAI_DATA_DIR`.

## Backends (all stubs)

| Id | Alias | 5s @768P stub | Pitch |
| --- | --- | --- | --- |
| `runpod-h3` | `runpod` | **~$0.17** | OSS + rented GPU (default). Unmeasured. |
| `fal-ai` | `fal` | **$0.20** | Fast closed API. Default model `fal-ai/minimax/h3-max-turbo/text-to-video` |
| `minimax-h3-api` | `minimax` | **$0.40** | Official paygo **ceiling** ($0.08/s). 2K = $0.65 |

None of them call a cloud in this MVP. `JEREMAI_ALLOW_SPEND=1` still does not. Deep dive: `skills/runpod.md`, `skills/fal.md`.

## Budget
- Soft-warn at **80%** of `budget_cap_usd`. Hard-stop at **100%** (and if this job would cross the cap).
- Dry-run `actual` = **$0** and does **not** eat the cap.
- `--simulate-spend` on `generate` debits the **estimate** so you can rehearse the 80/100 gates. Still no cloud call.

See `skills/budget-meters.md`.

## Claims
1. Write only allowlisted structure/function lines (`skills/copywriting.md`).
2. `script` runs deterministic lint (`skills/compliance-lint.md`).
3. Human `--approve` before any render.
4. `generate` refuses unapproved or failing scripts.

Do not “improve” copy with disease, treat/cure/prevent, before/after, or pound-loss language.

## Editor handoff
`assemble` writes `.data/jobs/<job>/`:

| File | For |
| --- | --- |
| `rough-cut.mp4` | ffmpeg concat (library stubs + generated stub) |
| `handoff.json` | Premiere / CapCut notes |
| `EDITOR.md` | Human ~10% polish checklist |

Captions = **approved script only**. Do not upload from the NLE. A human posts. See `skills/assemble.md`, `skills/ship.md`.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `generate` says pass `--confirm` | Add `--confirm` or `--yes`. Exit 2 is the product. |
| Unapproved script | `jeremai script --client <id> --approve` after a human reads a **PASS** lint. |
| Lint FAIL | Rewrite to the allowlist. Do not approve a fail. |
| Hard stop / over cap | `jeremai cost --client <id>`. Wait for a higher cap or stop generating. |
| ffmpeg missing | Install ffmpeg, or set `FFMPEG_PATH`. Handoff files still write. |
| Empty B-roll search | Run `init` or check `fixtures/broll/<id>.yaml`. Search before gen (`skills/broll-reuse.md`). |
| Wrong backend on next step | `estimate` prints `--backend <id>` — copy that into `generate`. |
| Comfy / product refs | Do not invent a UI. See `skills/comfyui.md` + `workflows/`. |

## What NOT to do
- Build a deployed web UI, or wire media-buying. `pnpm desk` is the local desk on this computer.
- Call MiniMax, fal, or rent a RunPod GPU from this MVP
- Commit `.env` or paste API keys into chat
- Auto-publish
- Skip `search-broll`
- Override a hard budget stop
- Use `claim_safe=false` clips (e.g. bathroom scale) on a paid cut

## More skills (do not duplicate)

| Need | Skill |
| --- | --- |
| Draft / approve | `skills/script.md` |
| Hook language | `skills/copywriting.md` |
| Lint rules | `skills/compliance-lint.md` |
| Shot list | `skills/storyboard.md` |
| Library first | `skills/broll-reuse.md` |
| 80/100 meters | `skills/budget-meters.md` |
| Self-host GPU | `skills/runpod.md` |
| Hosted API alt | `skills/fal.md` |
| Ref2VA graphs | `skills/comfyui.md` |
| Rough cut | `skills/assemble.md` |
| Never publish | `skills/ship.md` |
