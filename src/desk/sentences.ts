import { money } from "../lib/print.ts";
import { searchBroll } from "../lib/search.ts";
import type { AssetRecord, CostEstimate } from "../types.ts";
import type { StepId } from "./types.ts";

export function stopSentence(exitCode: number): string | null {
  if (exitCode === 2) return "Stopped on purpose. Making a clip needs a confirmation. Nothing was spent.";
  if (exitCode === 3) return "Stopped. This would pass the brand’s budget.";
  if (exitCode === 4) {
    return "Stopped. The script is not approved, or it says something this brand is not allowed to say.";
  }
  if (exitCode === 5) return "Stopped. Add the notes, write the script, or make the clip first.";
  if (exitCode === 1) return "Stopped. Something on this step is not valid.";
  return null;
}

export function footageSentence(assets: AssetRecord[], query: string): string {
  if (assets.length === 0) return "The library is empty. Set up this brand first.";
  const ranked = searchBroll(assets, query).filter((hit) => hit.score > 0).slice(0, 8);
  if (ranked.length === 0) {
    return "Nothing safe to use matched. You can still check the price before making a clip.";
  }
  const fine = ranked.filter((hit) => hit.asset.claimSafe);
  const held = ranked.filter((hit) => !hit.asset.claimSafe);
  const heldText =
    held.length === 0 ? "0 were held back." : `${held.length} were held back: ${held.map((hit) => hit.asset.title).join(", ")}.`;
  return `${fine.length} clips are fine to use in an ad. ${heldText}`;
}

export function priceSentence(estimate: CostEstimate): string {
  const parts = [
    `About ${money(estimate.estimatedCostUsd)} for ${estimate.seconds} seconds. ${money(estimate.usedUsd)} of ${money(estimate.capUsd)} is spent. Nothing was charged.`,
  ];
  if (estimate.warn80) parts.push("You have used 80% of the budget.");
  if (estimate.hardStop || estimate.wouldExceedCap) {
    parts.push("Making a clip will stop, because this would pass the budget.");
  }
  return parts.join(" ");
}

export function successSentence(
  step: StepId,
  ctx: {
    brandName: string;
    footage?: string;
    assets?: AssetRecord[];
    estimate?: CostEstimate;
    countQuote?: boolean;
    spentUsd?: number;
    capUsd?: number;
  },
): string {
  if (step === "set-up") return `The library for ${ctx.brandName} is ready.`;
  if (step === "add-notes") return "Notes added.";
  if (step === "find-footage") return footageSentence(ctx.assets ?? [], ctx.footage ?? "");
  if (step === "write-script") return "The script is written. The claims check passed. It is not approved yet.";
  if (step === "approve-script") return "Approved. Making a clip still needs a confirmation.";
  if (step === "check-price") {
    if (!ctx.estimate) return "Stopped. Something on this step is not valid.";
    return priceSentence(ctx.estimate);
  }
  if (step === "make-clip") {
    return ctx.countQuote
      ? "Practice clip is ready. The quote was counted against the budget."
      : "Practice clip is ready. $0 was spent.";
  }
  if (step === "rough-cut") return "Rough cut is ready for the editor. The ad was not posted.";
  if (step === "spending") return `Spent ${money(ctx.spentUsd ?? 0)} of ${money(ctx.capUsd ?? 0)}.`;
  return "Practice run finished. A clip request without confirmation stopped on purpose, then practice clips were made. Nothing was posted.";
}
