# Skill: ComfyUI (H3 / Ref2VA-style graphs)

Use Comfy when the shot needs **references** (pack label, talent, kitchen plate) that a single T2V prompt will scramble. JeremAI does **not** run Comfy in this MVP. This skill is the handoff contract.

## When
- Product fidelity: bottle / scoop / label must match the live SKU hash in the B-roll index.
- Ref2VA / I2V / reference-image stacks (H3 family, Wan, LTX).
- Batch variants that share a graph and swap only seed + hook text.

## When not
- Simple 5s B-roll cutaway that already exists in Drive/R2 — `search-broll` first (`skills/broll-reuse.md`).
- Talking-head UGC you would rather buy from Creatify/Arcads (out of scope).
- Anything that would auto-publish.

## Repo layout
```
workflows/                  # Comfy JSON / API graphs (this repo)
  README.md
  h3-t2v-ad.json            # add when a real graph exists
  h3-ref2va-product.json
knowledge/clients/<id>/     # brand + claims — inject as text nodes, not as model LoRAs
```

Keep graphs **client-agnostic**. Client strings come from `brand.md` + approved script. Do not bake “cures fatigue” into a node.

## Pipeline
1. `jeremai search-broll` — if a claim-safe clip exists, skip Comfy.
2. `jeremai script --approve` — VO/hook text is the only prompt source.
3. Pick backend:
   - Local / RunPod Comfy → still quote as `runpod-h3` once live.
   - Hosted API → `fal-ai` or `minimax-h3-api`.
4. `jeremai estimate` → `--confirm` → write clip into `.data/clips/` (or R2 URI).
5. Index the new clip (`claim_safe` only if the prompt stayed on the allowlist).
6. `jeremai assemble` — ffmpeg concat + Premiere/CapCut handoff.

## Graph rules
- **Text nodes** must be filled from the approved script, not the brief’s “must not” section.
- **Reference images** = current SKU only. If Drive hash ≠ live pack, stop.
- **Seeds** logged on the job row (future: `jobs` table note). Needed to reproduce a winner.
- **Output** = 9:16 or 16:9 mp4, no burned disease claims, disclaimer reserved for editor SUPER.

## Failure modes
- Graph on the pod is newer than `workflows/` in git — treat pod as dirty; pull first.
- Ref image leaks a before/after or scale — `claim_safe=false`, do not assemble into a paid cut.
- Agent “improves” the prompt inside Comfy. That bypasses lint. Forbidden.

## Commands (today)
```
jeremai search-broll --client aether-wellness --query "scoop jar"
# After a human runs Comfy elsewhere:
jeremai assemble --client aether-wellness
```
