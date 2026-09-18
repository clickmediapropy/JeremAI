# Aether Wellness — spend & publish policies

Mapped to HQ by Indigo Policies (human approval for spend / publish / customer contact).

1. **Search B-roll first.** Drive vault + R2 working set + SQLite index. Do not generate a shot that already exists and is claim-safe.
2. **Claims lint is blocking.** Deterministic allowlist. No model override.
3. **Human approve script** before any render job is created.
4. **Confirm-before-spend.** `estimate` then `generate --confirm`. Soft-warn 80%, hard-stop 100% of `budget_cap_usd`.
5. **Dry-run by default.** Stubs only in this MVP. No MiniMax paygo. No RunPod GPU rental.
6. **Never auto-publish.** Assemble writes a Premiere/CapCut handoff. A human posts to Meta/Google after account review.
7. **Substantiation lives outside the model.** If a claim is not on the allowlist, it does not ship — even if a winning ad used stronger language.
