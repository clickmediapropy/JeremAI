const PREFIX = (name, id) =>
  `You are working in the JeremAI repo for ${name} (${id}).\n` +
  `Use pnpm jeremai. Do not post an ad. Do not call RunPod, fal, or MiniMax. Clips in this build are practice clips.`;

function clipCommand(blanks, confirm) {
  const seconds = blanks.seconds ?? 5;
  const backend = blanks.backend ?? "runpod-h3";
  const resolution = blanks.resolution ?? "768P";
  let command =
    `pnpm jeremai generate --client ${blanks.brand} --seconds ${seconds} --backend ${backend} --resolution ${resolution}`;
  if (confirm) {
    command += " --confirm";
    if (blanks.countQuote) command += " --simulate-spend";
  }
  return command;
}

export function fillInstruction(step, blanks) {
  const name = blanks.brandName;
  const id = blanks.brand;
  const head = PREFIX(name, id);
  let body = "";
  if (step === "set-up") {
    body =
      `Run \`pnpm jeremai init --client ${id}\`.\n` +
      `Then stop. Do not search, write a script, or make a clip.`;
  } else if (step === "add-notes") {
    body =
      `Notes file: ${blanks.notesPath}.\n` +
      `Run \`pnpm jeremai brief --client ${id} --file "${blanks.notesPath}"\`.\n` +
      `Then stop. Do not write the script.`;
  } else if (step === "find-footage") {
    body =
      `Look for: ${blanks.footage}.\n` +
      `Run \`pnpm jeremai search-broll --client ${id} --query "${blanks.footage}"\`.\n` +
      `Tell me which clips are fine for an ad and which were held back.\n` +
      `Then stop. Do not write a script, make a clip, or publish.`;
  } else if (step === "write-script") {
    body =
      `Run \`pnpm jeremai script --client ${id}\`.\n` +
      `Show the script and whether the claims check passed.\n` +
      `Then stop. Do not approve. Do not make a clip.`;
  } else if (step === "approve-script") {
    body =
      `The person has already read a script that passed the claims check.\n` +
      `Run \`pnpm jeremai script --client ${id} --approve\`.\n` +
      `Then stop. Do not make a clip.`;
  } else if (step === "check-price") {
    const seconds = blanks.seconds ?? 5;
    const backend = blanks.backend ?? "runpod-h3";
    const resolution = blanks.resolution ?? "768P";
    body =
      `Run \`pnpm jeremai estimate --client ${id} --seconds ${seconds} --backend ${backend} --resolution ${resolution}\`.\n` +
      `Show the price and what is left of the budget.\n` +
      `Then stop. Do not make a clip.`;
  } else if (step === "make-clip" && blanks.confirm) {
    body =
      `Run \`${clipCommand(blanks, true)}\`.\n` +
      `Say that a practice clip records $0 unless the quote was counted.\n` +
      `Do not publish.`;
  } else if (step === "make-clip") {
    body =
      `Run \`${clipCommand(blanks, false)}\` with no confirm flag.\n` +
      `It should stop. Report that stop. Do not pass \`--confirm\`. Do not publish.`;
  } else if (step === "rough-cut") {
    body =
      `Run \`pnpm jeremai assemble --client ${id}\`.\n` +
      `Hand the editor the rough cut. Do not post the ad.`;
  } else if (step === "spending") {
    body =
      `Run \`pnpm jeremai cost --client ${id}\`.\n` +
      `Report what has been spent against the budget. Do not make a clip or post.`;
  } else if (step === "practice") {
    body =
      `Run \`pnpm jeremai demo --client ${id}\`.\n` +
      `A clip request without confirmation stops on purpose, then practice clips are made.\n` +
      `Do not post.`;
  } else {
    throw new Error(`Unknown step: ${step}`);
  }
  return `${head}\n\n${body}`;
}
