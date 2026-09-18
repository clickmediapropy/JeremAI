# Skill: script

## When
After `brief` is ingested. Before `estimate` / `generate`.

## Do
1. Load `knowledge/clients/<id>/brand.md` and `claims-allowlist.yaml`.
2. Draft 3 hooks + VO + CTA. Only allowlisted structure/function claims.
3. Run `jeremai script --client <id>` (deterministic lint).
4. Stop for a human. If lint passes: `jeremai script --client <id> --approve`.

## Do not
- Invent studies, doctors, or “lose 7 pounds” language from a winning ad.
- Treat the FDA disclaimer as permission to make a stronger claim.
- Approve your own script without a human when this is a real client.

Copy craft: `skills/copywriting.md`. Lint rules: `skills/compliance-lint.md`.

## Command
```
jeremai script --client aether-wellness
jeremai script --client aether-wellness --approve
```
