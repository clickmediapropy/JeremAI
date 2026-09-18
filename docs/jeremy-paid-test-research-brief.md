# Jeremy Paid-Test Research Brief
**Project:** Fathom Jeremy 1 (2026-09-18)  
**Prepared for:** Nico (relay to God Bot)  
**Constraint:** No spend, no GPU rental, no outreach — desktop research only  
**Primary call:** https://fathom.video/calls/829625083  

---

## A. Executive summary

- **Paid pilots before FT are standard** for AI creative work: typically a **1-month / defined-batch** engagement, then retainer; hybrid “project fee → retainer” is common for agent builds. Credible AI creative agencies often sell pilots explicitly before retainers ([Admiral Media](https://admiral.media/ai-creative-agency-pricing); [Absolutely AI](https://www.absolutelyai.com.au/news/ai-creative-agency-vs-traditional-creative-agency)).
- **Nico’s $3k/mo FT floor sits at the low end of managed AI creative retainers** (vendor examples ~€4k–€21.5k/mo for volume video programs) but is **plausible for a builder/operator seat** if the deliverable is a reusable CLI agent + ops, not a full agency creative desk ([Admiral](https://admiral.media/ai-creative-agency-pricing); [Taskip AI agency pricing](https://taskip.net/ai-automation-agency-pricing)).
- **Commercial Meta/Google creative agents exist** (AdCreative.ai, Creatify, Arcads, Pencil/Lapis, Smartly, Madgicx, AdAmigo, etc.) — almost all are **web SaaS**, not agent-native CLI. Nutra-specific value is compliance + volume testing, not “another UI” ([HyperFX 2026 tools](https://www.hyperfx.ai/blog/best-ai-tools-for-ecommerce-meta-google-ads-2026); [Heyflow Meta generators](https://heyflow.com/blog/best-ai-meta-ad-generators-comparison)).
- **Agent-native CLI is the right product shape** for this agency (tool use, confirm-before-spend, per-client meters). Patterns: Claude Code / Codex-style harness + MCP + file-based knowledge; treat GPU/API calls as **dangerous tools** requiring approval gates ([OpenMontage agentic video](https://www.developersdigest.tech/blog/openmontage-agentic-video-production); [CLI agent cost metering](https://blog.arcbjorn.com/state-of-cli-coding-agents-2026); HQ FAQ on approval for spend workflows — [hqforwork.com/faq](https://www.hqforwork.com/faq)).
- **Call cost hint “~$0.17 per ~5s via RunPod + Minimax H3 open-source” is NOT supported by official H3 API pricing.** Official MiniMax H3: **$0.08/sec @768P** and **$0.13/sec @2K** → **$0.40 / $0.65 for 5s** before retries/references ([platform.minimax.io pricing](https://platform.minimax.io/docs/guides/pricing-paygo)). Legacy Hailuo 2.3 Fast is **$0.19 per 768P 6s** — closer to the spoken figure. Self-host economics on RunPod are **plausible but unverified** without measured H3 inference time + license/region constraints.
- **RunPod economics are real and published** (e.g. Community RTX 4090 ~$0.34/hr, Secure ~$0.74/hr; A100 Secure ~$1.59/hr; storage from ~$0.05–0.10/GB/mo). Public video endpoints list e.g. Seedance 1.0 pro **5s $0.12 (480p)**, Wan 2.2 I2V **5s $0.30** ([runpod.io/pricing](https://www.runpod.io/pricing), updated ~Sep 13, 2026).
- **~90% AI / 10% human polish is directionally right for volume UGC-style Nutra ads, not for “hero” brand film.** Industry hybrid consensus: AI wins volume/testing velocity; humans win compliance, claims, product fidelity, and final cut ([Absolutely AI hybrid verdict](https://www.absolutelyai.com.au/news/ai-creative-agency-vs-traditional-creative-agency); [VidAU hybrid note](https://www.vidau.ai/compare-ai-avatars-ugc-video-ads)). Skeptical risk: Meta Nutra policy + FTC substantiation make **claim/script review the real bottleneck**, not pixels.
- **B-roll reuse before regen is non-negotiable for unit economics.** Best practice = modular MAM (hooks/product/B-roll tagged) + Drive/R2 as store + semantic search; don’t regenerate what exists ([Recharm modular VAM](https://www.recharm.com/blog/video-asset-management); [Blare DAM guide](https://blarevideo.com/feeds/blog/digital-asset-management-video-production)).
- **“IndigoHQ / indigohq.com” on the call maps to HQ by Indigo** (company brain for Claude Code/Codex/Cursor + MCP). Live product sites: [hqforwork.com](https://www.hqforwork.com/), [getindigo.ai](https://www.getindigo.ai/). **https://indigohq.com currently shows a GoDaddy domain-for-sale page** — do not treat that URL as the product. Strong fit for client KB + secrets + Skills + spend policies.
- **Biggest open risks:** FTC/FDA claim liability (agency + tool builder exposure), Meta Health & Wellness restrictions (18+ targeting, prohibited claims), H3 open-weight license/geo limits if self-hosting, and whether paid-test success metrics are **creative throughput** vs **ad ROAS** (different scopes).

---

## B. Recommended stack for the paid test

| Layer | Recommendation | Why (skeptical) |
| --- | --- | --- |
| **Agent shell** | Claude Code / Cursor agent + repo of Skills (script, compliance lint, storyboard, assemble, ship) | Matches “CLI/chat not web app”; MCP-native; already how HQ integrates |
| **Knowledge / brand** | **HQ Core + Cloud** (Indigo) per client company/workspace; Policies for claims | File-based, portable; secrets vault for Drive/R2/API keys ([hqforwork.com/faq](https://www.hqforwork.com/faq)) |
| **Script / brief** | Claude (or GPT) with HQ brand kit + **claims allowlist** | Cheap; quality is in the Policy layer, not the model |
| **Compliance gate** | Deterministic lint (banned words/disease claims) + human approve before render | FTC holds advertisers + participants liable ([FTC Health Products Guidance](https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance)) |
| **Video gen (test path A — fast)** | MiniMax H3 API **768P** for drafts; 2K only for winners | Official $0.08/s vs $0.13/s ([pricing](https://platform.minimax.io/docs/guides/pricing-paygo)) |
| **Video gen (test path B — cost probe)** | RunPod public endpoints (Wan / Seedance / Kling) OR short Pod experiments — **measure $/usable clip**, don’t assume $0.17 | RunPod published endpoint prices ([pricing](https://www.runpod.io/pricing)) |
| **UGC talking-head (optional)** | Creatify / Arcads / HeyGen-class for avatar UGC variants | Faster authenticity tests than pure B-roll gen ([Heyflow comparison](https://heyflow.com/blog/best-ai-meta-ad-generators-comparison)) |
| **Edit / assemble** | ffmpeg + CapCut/Premiere handoff OR Remotion/OpenMontage-style agent edit | Agent owns assembly; human owns last 10% polish |
| **Storage** | Client Google Drive (source of truth) + **Cloudflare R2** (working/cache CDN) | Matches call; R2 = cheap egress for agent pulls |
| **Asset index** | Sidecar JSON/SQLite: tags, duration, claim-safe flag, hash, Drive/R2 URI; **search before gen** | Prevents regen waste |
| **Cost meter** | Per-client ledger: estimated_cost → confirm → execute → actual_cost; hard cap; daily report | Confirm-before-spend is a first-class product requirement |
| **Human checkpoints** | (1) brief/claims OK (2) script OK (3) rough cut OK (4) final export | Never auto-publish Nutra ads |

**Do not build a web app for the paid test.** Ship a CLI with `/brief`, `/search-broll`, `/script`, `/estimate`, `/generate` (confirm), `/assemble`, `/cost`.

---

## C. Section answers 1–8 (with sources)

### 1. Paid collaboration / test-project patterns (agency AI creative → FT retainer)

**What good looks like**
- **Scoped pilot (often ~2–4 weeks or 1 month)** with a defined creative batch, success metrics, then convert to retainer ([Admiral: “structured pilot… typically one-month… defined batch… before… retainer”](https://admiral.media/ai-creative-agency-pricing); [Absolutely AI: two-week single-channel pilot](https://www.absolutelyai.com.au/news/ai-creative-agency-vs-traditional-creative-agency); Synima LinkedIn guidance: run paid pilot before retainer — [LinkedIn](https://www.linkedin.com/pulse/how-find-best-ai-video-production-agency-2026-synima-7hane)).
- **Hybrid pricing for agent/automation builds:** project fee to get production live → retainer for ownership/iteration ([Taskip 2026](https://taskip.net/ai-automation-agency-pricing)).
- **AI creative retainer ballpark (managed agency, not solo builder):** Admiral cites **€4,000–€21,500/mo** depending on volume; per-asset AI video from **~€200**; creative budget rule of thumb **10–20% of media spend** ([Admiral](https://admiral.media/ai-creative-agency-pricing)).
- **Paid media agencies** often use **~90-day pilots** before long contracts ([DataAlly](https://www.dataally.ai/blog/top-paid-media-agencies)).

**Implication for Nico**
- Structure the paid test as **deliverable-defined project** (agent MVP + N creatives for 1 Nutra client), priced as a **fraction of the $3k floor** (see Section E), with written convert-to-FT criteria — not open-ended “R&D hours.”

### 2. AI media-buying / creative agents for Nutra on Meta/Google

**What exists commercially (2025–2026)**
- **Creative volume / static+video SaaS:** AdCreative.ai, Pencil, Creatify, Arcads, Tagshop, Imagine.art, QuickAds ([HyperFX](https://www.hyperfx.ai/blog/best-ai-tools-for-ecommerce-meta-google-ads-2026); [Venngage roundup](https://venngage.com/blog/best-ai-ad-generator); [Heyflow](https://heyflow.com/blog/best-ai-meta-ad-generators-comparison)).
- **Media buying / optimization agents:** Madgicx, Smartly.io (enterprise), AdAmigo, Ryze, Birch/Revealbot, Meta Advantage+ creative ([Atria](https://www.tryatria.com/blog/meta-ads-ai-tools); [Ryze](https://www.get-ryze.ai/blog/best-ai-tools-meta-ads-2026); [Meta Advantage+ creative](https://www.facebook.com/business/ads/meta-advantage-plus/creative)).
- **Nutra-specific guidance:** Zeely and others stress **structure/function “supports” language**, Meta bans on before/after for many health contexts, Google healthcare rules ([Zeely supplement ads](https://zeely.ai/blog/discover-supplement-ads-examples); [Forge Digital Meta supplements 2026](https://forgedigitalmarketing.com/how-to-advertise-supplements-on-meta)).

**What actually works (skeptical)**
- Winners are **creative testing velocity + claim-safe messaging**, not “fully autonomous media buying” for Nutra.
- Most tools are **web apps** — they compete with Jeremy’s *agency* workflow, not with Nico’s proposed **CLI agent that sits inside their Drive/R2/HQ**.
- Gap: **agent that reuses client B-roll, enforces brand+claims, meters cost, and hands Premiere-ready cuts** — underserved vs avatar UGC generators.

### 3. Agent-native CLI architecture (tool use, confirm-before-spend, budget meters)

**Best practices**
- Treat the creative pipeline as **repo-shaped agent work**: scripts, assets, render orchestration, review loops ([OpenMontage](https://www.developersdigest.tech/blog/openmontage-agentic-video-production); Developers Digest H3 note on agent orchestration — [same ecosystem](https://www.developersdigest.tech/blog/minimax-h3-omni-video-model)).
- **Cost engineering is a product feature:** live token/GPU meters, budgets per thread/client, cheap-model routing ([CLI agents mid-2026](https://blog.arcbjorn.com/state-of-cli-coding-agents-2026); Claude Code cost tooling discussion — [Maxim](https://www.getmaxim.ai/articles/top-5-tools-for-claude-code-cost-management-2)).
- **Confirm-before-spend:** HQ explicitly recommends human approval for workflows that **publish, spend money, change systems, or contact customers** ([HQ FAQ Q14/Q25](https://www.hqforwork.com/faq)).
- Prefer **CLI over web app** for ops agents that need Drive mounts, ffmpeg, pod spin-up, and audit trails — web UIs slow agency media buyers who already live in chat/Ads Manager.

**Concrete pattern for this test**
1. `estimate` prints model, seconds, retries buffer, client remaining budget.  
2. User types `yes` / `--confirm`.  
3. Tool executes; ledger appends actuals.  
4. Cap soft-warn at 80%, hard-stop at 100%.

### 4. RunPod + Minimax H3 / open-source vs closed APIs

#### Official MiniMax H3 (verified)
Source: [https://platform.minimax.io/docs/guides/pricing-paygo](https://platform.minimax.io/docs/guides/pricing-paygo)

| Output | Rate | **5s** | **10s** | **15s** |
| --- | --- | --- | --- | --- |
| H3 768P | $0.08/s | **$0.40** | $0.80 | $1.20 |
| H3 2K | $0.13/s | **$0.65** | $1.30 | $1.95 |
| H3-Max 480P | $0.05/s | $0.25 | $0.50 | $0.75 |
| H3-Max 768P | $0.08/s | $0.40 | $0.80 | $1.20 |

Also: first 5 ref images free; extra images $0.04; input video billed at output-resolution rates; 768P→2K regeneration $0.05/s.  
Legacy Hailuo (same page): **Hailuo-2.3-Fast $0.19 / 768P 6s** — nearest published number to the call’s “~$0.17 / ~5s.”

Launch/context writeups: [Developers Digest H3](https://www.developersdigest.tech/blog/minimax-h3-omni-video-model), [MiniMax H3 blog](https://www.minimax.io/blog/minimax-h3).

#### Call claim vs reality
- **“~$0.17 / ~5s H3 open-source on RunPod” — unverified as a measured unit cost.** Official API path is **2.4–3.8× higher** at 768P/2K for 5s.
- Self-host could approach ~$0.17 **if** (a) usable open weights exist for Nico’s jurisdiction, (b) VRAM/runtime fit a mid GPU, (c) wall-clock gen time is short. Secondary sources note weights/region/license caveats (e.g. Renderforest H3 FAQ on region limits — [renderforest.com/minimax-h3](https://www.renderforest.com/minimax-h3); TechTimes on license revenue thresholds — [techtimes](https://www.techtimes.com/articles/322521/20260731/minimax-h3-opens-ai-video-developers-copyright-lawsuit-clouds-every-clip.htm)). **Do not bank the paid-test budget on $0.17 until a measured bench.**

#### RunPod (verified Sep 2026 page)
Source: [https://www.runpod.io/pricing](https://www.runpod.io/pricing)

Examples (Secure / Community where listed in page schema):
- RTX 4090 Community **~$0.34/hr**, Secure **~$0.74/hr**
- RTX A5000 Secure **~$0.27/hr**
- A100 PCIe Secure **~$1.59/hr** (Community ~$1.19)
- H100 PCIe Secure **~$2.89/hr** (Community ~$1.99)
- Storage: network standard from **~$0.05–0.07/GB/mo**; container/volume higher

Public video endpoints (same page; useful “no ops” baseline):
- Seedance 1.0 pro **5s $0.12 (480p)**
- Wan 2.2 I2V/T2V **5s $0.30**
- Kling v2.1 I2V Pro **5s $0.45**
- Seedance V1.5 Pro I2V **$0.024/sec**

#### Closed / multi-model competitors (third-party comparisons — treat as approximate)
- Kling / Runway / Higgsfield credit math varies by plan; third-party API comparisons cite ~$0.05–0.12/sec ranges depending on model ([Crazyrouter May 2026 table](https://crazyrouter.com/en/blog/ai-video-generation-api-pricing-may-2026-comparison); [Apostle Kling vs Higgsfield](https://apostle.io/compare/kling-vs-higgsfield); [Higgsfield vs Runway](https://higgsfield.ai/blog/higgsfield-vs-runway-2026)). **Always re-check live vendor pages before quoting clients.**

**Ops recommendation for paid test:** start with **H3 API 768P** + RunPod **public endpoints** for A/B quality; optionally one **instrumented** Pod week to produce a real $/usable-clip number — not marketing math.

### 5. Feasibility of ~90% AI + 10% human for Nutra UGC/ad creatives

**Honest assessment: feasible for volume testing creatives; not for unsupervised claims or product-critical demos.**

| Stage | AI share | Human share | Why |
| --- | --- | --- | --- |
| Brief → angles | High | Medium | Buyer still picks winning angle |
| Script + hooks | High | **High review** | Claims risk |
| B-roll / cutaways | High if library exists | Low | Reuse > gen |
| Avatar UGC | High | Medium | Uncanny / brand risk |
| Product fidelity (label, scoop, pill) | Medium | **High** | Wrong bottle = wasted spend |
| Final grade/sound/export | Low | High | The “10%” |
| Meta/Google compliance | Assist | **Mandatory** | Account bans |

Industry direction supports hybrid AI volume + human strategy/governance ([Absolutely AI](https://www.absolutelyai.com.au/news/ai-creative-agency-vs-traditional-creative-agency); AI UGC stack articles — [VidAU](https://www.vidau.ai/compare-ai-avatars-ugc-video-ads), [ReelNReel](https://www.reelnreel.com/ai-ugc-video-ads)).  
**Skeptical caveat:** vendor blogs claim huge CTR/cost wins; treat as marketing. Paid-test success should measure **usable ads per week** and **approval rate**, not claimed ROAS from tool blogs.

### 6. B-roll reuse (Drive/R2) + cost caps/meters

**Best practices**
- Treat footage as **modular components** (hooks, testimonials, product, B-roll, CTA) with ad-specific tags — not nested Drive chaos ([Recharm 2026 VAM](https://www.recharm.com/blog/video-asset-management)).
- DAM/MAM reduces search waste; Canto survey cited in industry guides: marketers lose weeks/year hunting files ([Blare](https://blarevideo.com/feeds/blog/digital-asset-management-video-production)).
- Pattern that fits Nico: **Drive = client vault**, **R2 = agent working set/CDN**, **index DB = searchable metadata**; agent workflow = `search → propose reuse → only then generate`.
- Cost meter patterns: per-client budget object; estimate-before-call; hard stop; attribute every generation to `client_id` + `campaign_id` (same discipline as Claude Code cost gateways — [Maxim](https://www.getmaxim.ai/articles/top-5-tools-for-claude-code-cost-management-2)).

**Tooling patterns (no purchase required for test)**
- Google Drive API list+hash; Cloudflare R2 S3 API; local SQLite/LanceDB for embeddings of clip descriptions; optional later: Frame.io for review.

### 7. IndigoHQ / indigohq.com — what it is & fit

**Finding (important):** On the Fathom call, the knowledge base is described as **HQ (indigohq.com)** ([meeting summary](https://fathom.video/calls/829625083)).

| URL | What it is today |
| --- | --- |
| [https://indigohq.com](https://indigohq.com) | **Domain-for-sale / GoDaddy parking page** (fetched 2026-09-18) — **not** the product |
| [https://www.hqforwork.com](https://www.hqforwork.com/) | **HQ by Indigo** — “company brain your AI runs on” |
| [https://www.getindigo.ai](https://www.getindigo.ai/) | Same product marketing site |
| Deploy domains | e.g. `*.indigo-hq.com` referenced on product pages |

**Product (from HQ site + FAQ)**  
File-based company memory (Knowledge, Skills, Projects, Workers, Policies) for Claude Code / Codex / Cursor + MCP into chat; Secrets vault; HQ Bots in Slack/email; Deploy for shared apps. Pricing cited on FAQ: Starter free (limits), Individual **$50/mo**, Workforce **$500/mo** (+ optional Bots/meeting capture), Enterprise from **$10k/mo** ([FAQ](https://www.hqforwork.com/faq); [Core](https://www.hqforwork.com/products/core)).

**Fit for Jeremy agent:** **Strong.** Exactly the missing layer for multi-client Nutra agencies: per-client company brain, claim Policies, brand Skills, Drive/API secrets without pasting keys, approval gates for spend. Nico should research **hqforwork.com / getindigo.ai**, not the parked indigohq.com.

*(Separate: LeadIQ still associates “Indigo Partners” consulting with indigohq.com — likely stale/unrelated; ignore for this project.)*

### 8. Competitive tools, Nutra compliance risks, recommended stack

#### Competitive map (CLI agent vs SaaS)
- SaaS creative: AdCreative, Creatify, Arcads, Pencil, Zeely  
- Buying automation: Madgicx, Smartly, Advantage+  
- Infra: RunPod, MiniMax, Kling, Runway, Higgsfield, Wan/Seedance via endpoints  
- **Nico’s wedge:** agency-native CLI + Drive/R2 reuse + per-client meters + HQ knowledge — not another SaaS UI.

#### Compliance (non-optional)
- **FTC:** Health claims need **competent and reliable scientific evidence**; ads include social, influencer, packaging; **all parties** who participate in marketing can be liable; DSHEA disclaimer **does not cure** deceptive ads ([FTC Health Products Compliance Guidance](https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance); [FTC announcement](https://www.ftc.gov/news-events/news/press-releases/2022/12/ftc-announces-new-business-guidance-marketers-sellers-health-products)).
- **FDA:** Primary on labeling; structure/function vs disease claims — disease claims are high risk in ads ([FDA structure/function overview via FTC guidance coordination](https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance)).
- **Meta:** Health & Wellness policy — dietary/weight ads **18+**; prohibited claim types; before/after and negative self-perception rules frequently trip Nutra ([Meta Transparency Health & Wellness](https://transparency.meta.com/policies/ad-standards/restricted-goods-services/health-wellness); practitioner guides — [Forge](https://forgedigitalmarketing.com/how-to-advertise-supplements-on-meta), [Exit Strategy Ads resource center](https://exitstrategyads.com/supplement-advertising-compliance-resource-center-ftc-fda-google-meta-tiktok-youtube-policies-2025-guide)).

**Recommended stack for paid test:** see Section B.

---

## D. Open risks / questions for Nico & God Bot

1. **Confirm HQ URL with Jeremy’s team** — indigohq.com is parked; is the agency already on hqforwork.com / getindigo.ai?
2. **Is paid-test success “ship agent + N creatives” or “improve CPA/ROAS”?** Latter needs media access + longer window.
3. **Which Nutra vertical?** Weight loss / anxiety / sexual health = highest Meta+FTC risk; vitamins/general wellness = safer test bed.
4. **Who owns claim substantiation docs?** Agent cannot invent science; needs a claims spreadsheet mapped to evidence.
5. **H3 self-host:** license, geo restrictions, VRAM, measured seconds/clip — until benched, budget **API rates**, not $0.17.
6. **IP / likeness:** AI avatars + client UGC — consent and platform disclosure rules.
7. **Account risk:** one bad disease claim can ban the BM. Human checkpoint must be contractual, not optional.
8. **FT conversion:** does $3k/mo include media buying, or creative-agent-only? Scope drives whether pricing is below/above Admiral-style retainers.
9. **Data residency:** MiniMax/Chinese model APIs + Nutra customer creative — acceptable to the agency’s clients?
10. **Editor workflow:** Premiere project? CapCut? Frame.io? Define the “10% polish” handoff artifact now.

---

## E. Suggested paid-test scope

| Item | Suggestion |
| --- | --- |
| **Duration** | **2–3 weeks** (or 1 calendar month if they insist on “pilot month”) |
| **Client** | **1 Nutra brand**, lower-risk claim category if possible |
| **Deliverables** | (1) CLI agent MVP in repo: brief→script→b-roll search→estimate/confirm→generate→assemble→cost report; (2) HQ/Skills pack for that client; (3) **8–15** Meta-ready video variants (mix of reused B-roll + gen); (4) cost ledger + measured $/usable clip vs $0.17 hypothesis; (5) 1-page ops runbook for editors |
| **Out of scope** | Full media buying automation, multi-client HQ rollout, self-host H3 production, web UI |
| **Success metrics** | ≥70% of AI drafts reach “editor-usable” without rescript; **≥40%** of final seconds from **reused** library; **$0 API spend over cap**; time-to-first-cut &lt; X hours from brief; zero policy-prohibited claims in shipped scripts |
| **Pricing band vs $3k/mo floor** | Paid test as **project fee ≈ $1,500–$2,500** (≈½–¾ of monthly floor) for 2–3 weeks **or** **$3,000** for a full pilot month with higher creative volume — then FT retainer **≥ $3,000/mo** if convert. Avoid free “tryouts”; industry pattern is paid pilots ([Admiral](https://admiral.media/ai-creative-agency-pricing)). |
| **Conversion trigger** | Written: editor NPS, usable volume, cost/clip within agreed band, and agency still wants CLI not SaaS |

---

## Source index (primary / high-value)

- Fathom Jeremy 1: https://fathom.video/calls/829625083  
- MiniMax paygo pricing: https://platform.minimax.io/docs/guides/pricing-paygo  
- MiniMax H3 announcement: https://www.minimax.io/blog/minimax-h3  
- RunPod pricing: https://www.runpod.io/pricing  
- HQ / Indigo: https://www.hqforwork.com/ · https://www.getindigo.ai/ · https://www.hqforwork.com/faq  
- indigohq.com (parked): https://indigohq.com  
- FTC Health Products Guidance: https://www.ftc.gov/business-guidance/resources/health-products-compliance-guidance  
- Meta Health & Wellness ads: https://transparency.meta.com/policies/ad-standards/restricted-goods-services/health-wellness  
- AI creative pilot/pricing: https://admiral.media/ai-creative-agency-pricing  
- Hybrid AI/traditional: https://www.absolutelyai.com.au/news/ai-creative-agency-vs-traditional-creative-agency  
- OpenMontage / agent video ops: https://www.developersdigest.tech/blog/openmontage-agentic-video-production  
- Developers Digest H3 verified pricing writeup: https://www.developersdigest.tech/blog/minimax-h3-omni-video-model  

*Numbers that could not be independently measured in this research (no GPU spend): self-host $/5s for H3 open weights; agency-internal ROAS lifts; exact Higgsfield/Runway credit-to-USD conversion without an active subscription.*
