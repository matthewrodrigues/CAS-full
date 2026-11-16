# Consistency review (Task 6)

I reviewed all 43 screenshots in `design/review/shots/` (refreshed with `npm run design:check`, which passes) against `kit.md`, `decisions.md`, the plan's Global Constraints and the four `kit-additions` files. The reference screens are `question-mc.html` for the phone and `big-question.html` for the big screen.

Overall the five areas hold together well. Paper, edges, fonts, the 96px timed-screen host, 48px list avatars, the fixed result words, and the host per round (R1 Rocco, R2 Pebble, R3 Dr. June, final and end Rocco) all line up. The problems are concentrated in four places: status-pill choices for in-between states, the big screen copying phone patterns loosely (reveal, leaderboard avatars, wrong question counts), the after-game tab pages carrying play chrome, and duplicate classes across the additions files.

## 1. Findings

| # | file(s) | problem | fix | owner | severity |
|---|---|---|---|---|---|
| 1 | `big-leaderboard.html` | Every team row has an animal avatar, picked from the prize set and including `moray-eel` and `mystery`. Teams don't own animals. On the phone (`leaderboard-tonight`, `-stress`) only the top 3 show their **prize** animal and ranks 4+ have none. The big screen implies avatars the product doesn't have. | Match the phone: ranks 1–3 show their prize animal (`penguin-chick`, `giant-pacific-octopus`, `pacific-seahorse`). Ranks 4+ get no avatar. Drop the `animals/${animal}` loop. | 5d | must |
| 2 | `big-round-intro.html`, `big-locked.html`, `big-reveal.html`, `big-leaderboard.html` | Question counts contradict the seed and the phone. Round 2 shows "10 questions" (the seed and `question-image` say 9). Ocean Sounds shows "Question 5 of 10" (the seed and `question-stress` say "of 9"). The leaderboard says "Top teams after 20 questions" after Round 2 (the seed gives 10 + 9 = 19). | Use the seed's counts: "Picture round · 9 questions · 10 points each", "Question 5 of 9", "Top teams after 19 questions". | 5d | must |
| 3 | `round-break.html` vs `big-round-intro.html` | The same moment shows different status pills: "Results are in" on the phone and "Waiting for the host" on the big screen. | Both use `.pill--waiting` "Waiting for the host". The round's results were already shown on the reveal and leaderboard, and the room is now waiting for the next round to start. | 5b | must |
| 4 | `wager.html` | The pill says "Waiting for the host", but the screen asks the team to act now, with a primary "Lock in our wager" and a countdown-style deadline. The status contradicts the action. | Use a wager status (see decision 1). Until that's decided, use `.pill--live` with "Question live" style words, because the screen is a live input. The host stays `asking`. | 5b + kit | must |
| 5 | `paused.html` | "Paused by the host" isn't one of kit §10's four fixed status words, and it borrows `.pill--waiting`'s class with a different icon. | Add `.pill--paused` to the kit (butter, pause icon) and add "Paused by the host" to the fixed status words (decision 1). Then switch `paused.html` to that class. | kit, then 5b | must |
| 6 | `big-reveal.html` vs `reveal-correct.html` / `reveal-incorrect.html` | The revealed option on the big screen keeps a plain "A" letter bubble with only a green border. The phone replaces the letter with `.option__mark--correct` (a filled check). On the big screen, color plus the header badge is the only cue on the row itself. | Replace `.option__letter` with `<span class="option__mark option__mark--correct">` (check SVG) in `.option--answer`, as the phone does. | 5d | must |
| 7 | `big-reveal.html` | The fun fact is a bare `.hand` heading plus a sentence set in `.h2` (Fredoka 600). The phone uses `.fact` (dashed rule, lightbulb `.fact__icon`, `.fact__label`, Nunito body). A full sentence in the heading font also breaks kit §2 (Fredoka is for headings and the question). | Use the `.fact` block exactly as `reveal-correct.html` does. Set the body as a `<p>` at `--text-lg` (via the kit rule `.big .fact p` in the merge plan), not `.h2`. | 5d | should |
| 8 | `big-locked.html` vs `locked.html` | The big screen puts the waiting host on the default peach stage, and the phone uses `.stage--butter`. Kit §11 says butter means waiting. | Add `stage--butter` to the big-locked stage. | 5d | should |
| 9 | `big-leaderboard.html`, `big-lobby.html`, `big-prizes.html` | Big-screen list avatars are 64px on the leaderboard, 128px under the lobby and 160px on prizes. Kit §11 says list avatars are 96px on the big screen. | Leaderboard rows: `char--96`. Prizes rows: keep 160 only if the kit adopts a "prize row" size (see kit merge plan), otherwise 96. Lobby prize row: `char--128` is acceptable as a hero group, so leave it. | 5d | should |
| 10 | `animals.html`, `my-animal.html`, `rewards.html`, `redeem-code.html`, `leaderboard-season.html` | These tab pages carry a "Results are in" pill and "Game DEMO1". They aren't play screens. They're visited days later (season, animal updates, a code that expires Dec 12), so the status is false then. On `redeem-code` and `my-animal` the pill also moves to the right of a back link, against §6's "pill on the left". | Remove the status pill from these five. In `screen__top`, put the back link (where there is one) on the left, and the screen's hand note on the right ("Fall 2026 season", "My rewards"). Keep the pill on `ended-prizes*`, `leaderboard-tonight`, `-stress`, `-empty` and `feedback`, which are tonight's game. | 5c | should |
| 11 | shared chrome: all phone screens | The 4-tab bar exists only in 5c, so the product has two app shells. | **Show the tab bar** on `lobby`, `lobby-stress`, `round-break` and every 5c screen (Play is active on lobby, round break, ended and feedback). **Hide it** on `landing`, `join-*` (no session yet), `staff-round-hosts` (staff) and every timed or in-flow sheet: `question-*`, `wager`, `locked`, `reveal-*`, `paused`. The sheet is one idea per screen, and the button must stay in thumb reach. 5a and 5b add `nav.tabbar` (after `.screen__actions`) to the three screens named. | 5a, 5b | should |
| 12 | `ended-prizes.html`, `ended-prizes-stress.html` | Two `.sparkle` spans are placed with inline `style="top…; left…"`. That's new CSS in a mockup, against kit "don't write new CSS". The cheering SVG already draws 3 honey sparkles, so the screen shows 5, against §14's "a sparkle or two". | Delete both `.sparkle` spans. The cheering art carries the celebration. | 5c | should |
| 13 | `my-animal.html` | The "Meet the real one" photo slot is a big Mist (`--color-info-soft`) block with a `--color-depth` icon. It adds a fourth bright color (peach stage, brand button, mist, plus honey feed dots) and reads as a blue panel, not an empty photo. | Change `.photo-slot__frame` to `background: var(--color-paper)`, keep the dashed `--color-border`, and set the icon to `var(--color-ink-muted)`. | 5c | should |
| 14 | `join-team.html`, `join-team-stress.html` | Team rows put the team's initial in `.option__letter` (the A–D answer-sheet bubble), so teams read as answer choices "A / K / S". The lobby already uses joining.css's `.initial` for the same job (a person or team initial). | Use `.initial` (at 38px via a `.initial--sm` modifier, or 48px as-is) in place of `.option__letter` in team rows. Keep the `.option` button. | 5a | should |
| 15 | `rewards.html`, `feedback.html`, `my-animal.html` | The primary button sits mid-page inside a card, while every other phone screen keeps it in `.screen__actions` at the bottom. The pattern is fine for a scrolling tab page, but the kit doesn't sanction it, so the builders will guess. | Keep the placement. Kit §8 adds: "On a scrolling tab page, the one primary sits directly under the form or card it acts on." `feedback`'s "Sign me up" stays `.btn--secondary`. | kit | should |
| 16 | `rewards.html`, `my-animal.html` | The button copy isn't first-person: "Suggest this name", "Follow this animal". Elsewhere it's "That's our answer!", "Let's name our octopus!", "Send my feedback". | "That's our name!" (team action) and "Follow our octopus" for your team's animal, or "Follow this one" for another team's. | 5c | nit |
| 17 | `round-break.html` vs `big-round-intro.html` | The incoming host's line differs for the same moment: "Hi, friends! Ready to dive in?" on the phone and "Waddle you know? Let's see!" on the big screen. The outgoing line exists only on the big screen ("Over to you, Pebble!"), while the phone narrates it in third person ("Rocco's taking a breather…"). | Use one line on both: "Hi, friends! Ready to dive in?" On the phone, give small Rocco the bubble "Over to you, Pebble!" (`.bubble` beside the 64px `relaxing`) in place of the sentence, so both screens match. | 5b, 5d | nit |
| 18 | `leaderboard-stress.html` | The "You're 11th of 20" jump row says "131 pts", and every other score line says "points". | "131 points". | 5c | nit |
| 19 | `big-prizes.html` vs `ended-prizes.html` / `leaderboard-tonight.html` | Prize sub-lines differ: "Place 1: name the African penguin chick" on the big screen and "Names the African penguin chick" on the phone. | Use "Names the African penguin chick" on both. | 5d | nit |
| 20 | `lobby.html` → `round-break.html` → `ended-prizes.html` | "Your team" changes along the clickable flow (Kraken Up, then The Anglerfish Five at #3 of 18 teams, then The Blobfish Brigade). The big screen says 20 teams. | Use one team through the flow ("The Blobfish Brigade") and a 20-team night ("#3 of 20 teams"). The stress screens keep their long names. | 5a, 5b | nit |
| 21 | `lobby.html`, `lobby-stress.html` | `.screen__top` has the pill but no right-hand hand note. Every other play screen has one. | Add `<p class="hand hand--sm">Deep Sea Night</p>` to match the join steps. | 5a | nit |
| 22 | `reveal-incorrect.html` | It shows four bright colors (peach stage, Tomato, Fern for the right answer, honey tape and rule). This is inherent to "wrong, and here's the right one", but it breaks the letter of kit §1. | No screen change. Kit §1 adds: "On a reveal, correct and incorrect count as one pair." | kit | nit |
| 23 | `round-break.html`, `big-round-intro.html` | Kit §15's moment table says round break = `relaxing`. Decision 2 has the incoming host introduce themselves, and both screens rightly use `greeting` for the incoming host and `relaxing` for the outgoing one. | Update the kit table: "Round break: incoming host `greeting`, outgoing host `relaxing` (small)". | kit | nit |
| 24 | `big-question.html` | The `.pill__dot` stays 10px inside a 64px big pill, so "Question live" loses its breathing dot from across the room. | Kit: `.big .pill__dot { width: 18px; height: 18px; margin: 0 9px; }`. | kit | nit |

**Counts:** 24 findings: 6 must, 9 should, 9 nit.
- By owner (a shared finding counts for each owner): 5a 4 · 5b 6 · 5c 5 · 5d 8 · 5e 0 · kit 6.
- 5e has no findings. Hosts and expressions fit every moment, the round assignment is right on every screen, and Pebble reads clearly apart from the penguin chick.

## 2. Kit merge plan

General rule: merge into `kit.css` under the matching section, keeping each block's comment. Motion stays in the single `prefers-reduced-motion: no-preference` block. Then delete the four `kit-additions/*.css` files and their `<link>`s from every mockup.

**Shared kit change for the pen circle:** the same data-URI mask is now inlined in `.option` (kit) and `.choice` (joining). Define it once as `--mask-pen-circle` in `:root` and use `mask: var(--mask-pen-circle) center / 100% 100% no-repeat` in both.

### joining.css (5a)

| Class | Action |
|---|---|
| `.panel`, `.panel__head` | **Unify into `.card`** (after.css), with the same box. `.panel__head` becomes `.card__head.card__head--split` (`justify-content: space-between; align-items: baseline`). Migrate `lobby*`, `staff-round-hosts` and `leaderboard-empty`. Drop `.panel`. |
| `.field__error` (+ `svg`), `.field__input[aria-invalid]` | **Keep this one** (it has an icon slot, flex and alignment). Merge into kit §9. Drop after.css's copy; `feedback.html` already puts an icon in it. |
| `.option__sub` | Merge as-is. |
| `.wrap-anywhere` | **Drop.** Kit fix: add `overflow-wrap: anywhere` to `.display`, `.h1` and `.h2`, so long team names never need a utility. Also drop after.css's `.card__head > :last-child { overflow-wrap }`, which is then redundant. |
| `.icon-inline` | Merge as-is. |
| `.initial` (+ `.list-row.is-you .initial`) | Merge. Add `.initial--sm` (38px, `--letter`) for join-team rows (finding 14). |
| `.stage--hero .bubble` | **Unify** with big-screen.css's `.stage--hero > .bubble` and `.row.big-row > .bubble` into one kit rule: `.stage--hero > .bubble, .row > .bubble--fit { flex: none; align-self: center; max-width: 100%; }`. Drop all three copies. |
| `.link-row` | Merge as-is. |
| `.select`, `.field__select` | Merge (staff pages need it). |
| `.choices`, `.choice`, `.choice__avatar`, `.choice__random` | Merge. Use `--mask-pen-circle` (above). |

### paper.css (5b)

| Class | Action |
|---|---|
| `.media`, `.media__frame`, `.media__caption` | Merge as-is. |
| `.clip` and all its parts, `.clip__cc` | Merge as-is. |
| `.option__mark` (+ `--correct`, `--incorrect`) | Merge as-is into kit §10 next to `.option.is-correct`. Kit §9 says a revealed row uses `.option__mark` in place of the letter. |
| `div.option { cursor: default }` | Merge as `.option--static` (used for non-interactive rows on reveal and the big screen); avoid the element selector. |
| `.option__note--muted` | Merge as-is. |
| **Kit fix:** `.option--tf .option__note { position: static }` | Replace the kit's absolute positioning for `.option--tf .option__note` with this. Delete the `top`/`right` lines. |
| **Kit fix:** `.field__count { flex: none; white-space: nowrap }` | Fold into the existing `.field__count` rule. |
| `.fact`, `.fact__icon`, `.fact__label` | Merge. Add `.big .fact p { font-size: var(--text-lg); }` for 5d's reveal (finding 7). |
| `.tally`, `.tally__num`, `.tally__label` | Merge as-is. |

### after.css (5c)

| Class | Action |
|---|---|
| `.tabbar` and parts | Merge (finding 11 says where it shows). |
| `.seg`, `.seg__link` | Merge as-is. |
| `.card`, `.card__head` | **Keep as the one Milk card** (absorbs `.panel`). Add `.card__head--split`. Drop `.card__head > :last-child`'s `overflow-wrap` (the kit now handles it). |
| `.chip` (+ `--win`) | Merge. In kit §10, say what each is for: `.pill` = game status (one per screen), `.tag` = "You", `.chip` = an item's status (prize ready, name approved). |
| `.sparkle`, `.sparkle--sm`, `@keyframes after-sparkle` | **Drop** (finding 12). The cheering art has its own sparkles. |
| `.code-display` | **Keep as the one code class.** Absorb big-screen.css's `.big-code` as `.code-display--xl` (`font-size: calc(var(--text-display) * 1.6); letter-spacing: 0.08em`). Color inherits, so it works on Midnight without a separate rule. |
| `.qr` | **Keep as the one QR tile.** Absorb `.big-qr` with `.big .qr { width: 440px; height: 440px; padding: var(--space-5); }`. Drop `.big-qr`. |
| `.photo-slot` and parts | Merge, with the recolor in finding 13. |
| `.rating` and parts | Merge as-is. |
| `.check` and parts | Merge as-is. |
| `.field__input--area` | Merge as-is. |
| `.field__error` | **Drop** (duplicate; joining.css's version is kept). |
| `.feed` and parts | Merge as-is. |
| `.back-link` | Merge (it modifies `.btn--quiet`). |

### big-screen.css (5d)

| Class | Action |
|---|---|
| `.big-col` | Merge as-is (the big-screen layout section). |
| `.big-note` | **Rename** to `.hand--night` (hand font, `--color-info-soft`). It's the night version of the `.hand` top-right note, and the build may need it on a rare phone night screen. |
| `.on-night-muted` | **Rename** to `.muted--night`, as the pair of `.muted`. |
| `.stage--hero > .bubble`, `.row.big-row > .bubble` | Drop (unified above). |
| `.countdown--xl` | Merge as-is. |
| `.big-qr` | Drop (into `.qr`). |
| `.big-code` | Drop (into `.code-display--xl`). |
| `.list--cols-3` | Merge as-is. |
| `.list--board` | Merge as-is. |
| `.big-avatars` | **Rename** to `.avatar-row`. The phone lobby's "Tonight's prizes" row is the same pattern and can use it. |
| `.big-caption`, `.big-caption__icon` | **Rename** to `.caption-line`, `.caption-line__icon` (a static caption on paper; `.clip__caption` stays for the player). |
| `.row.big-row` | **Rename** to `.row--wide` (`gap: var(--space-8)`). |
| `.option.option--answer` | Merge as-is. |
| **Kit fix:** `.screen--night .list-row { color: ink }` | Move into `.list-row` itself (`color: var(--color-ink)`). A Milk row always needs Cocoa, on any background. Drop the scoped rule. |
| **Kit fix:** `.option[aria-disabled='true']` | Add to the kit's `.option:disabled` selector list (`.option:disabled, .option[aria-disabled='true']`). |
| **Kit fix:** `.big .paper { --fold: 40px }`, `.big .paper::before` (tape 176×40, top −20px) | Fold into the kit's `.big` paper rules. Kit §7's "tape sits 13px above" note gets a big-screen value. |
| **Kit fix:** `.screen--night .pill--locked` (Mist outline) | Merge into kit §10 as-is. |
| **Kit fix:** `.big .list--board .list-row__rank { min-width: 60px }` | Generalize to `.big .list-row__rank { min-width: 60px }`, so every big list lines up. |

### Other kit rule changes (from findings)
- §10: add `.pill--paused` and, if approved, a wager status (decision 1). Also the `.big .pill__dot` size (finding 24).
- §1: on a reveal, correct and incorrect count as one pair (finding 22).
- §8: the primary sits under its form on scrolling tab pages (finding 15).
- §11 sizes table: add "Prize rows on the big screen: 160px" if 5d keeps it; otherwise 96 (finding 9).
- §15 moment table: round break = incoming `greeting`, outgoing `relaxing` (finding 23).
- §6: document `nav.tabbar` and which screens show it (finding 11).

## 3. Decisions for the user

1. **Two more status words.** Kit §10 fixes four statuses, but the game has two more states. Should "Paused by the host" (butter, pause icon) and a wager status (e.g. "Place your wager", mist with the live dot) be added? The alternative is forcing them into "Waiting for the host" and "Question live", which reads wrong on the wager screen.
2. **The tote bag prize.** `rewards.html` and `redeem-code.html` invent a "NightLife tote bag", picked up "at the info desk", expiring Dec 12. Is there a real non-animal prize, and where and until when is it collected? If not, drop the "Prize codes" section.
3. **Animal locations and keeper copy.** Lines like "Steinhart Aquarium, Northern California Coast", "African Hall penguin colony", the keeper updates ("Weighed in at a healthy 2.1 kg…") and "Professor Wiggles" are written by the designers, not taken from the seed. Should they stay as placeholder copy, or does the Academy supply real text before the build?
4. **The tab bar during the game.** The recommendation (finding 11) shows it on the lobby and round break and hides it on every timed or in-flow sheet. Players then can't open the leaderboard mid-question. Confirm that's acceptable.
