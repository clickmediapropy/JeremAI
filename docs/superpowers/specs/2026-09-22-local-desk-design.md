# Local desk

Date: 2026-09-22

A page on this computer for running JeremAI and for copying finished instructions into Jeremy’s terminal agent. The CLI stays the product. The desk is not deployed, does not post ads, and does not call RunPod, fal, or MiniMax.

This is a local exception to the “no web UI” line in `Agents.md` and `skills/userguide.md`. Implementation updates those lines so they allow this desk and still forbid a deployed app and media buying.

## Who it is for

Nico opens one desk and runs every step. Jeremy fills the same blanks and copies a finished instruction into the agent already running in his terminal. The instruction tells that agent to run `jeremai`. Copy does not run anything.

## What you see

`pnpm desk` serves the page at `http://127.0.0.1:4173`. If that port is taken, the process exits and says the desk is not running.

The header shows the brand by name. For the packaged brand that is **Aether Wellness**, with the product from its config beside it (`Aether Daily Mineral`). **Switch brand** lists names from `knowledge/clients/`, not folder ids.

The header shows the budget in words: `Budget $25`, `Spent $0`, and `Nothing spent yet` while spent is zero. Later it shows the spent amount and the percent of the budget. At 80% or more the header says so. The desk still allows the step. The CLI is what stops a clip at 100% (`src/lib/budget.ts` `budgetGate`).

The steps, in order:

| On screen | CLI | Blanks |
| --- | --- | --- |
| Set up | `init` | Brand from the header |
| Add notes | `brief` | Notes file on this computer. Prefill `fixtures/briefs/aether-morning.md` when that file exists. |
| Find footage | `search-broll` | What footage do you need? |
| Write the script | `script` with no `--approve` | None |
| Approve the script | `script --approve` | None |
| Check the price | `estimate` | Clip length in seconds (default 5). How it would be made. Picture size. |
| Make the clip | `generate` | Same blanks as Check the price |
| Build the rough cut | `assemble` | None. Uses the latest clip. |
| See spending | `cost` | None |
| Practice run | `demo` | Brand from the header |

Practice run sits at the bottom of the list, apart from the other steps.

One step is open at a time. Its blanks sit in the middle. The run button uses those blanks. **Copy instructions** uses those same blanks. The result under the buttons is a sentence. **Show the terminal output** reveals stdout and stderr.

Run buttons: **Set up this brand**, **Add these notes**, **Search the library**, **Write the script**, **I read it. Approve.**, **Check the price**, **Try it — it should stop**, **Build the rough cut**, **See spending**, **Run the practice job**. Make the clip also has **Confirm and make the clip**, which opens the sheet.

The right column is the instruction Jeremy will paste, already filled. The stop line is fixed text. It is not a blank.

Field labels do not say “client” or “query”.

How it would be made:

| On screen | CLI id | When |
| --- | --- | --- |
| RunPod, self-hosted | `runpod-h3` | Default when the brand config says so (`preferred_backend` in `knowledge/clients/aether-wellness/config.yaml`) |
| fal.ai | `fal-ai` | Chosen on the step |
| MiniMax API | `minimax-h3-api` | Chosen on the step |

Picture size: **Standard** is `768P` (default). **High** is `2K`.

## Make the clip

Two actions.

**Try it — it should stop** runs `generate` with no `--confirm`. The sentence is: “Stopped on purpose. Making a clip needs a confirmation. Nothing was spent.” Exit code is 2 (`src/types.ts` `EXIT.needsConfirm`, `src/commands/generate.ts`).

**Confirm and make the clip** first runs Check the price with the same blanks. The sheet then shows that price, the budget, and “This practice clip records $0.” A checkbox, off by default, reads “Count this quote against the budget (still no real charge).” That checkbox is `--simulate-spend`. The sheet’s **Confirm** button is the only control that runs `--confirm`. The sheet’s **Copy instructions** is the only copy that includes `--confirm`. Closing the sheet runs nothing.

If Check the price says the clip would pass the budget, the sheet does not offer Confirm. The sentence says making a clip will stop. Estimate itself still exits 0; the warning is in its output (`src/commands/estimate.ts`).

## Approve the script

`script --approve` writes a new script and, when the claims check passes, records approval on that new script (`src/commands/script.ts`). The draft text is deterministic for the same notes (`src/lib/scriptgen.ts`), so the script on screen matches the one approval records.

The button label is **I read it. Approve.** The copied instruction says the person has already read a script that passed the claims check. Write the script’s instruction does not contain `--approve`. A failed claims check returns exit 4 and records no approval.

## Instructions

Each step has one template. Holes are only the blanks on that step. Copy writes the filled template to the clipboard and does not call the server. If the clipboard is blocked, the text stays on screen.

Every template starts with:

```
You are working in the JeremAI repo for {brand name} ({brand id}).
Use pnpm jeremai. Do not post an ad. Do not call RunPod, fal, or MiniMax. Clips in this build are practice clips.
```

Then the step:

- **Set up.** Run `pnpm jeremai init --client {id}`. Then stop. Do not search, write a script, or make a clip.
- **Add notes.** Notes file: `{path}`. Run `pnpm jeremai brief --client {id} --file "{path}"`. Then stop. Do not write the script.
- **Find footage.** Look for: `{footage}`. Run `pnpm jeremai search-broll --client {id} --query "{footage}"`. Tell me which clips are fine for an ad and which were held back. Then stop. Do not write a script, make a clip, or publish.
- **Write the script.** Run `pnpm jeremai script --client {id}`. Show the script and whether the claims check passed. Then stop. Do not approve. Do not make a clip.
- **Approve the script.** The person has already read a script that passed the claims check. Run `pnpm jeremai script --client {id} --approve`. Then stop. Do not make a clip.
- **Check the price.** Run `pnpm jeremai estimate --client {id} --seconds {n} --backend {backend} --resolution {res}`. Show the price and what is left of the budget. Then stop. Do not make a clip.
- **Make the clip, unconfirmed.** Run `pnpm jeremai generate --client {id} --seconds {n} --backend {backend} --resolution {res}` with no confirm flag. It should stop. Report that stop. Do not pass `--confirm`. Do not publish.
- **Make the clip, confirmed.** Only from the sheet. Run the same command with `--confirm`. Add `--simulate-spend` only when the checkbox is on. Say that a practice clip records $0 unless the quote was counted. Do not publish.
- **Build the rough cut.** Run `pnpm jeremai assemble --client {id}`. Hand the editor the rough cut. Do not post the ad.
- **See spending.** Run `pnpm jeremai cost --client {id}`. Report what has been spent against the budget. Do not make a clip or post.
- **Practice run.** Run `pnpm jeremai demo --client {id}`. A clip request without confirmation stops on purpose, then practice clips are made. Do not post.

## Architecture

Five pieces. The page is one HTML file, one CSS file, and one JS file. No new UI framework and no Vite. The page shows the `sentence` from the run response and does not write its own headline.

1. **Desk server.** Binds `127.0.0.1` only. Serves the page, `GET /api/state?brand={id}`, and `POST /api/run`. No login. Anyone on this computer can open it. One run at a time. A second run gets “Still working on the last step.” and does not start a process.
2. **State reader.** Reads `knowledge/clients/` and the SQLite file the CLI uses (default `.data/jeremai.sqlite`, or `JEREMAI_DATA_DIR` when set). It only runs reads. It uses the existing budget helpers for cap, spent, remaining, and the 80% and 100% flags. It does not spawn the CLI.
3. **Command runner.** Turns a step id plus blanks into an argv array and spawns `node --import tsx src/cli.ts`. It never builds a shell string. Unknown step ids are rejected and spawn nothing. `--confirm` is added only for Make the clip when the request says the sheet was confirmed. `--simulate-spend` is added only with that confirm.
4. **Instruction templates.** Pure functions from step plus blanks to text. No IO.
5. **Desk page.** Renders the state, sends a run, and copies a template. It does not decide claims, budget, or confirmation.

`POST /api/run` body: `step`, `brand`, and the blanks for that step. `confirm` and `countQuote` are accepted only for `make-clip`. Response: `exitCode`, `stdout`, `stderr`, `sentence`.

`GET /api/state` returns the brand name, product, budget figures, whether notes exist, how many clips in the library are marked fine to use versus held back, the latest script’s claims result and approval, and the latest clip’s quoted amount, spent amount, and dry-run flag. Those library counts are the index, not the last search. The last sentence on screen is the run response, not a new database table.

Practice run is `demo --client {id}` with no `--data-dir`. The demo keeps its own library at `.data/demo` (`src/commands/demo.ts`). The header keeps showing the working library.

## Sentences

The CLI decides. The headline repeats that decision. Terminal text stays behind the disclosure.

| Situation | Headline |
| --- | --- |
| Exit 2 | Stopped on purpose. Making a clip needs a confirmation. Nothing was spent. |
| Exit 3 | Stopped. This would pass the brand’s budget. |
| Exit 4 | Stopped. The script is not approved, or it says something this brand is not allowed to say. |
| Exit 5 | Stopped. Add the notes, write the script, or make the clip first. |
| Exit 1 | Stopped. Something on this step is not valid. |
| Desk not running | The desk is not running on this computer. |
| Unknown brand | That brand is not on this computer. |
| Busy | Still working on the last step. |

Exit codes are `EXIT` in `src/types.ts`: 0 ok, 1 usage, 2 needs confirm, 3 budget, 4 compliance, 5 not found.

When the exit is 0, the headline is:

- Set up: “The library for {brand} is ready.”
- Add notes: “Notes added.”
- Find footage: “{n} clips are fine to use in an ad. {m} were held back: {titles}.” Use the same rows `search-broll` prints: the first 8 matches from `searchBroll` with score > 0 (`src/lib/search.ts`, `src/commands/search-broll.ts`). Fine means `claimSafe`. Held back means not `claimSafe`, and the titles are those rows. A clip that scores 0 or below is absent, not described as held back. The bathroom-scale clip in `fixtures/broll/aether-wellness.yaml` is `claim_safe: false`. It is held back by name only when the footage words match it, such as “bathroom scale”. A search for “morning kitchen” does not list it as a clip to use. No rows: “Nothing safe to use matched. You can still check the price before making a clip.” Zero clips in the library: “The library is empty. Set up this brand first.”
- Write the script: “The script is written. The claims check passed. It is not approved yet.” The script text is shown under the sentence.
- Approve: “Approved. Making a clip still needs a confirmation.” The script text is shown under the sentence.
- Check the price: “About {estimate} for {seconds} seconds. {spent} of {cap} is spent. Nothing was charged.” If the projected spend is at 80%, add “You have used 80% of the budget.” If the cap is already reached or this clip would pass it, add “Making a clip will stop, because this would pass the budget.”
- Make the clip: “Practice clip is ready. $0 was spent.” With the checkbox on: “Practice clip is ready. The quote was counted against the budget.”
- Rough cut: “Rough cut is ready for the editor. The ad was not posted.”
- Spending: “Spent {spent} of {cap}.”
- Practice run: “Practice run finished. A clip request without confirmation stopped on purpose, then practice clips were made. Nothing was posted.”

Find-footage and price headlines are computed with the existing read-only helpers after exit 0, using the same blanks. A non-zero exit keeps the stop headline. The helper does not override a stop.

## Checks

Same runner as `pnpm test`. No new test framework.

1. The server listens on this computer only. A step id outside the ten steps is rejected and never starts a process. `--confirm` on any step other than Make the clip is rejected.
2. Find footage for “bathroom scale” on Aether Wellness names that clip as held back. Find footage for “morning kitchen” does not list it as a clip to use.
3. Make the clip without the sheet returns the exit-2 sentence and spends $0. `--confirm` is sent only from the sheet’s Confirm button. A practice clip records $0 unless the checkbox is on.
4. Instruction templates include the footage words and the fixed stop line. The write-script template has no `--approve`. The unconfirmed clip command does not pass `--confirm`. Its sentence may name that flag to forbid it. The confirmed template passes `--confirm` only when the sheet produced it.
5. The served page header contains “Aether Wellness” and the find-footage blank contains “What footage do you need?” `pnpm test` and `pnpm typecheck` still pass.

Automated tests cover the argv builder, the headlines, and the templates. One automated test starts the desk on a temporary library and checks the unconfirmed clip stop. One browser pass checks the words and that a blocked clipboard still leaves the instruction on screen.

## Out of scope

Posting an ad, media buying, renting a GPU, and calling fal or MiniMax. `JEREMAI_ALLOW_SPEND` stays unused. No accounts, no deploy, no second database.
