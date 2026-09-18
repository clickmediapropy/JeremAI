# Knowledge layer — HQ by Indigo

On the Jeremy 1 call the “company brain” was described as Indigo HQ. Live product:

- https://www.hqforwork.com/ — HQ by Indigo (“company brain your AI runs on”)
- https://www.getindigo.ai/ — same product marketing
- https://indigohq.com — **parked / for sale**. Ignore it.

This repo ships a **file-based stand-in** so Claude Code / Cursor can run without an HQ workspace:

| HQ object | Here |
| --- | --- |
| Company / client | `knowledge/clients/<id>/` |
| Knowledge | `brand.md`, brief fixtures |
| Skills | `../../skills/` |
| Policies | `policies.md` + `claims-allowlist.yaml` |
| Secrets | `.env` (never committed) — Drive / R2 / API keys later |

Paid-test next step: copy this tree into an HQ Core workspace per Nutra client. Do not roll out multi-client HQ in the MVP.
