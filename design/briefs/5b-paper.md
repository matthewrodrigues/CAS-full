You are one of five designers redesigning NightLife Trivia, a mobile web trivia game played in a loud, dim bar at Thursday NightLife at the California Academy of Sciences. The feel: **warm, cozy, cute and character-led**, and a host character guides every step. Your area is **5b: the paper answer sheet**, the heart of the game: every question type and the moments around it. Four other designers are building other areas from the same kit at the same time, so stick to the kit exactly.

Work in c:\dev\CAS\nightlife-trivia (branch `ui-redesign`).

## Read first
- `design/README.md`.
- `design/system/decisions.md`. It's binding:
  - **tap, then send:** a tap circles the answer on your own sheet, and "That's our answer!" sends it for the team, which can change and resend until the lock
  - a 5-second nudge if the circled answer isn't sent
  - three hosts rotate by round: Rocco, Pebble and Dr. June
  - the round break introduces the incoming host
- `design/system/kit.md`, `kit.css` and `tokens.css`: use ONLY kit classes and tokens.
- `design/screens/question-mc.html`: the approved sample, which you own now.
- `docs/superpowers/plans/2026-11-15-ui-redesign-design-phase.md`: Global Constraints and Task 5.
- For what each state must show, read `src/routes/play/`: question-screen, answer-choice, answer-text, question-media, wager-screen, locked-screen, reveal-screen, round-break-screen, paused-banner, result-badge. Also `src/components/countdown.tsx`, `src/i18n/en.json`, and `server/db/seed-demo.ts` for real questions, the fun facts and the 4 rounds. Use real seed copy.

## Your files (in `design/screens/`)
- Refine `question-mc.html`. Switch its inline Rocco symbols to `data-character` spans so it uses the shared character files.
- `question-mc-submitted.html`
- `question-mc-nudge.html`: 5 seconds left, an answer circled but not sent. The host nudges warmly, with the urgent timer.
- `question-true-false.html`
- `question-text.html`: typed answer, max 200 characters.
- `question-number.html`: closest number.
- `question-image.html`
- `question-audio.html`: captions shown by default.
- `question-captain-only.html`: a non-captain sees the sheet read-only.
- `question-stress.html`: the longest prompt and longest options from the seed, or longer.
- `wager.html`: the final wager, on the torn-edge paper.
- `locked.html`: answers locked, on the torn edge.
- `reveal-correct.html` and `reveal-incorrect.html`: color + icon + word; the fun fact; the host cheering or consoling (warm, never mocking).
- `round-break.html`: introduces the incoming host, e.g. "Pebble's taking Round 2!", with the host greeting.
- `paused.html`

Spread the hosts across the rounds so all three appear: Round 1 Rocco, Round 2 Pebble, Round 3 Dr. June, final Rocco. Match each screen's round to its host.

## Characters
`<span data-character="hosts/pebble/asking" aria-label="…"></span>` (see README). If the character files aren't drawn yet, placeholders show. That's expected.

## Shared rules
- Phone at 390×844.
- The question element gets `data-role="question"` and is at least 20px.
- One primary button. Two or three bright colors per screen at most. Green only means correct, red only means incorrect.
- 44px tap targets. Motion only inside the kit's reduced-motion guard.
- No text in SVGs. Real copy, warm and first-person buttons.
- Clickable: options circle, send works, links between states.
- Head as in question-mc.html.
- If you need a component the kit lacks, add it to `design/system/kit-additions/paper.css`, link it after kit.css, and list it in your report.

## Check
Run `npm run design:check` from **PowerShell**. Your files must have zero problems; ignore other designers' files. Look at your screenshots in `design/review/shots/` with Read, and iterate until they're polished.

## Rules
- Do NOT commit or git add. Do NOT install packages. Do NOT kill processes by name. Leave any dev server on port 5180 alone. Edit only your files and your kit-additions file.
- If the harness refuses a Write, return the content in your report under its exact path.
- Report: files written, any kit-additions, anything unsure, and your last design:check output.
