# UI redesign build: every screen compared with its mockup

Task 12 of `2026-11-16-ui-redesign-build.md`. Each of the 40 mockups in `design/screens/` was compared side by side with the built app's screenshot (`test-results/screens/<name>.png`, captured by the e2e suite at 390px, or 1920×1080 for the big screen) on branch `ui-redesign` at `b35d5a9`.

- **match:** the same design; only test data differs (names, numbers, question text).
- **data:** a visible difference caused by data the app doesn't have, or by the test fixture. Listed under "Data gaps".
- **fixed:** a real design difference, fixed in Task 12 (F1–F8 below).

The built app has one extra capture with no mockup: `host-console-round-break`. The host console and staff pages have no mockups; they use the same tokens and kit.

## Results

| Screen | Verdict | What differs |
|---|---|---|
| landing | match | |
| join-nickname | data | header shows the fixture's event name |
| join-team | data | team rows lack "· Priya is captain" (G1) |
| join-team-stress | data | same captain line (G1) |
| lobby | data | prizes line lacks articles ("African penguin chick, Giant Pacific octopus…") (G8) |
| lobby-stress | data | same prizes line (G8) |
| staff-round-hosts | fixed | Random was listed first, the mockup has it last (F7). The control sits inside the staff settings tab, not a standalone page; that's deliberate |
| round-break | fixed | note showed the event code, and the hero and recap lacked the round number, title and format (F3) |
| paused | fixed | "Round 1" without "of 4" (F2) |
| locked | fixed | "Round 1" without "of 4" (F2) |
| question-mc | fixed | a picked option under the pointer lost its blue border (F1); round note (F2) |
| question-mc-nudge | fixed | same border (F1); round note (F2) |
| question-mc-submitted | fixed | round note (F2) |
| question-true-false | fixed | same border (F1); round note (F2) |
| question-text | fixed | "Your answer" should be "Our answer" (F4); round note (F2) |
| question-number | fixed | "Your guess" should be "Our guess" (F4); round note (F2) |
| question-image | data | the fixture's picture question is a typed one with a placeholder image; round note (F2) |
| question-audio | data | nothing picked yet in the capture; round note (F2) |
| question-captain-only | data | the fixture question has no picture; round note (F2) |
| question-stress | data | the fixture question has no audio clip; round note (F2) |
| wager | match | |
| reveal-correct | fixed | round note (F2) |
| reveal-incorrect | fixed | round note (F2) |
| ended-prizes | fixed | button said "Let's name our animal!", the mockup names the animal (F8) |
| ended-prizes-stress | fixed | same button (F8) |
| leaderboard-tonight | match | |
| leaderboard-season | data | rows show "N nights" with no team (G4) |
| leaderboard-stress | data | "20 teams!" where the mockup spells out "Twenty teams!" |
| leaderboard-empty | match | |
| rewards | match | captured in the not-yet-named state |
| feedback | match | captured in the empty state |
| animals | data | no "Tonight's animals" section in the fixture's state (G6) |
| my-animal | data | "Named on Nov 16" lacks "by <team>"; keeper credit is generic (G7) |
| big-lobby | fixed | header showed the theme alone, not "Thursday NightLife Trivia · theme" (F5) |
| big-question | data | host follows the round's cast (G9) |
| big-locked | match | |
| big-reveal | data | no "N teams were right" count, so the copy is neutral (G2) |
| big-leaderboard | data | "Top teams so far", not "after 19 questions" (G3) |
| big-round-intro | fixed | the meta line under "Round 2 of 4" was missing (F6) |
| big-prizes | match | |

## Fixes made in Task 12

| # | Fix |
|---|---|
| F1 | The hover style no longer overrides a picked option's pen-blue border (`kit.css`) |
| F2 | The game view carries the number of rounds, so phone screens say "Round 1 of 4" |
| F3 | The round break shows "Round N of M", the next round's title and format, and "Round N done!" |
| F4 | Typed and number answers are labelled "Our answer" and "Our guess" |
| F5 | The big-screen lobby header reads "Thursday NightLife Trivia · theme" |
| F6 | The big-screen round intro has its meta line (format, question count, points) |
| F7 | Round hosts are listed Rocco, Pebble, Dr. June, Random; Random is still the default |
| F8 | The winners' button names the animal: "Let's name our octopus!" |

## Data gaps (the mockup shows something the app has no data for)

| # | Gap | Where |
|---|---|---|
| G1 | The captain's name on each team row | join-team |
| G2 | "14 of 20 teams were right" and the host line built on it | big-reveal |
| G3 | "Top teams after 19 questions" | big-leaderboard |
| G4 | A team name per player on the season board | leaderboard-season |
| G5 | A round-specific instruction line ("Look closely at each picture…") | big-round-intro |
| G6 | The "Tonight's animals" section depends on naming being in progress; the fixture doesn't reach that state | animals |
| G7 | "Named by <team>" and a named keeper team in the credit | my-animal |
| G8 | Articles in the prizes sentence ("an African penguin chick, a giant Pacific octopus…"); it's built from species names | lobby |
| G9 | Mockups show a fixed host per screen; the app shows the round's host, which is Random by default | all play and big screens |

Animal names, locations and keeper updates are placeholder copy ("Professor Wiggles"), kept on purpose. Confirm them before deploying.

## Old-look styles left in `src/`

A grep for `bg-brand-deep text-surface`, `shadow-pop` and `font-heading` finds these, and they stay:

- **The midnight header bar** on the host console and staff pages (`host-page.tsx`, `staff-page.tsx`). The tokens were remapped, so it renders in the new palette. These pages have no mockups.
- **`font-heading`** on headings in `role-gate.tsx`, `host-home.tsx`, `privacy-page.tsx` and `placeholder-screen.tsx`. It now resolves to Fredoka, the kit's heading font.
- **`shadow-pop`** in `ui/button.tsx`. It's the kit's button edge, defined in `tokens.css`.

Removed: `src/components/status-banner.tsx`, unused since `StatusPill` replaced it.
