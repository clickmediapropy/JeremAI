# Skill: RunPod (self-host H3 / rented GPU)

Prefer this path for the paid-test **pitch**: OSS weights + rented GPU, measure $/usable clip. JeremAI’s `runpod-h3` backend is a **dry-run stub** at **~$0.17 / ~5s**. It does not create pods.

## When
- Client wants unit-cost below MiniMax paygo ($0.40 / 5s @768P) and fal H3 Max Turbo ($0.20 / 5s).
- You need a **measured bench**, not marketing math.
- Comfy / Ref2VA graphs will run on the same box (`skills/comfyui.md`).

## Do not
- Spin a pod from this MVP. No `RUNPOD_API_KEY` calls. `generate --confirm` still only writes a local ffmpeg stub.
- Bank the $0.17 number until wall-clock seconds × GPU $/hr × retries are measured.
- Leave a Secure GPU idle. Confirm-before-spend includes **pod create** and **pod start**.

## JeremAI mapping

| Today (stub) | Future live adapter |
| --- | --- |
| `--backend runpod-h3` | Same id |
| Quote $0.17 / 5s × `retries_buffer` | `(gpu_usd_per_hr / 3600) * wall_clock_s * retries` |
| `RUNPOD_API_KEY` / `RUNPOD_ENDPOINT_ID` reserved in `.env.example` | HQ secret, never pasted into chat |
| Ledger actual $0 in dry-run | Ledger actual from RunPod invoice / endpoint receipt |

```
jeremai estimate --client aether-wellness --seconds 5 --backend runpod-h3
jeremai generate --client aether-wellness --backend runpod-h3          # must refuse
jeremai generate --client aether-wellness --backend runpod-h3 --confirm
```

## GPU pick (published Sep 2026 ballpark — re-check runpod.io/pricing)

Start cheap; step up only if VRAM/OOM or quality fails.

| GPU | Secure $/hr (approx) | Use |
| --- | --- | --- |
| RTX A5000 | ~$0.27 | First H3/open-weight probe if it fits |
| RTX 4090 Community / Secure | ~$0.34 / ~$0.74 | Likely first real bench |
| A100 PCIe | ~$1.19–1.59 | If 4090 OOMs |
| H100 PCIe | ~$1.99–2.89 | Last resort for this test |

Storage: network volume ~$0.05–0.10/GB/mo. Put weights + Comfy models on a **network volume**, not the container disk.

## Pod / template checklist
1. Template: official PyTorch or a ComfyUI template — pin the image digest.
2. Volume: mount `/workspace/models` (or `/runpod-volume`) for H3 / VAE / text encoders.
3. Ports: 22 SSH, 8888 Jupyter (optional), 8188 Comfy. Do not expose a public UI for Nutra clients.
4. Env: no client claims files on the pod unless the volume is private to that client.
5. Idle policy: stop on job complete. Hard-stop if JeremAI cap would be exceeded **before** `pod start`.

## SSH / files
```
ssh root@<pod> -i ~/.ssh/runpod
# weights on volume; workflows from this repo: workflows/
```
Copy claim-safe B-roll **in**, rough clips **out** to R2 / local `.data/clips/`, then `jeremai assemble`.

## Failure modes
- **OOM** — drop resolution or step up GPU; do not retry blindly (retries eat the cap).
- **License / geo** — H3 open weights may be restricted. Stop; fall back to `fal-ai` or `minimax-h3-api` stubs until legal clears.
- **Cold start** — first job is not the unit cost. Bench N≥5 usable clips.
- **Public endpoint temptation** — Wan/Seedance/Kling on RunPod serverless is a different backend. Do not silently swap ids.

## Client brain
`knowledge/clients/<id>/config.yaml` → `preferred_backend`, `budget_cap_usd`. Policies: `policies.md`. Secrets: HQ vault, not the repo.
