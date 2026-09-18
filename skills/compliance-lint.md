# Skill: compliance lint

Deterministic. Not an LLM judge.

## Checks
- Banned disease / treatment / before-after / guarantee patterns on HOOK, VO, CTA
- Every claim-like spoken line must contain an allowlisted phrase
- Disclaimer must be present on the script
- Claim-unsafe B-roll flagged at search time

## Human gates
1. Brief / claims owner OK
2. Script OK (`--approve`)
3. Rough cut OK (editor)
4. Final export OK — **never auto-publish**

FTC: health claims need competent and reliable scientific evidence; advertisers **and participants** can be liable. DSHEA disclaimer does not cure a deceptive ad. Meta Health & Wellness: 18+ for many dietary ads.

## Command
Lint is embedded in `jeremai script`. A failing script cannot be approved or rendered.
