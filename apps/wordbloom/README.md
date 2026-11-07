# WordBloom

A small English-learning space for one child. Built from the original Little Word Garden vocabulary, with more reliable saving and a simpler daily routine.

## Rebuild this app later

Save this instruction for a future chat: **Rebuild the complete WordBloom app using `apps/wordbloom/REBUILD-PROMPT.md` and the current Backflip project rules.** The file contains the app requirements and integration details.

## Backflip workspace

WordBloom source and assets live in `apps/wordbloom/`. The active app is hosted by Backflip at `/backflip/wordbloom` and requires a signed-in dashboard session. The My apps card opens it in a separate tab.

- Start Backflip in one terminal with `corepack yarn workspace web dev`.
- Start the separate local WordBloom site in another terminal with `corepack yarn workspace web dev:wordbloom` (bound to this computer only), then visit `http://localhost:3081/wordbloom`.
- The local WordBloom site does not require signing in. Its Next.js dev output is isolated from the Backflip server.
- The integrated Backflip route remains available at `http://localhost:3070/backflip/wordbloom` after signing in.
- Logic checks: `corepack yarn workspace wordbloom test`.
- Browser checks: `corepack yarn workspace wordbloom test:browser`.

## Your words and backups

The two original collections are included: Clothes (10 words) and Where is the little fox? (9 words). The original clothes pictures and five screenshots are preserved.

Use **Parent corner → Export full backup** to save your words, pictures, progress and tests. To import a backup, choose **Parent corner → Import or restore → Choose backup file**, review the summary, then choose **Add missing items** or **Restore everything**. Restoring everything replaces current WordBloom data and requires an explicit checkbox.
Use **Parent corner → Clear all saved test history** to remove every saved test score and an unfinished test while keeping your words, learning progress, pictures, football cards and reward meter.
Use **My Team → Reset collection** and confirm to clear the collected players, pending card choices, lineup, captain and card progress. This keeps your words, learning progress and test history.

WordBloom can also check for a compatible older Word Garden database when the browser makes it available at the same origin. Browser storage is origin-specific, so data from an old standalone address must have been exported before that server was removed. Imported progress and test history are kept; obsolete raw per-click legacy events are not carried forward.

## Tests

- **Tests** is the only learning page. Choose a Word Collection and start one of five tile-based tests: **Listen & Write**, **Look & Write**, **Build the Word**, **Find a Word**, or **Read & Choose**. Each tile shows its card reward and a short example.
- **Turn a card** and weekly planning are not part of the learning interface.
- Every test answer is saved immediately. Correct and incorrect feedback stays inline; **Next** becomes available after the answer and waits for an explicit click. Letter tests check the word as soon as all tiles are placed.
- Listen & Write and Build the Word each add 30% card progress, Look & Write 60%, and Find a Word and Read & Choose 20% each. At 100%, a player choice appears and any remaining percentage carries over. Partial rewards show the earned amount and how much is left.
- Test answers stay on screen with their result. There is no answer feedback modal.
- Practice cards keep a fixed screen-fitting frame. Long content scrolls inside the card while its answer controls remain available.
- Starting a test always starts a fresh session. Closing a test or pressing browser Back exits to Tests and clears the unfinished session; submitted answers remain in learning progress.
- The Tests heading and next-card progress share one panel, reward percentages sit beside test names, and all dialogs are centered.
- Correct answers on different days build mastery. Repeating the same word in one day cannot instantly mark it mastered.
- **Parent corner → Voice & speaking speed:** preview available English voices, choose one, and select Slow / Clear & steady / Normal. Automatic prioritizes natural, enhanced, neural or premium English voices available in the browser; the default rate is 0.85.
- Ordinary listening practice has a written-clue alternative. A sound-only test needs audio and does not reveal a written answer as a fallback. If sound fails, replay it or choose another voice or test.
- Voice availability and quality depend on the device and browser. A saved voice unavailable on another device falls back to an available English voice. Voice lists refresh when the browser loads them.

## Saving and backups

IndexedDB stores the learning state and a separate picture library. Test attempts keep picture IDs, not duplicate image files. State and newly added pictures are committed together in a transaction. A failed save does not advance the visible answer or replace the last saved data. Two windows cannot silently overwrite each other's newer changes.

Export regularly. Clearing browser site data, private browsing, running out of device space or changing addresses can make browser data unavailable. Backups include pictures, originals, word progress and tests. Restore validates the entire document before writing; malformed imports make no partial changes.

The local standalone site runs at `http://localhost:3081/wordbloom`; the integrated Backflip route runs at `/backflip/wordbloom` behind the signed-in dashboard session. Learning data remains in the browser and does not sync between devices or between the separate local addresses. Optional OCR downloads Tesseract resources from a CDN and processes screenshots in the browser. Externally linked pictures contact their hosts. Built-in words and pictures do not need an internet connection.

## Pictures and screenshots

Add a word manually, upload a picture, or choose one or two screenshots. The first screenshot contains the definition and illustration; the optional second contains the word. Drag or adjust percentage fields to crop the picture. Originals are retained separately. Review OCR suggestions before saving; crop out any printed answer.

## Files

- `index.html`, `styles.css`: responsive English interface.
- `app.js`: interface, audio, word editing and import previews.
- `core.js`: shared learning, validation, migration and merge rules; no DOM dependency.
- `football.js`: the 48-player roster, daily reward rules, collection validation and lineup rules.
- `storage.js`: atomic IndexedDB saving and concurrent-window protection.
- `seed.js`, `assets/fox.png`: original learning content and illustration.
- `assets/football/`: generated coach poses and player portrait atlases, kept separate from learner backups.
- `tests/core.test.cjs`: dependency-free Node tests.
- `tests/browser.cjs`: optional Playwright Chromium scenarios and screenshots.

## Test results

Read `TEST-RESULTS.md` and `test-results.json` for the recorded checks. Test source and browser screenshots are in `tests/`.

## Development checks

Backflip runs WordBloom through Next.js. For the logic checks, use Node 20 or newer:

```sh
node --test tests/core.test.cjs
node --check app.js
node --check core.js
node --check storage.js
```

Browser tests require an existing `@playwright/test` installation and its Chromium browser. Set `WORDBLOOM_PLAYWRIGHT` to that module's absolute directory if it is not on the normal module path, then run `node tests/browser.cjs`. The suite starts an ephemeral local server and temporary browser profiles; it never uses a personal browser profile. Set `WORDBLOOM_OUTPUT` to choose where reports and screenshots are written.

## Limits

One child, English-only interface, manual transfer between devices. No cloud sync, user accounts, remote uploads, service worker or app-store package. Closing an unanswered question saves the submitted answers and next question, not unsent text or partially assembled letters. Real Safari/iPhone audio and OCR accuracy need a manual check on the target device.

## Speech API references

- [Available device voices](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/getVoices)
- [Asynchronous voice loading](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesis/voiceschanged_event)
- [Speaking rate](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisUtterance/rate)

## Football club

- Tests is the home page. The app name and address stay WordBloom.
- Coach Fox celebrates correct answers and reacts to missed answers. Reduced-motion preferences disable the small reaction animations.
- **My Team** contains a 4–3–3 starting eleven, a bench, a captain and 48 collectible footballers. Emiliano Martínez is the goalkeeper; Lautaro Martínez is a separate forward.
- Every completed test adds its configured card progress. At 100%, the player can choose from three randomly selected uncollected footballers. Offers avoid the previous choice when enough players remain.
- Rewards are for effort: no perfect score is required, no points are spent, and missed days never remove players.
- Listen & Write and Build the Word add 30%, Look & Write 60%, and Find a Word and Read & Choose add 20% each. At 100%, another player choice is saved and the remaining percentage carries over. Unclaimed choices stay saved until selected.
- Collected players never repeat. A player automatically fills a free matching position; any outfield player can be placed in any outfield position, while goalkeepers can only play in goal. Tap a pitch position to change the lineup. Unselected or displaced players remain on the bench. Choose a captain from a collected player's details.
- When all 48 players are collected, the full squad stays available and tests remain playable. No timers, purchases, rankings or random paid packs.
- Team name, collected players, pending choices, starting eleven and captain are included in full backups and restores. Add-missing-items import keeps local choices on conflicting reward dates.
- Old WordBloom backups without a football collection remain valid and start with an empty club; existing words and learning progress are preserved. Old missions do not retroactively mint player rewards.

## Second chances in learning

A first incorrect answer in mission, review, word builder or meaning-matching practice stays on the same question and gives the first letter. The child can answer again; the mistake and pending second chance are saved even before the question finishes. A correct answer with that help does not count as independent mastery. A second mistake reveals the correction and schedules a later retry.

The five tests remain first-attempt assessments: no second chance, immediate saved result and a correction shown in place. First-answer scoring is not changed by the practice-only hint system.

## Football artwork and roster

See `ASSETS.md` for the image-generation prompts and saved assets, and `ROSTER-SOURCES.md` for the roster scope. There are 32 illustrated portraits and 16 name-and-kit monogram cards; one portrait atlas was rejected by the image tool, so those cards honestly use initials rather than another player's face. All 48 footballers can still be collected and placed in the team.
