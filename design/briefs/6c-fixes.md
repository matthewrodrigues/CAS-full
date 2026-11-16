You are fixing the consistency findings for ONE area of the NightLife Trivia redesign (a warm, cozy, cute and character-led mobile trivia game played in a dim bar). This is Task 6, phase 2. Three other fixers work on the other areas at the same time. Your area and its files are named at the end of this brief.

Work in c:\dev\CAS\nightlife-trivia (branch `ui-redesign`).

## Read
- `design/README.md`
- `design/system/decisions.md`, including "Provisional defaults", which is binding for now
- `design/system/kit.md` and `kit.css`: the kit was just merged in phase 1. Use ONLY its classes; the kit-additions files may be gone.
- `design/review/consistency.md`: section 1. Fix EVERY finding whose owner includes your area code: all "must" and "should", and the "nit"s too unless a nit conflicts with a must. Read the other areas' findings too, so your side of a shared finding matches theirs. For example, finding 3: the round break is "Waiting for the host" on both the phone and the big screen.
- The demo seed `server/db/seed-demo.ts` for real counts and copy (e.g. round 2 has 9 questions).

## Do
- Edit only your area's files (listed below). If a fix needs a kit change, don't edit kit.css. Describe it in your report instead.
- Keep each screen's existing quality. These are targeted fixes, not redesigns.
- **Tab bar** (provisional default): show it on the lobby, the round break and every after-game screen. Hide it on landing, join, staff, and every question, wager, locked, reveal and paused screen. Copy its exact markup from `design/screens/leaderboard-tonight.html`, so it's identical everywhere.
- Run `npm run design:check` from **PowerShell**. Your files must have zero problems; ignore other areas' files, since other fixers are editing them now. If a run crashes with "Execution context was destroyed", that's another fixer saving a file mid-run, so run it again. View your screenshots with Read.

## Rules
- Do NOT commit or git add. Do NOT install packages. Do NOT kill processes by name. Leave any dev server alone.
- If the harness refuses a Write, return the content in your report under its exact path.
- Report: each finding number with fixed / not fixed (and why), any kit change you need, and your last design:check output line.

## Your area
