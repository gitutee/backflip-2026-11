# WordBloom test results

Latest implementation check: 2026-11-07. These results supersede the historical snapshot that covered the former Training page.

## Automated checks

- PASS — `corepack yarn workspace wordbloom test` — 41 unit tests.
- PASS — `corepack yarn workspace wordbloom test:browser` — 13 Chromium scenarios.
- PASS — `node --check` for `app.js`, `core.js`, `football.js`, and both WordBloom test files.
- PASS — `corepack yarn workspace web typecheck`.
- PASS — `corepack yarn workspace web build` (Next.js production build and TypeScript).
- PASS — `corepack yarn lint` (0 errors; 14,079 existing and generated-code warnings remain).

## Browser scenarios

- PASS — Tests home, five tiles with reward percentages, merged hero/progress panel, Word Collection selector, no Daily Challenge, responsive layout.
- PASS — Look & Write adds 60% and reports the remaining card progress.
- PASS — Listen & Write accepts no empty answer, adds 30%, and reports the remaining card progress.
- PASS — Find a Word shows a picture, reads its clue aloud and adds 20% progress.
- PASS — Build the Word auto-checks an incorrect assembled word inline, activates Next, and grants 30%; repeated tests issue a card at 100% and preserve 20% remainder.
- PASS — Read & Choose reads its clue aloud and adds 20% progress.
- PASS — A new test replaces unfinished work without a dialog.
- PASS — Browser Back from a test returns to Tests and clears the unfinished session.
- PASS — All dialogs are centered in the window.
- PASS — Look & Write and Listen & Write inputs are not initially invalid; empty checks do not score an answer.
- PASS — The fox celebrates correct answers and misses incorrect ones.
- PASS — Test tiles keep one-line titles, align with their icons, use compact green Earn blocks and right-aligned small green serif history text, and mark a perfect attempt.
- PASS — After 11 completions, a test displays a 15-minute lock and keeps it after reloading.
- PASS — Automatic speech selection prefers the enhanced English voice when available.
- PASS — Goalkeepers can only play in goal; every field player can be assigned to any outfield slot.
- PASS — Selecting a footballer card opens My Team immediately.

Browser run saved screenshots and machine-readable results under `tests/output/`.

## Manual follow-up

- Check speech recognition and voice quality on the target iPhone/Safari device.
- Browser data remains local to its site origin; use full backups to move progress between addresses or devices.
