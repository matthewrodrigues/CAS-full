# UI redesign: progress log and resume guide

**Read this first when resuming.** It's the single source of truth for where the design phase stands. Update it, and commit, every time a task changes state.

- Plan: `docs/superpowers/plans/2026-11-15-ui-redesign-design-phase.md`
- Spec: `docs/superpowers/specs/2026-11-15-ui-redesign-design.md`
- User decisions (binding): `design/system/decisions.md`
- Agent briefs, for re-launching: `design/briefs/`
- Branch: `ui-redesign` (off `animal-naming`). Local only, never pushed. Don't push, merge or deploy without asking the user.

## Status

| Task | State | Commit / notes |
|---|---|---|
| 1 Workspace + `design:check` | ✅ done | 716364d |
| 2a Research: Ahead | ✅ done | 827d8c5 (`design/research/ahead/findings.md`; images local, gitignored) |
| 2b Research: paper + characters | ✅ done | 5d04f9d |
| 3 Design lead: kit | ✅ done | 9c62aa8 (tokens, kit.css, kit.md, host-options, question-mc) |
| 4 User review 1 | ✅ done | bfa5d22, 0db24cc. Rocco is the main host; 3 hosts rotate by round (Random default, no repeats); tap then send with a 5 s nudge; look approved |
| 5a Joining | ⏳ dispatched 2026-11-15 | brief `design/briefs/5a-joining.md` |
| 5b Paper sheet | ⏳ dispatched 2026-11-15 | brief `design/briefs/5b-paper.md` |
| 5c After the game | ⏳ dispatched 2026-11-15 | brief `design/briefs/5c-after.md` |
| 5d Big screen | ⏳ dispatched 2026-11-15 | brief `design/briefs/5d-big-screen.md` |
| 5e Characters | ⏳ dispatched 2026-11-15 | brief `design/briefs/5e-characters.md` |
| 5 wrap-up | ☐ | after 5e: rerun check with the real art; merge reviewed `design/system/kit-additions/*.css` into kit.css |
| 6 Consistency review | ☐ | plan Task 6 |
| 7 User review 2 | ☐ | then write the build plan (superpowers:writing-plans) |

## How to resume after an interruption

Background agents die with the session. Rebuild from what's on disk:

1. `git status` and `git log --oneline -15` on `ui-redesign`. Uncommitted files under `design/` are a dispatched agent's partial or finished work.
2. For each ⏳ task, compare its file list (in its brief) with what exists:
   - **All files exist:** run `npm run design:check` from **PowerShell** (Git Bash breaks vitest/tsx path casing). Look at the screenshots in `design/review/shots/`, then commit that set and mark it ✅ here.
   - **Some or none exist:** re-dispatch an agent with the brief file's content. Add one line: "Some files already exist from an interrupted run; review and finish them rather than starting over."
3. The orchestrator commits; agents never do. Subagents can't write report-style files (findings) and may return content in their report instead. Save it to the path they name.
4. The gallery server: `npm run design:serve` (port 5180), run in the background. The user reviews at http://localhost:5180/.

## Lessons from earlier runs

- Run vitest, tsx and `design:check` from PowerShell, not Git Bash.
- A research agent ran `taskkill /F /IM python.exe`. Every brief now forbids killing processes by name.
- Vite serves `index.html` (with a 200) for missing files, so `include.js` only accepts SVG responses. That's tested.
- The comparison mockups made for the tap-then-send decision were throwaway and have been deleted.

## Log

- 2026-11-15: Tasks 1–4 done. Swarm 5a–5e dispatched in parallel.
