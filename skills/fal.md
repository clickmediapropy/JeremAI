# Skill: fal.ai (closed-API alternative)

fal is the **fast hosted** path when you do not want to rent a GPU. Prefer RunPod self-host for the unit-cost pitch (`skills/runpod.md`). Use fal for velocity / quality A-B. JeremAI `fal-ai` is a **dry-run stub**. No `FAL_KEY` calls.

## When
- Need a 5s draft today without a pod.
- Comparing hosted H3-family quality to the $0.17 self-host hypothesis.
- Comfy is overkill; T2V / I2V endpoint is enough.

## When not
- Client forbids third-party / China-adjacent model APIs (data residency — brief §D).
- You are trying to prove the $0.17 number. fal will not do that.
- Live spend. This MVP never calls fal.

## Backend id
`fal-ai` — aliases `fal`, `fal.ai`.

Default model (short ads, 5s, 768P T2V):

`fal-ai/minimax/h3-max-turbo/text-to-video`

Override: `FAL_VIDEO_MODEL` in `.env` (never commit). Catalog stub rates:

| Endpoint | Stub rate | 5s |
| --- | --- | --- |
| `fal-ai/minimax/h3-max-turbo/text-to-video` (default) | $0.04/s @768P · $0.08/s @2K/1080p | $0.20 / $0.40 |
| `fal-ai/minimax/h3/text-to-video` | $0.08/s @768P · $0.13/s @2K | $0.40 / $0.65 (matches MiniMax ceiling) |
| `fal-ai/wan-25/text-to-video` | $0.05/s | $0.25 |

Re-check [fal model pages](https://fal.ai/) before quoting a client. Promo rates expire.

## Auth (future)
- Env only: `FAL_KEY`.
- Store in HQ secrets, not chat, not `knowledge/`.
- `JEREMAI_ALLOW_SPEND=1` will still not call fal until a human replaces the stub.

## Commands
```
jeremai estimate --client aether-wellness --seconds 5 --backend fal
jeremai generate --client aether-wellness --backend fal-ai              # refuse
jeremai generate --client aether-wellness --backend fal-ai --confirm    # dry-run $0
```

Same gates as other backends: search B-roll first, approved script, 80% warn, 100% hard-stop.

## vs other backends
| | runpod-h3 | fal-ai | minimax-h3-api |
| --- | --- | --- |
| Pitch | OSS + rented GPU | Fast closed API | Official ceiling |
| 5s @768P stub | $0.17 | $0.20 | $0.40 |
| Ops | Pod, volume, SSH | One key, many models | MiniMax account |
| Use | Measure real $/clip | Drafts / A-B | Comparison only |

## Failure modes
- Wrong model string — stub falls back to H3 Max Turbo **rates** and says so. Do not assume quality matches.
- Treating fal H3 Max as “self-host.” It is not.
- Skipping `--confirm` because “it’s only $0.20.” Gate is product, not price.

## Client brain
`knowledge/clients/<id>/config.yaml` can stay on `preferred_backend: runpod-h3`. Select fal per job with `--backend fal`.
