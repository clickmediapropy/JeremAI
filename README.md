# JeremAI

Agent-native **CLI** for Nutra ad creative production. Not a web app. Not a SaaS studio.

**User guide:** [`skills/userguide.md`](skills/userguide.md) — first-run, copy-paste commands, backends, budgets, claims, editor handoff, troubleshooting. Agents: start there, then `AGENTS.md`.

## Local desk

`pnpm desk` serves http://127.0.0.1:4173 on this computer. Buttons run the CLI. Copy puts a finished instruction on the clipboard for a terminal agent. The desk is not deployed and it does not publish.

Human brief / winning ad (10–15%) → agent script, B-roll search/reuse, generate, assemble (~90%) → human editor polish (~10%) → **human** publish. Never auto-publish.

Built for the Jeremy paid-test: one client brain, claims allowlist, confirm-before-spend, per-client hard cap. Video backends are **stubs**. This repo will not rent a GPU or call MiniMax / fal paygo.

## Why a CLI (the wedge vs Creatify et al.)

Creatify, Arcads, AdCreative.ai, Pencil, Zeely and the rest are **web UIs** for avatar/static volume. They compete with an agency’s *creative desk*, not with an ops agent that already lives in chat, Drive, and Ads Manager.

JeremAI’s job is the underserved slice:

- Search the **existing** Drive / R2 library **before** paying to regenerate
- Enforce a **Nutra claims allowlist** (deterministic lint, not “the model promised”)
- Meter **$/client** with estimate → `--confirm` → ledger; soft-warn 80%, hard-stop 100%
- Hand a **Premiere / CapCut** rough cut to the editor (the last 10%)
- Sit next to **HQ by Indigo** file knowledge ([hqforwork.com](https://www.hqforwork.com/)). `indigohq.com` is parked — ignore it.

## Cost pitch (hypothesis vs ceiling)

| Path | 5s clip | Status in this repo |
| --- | --- | --- |
| **RunPod self-host MiniMax H3** | **~$0.17** | Unverified hypothesis from the call. Default stub. **No pods spun.** Prefer this pitch (OSS + rented GPU). |
| **fal.ai H3 Max Turbo** (`fal-ai`) | **$0.20** ($0.04/s @768P) | Fast **closed-API alternative**. Stub only. Default endpoint `fal-ai/minimax/h3-max-turbo/text-to-video`. |
| MiniMax H3 API 768P | **$0.40** ($0.08/s) | Official paygo **ceiling** for comparison. Stub only. |
| MiniMax H3 API 2K | **$0.65** ($0.13/s) | Same — ceiling only. |

Do not bank a paid-test budget on $0.17 until someone measures wall-clock seconds on a real pod (out of scope here). `estimate` prints both the working number and the ceiling note.

## Requirements

- Node 20.18+ (Node 22+ recommended; SQLite is `node:sqlite`)
- ffmpeg on `PATH` (assemble writes a real `rough-cut.mp4`; without ffmpeg you still get handoff files)
- pnpm or npm

## Install + demo dry-run

Walkthrough for buyers, editors, and agents: **[`skills/userguide.md`](skills/userguide.md)**.

```bash
pnpm install
pnpm demo
```

That is the acceptance path:

1. `brief` — ingest `fixtures/briefs/aether-morning.md`
2. `search-broll` — hit the seeded Drive/R2 index (including a claim-**unsafe** scale clip)
3. `script --approve` — allowlisted hooks + lint + human approve
4. `estimate` — RunPod H3 stub, 5s, 1.2× retries buffer, remaining cap
5. `generate` **without** `--confirm` — **refuses** (exit 2)
6. `generate --confirm` — dry-run stub clip, ledger actual **$0**
7. Same refuse/confirm gates on `--backend fal-ai` (alias `fal`)
8. `assemble` — ffmpeg concat + `handoff.json` / `EDITOR.md`
9. `cost` — per-client ledger

Or step by step:

```bash
pnpm jeremai init --client aether-wellness
pnpm jeremai brief --client aether-wellness --file fixtures/briefs/aether-morning.md
pnpm jeremai search-broll --client aether-wellness --query "morning kitchen ritual scoop"
pnpm jeremai script --client aether-wellness
pnpm jeremai script --client aether-wellness --approve
pnpm jeremai estimate --client aether-wellness --seconds 5 --backend runpod-h3
pnpm jeremai generate --client aether-wellness                 # must fail
pnpm jeremai generate --client aether-wellness --confirm      # dry-run
pnpm jeremai estimate --client aether-wellness --seconds 5 --backend fal
pnpm jeremai generate --client aether-wellness --backend fal-ai            # must fail
pnpm jeremai generate --client aether-wellness --backend fal-ai --confirm  # dry-run $0
pnpm jeremai assemble --client aether-wellness
pnpm jeremai cost --client aether-wellness
```

```bash
pnpm test
pnpm typecheck
```

Local state lands in `.data/` (gitignored). Point it elsewhere with `--data-dir` or `JEREMAI_DATA_DIR`.

## Environment

Copy `.env.example`. **No secrets are required** for the demo. Nothing in `.env` should be committed.

| Variable | Purpose |
| --- | --- |
| `JEREMAI_DATA_DIR` | SQLite + stubs + job exports |
| `FFMPEG_PATH` | Override ffmpeg binary |
| `JEREMAI_ALLOW_SPEND` | Even `=1` does **not** call a paid API in this MVP; adapters stay stubs |
| `MINIMAX_API_KEY` / `RUNPOD_API_KEY` / `FAL_KEY` | Reserved. Unused. Do not paste keys into chat; HQ secrets later |
| `FAL_VIDEO_MODEL` | Override fal endpoint (default `fal-ai/minimax/h3-max-turbo/text-to-video`) |

`--simulate-spend` on `generate` debits the **estimate** against the cap so you can rehearse the 80/100 gates. It still does not call a cloud.

## Architecture

```
brief ──► SQLite
            ├─ assets (tags, duration, claim_safe, hash, Drive/R2 URI)
            ├─ scripts (lint + approved)
            ├─ jobs
            └─ ledger (estimate / actual, dry_run flag)

search-broll ──► rank claim-safe library hits
script        ──► template draft + deterministic lint
estimate      ──► model, seconds, retries buffer, remaining budget
generate      ──► refuse unless --confirm; refuse if unapproved / over cap
assemble      ──► ffmpeg rough cut + Premiere/CapCut handoff
cost          ──► billed live vs cap (dry-run quotes do not count)
```

**Backends** (pluggable, dry-run):

- `runpod-h3` — self-host H3 placeholder at $0.17 / 5s (default / preferred pitch)
- `fal-ai` (`fal`) — fal closed-API alt; default H3 Max Turbo $0.04/s @768P
- `minimax-h3-api` — official paygo rates as a ceiling

**Client brain** (HQ stand-in): `knowledge/clients/<id>/` — `config.yaml`, `brand.md`, `claims-allowlist.yaml`, `policies.md`.

**Agent skills:** `skills/userguide.md` first, then `AGENTS.md` (runpod, comfyui, fal, copywriting, compliance, script, storyboard, assemble, ship, b-roll reuse, budget meters).

## Paid-test metrics

See `docs/paid-test-metrics.md`. Headline: ≥70% drafts editor-usable, ≥40% seconds reused, **$0 over cap**, **zero** prohibited claims, measure $/clip against $0.17 vs $0.40.

## Out of scope

Web UI. Live GPU rental. Real MiniMax / fal / RunPod spend. Media-buying automation. Multi-client HQ production rollout. Self-host H3 production install.

## License

UNLICENSED (private). Owner: clickmediapropy / Nico.
