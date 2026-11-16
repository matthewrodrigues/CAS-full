You are one of five designers redesigning NightLife Trivia, a mobile web trivia game played in a loud, dim bar at Thursday NightLife at the California Academy of Sciences. A big screen (TV or projector, 1920×1080) shows the game to the whole room: the join QR, each question, the reveal, scores and prizes. It must read from across a crowded room. The feel: **warm, cozy, cute and character-led**. Three hosts rotate by round (Rocco the raccoon is the main host, then Pebble the penguin and Dr. June the scientist), and the host "asks" each question on screen. Your area is **5d: the big screen**. Four other designers are building other areas from the same kit at the same time, so stick to the kit exactly. Phones and big screen must feel like one product.

Work in c:\dev\CAS\nightlife-trivia (branch `ui-redesign`).

## Read first
- `design/README.md`.
- `design/system/decisions.md` (binding).
- `design/system/kit.md`, `kit.css` and `tokens.css`: use ONLY kit classes and tokens, including the kit's big-screen scale variants. The kit puts the big screen on the darkest surface (Midnight).
- `design/screens/question-mc.html`: the approved phone sample. Your big-screen question is its sibling.
- `docs/superpowers/plans/2026-11-15-ui-redesign-design-phase.md`: Global Constraints and Task 5.
- `src/routes/host/display-page.tsx` for what the big screen shows today (lobby QR + join code, question, reveal, leaderboard). Also `src/i18n/en.json` and `server/db/seed-demo.ts` for real copy.

## Your files (in `design/screens/`; every name must start with `big-` so the checker uses 1920×1080)
- `big-lobby.html`: a big QR (placeholder box, clearly a QR), join code DEMO1, the join URL, Rocco greeting, and the teams that have joined.
- `big-round-intro.html`: the incoming host takes over ("Pebble's taking Round 2!").
- `big-question.html`: the question on paper; the host asking; options; a countdown readable from the back of the room.
- `big-locked.html`
- `big-reveal.html`: the correct answer (color + icon + word), the fun fact, and the host cheering.
- `big-leaderboard.html`: 20 teams, with the top teams legible from across the room; 30-character names.
- `big-prizes.html`: places 1–3 and the animals they'll name (avatars), with Rocco cheering.

Spread the hosts: Round 1 Rocco, Round 2 Pebble, Round 3 Dr. June.

## Characters
`<span data-character="hosts/pebble/asking" aria-label="…"></span>` and `animals/<key>` (see README). If the character files aren't drawn yet, placeholders show. Size the slots large.

## Shared rules
- Question text far above 20px: aim for legibility at 10 m.
- Two or three bright colors per screen at most. Green only means correct, red only means incorrect.
- Motion only inside the kit's reduced-motion guard, with no flashing.
- No text in SVGs. Real copy.
- Big screens aren't tapped, but any controls must still be 44px.
- Head as in question-mc.html.
- If you need a component the kit lacks, add it to `design/system/kit-additions/big-screen.css`, link it after kit.css, and list it in your report.

## Check
Run `npm run design:check` from **PowerShell**. Your files must have zero problems; ignore other designers' files. Look at your screenshots in `design/review/shots/` with Read, and iterate until they're polished.

## Rules
- Do NOT commit or git add. Do NOT install packages. Do NOT kill processes by name. Leave any dev server on port 5180 alone. Edit only your files and your kit-additions file.
- If the harness refuses a Write, return the content in your report under its exact path.
- Report: files written, any kit-additions, anything unsure, and your last design:check output.
