import type { ClaimsPolicy, LintHit, LintReport } from "../types.ts";

const CLAIMISH =
  /\b(support|supports|help|helps|boost|boosts|improve|improves|increase|increases|reduce|reduces|relief|energy|sleep|metabolism|immunity|immune|hormone|testosterone|cortisol|weight|fat|burn|appetite|focus|calm|anxiety|mood|joint|gut|digest)/i;

export function lintScript(text: string, policy: ClaimsPolicy): LintReport {
  const spoken = creativeLines(stripDisclaimer(text, policy.disclaimer));
  const hits: LintHit[] = [];

  if (!text.includes(policy.disclaimer.trim())) {
    hits.push({
      id: "missing-disclaimer",
      severity: "fail",
      excerpt: "(script)",
      reason: "FDA DSHEA disclaimer is missing. It does not cure a deceptive claim, but it is required on this client's pack.",
    });
  }

  for (const rule of policy.bannedPatterns) {
    const re = new RegExp(rule.pattern, "gi");
    let match: RegExpExecArray | null;
    while ((match = re.exec(spoken))) {
      hits.push({
        id: rule.id,
        severity: rule.severity,
        excerpt: excerpt(spoken, match.index, match[0].length),
        reason: rule.reason,
      });
    }
  }

  for (const banned of policy.bannedTerms) {
    const re = new RegExp(`\\b${escapeRe(banned.term)}\\b`, "gi");
    let match: RegExpExecArray | null;
    while ((match = re.exec(spoken))) {
      hits.push({
        id: `term:${banned.term}`,
        severity: "fail",
        excerpt: excerpt(spoken, match.index, match[0].length),
        reason: banned.reason,
      });
    }
  }

  const usedClaims: string[] = [];
  const unknownClaimLines: string[] = [];
  for (const line of spoken.split(/\n+/)) {
    const trimmed = line.replace(/^[-*#>\s]+/, "").trim();
    if (!trimmed) continue;
    const body = trimmed.replace(/^(VO:|CTA:|HOOK\s*\d*[^:]*:)\s*/i, "");
    if (!CLAIMISH.test(body)) continue;
    const matched = policy.allowedClaims.find((c) => normalize(body).includes(normalize(c)));
    if (matched) {
      if (!usedClaims.includes(matched)) usedClaims.push(matched);
    } else {
      unknownClaimLines.push(body);
      hits.push({
        id: "unlisted-claim",
        severity: "fail",
        excerpt: body.slice(0, 140),
        reason: "Claim-like line is not on the client allowlist. Rewrite to an approved structure/function claim or drop it.",
      });
    }
  }

  const ok = hits.every((h) => h.severity !== "fail");
  return { ok, hits, usedClaims, unknownClaimLines };
}

export function stripDisclaimer(text: string, disclaimer: string): string {
  if (!disclaimer.trim()) return text;
  return text.split(disclaimer).join("");
}

/** Spoken / on-screen creative only — production notes and SUPER legal lines are not claim copy. */
export function creativeLines(text: string): string {
  return text
    .split("\n")
    .filter((line) => /^(HOOK\b|VO:|CTA:)/i.test(line.trim()))
    .join("\n");
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function excerpt(text: string, index: number, len: number): string {
  const start = Math.max(0, index - 24);
  const end = Math.min(text.length, index + len + 24);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}
