You are merging four designers' kit additions into the shared design kit for NightLife Trivia (a warm, cozy, cute and character-led mobile trivia game). This is Task 6, phase 1. Phase 2 agents will fix screens on top of your merged kit, so be exact.

Work in c:\dev\CAS\nightlife-trivia (branch `ui-redesign`).

## Read
- `design/README.md`
- `design/system/decisions.md`, including the "Provisional defaults" section, which is binding for now
- `design/review/consistency.md`: section 2 (the Kit merge plan) is your spec. Also every finding whose owner is `kit`.
- `design/system/kit.css`, `kit.md`, `tokens.css` and all of `design/system/kit-additions/*.css`

## Do
1. Apply section 2 exactly:
   - merge the listed classes into `kit.css`
   - unify the duplicates under the names it gives
   - apply the renames
   - drop what it says to drop
   - apply the fixes to existing kit rules
   - add the new pieces: `.pill--paused` (status word "Paused by the host", with a pause icon) and a wager status "Place your wager" (choose a pill variant consistent with the kit's other states), plus the bigger live dot on the big screen
2. Every finding with owner `kit` must be resolved in kit.css.
3. **Update every mockup in `design/screens/` and `design/system/*.html` that uses a renamed or dropped class**, so nothing breaks. Use grep to find every use. Change only class names and the kit-additions `<link>` tags. Don't change layout or copy; that's phase 2.
4. When every class from a kit-additions file lives in kit.css, delete that file and remove its `<link>` from every page. If some class truly belongs to one area only, it may still move into kit.css; prefer one kit.
5. Update `kit.md` so every new or renamed class is documented (what it is, when to use it). Update the status-word section with the two new words.
6. Run `npm run design:check` from **PowerShell** (not Git Bash). It must pass with zero problems. Look at a sample of screenshots from each area (at least 2 per area, plus the big screen) with Read, to confirm nothing visibly broke.

## Rules
- Tokens only (no raw colors outside tokens.css). Motion only inside the kit's reduced-motion guard.
- Do NOT commit or git add. Do NOT install packages. Do NOT kill processes by name.
- If the harness refuses a Write, return the content in your report under its exact path.
- Report: what merged, renamed, dropped and fixed; the final list of kit classes added; the files touched; and your last design:check output line.
