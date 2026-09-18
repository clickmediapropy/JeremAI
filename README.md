# JeremAI

Agent-native **CLI** for Nutra ad creative production. Not a web app. Not a SaaS studio.

Human brief / winning ad (10–15%) → agent script, B-roll search/reuse, generate, assemble (~90%) → human editor polish (~10%) → **human** publish. Never auto-publish.

## Install + demo

```bash
pnpm install
pnpm demo
```

That runs: brief → search-broll → script --approve → estimate → generate (refuses without --confirm) → generate --confirm → assemble → cost.

## Cost pitch

| Path | 5s clip |
| --- | --- |
| RunPod self-host MiniMax H3 | ~$0.17 hypothesis (stub, no GPUs) |
| MiniMax H3 API 768P | $0.40 ceiling ($0.08/s) |
| MiniMax H3 API 2K | $0.65 ceiling ($0.13/s) |

See the full README in this repository after the source tree is pushed. Owner: clickmediapropy / Nico. UNLICENSED / private.
