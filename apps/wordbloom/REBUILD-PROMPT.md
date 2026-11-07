# WordBloom rebuild prompt

Use this saved request to rebuild or regenerate the complete WordBloom app. Follow the current implementation described below. Before changing code, read the repository `AGENTS.md`, `README.md`, `docs/constitution.md`, `docs/contracts/ui.md`, `docs/contracts/infra.md`, the matching notes, and the relevant installed Next.js documentation. Preserve unrelated workspace changes and existing learner data. Do not stage or commit unless asked.

## Product and visual design

- Build WordBloom as a child-friendly English vocabulary and football-card app. Keep every learner-facing string in English.
- Use the existing warm cream, pale green and forest green palette, rounded cards, calm typography, friendly fox coach, clear focus states and responsive layouts.
- On desktop, place text to the left of its picture when there is room. Shrink pictures before allowing them to crowd the question or controls. Keep answers and navigation easy to reach on phones.
- Keep app navigation to **Tests**, **My Team** and **Parent corner**. **Tests** is the only learning landing page. Do not add Training, Daily Challenge, weekly planning or a Turn a card activity.

## Backflip and local hosting

- Keep WordBloom code and assets in `apps/wordbloom/`.
- Keep the authenticated Backflip app at `/backflip/wordbloom`, protected by the `dashboard` capability. Serve static WordBloom files through the authenticated, allowlisted `/api/wordbloom/*` route.
- Keep the separate, local-only development site at `http://localhost:3081/wordbloom`. Start it with `corepack yarn workspace web dev:wordbloom`; bind to loopback and use its separate `.next-wordbloom` output directory so it can run beside Backflip on port 3070.
- In development, My Apps and the sidebar open the separate local site in a new tab. Hosted Backflip links open `/backflip/wordbloom` in a new tab.
- Keep the old standalone Python server removed. Do not expose the local development page in production.
- Keep learner state in browser IndexedDB. Storage is origin-specific: the Backflip route, local site, different ports, browsers and devices do not share progress. Explain manual backup transfer clearly.

## Tests home

- Show one **Tests** page with a **Word Collection** select, a collection summary, and five responsive app-like test tiles. Keep each title on one line, center tile content vertically beside its icon, and show each reward in a compact 9px white-on-green block. Show the selected collection’s completed-attempt count in small, semibold green serif text aligned to the right of each tile, with a subtle check mark after any error-free completion. Each tile has a short explanation, a brief example, and its reward block beside the test name:
  - **Listen & Write — Earn 30%**. Play the spoken word with the best available English voice; the learner types it.
  - **Look & Write — Earn 60%**. Show a picture; the learner types the word.
  - **Build the Word — Earn 30%**. Assemble the word with letter tiles.
  - **Find a Word — Earn 20%**. Show and read aloud the clue, show a picture beside it, and choose the matching word.
  - **Read & Choose — Earn 20%**. Read the clue aloud and choose its matching word.
- Combine **“Let’s collect your team.”** and **“Next football card”** progress into one hero panel. Keep visible spacing between the progress label and percentage (for example, “Next football card 0%”).
- Center every dialog in the viewport, including confirmation, editor, voice and import dialogs.
- Keep the layout responsive. On small screens, stack tiles and hero content without horizontal overflow.

## Test behaviour

- Starting a test always starts a fresh session. It replaces any unfinished session without asking to resume.
- The **Finish test** action clears the unfinished session and returns to Tests. Pressing the browser Back button during a test must also clear that session and return to Tests within WordBloom; it must not navigate out to Backflip. Use a same-route history entry and preserve Next.js router state.
- Show correct or incorrect feedback inline on the question screen. Do not show an answer-result modal. Keep **Next** visible, enable it only after an answer, and advance only when the learner selects it.
- In **Look & Write** and **Listen & Write**, the answer field starts neutral and is never marked wrong before submission. Do not score an empty value. Check and Enter evaluate a non-empty answer; typing after an empty-field warning clears that warning.
- In **Build the Word**, placing the final letter immediately checks the assembled word and enables **Next**. Do not scroll the page when a letter is selected.
- Offer **Skip word** in all available learning and test modes.
- Keep the little fox footballer reaction: score a goal on a correct response and miss humorously on an incorrect response. Respect reduced-motion preferences.
- Find a Word displays its picture beside the clue and speaks the clue once when the question opens. Read & Choose also speaks its clue once. Listen & Write speaks the target word. Respect browser voice availability and saved voice preferences.
- Automatically prefer enhanced, natural, neural or premium English speech voices when the browser provides them; keep saved voice selection available.

## Card collection and rewards

- Preserve the 48-player football collection, pending card choices, line-up, captain and 4–3–3 My Team view.
- Completing a test adds its configured card progress; a perfect score is not required:
  - Listen & Write: 30%.
  - Look & Write: 60%.
  - Build the Word: 30%.
  - Find a Word and Read & Choose: 20% each.
- At 100%, offer one selectable player card and preserve any progress remainder. Keep unclaimed choices available until selected. After a player is selected, navigate directly to **My Team**.
- Randomly choose player offers, avoiding the immediately previous offer when enough players remain. Never offer collected or reserved players.
- Goalkeepers can only be placed in goal. Every other player can be assigned to any outfield position.
- When a completed test adds partial progress without making a card available, congratulate the learner and state the amount earned plus the amount still needed for the next card (for example, “You earned 20% … You need 80% more”).
- Keep player photos local and record each real photo’s author, source, license, license URL and modifications in `photo-credits.json` and the readable credits page. Keep generated artwork distinct from real-player photos; never invent attribution.

## Parent corner, progress and backups

- Keep word collection editing, picture upload, screenshot cropping/OCR, voice selection and speed, test history and backup/restore in Parent corner.
- Clearing test history requires confirmation and clears saved test results and any unfinished session only. Preserve words, learning progress, pictures, football cards and reward progress.
- Resetting the football collection requires confirmation and clears players, pending choices, line-up, captain and card progress only. Preserve words, learning progress and test history.
- Export/import full backups for words, picture assets, progress, tests and football data. Validate imports before writing; malformed or failed saves must not partially replace existing data.
- Preserve compatibility with existing WordBloom and supported Word Garden backups. Do not silently erase or rewrite existing browser data.

## Engineering and verification

- Follow current Backflip architecture and documentation rules. Use Next.js App Router conventions from the installed Next.js docs; colocate private modules near their route; import shared UI from `@workspace/ui/components/*`.
- Update the relevant L2 contract and L3 notes with behavior changes; keep the docs index current. Do not change L1 rules without a concrete proposal. Keep one appropriate `@spec` tag on each owning feature module.
- Use only `corepack yarn` for repository commands. Do not stage or commit unless requested.
- Run the applicable checks before handoff: `corepack yarn workspace wordbloom test`, `corepack yarn workspace wordbloom test:browser`, `corepack yarn workspace web typecheck`, `corepack yarn lint`, and `corepack yarn workspace web build`. Report checks that could not run and why.
