# Desk redesign — design spec

Date: 2026-09-24. Input for the three mockup directions. Every mockup reads only this file.

## What the product is

JeremAI is an ops CLI for making AI nutra-supplement video ads. The **desk** is a local page (`pnpm desk`, `http://127.0.0.1:4173`, binds 127.0.0.1 only) that runs that CLI on this computer. It is not deployed, never publishes an ad, and never calls a paid video backend. Every video backend is a dry-run stub. The whole personality of the product is **confirm-before-spend**: a step that would cost money refuses until a human confirms, and the budget is always legible.

Two users. Nico (operator) runs each step from the desk. Jeremy (client) fills the same blanks and copies a finished instruction into an AI agent already open in his terminal. Copy runs nothing.

## Screen inventory (one page, one step open at a time)

**Header.** Brand name (`Aether Wellness`), product (`Aether Daily Mineral`), a brand switcher (`Switch brand` select listing brand names, plus a `New brand` button), and the budget: cap `$25.00`, spent `$0.00`, and either `Nothing spent yet` or `12.0% of the budget`; at 80%+ a warning line `You have used 80% of the budget.`; at 100% the CLI hard-stops clips.

**Step rail.** Eleven items in this order. Ten are pipeline steps; the last two sit apart.

| Label | Title | Help | Run button | Blanks | Live status (from state) |
| --- | --- | --- | --- | --- | --- |
| Set up | Set up this brand | Prepare the library on this computer. | Set up this brand | none | done when library has clips |
| Add notes | Add the notes | The winning-ad notes this work starts from. | Add these notes | Notes file on this computer | done when notes exist (title shown) |
| Find footage | Find footage you already have | Look through this brand’s library before making a new clip. | Search the library | What footage do you need? (hint: Everyday words. The search matches them to clips already on file.) | library: `6 fine · 1 held back` |
| Write the script | Write the script | A draft. It is not approved. | Write the script | none | done when a script exists; badge `claims check passed/failed` |
| Approve the script | Approve the script | Only after you have read a script that passed the claims check. | I read it. Approve. | none | done when approved |
| Check the price | Check the price | Nothing is charged. | Check the price | Clip length (seconds, default 5) · How it would be made (RunPod, self-hosted / fal.ai / MiniMax API) · Picture size (Standard / High) | last quote `$0.17` |
| Make the clip | Make the clip | A practice clip. Confirmation is separate. | **Try it — it should stop** and **Confirm and make the clip** | same as Check the price | clip: `practice · $0 spent` — this is the GATE |
| Build the rough cut | Build the rough cut | Files for the editor. The ad is not posted. | Build the rough cut | none | — |
| See spending | See spending | What has been counted against the budget. | See spending | none | `$0.00 of $25.00` |
| Practice run (apart) | Practice run | The packaged path, in its own library. | Run the practice job | none | — |
| Keys (apart) | Keys and install | Save API keys on this computer, and copy the official install commands. | none | password fields per key (OpenRouter, RunPod, fal, MiniMax) with Save / Remove, status `Saved on this computer.` / `Not set.`; list of vision models as radios; three `Install on this computer` blocks each with a `pre` command and a Copy button | key set / not set |

**Work panel.** Step title, help line, only that step's blanks, the actions: primary run button; on Make the clip two buttons (`Try it — it should stop`, `Confirm and make the clip`); when an OpenRouter key exists a `Model` select and a `Fill with AI` button; always `Copy instructions`.

**Result.** One sentence from the CLI is the headline. States: idle (nothing run yet), running (a step is spawned; a second run gets `Still working on the last step.`), ok (exit 0), stopped-on-purpose (exit 2: `Stopped on purpose. Making a clip needs a confirmation. Nothing was spent.`), stopped (exit 3 `Stopped. This would pass the brand’s budget.`, exit 4 `Stopped. The script is not approved, or it says something this brand is not allowed to say.`, exit 5 `Stopped. Add the notes, write the script, or make the clip first.`), invalid (exit 1 `Stopped. Something on this step is not valid.`). Success sentences read like: `4 clips are fine to use in an ad. 1 were held back: Bathroom scale close-up.` / `About $0.17 for 5 seconds. $0.00 of $25.00 is spent. Nothing was charged.` / `Practice clip is ready. $0 was spent.` On script steps the script body (multi-line text) shows under the sentence. `Show the terminal output` toggles a monospace stdout/stderr block.

**Instruction panel.** The text Jeremy pastes, already filled, monospace, with Copy. Example:

```
You are working in the JeremAI repo for Aether Wellness (aether-wellness).
Use pnpm jeremai. Do not post an ad. Do not call RunPod, fal, or MiniMax. Clips in this build are practice clips.

Look for: morning kitchen, scooping powder, mug by the window.
Run `pnpm jeremai search-broll --client aether-wellness --query "morning kitchen, scooping powder, mug by the window"`.
Tell me which clips are fine for an ad and which were held back.
Then stop. Do not write a script, make a clip, or publish.
```

**Dialogs.** `New brand` (Brand name, Product, Budget, Claims this brand may say — one per line; Create this brand / Close). Confirm **sheet** for Make the clip: the price sentence, `This practice clip records $0.`, a checkbox `Count this quote against the budget (still no real charge).`, buttons Confirm / Copy instructions / Close. If the quote would pass the budget the Confirm button is absent.

## The five answers

1. **Narrative role.** Operator console. Not a landing page, not a dashboard of vanity numbers. Every element is a control, a reading, or the text to paste.
2. **Viewing distance.** 60 cm, laptop or desktop. Body 14–16 px, labels never under 12 px, contrast ≥ 4.5:1. Target 1440×900 with everything above visible without scrolling; degrade gracefully to ~1100 wide.
3. **Temperature.** Calm and authoritative. Stops are deliberate outcomes, not errors: the stop colour is warm (amber/ochre/terracotta family), never alert-red slop. One accent only.
4. **Capacity.** 11 rail items, up to 5 blanks, 3–4 buttons, one sentence (may be two lines), an optional 20-line script, and a 10-line instruction block. All fit at 1440×900.
5. **Visual motif.** Two, from the content: the **gate** (a step that refuses until confirmed — Make the clip) and the **meter** (the budget). Whatever the style, the gate should be the single most articulated control on the page, and the meter should read at a glance.

## Hard constraints for every mockup

- Single self-contained HTML file, pure HTML/CSS (a few lines of JS only for tab-switch demo if desired). Google Fonts `<link>` allowed with a system fallback in the stack.
- Real content from this spec (Aether Wellness, real labels, real sentences, the instruction above). No lorem, no invented stats, no decorative icons per heading, no emoji icons, no purple gradients, no SVG people.
- Show the **Make the clip** step open, with the result panel in the **stopped-on-purpose** state, so the gate motif is visible. The rail should show realistic statuses (set up done, notes done, script written and approved, quote $0.17, clip practice $0).
- Layout skeleton must be structurally distinct from the other two directions (they are described in the brief each subagent gets).
- End the file with an HTML comment: `<!-- form came from: ... -->` one sentence naming what in the content produced the form.
- Save as the exact path given in the brief. Do not write anywhere under `src/`.
