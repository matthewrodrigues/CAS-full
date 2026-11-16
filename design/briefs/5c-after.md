You are one of five designers redesigning NightLife Trivia, a mobile web trivia game played in a loud, dim bar at Thursday NightLife at the California Academy of Sciences. The prizes are naming rights: the teams in places 1–3 each get to name a real Academy animal, and everyone can follow the night's animals afterwards. The feel: **warm, cozy, cute and character-led**. Rocco the raccoon is the main host, and the animal avatars are the stars here. Your area is **5c: after the game**. Four other designers are building other areas from the same kit at the same time, so stick to the kit exactly.

Work in c:\dev\CAS\nightlife-trivia (branch `ui-redesign`).

## Read first
- `design/README.md`.
- `design/system/decisions.md` (binding).
- `design/system/kit.md`, `kit.css` and `tokens.css`: use ONLY kit classes and tokens.
- `design/screens/question-mc.html`: the approved sample. Match its quality and head.
- `docs/superpowers/plans/2026-11-15-ui-redesign-design-phase.md`: Global Constraints and Task 5.
- `docs/superpowers/specs/2026-11-15-ui-redesign-design.md`, the "Data needed for avatars" section: the avatar is the animal's face everywhere, and the real photo shows only on the Animals tab / My Animal as "meet the real one".
- For what each screen must show, read `src/routes/play/`: ended-screen, prize-list, leaderboard-page, rewards-page, after-game-forms, animals-page. Also `src/components/leaderboard-list.tsx`, `src/i18n/en.json`, and `server/db/seed-demo.ts` for the demo animals and exhibits. Animal names max 30 characters, updates max 500.

## Your files (in `design/screens/`)
- `ended-prizes.html`: the final result; your place; the prize animals; Rocco cheering.
- `ended-prizes-stress.html`: a tie, plus 30-character team names.
- `leaderboard-tonight.html`
- `leaderboard-stress.html`: 20 teams with your team mid-table, still easy to find.
- `leaderboard-season.html`
- `leaderboard-empty.html`: a friendly empty state.
- `rewards.html`
- `redeem-code.html`: a code with a QR placeholder for staff to scan.
- `feedback.html`: rating, comment and newsletter consent.
- `animals.html`: the Animals tab, tonight's animals and their avatars.
- `my-animal.html`: the animal your team named; the avatar plus a "meet the real one" photo slot (a token-colored placeholder box with a caption); staff updates feed.

## Characters
`<span data-character="animals/giant-pacific-octopus" aria-label="…"></span>`, `animals/<key>-happy`, and `hosts/rocco/cheering` (see README). If the character files aren't drawn yet, placeholders show.

## Shared rules
- Phone at 390×844.
- One primary button per screen. Two or three bright colors per screen at most. Green only means correct, red only means incorrect; winners use the win token.
- 44px tap targets. Motion only inside the kit's reduced-motion guard, and celebrations are brief.
- No text in SVGs. Real copy, warm and first-person buttons.
- Clickable flow between your screens.
- Head as in question-mc.html.
- If you need a component the kit lacks, add it to `design/system/kit-additions/after.css`, link it after kit.css, and list it in your report.

## Check
Run `npm run design:check` from **PowerShell**. Your files must have zero problems; ignore other designers' files. Look at your screenshots in `design/review/shots/` with Read, and iterate until they're polished.

## Rules
- Do NOT commit or git add. Do NOT install packages. Do NOT kill processes by name. Leave any dev server on port 5180 alone. Edit only your files and your kit-additions file.
- If the harness refuses a Write, return the content in your report under its exact path.
- Report: files written, any kit-additions, anything unsure, and your last design:check output.
