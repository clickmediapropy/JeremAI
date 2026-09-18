import type { BriefRecord, ClaimsPolicy, ClientConfig } from "../types.ts";

export interface DraftScript {
  hooks: string[];
  body: string;
}

export function draftScript(client: ClientConfig, brief: BriefRecord, policy: ClaimsPolicy): DraftScript {
  const claim = policy.allowedClaims[0] ?? "supports a healthy wellness routine";
  const claim2 = policy.allowedClaims[1] ?? claim;
  const product = client.product;

  const hooks = [
    `Wait — your 3pm crash is not a personality.`,
    `I stopped stacking random powders. One ritual. That's it.`,
    `If your mornings already feel loud, skip the hype ads.`,
  ];

  const body = [
    `CLIENT: ${client.name}  ·  PRODUCT: ${product}  ·  VERTICAL: ${client.vertical}`,
    `BRIEF: ${brief.title}`,
    ``,
    `HOOK 1 (0–3s): ${hooks[0]}`,
    `HOOK 2 (alt): ${hooks[1]}`,
    `HOOK 3 (alt): ${hooks[2]}`,
    ``,
    `VO: You already have a morning. ${product} is the part that ${claim}.`,
    `VO: Not a hype stack. It ${claim2}.`,
    `B-ROLL: kitchen window light → scoop / capsule → water → walk out the door.`,
    `VO: Built for people who want a repeatable ritual, not a new identity.`,
    `CTA: Link in bio. Try the 14-day consistency check.`,
    ``,
    `SUPER: ${policy.disclaimer}`,
    `SUPER: 18+ where Meta Health & Wellness requires it. No before/after. No disease claims.`,
    ``,
    `WINNING-AD NOTES FROM BRIEF`,
    brief.notes.trim(),
  ].join("\n");

  return { hooks, body };
}
