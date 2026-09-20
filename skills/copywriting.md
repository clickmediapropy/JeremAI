# Skill: Nutra copy / hooks (Meta + Google)

Write structure/function ads. The model is cheap; the **allowlist** is the product.

## Inputs
1. `knowledge/clients/<id>/brand.md` — voice, visual, off-brand.
2. `knowledge/clients/<id>/claims-allowlist.yaml` — only these claims.
3. `knowledge/clients/<id>/policies.md` — spend/publish gates.
4. Latest brief via `jeremai brief` (winning-ad notes, the human 10–15%).

Aether demo allowlist: *supports daily energy*; *supports a healthy wellness routine*; *formulated with magnesium and vitamin D*; *helps you stay consistent*; *a daily mineral ritual*.

## Forbidden (hard fail in lint)
Do not put these on HOOK / VO / CTA even if a winning ad used them:

- Disease / drug: cure, treat, prevent, diagnose; cancer, diabetes, anxiety, depression, COVID, …
- Outcomes: “lose 7 pounds”, guaranteed, miracle, FDA approved, doctor recommended
- Meta tripwires: before/after, scale, body-shame, negative self-perception

DSHEA disclaimer **does not** legalize a deceptive line. FTC can hold the agency **and** the tool operator liable.

## Beat map (15s UGC / B-roll)

| t | Beat | Job | Copy rule |
| --- | --- | --- |
| 0–3s | Hook | Pattern interrupt. No medical frame. | No claim required. No disease words. |
| 3–8s | Ritual | One object, one action (scoop, water, door). | At most one allowlisted claim. |
| 8–12s | Proof-lite | Consistency / ritual, not transformation. | Second allowlisted claim or none. |
| 12–15s | CTA + SUPER | Shop / 14-day check. | Disclaimer SUPER is editor-owned. |

Three hooks, one body. Example shape (Aether):

```
HOOK 1: Wait — your 3pm crash is not a personality.
VO: You already have a morning. {product} is the part that supports daily energy.
VO: Not a hype stack. It supports a healthy wellness routine.
CTA: Link in bio. Try the 14-day consistency check.
```

## Workflow
```
jeremai brief --client <id> --file fixtures/briefs/aether-morning.md
jeremai script --client <id>            # deterministic lint
# Human reads brand.md + script. If lint PASS:
jeremai script --client <id> --approve
```

Do not approve a FAIL. Do not “fix” lint by moving a banned phrase onto a SUPER or B-ROLL line and calling it done — spoken/on-screen claims are what Meta reviews.

## Channel notes
- **Meta Health & Wellness:** 18+ for many dietary ads. No before/after. Special Ad Category as required.
- **Google:** healthcare/supplements restricted; landing page must match the claim, not a stronger one.
- Captions in CapCut/Premiere = approved script only (`skills/assemble.md`).

## Failure modes
- Inventing actives not on the label.
- Social-proof numbers (“10,000 customers lost weight”).
- Using the brief’s “must not” quotes as prompt spice.
- Letting fal/RunPod prompt rewrite the VO.

See also `skills/compliance-lint.md` and `skills/script.md`.
