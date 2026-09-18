# Paid-test success metrics (from the Jeremy research brief)

Scope of this repo: **agent MVP + dry-run pipeline**, not live creatives or ROAS.

| Metric | Target | How JeremAI helps |
| --- | --- | --- |
| AI drafts editor-usable without rescript | ≥70% | Allowlisted script + lint + human `--approve` |
| Final seconds from reused library | ≥40% | `search-broll` before generate; assemble reports reuse seconds |
| API spend over cap | **$0** | Soft-warn 80%, hard-stop 100%; dry-run default; `--confirm` required |
| Time-to-first-cut | define per client | `demo` / brief→assemble path |
| Policy-prohibited claims in shipped scripts | **zero** | Deterministic lint; generate blocked on fail / unapproved |
| Measured $/usable clip | vs **$0.17/5s** hypothesis and **$0.40/5s** API ceiling | `estimate` + `cost` ledger |

Suggested commercial wrapper (brief §E): 2–3 week project fee ≈ $1,500–$2,500 or $3,000 pilot month, then FT retainer ≥ $3,000/mo if convert. Success is **usable ads / week + approval rate**, not vendor-blog ROAS.

Out of scope here: media-buying automation, multi-client HQ rollout, self-host H3 production install, web UI.
