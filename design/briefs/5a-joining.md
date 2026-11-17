You are one of five designers redesigning NightLife Trivia, a mobile web trivia game played in a loud, dim bar at Thursday NightLife at the California Academy of Sciences. Players scan a QR code, pick a nickname, join a team and wait in the lobby. The feel: **warm, cozy, cute and character-led**. A character guides every step, and a screen without one needs a stated reason. Your area is **5a: joining**. Four other designers are building other areas from the same kit at the same time, so stick to the kit exactly. That's what keeps the app consistent.

Work in c:\dev\CAS\nightlife-trivia (branch `ui-redesign`).

## Read first
- `design/README.md`: folder rules, fixed names, the checker.
- `design/system/decisions.md`: the user's binding decisions. Rocco the raccoon is the main host, three hosts rotate by round, and answering is tap then send.
- `design/system/kit.md`, `kit.css` and `tokens.css`: use ONLY kit classes and tokens.
- `design/screens/question-mc.html`: the approved sample. Match its quality, structure and head.
- `docs/superpowers/plans/2026-11-15-ui-redesign-design-phase.md`: Global Constraints and Task 5.
- For what each screen must do: `src/routes/landing.tsx`, `src/routes/play/join-screen.tsx`, `team-screen.tsx`, `lobby-screen.tsx`, `use-join.ts`, `src/routes/staff/staff-page.tsx` (the event settings section), and `src/i18n/en.json` (current copy, which you may make warmer). The demo event is DEMO1, "Deep Sea Night" (`server/db/seed-demo.ts`).

## Your files (in `design/screens/`)
- `landing.html`: the start page.
- `join-nickname.html`: pick a nickname, max 24 characters.
- `join-team.html`: create a team (name max 30) or join an existing one.
- `join-team-stress.html`: the longest names (a 30-character team name, 24-character nicknames) and many existing teams.
- `lobby.html`: waiting for the host to start; your team and teammates; Rocco greeting.
- `lobby-stress.html`: a 30-character team name and 8 teammates with 24-character nicknames.
- `staff-round-hosts.html`: the staff event-settings control for each round's host. Show 4 rounds, each with Rocco / Pebble / Dr. June / Random, defaulting to Random, with a small avatar per choice and one save button. Staff pages are a tool, so keep it calm and simple, but on the kit.

## Characters
Place them with `<span data-character="hosts/rocco/greeting" aria-label="…"></span>` (see README). If the character files aren't drawn yet, placeholders show. That's expected; size the slots well.

## Shared rules
- Phone at 390×844.
- Real English copy, warm and first-person in buttons (kit.md copy voice).
- One primary button per screen.
- Two or three bright colors per screen at most.
- Green only means correct, and red only means incorrect.
- Text at least 20px for questions, 44px tap targets.
- Motion subtle and only inside the kit's reduced-motion guard.
- No text inside SVGs.
- Clickable flow: `<a>` links follow the real order (landing → nickname → team → lobby). Inputs work. A tiny inline script is fine for mockup behavior.
- Head: copy question-mc.html's head (tokens.css, kit.css, include.js).
- If you need a component the kit lacks, add it to `design/system/kit-additions/joining.css`, link it from your pages after kit.css, and list it in your report. Never write styles inline beyond a one-off size.

## Check
Run `npm run design:check` from **PowerShell** (not Git Bash). Your files must have zero problems; problems in other designers' files aren't yours, so ignore them. Look at your screenshots in `design/review/shots/` with Read, and iterate until they're polished and consistent with question-mc.

## Rules
- Do NOT commit or git add. Do NOT install packages. Do NOT kill processes by name. Leave any dev server on port 5180 alone. Don't edit files outside your list, except your kit-additions file.
- If the harness refuses a Write, return the file's full content in your report under its exact path.
- Report: files written, any kit-additions and why, anything unsure, and your last design:check output.
