You are the consistency reviewer for the redesign of NightLife Trivia, a mobile web trivia game played in a loud, dim bar at Thursday NightLife at the California Academy of Sciences. The feel is **warm, cozy, cute and character-led**. Five designers built ~43 mockups in parallel from one kit:
- 5a joining
- 5b paper answer sheet
- 5c after the game
- 5d big screen
- 5e characters

Your job is to find where their work drifted apart, or from the kit, and to say exactly how to fix each problem. You review and write findings. You do NOT edit any mockup or kit file.

Work in c:\dev\CAS\nightlife-trivia (branch `ui-redesign`).

## Read first
- `design/README.md`
- `design/system/decisions.md` (binding user decisions)
- `design/system/kit.md`, `kit.css` and `tokens.css`
- `docs/superpowers/plans/2026-11-15-ui-redesign-design-phase.md`: Global Constraints, Review Focus, Task 6
- every file in `design/system/kit-additions/`: joining.css, paper.css, after.css, big-screen.css

## Look
- Run `npm run design:check` from **PowerShell** (not Git Bash) to refresh `design/review/shots/`.
- Then view EVERY screenshot there with Read. Compare screens across areas side by side. `design/screens/question-mc.html` is the approved reference for the phone, and the big screen's sibling is `big-question.html`.
- A gallery server may be running at http://localhost:5180/. Leave it alone.

## Check every screen for
- **Kit and look:** corners, edges, shadows, the paper treatment (tape, fold, header rule, torn edge used only where kit.md says), spacing, type scale and fonts (Fredoka, Nunito, and Shantell only for short accents).
- **Characters:**
  - a character on every screen, or a stated reason
  - the right host for the round (Round 1 Rocco, Round 2 Pebble, Round 3 Dr. June, final Rocco; Rocco for the lobby, end and prizes)
  - the host's expression fits the moment (greeting, asking, waiting, cheering, consoling, relaxing)
  - avatar sizes are consistent for the same job
- **Color rules:** two or three bright colors per screen at most; green only for correct, red only for incorrect; correct/incorrect always shows an icon and a word.
- **One primary button per screen**, and its placement is consistent across similar screens.
- **Status:** the status pill wording is the same everywhere for the same state (e.g. "Results are in" vs "Results in"), and every play screen shows its state clearly.
- **Copy voice:** warm and first-person, consistent ("our" vs "my", host line style).
- **Shared chrome:** the 4-tab bar (Play / Leaderboard / Rewards / Animals) exists only in 5c's screens. Decide which phone screens should show it (e.g. lobby? question screens?) and say so.
- **Stress states:** long names wrap without overflow and never cover a character. The 20-team lists keep your team findable.
- **Phone vs big screen** feel like one product.
- **Kit additions:**
  - Classes that duplicate each other across areas (e.g. `.card` in after.css vs `.panel` in joining.css, or two `field__error` definitions) should be unified. Name the one to keep.
  - List every addition that should be merged into `kit.css`, and every kit FIX (5d's big-screen.css and 5b's paper.css both contain fixes to existing kit classes).

## Output
Write `design/review/consistency.md`:
1. **Findings:** a table with columns `#`, `file(s)`, `problem`, `fix` (specific: class, wording, host or expression), `owner` (5a/5b/5c/5d/5e or `kit`) and `severity` (must / should / nit). Keep it to real problems; no padding.
2. **Kit merge plan:** for each kit-additions file, which classes merge into kit.css as-is, which are renamed or unified (and the final name), which are dropped, and which existing kit rules change.
3. **Decisions for the user:** only things a designer can't settle (e.g. made-up prize copy), max 5.

If the harness refuses the Write, return the file's full content in your report under its exact path.

## Rules
- Do NOT edit mockups, kit files or SVGs. Do NOT commit or git add. Do NOT install packages. Do NOT kill processes by name.
- Report: the number of findings by severity and owner, the 5 most important findings, and the user decisions.
