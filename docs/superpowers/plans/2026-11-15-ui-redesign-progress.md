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
| 5a Joining | ✅ done | see log; 7 screens + `kit-additions/joining.css` |
| 5b Paper sheet | ✅ done | 0b8f621, 16 screens + `kit-additions/paper.css` |
| 5c After the game | ✅ done | 11 screens + `kit-additions/after.css` (adds the 4-tab bar) |
| 5d Big screen | ✅ done | 7 screens + `kit-additions/big-screen.css` |
| 5e Characters | ✅ done | 8f4b934, 28 SVGs + `system/characters.html`; generators in `design/characters/_src/` |
| 5 wrap-up | ◐ | full check passes on 43 pages with the real art. Kit-additions merge is folded into Task 6 (the reviewer writes the merge plan) |
| 6 Consistency review | ✅ done | 7060586 review; d797c30 kit merge; 4ebe3bd and the next commit fixes. design:check 43/43 |
| 7 User review 2 | ✅ approved 2026-11-16 | defaults stand (decisions.md). Next: build plan via superpowers:writing-plans |

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
- 2026-11-15: 5a done and committed. README fixed: labeled character spans need `role="img"` (axe).
- 2026-11-15: 5c done and committed. For Task 6: the tab bar (Play/Leaderboard/Rewards/Animals) exists only in 5c screens, so check whether 5a/5b screens need it. Made-up copy to confirm at review 2: prize "NightLife tote bag", code format, keeper update author line.
- 2026-11-15: 5d done and committed. For the wrap-up: big-screen.css has kit FIXES to fold into kit.css (bubble flex in hero stage, list-row ink on night, aria-disabled options, locked pill outline on night, paper tape/fold at big scale). The join URL on big-lobby is a placeholder (real one comes from PUBLIC_URL).
- 2026-11-15: 5b and 5e done. All five swarm areas committed; design:check passes 43/43. Task 6 reviewer dispatched. Screen generators saved in `design/screens/_src/`.
- 2026-11-15 (evening): the Task 6 reviewer hit the 5-hour usage limit before writing consistency.md. Resumed it after the reset (its transcript is kept). If it fails again, re-dispatch from `design/briefs/6-consistency.md`.
- 2026-11-16: Task 6 review done: 24 findings, 5e clean. The 4 user questions get provisional defaults (in decisions.md), to be asked at review 2. Phase 1 (kit merge) dispatched.
- 2026-11-16: phase 1 (kit merge) done and committed; all kit-additions are now in kit.css. Phase 2 dispatched as 4 parallel fixers. Area lines appended to 6c-fixes.md: 5a = landing, join-*, lobby*, staff-round-hosts; 5b = question-*, wager, locked, reveal-*, round-break, paused; 5c = ended-*, leaderboard-*, rewards, redeem-code, feedback, animals, my-animal; 5d = big-*. Special: 5d must switch big-prizes to char--96 (kit call on finding 9).
- 2026-11-16: Task 6 done; every finding fixed, plus 3 small kit tweaks (picked team initial in pen, big-screen check/lightbulb scale, lone top-row note on the right). Review 2 started with the user.
- 2026-11-16: the user approved review 2. Writing the build plan.
- 2026-11-16: the user says the only prize is naming an animal, so prize codes are removed from the mockups (redeem-code deleted), and the placeholder animal names stay. Build plan written: `docs/superpowers/plans/2026-11-16-ui-redesign-build.md`.
- 2026-11-16: BUILD started (subagent-driven, parallel waves in worktrees). **The build ledger is `.superpowers/sdd/2026-11-16-ui-redesign-build/progress.md`** (git-ignored): waves, rulings, agent IDs, per-task status. Resume from it. Wave A (T1, T2, T5) dispatched.
- 2026-11-17: build status: T1, T2, T3, T5, T6 merged into ui-redesign (e2e 28/28). T4 and T7 were interrupted by the usage limit and resumed. Details are in the build ledger.
- 2026-11-17: T4 (per-round hosts) merged, so 6 of 12 build tasks are in (T1–T6). Ruling: the final wager counts as started for host changes. Watch item: simulate.test flakes only under parallel load (passes alone). T7 is in progress (24 files changed, uncommitted). Next: T7 review/merge, then T8–T11 in parallel, then T12 and the final review.
- 2026-11-17: T7 merged (7 of 12 build tasks in); T4+T7 integration fix f518a2e; unit 524/524, e2e 32/32, typecheck green. Wave D (T8 paper sheet, T9 after-game, T10 big screen, T11 host/staff) dispatched in parallel worktrees.
- 2026-11-17 check: Wave D (T8–T11) mid-build in their worktrees, nothing committed yet. 7 of 12 build tasks merged.
- 2026-11-17 (before a usage-limit stop): **to resume the build, read `.superpowers/sdd/2026-11-16-ui-redesign-build/RESUME.md`** (git-ignored, on disk). It lists the in-flight Wave D agents (T8–T11), their worktrees, ports and briefs, and the exact next steps. T1–T7 are merged on ui-redesign.
- 2026-11-17 (after the limit reset): all four Wave D agents (T8–T11) were interrupted mid-task and have been resumed. RESUME.md in the build ledger folder still applies if this stops again.
- 2026-11-17: T10 (big screen) and T11 (host/staff, round hosts) reviewed and merged: 9 of 12 build tasks in; unit 533/533, typecheck clean. T8 and T9 are still building. Full e2e to run once they finish.
- 2026-11-17: all four Wave D tasks built. T10 and T11 merged (e2e 37/37 on the merged branch, idle machine). T8 and T9 reviewed: each in fix round 1 (T8: reveal tone, dead branch, Countdown on the big screen, and it merges ui-redesign into its branch; T9: leaderboard-stress jump row and the season leaderboard with a new server route). Then: re-reviews, merges, T12, final review.
- 2026-11-17 (evening): the usage limit interrupted the T8 and T9 fix rounds; both resumed from their on-disk work. Next: re-reviews, merges, T12, final review.
- 2026-11-17: T8 (837c87a) and T9 (36fbc8b) fix rounds done; scoped re-reviews running for both. Then merge both, full test run, T12, final review.
- 2026-11-17: T8 re-review clean; merged (daf5667). 10 of 12 build tasks in. T9 re-review still running.
- 2026-11-17: T9 re-review clean; merged (68b1985) plus integration fix 409f159. **11 of 12 build tasks in.** Merged branch: unit 572/572, e2e 46/46, typecheck clean. Next: T12 whole-app verification, then the final review.
- 2026-11-17: T12 under way. All 40 mockups have a built capture; four agents compared them (9 match, 19 data-only differences, 12 screens with real differences = 8 fixes F1-F8). SPEC section 7 rewritten (fc34fce). A fix agent is making F1-F8 on ui-redesign. The compare doc is drafted (uncommitted until the fixes land): docs/superpowers/plans/2026-11-16-ui-redesign-build-compare.md. The build ledger has the F-list. Next: verify fixes, commit 'Redesign build verified', final whole-branch review.
- 2026-11-17: **T12 done: all 12 build tasks complete.** Eight mockup differences fixed (9f7e63e), a countdown bug fixed (could show 21 on a 20 s question). Final state: typecheck clean, unit 583/583, e2e 46/46. Compare doc: docs/superpowers/plans/2026-11-16-ui-redesign-build-compare.md. Next: the final whole-branch review, then ask the user about merge/deploy.
- 2026-11-17: the final whole-branch review is running (two reviewers: server half, client half) at 319630f. On findings: one fix round, one re-review. Then ask the user about merge/deploy.
- 2026-11-17 (after the limit reset): both final reviewers were interrupted by the usage limit and have been resumed.
- 2026-11-17: final review done: no Critical findings in either half. Six Important ones: the stale host flash at round changes (the live update lacks cast/rounds); a broken walkthrough script; zero-point teams shown as prize winners on phones; a host 'handing over' to themselves; teammates can't see a sent typed/number answer or wager; two FieldError components. One fix agent is making them plus cheap minors. Then one re-review, then ask the user about merge/deploy. Reports: final-review-A/B-report.md in the build ledger folder.
