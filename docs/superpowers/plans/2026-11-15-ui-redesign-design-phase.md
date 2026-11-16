# UI Redesign, Design Phase: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce the approved visual design for the warm, cozy, cute and character-led redesign: research, a design kit, the host character and animal avatars, and clickable HTML mockups of every player and big-screen state. The React build comes in a second plan, written after user review 2.

**Architecture:**
- **Task 1** builds the design workspace and a mockup checker, `npm run design:check`. It's real code, written test-first.
- **Every task after that** is an agent brief with fixed inputs, fixed output file names and acceptance checks. The checker gives every agent the same automated gate: no raw colors, axe, tap targets, reduced motion.
- **The orchestrator** (the main session) dispatches the agents, verifies each one's outputs, makes all the commits and runs both user reviews.

**Tech Stack:** static HTML/CSS and inline SVG mockups served by Vite. The checker uses Playwright, `@axe-core/playwright`, tsx and Vitest, all already installed, so there are no new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-15-ui-redesign-design.md`

## Global Constraints

- The feel, in every brief, verbatim: **warm, cozy, cute and character-led**. A screen without a character needs a reason.
- Borrow Ahead's feel only. Never trace or near-copy its art, characters, layouts, palette or branding.
- Colors:
  - Every color is a token in `design/system/tokens.css`, which is the only file allowed raw color values.
  - Mockups and SVGs use `var(--color-…)` only.
  - Green means correct and red means incorrect. Correct/incorrect always pairs color with an icon **and** a word.
  - Two or three bright colors per screen at most.
- Sizes: phone mockups are 390×844, big-screen mockups (`big-*.html`) are 1920×1080. Question text is at least 20px, every tap target is at least 44×44px, and there's one primary button per screen.
- Motion is subtle, with no flashing, and stops entirely under `prefers-reduced-motion: reduce`.
- Audio questions show captions by default.
- Every status is clear on every play screen: waiting for host, question live, answers locked, results in.
- Mockup copy is the real English copy. The build moves it into i18n, so no text may be baked into SVGs.
- Text limits come from `shared/api.ts`: nickname 24, team name 30, typed answer 200, animal name 30, animal update 500.
- There's no `live_background` setting and no violet variant. The paper sheet is the one live-question look.
- Character art is the final art, and its quality bar:
  - it reads clearly at 48px and at full big-screen size
  - the host and the animals look like one set
  - expressions are distinct at a glance
- **Agents never commit.** The orchestrator verifies, then commits, so parallel agents don't collide in the git index.
- Work on branch `ui-redesign`, created from `animal-naming`.

## Fixed names (every task uses these)

- **Host expressions:** `greeting`, `asking`, `waiting`, `cheering`, `consoling`, `relaxing`. The files are `design/characters/host/<expression>.svg`.
- **Animal avatar keys:** `penguin-chick`, `giant-pacific-octopus`, `pacific-seahorse`, `moray-eel`, `mystery`. The files are `design/characters/animals/<key>.svg` and `<key>-happy.svg`.
- **Placeholder** until the characters land: `design/characters/placeholder.svg`, a token-colored rounded blob labeled by its `data-character` attribute.
- **Including a character in a mockup:** `<span data-character="host/asking"></span>`. The script `design/system/include.js` fetches `../characters/host/asking.svg`, falls back to the placeholder if that file is missing, and inlines it. It's inlined so the SVG's `var(--color-…)` fills resolve.
- **Character colors** are tokens named `--color-char-*`, in `design/system/tokens.css`.
- **Every mockup's `<head>`** links `../system/tokens.css` and `../system/kit.css` and loads `../system/include.js`. The question prompt element carries `data-role="question"`.

## Review Focus

1. **Longest real text:** a 30-character team name, a 24-character nickname, a 200-character typed answer, and the longest MC option in the demo seed. Expect the layout to wrap without overflowing or covering a character. Every swarm brief requires one stress state per screen that shows names (Tasks 5a–5d).
2. **A 20-team leaderboard on a phone and on the big screen.** Expect your team to stay findable, and the big screen to show the top teams legibly from across the room (Tasks 5c and 5d stress states).
3. **A dim bar:** contrast must hold on the paper and over character art, not just on plain backgrounds. Checked by axe in `design:check` (Task 1 test `reports axe contrast violations`).
4. **Reduced motion:** a character's idle animation must stop entirely. Task 1 test `reports running animations under reduced motion`.
5. **Small tap targets** squeezed in by decoration around paper options. Task 1 test `reports tap targets under 44px`.

---

### Task 1: Design workspace and mockup checker

**Files:**
- Create: `design/README.md`, which holds the folder rules, the fixed names above and how to run the checker
- Create: `design/system/include.js` (character inliner), `design/characters/placeholder.svg`
- Create: `scripts/mockup-rules.ts` (pure rules) and `scripts/check-mockups.ts` (Playwright runner)
- Create: `scripts/mockup-rules.test.ts`, plus fixtures in `scripts/fixtures/mockups/`
- Create: `src/styles/raw-colors.ts`, by moving `findRawColors` and its rules out of `src/styles/no-raw-colors.test.ts` so both checks share it. Add `styles/raw-colors.ts` to that test's `ALLOWED_FILES`.
- Modify: `vitest.config.ts`. Add a third project, `{ name: 'scripts', include: ['scripts/**/*.test.ts'] }`.
- Modify: `package.json`. Add `"design:serve": "vite design --port 5180 --strictPort"` and `"design:check": "tsx scripts/check-mockups.ts"`.
- Modify: `.gitignore`. Add `design/research/**/*.png`, `design/research/**/*.jpg` (third-party screenshots, for reference only) and `design/review/shots/`.

**Interfaces:**
- Produces: `findRawColors(text: string): { line: number; rule: string; match: string }[]` from `src/styles/raw-colors.ts`.
- Produces: in `scripts/mockup-rules.ts`:
  - `viewportFor(file: string): { width: number; height: number }`, which is 1920×1080 when the basename starts with `big-` and 390×844 otherwise.
  - `mockupFiles(root: string): string[]`, which lists every `.html` under `design/` except `design/index.html` and anything in `design/research/`.
  - `scanDesignColors(root: string): { file: string; line: number; match: string }[]`, which scans `.html`, `.css`, `.svg` and `.js` under `design/` and skips `design/system/tokens.css` and `design/research/`.
  - `checkHead(html: string): string[]`, which returns the missing items among the tokens.css link, the kit.css link and the include.js script.
- Produces: `npm run design:check`. It starts Vite on `design/` and, for each mockup at its viewport, does four things:
  1. runs axe (`wcag2a`, `wcag2aa`)
  2. requires every `button, a, input, select, [role=button], [role=radio]` box to be at least 44×44
  3. requires `[data-role=question]` to have a computed `font-size` of at least 20px, where present
  4. with `reducedMotion: 'reduce'`, requires `document.getAnimations().filter(a => a.playState === 'running').length === 0` after 500 ms

  It writes `design/review/shots/<name>.png` and `design/index.html`, a gallery with a link and a screenshot per mockup. It prints `<file>: <problem>` lines and exits 1 on any problem.

- [ ] **Step 1:** Create branch `ui-redesign` from `animal-naming`.
- [ ] **Step 2: Write the failing tests** in `scripts/mockup-rules.test.ts`:
  - `viewportFor('design/screens/big-lobby.html')` equals `{ width: 1920, height: 1080 }`, and `viewportFor('design/screens/lobby.html')` equals `{ width: 390, height: 844 }`.
  - `mockupFiles(fixtures)` includes `screens/ok.html` and excludes `index.html` and `research/x.html`.
  - `scanDesignColors(fixtures)` reports `screens/raw.html` line 3 `#ff0000`, reports nothing for `system/tokens.css`, and reports `characters/raw.svg` `fill="#000"`.
  - `checkHead('<head></head>')` returns all three missing items, and `checkHead` of `screens/ok.html` returns `[]`.
  - The browser checks run as a test over two fixture pages under one Vite server, with a 60 s timeout:
    - `reports axe contrast violations`
    - `reports tap targets under 44px`
    - `reports running animations under reduced motion`
    - `passes a clean page`

    Export `checkPage(page, file): Promise<string[]>` from `scripts/check-mockups.ts` for this.
- [ ] **Step 3:** Run `npx vitest run --project scripts`. Expect FAIL: the modules don't exist yet.
- [ ] **Step 4:** Move `findRawColors` to `src/styles/raw-colors.ts`. Then implement `scripts/mockup-rules.ts`, `scripts/check-mockups.ts`, `design/system/include.js` and the placeholder SVG.
- [ ] **Step 5:** Run `npm test`. Expect every project to pass, including the existing 392 tests.
- [ ] **Step 6:** With an empty `design/screens/`, run `npm run design:check`. Expect exit 0 and a gallery that says "No mockups yet".
- [ ] **Step 7:** Run `npm run typecheck && npm run lint`. Expect both to be clean.
- [ ] **Step 8:** Commit: `Design workspace: mockup checker (axe, tap targets, reduced motion, raw colors) and gallery`.

### Task 2a: Research A, Ahead (agent, parallel with 2b)

**Brief:**
- Study Ahead (`apps.apple.com/us/app/id1570430177`, plus its flows on `screensdesign.com/showcase/ahead-emotions-coach`) in the user's Chrome (`mcp__claude-in-chrome__*`, in a new tab).
- Save every App Store screenshot, plus at least 8 flow screens, to `design/research/ahead/NN-<what>.png`. Download them with curl from the image URLs on the page.
- Write `design/research/ahead/findings.md` with these sections:
  - Palette (observed hues described, not sampled to exact hex)
  - Shape and corners
  - Edges and shadows
  - Type
  - Characters (shape language, line, shading, eyes, expressions, how they guide a step)
  - Cards and layout
  - Rewards and progress
  - Motion (from App Store preview video, if one exists)
  - **What makes it warm, cozy and cute**
  - **What to avoid copying**
- Every claim cites an image file.
- The agent describes style. It produces no art.

**Acceptance (orchestrator):**
- At least 12 images exist.
- Every section exists, and each one cites at least one image.
- `git status` shows no images staged (they're gitignored).
- Commit `findings.md`: `Research: Ahead findings`.

### Task 2b: Research B, paper and characters (agent, parallel with 2a)

**Brief:**
- Use WebSearch and the Playwright MCP, a separate headless browser, so it doesn't collide with 2a's Chrome tab.
- Collect references for:
  - **A paper feel that stays legible on a phone:** grain, deckle or torn edges, punched holes, notepad rules, a pencil or handwritten accent font that is legible at 20px and self-hostable via `@fontsource`.
  - **Warm, cozy, cute character styles that survive at 48px as flat SVG,** with no gradients-for-detail and a limited color count.
- Save the references to `design/research/paper-characters/NN-<what>.png`.
- Write `findings.md` with these sections: Paper treatments (each rated for legibility and how it would hold up at 390px), Fonts (each with its fontsource package name and license), Character styles (what makes each read as cute at small sizes), Recommendations.

**Acceptance:**
- At least 10 images exist, and every font named exists on npm as `@fontsource*`.
- Commit `findings.md`: `Research: paper and character findings`.

### Task 3: Design lead, the kit (agent, after 2a and 2b)

**Inputs:**
- the spec
- both `findings.md` files and their images, which the agent views with Read
- `src/styles/tokens.css`, for its token format
- `src/routes/play/question-screen.tsx` and `answer-choice.tsx`, for what the question screen contains
- `server/db/seed-demo.ts`, for real question copy

**Outputs:**
- **`design/system/tokens.css`:** the same `@theme` and `:root` structure as `src/styles/tokens.css`.
  - The existing token names keep their jobs. New names are allowed, plus the `--color-char-*` tokens.
  - Contrast notes go in comments: every text/background pair it intends, with its ratio. Each must be at least 4.5:1, or at least 3:1 for text 24px and up.
- **`design/system/kit.css`:** the paper sheet, cards, buttons, answer options, status pill, countdown and motion, all as classes. Motion sits inside `@media (prefers-reduced-motion: no-preference)`.
- **`design/system/kit.md`:** the paper treatment spec, components, motion rules, fonts with their fontsource package names, and the character style guide (shape language, line weight, colors, eyes and mouths, how the host and animals share one style).
- **`design/system/host-options.html`:** 2–3 host character options. Each is shown as an inline SVG in `asking` and `cheering`, at 48px and 400px, with one paragraph on who they are.
- **`design/screens/question-mc.html`:** the sample screen. A live MC question from the demo seed, on paper, with the host asking and a working countdown. Options are selectable, and the submitted state toggles.

**Acceptance:**
- `npm run design:check` passes.
- The orchestrator screenshots `question-mc` and `host-options`, and checks them against the quality bar and every Global Constraint.
- Commit: `Design kit: tokens, paper, components, host options, sample question`.

### Task 4: User review 1 (gate)

- [ ] Run `npm run design:serve` and give the user `http://localhost:5180/`, the gallery, plus the two pages to look at.
- [ ] The user picks the host option and approves or redirects the look. Record their decisions verbatim in `design/system/decisions.md`.
- [ ] If they want changes, resume the Task 3 agent (SendMessage) with the decisions. If every host option was rejected, it produces a second round. Repeat until approved.
- [ ] Commit: `Design review 1: decisions`.
- **Nothing in Task 5 starts before the user approves.**

### Task 5: Design swarm (5 agents, in parallel)

**Every brief includes:**
- the Global Constraints and Fixed names
- the approved kit and `decisions.md`
- the rule to use only kit classes and tokens. A missing component is added to `design/system/kit-additions/<agent>.css` and flagged, never written inline.
- the rule to use real demo-seed copy
- one `-stress` state per screen that shows names (Review Focus 1–2)
- clickable flow: `<a>` links follow the game's order, and selections work
- the rule to run `npm run design:check` before reporting

Screen agents use `data-character` keys. These render as placeholders until 5e lands.

| Agent | Files in `design/screens/` |
|---|---|
| **5a Joining** | `landing`, `join-nickname`, `join-team`, `join-team-stress`, `lobby`, `lobby-stress` |
| **5b Paper sheet** | refine `question-mc`; `question-mc-submitted`, `question-true-false`, `question-text`, `question-number`, `question-image`, `question-audio` (captions on), `question-captain-only`, `question-stress` (longest option and prompt), `wager`, `locked`, `reveal-correct`, `reveal-incorrect`, `round-break`, `paused` |
| **5c After the game** | `ended-prizes`, `ended-prizes-stress`, `leaderboard-tonight`, `leaderboard-stress` (20 teams), `leaderboard-season`, `leaderboard-empty`, `rewards`, `redeem-code`, `feedback`, `animals`, `my-animal` (avatar, plus "meet the real one" photo slot, plus staff updates) |
| **5d Big screen** | `big-lobby` (QR, host greeting), `big-question`, `big-locked`, `big-reveal`, `big-leaderboard` (20 teams), `big-prizes` |
| **5e Characters** | `design/characters/host/<6 expressions>.svg`, `design/characters/animals/<5 keys>.svg` and `-happy.svg`, plus `design/system/characters.html`, which shows every character at 48px and 400px on the paper and on the darkest surface |

All file names get `.html` (screens) or `.svg` (characters).

5e also has rules for the SVGs:
- `viewBox="0 0 400 400"`
- fills and strokes only from `var(--color-char-*)` or kit tokens
- no `<text>`
- a `<title>` set from the species or expression, for screen readers

**Acceptance (orchestrator, per agent):**
- Every listed file exists.
- `npm run design:check` passes.
- Screenshots match the kit.
- Any `kit-additions` file has been reviewed.

Commit each agent's set separately, e.g. `Design: joining screens`. After 5e lands, run `design:check` again so every screen renders the real characters. Then merge the reviewed `kit-additions` into `kit.css` and commit.

### Task 6: Consistency review (agent)

**Brief:**
- View every screenshot in `design/review/shots/` against the kit and `decisions.md`.
- Check:
  - corners, edges and the paper treatment
  - a character on every screen, or a stated reason
  - host expression fits the moment
  - bright-color count
  - one primary button
  - status clarity
  - the correct/incorrect rule
  - phone and big screen feel like one product
  - stress states hold
- Write `design/review/consistency.md`: one line per finding, with file, problem, fix and owner (5a–5e).

**Then:**
- The orchestrator resumes each owning agent with its findings (SendMessage).
- They fix, and `design:check` passes.
- Commit: `Design: consistency fixes`.

### Task 7: User review 2 (gate)

- [ ] Serve the gallery, and give the user the URL and the list of screens.
- [ ] Record their decisions in `decisions.md`. Route changes to the owning agents, and repeat until the user approves.
- [ ] Commit: `Design review 2: approved`.
- [ ] Next: write the build plan (superpowers:writing-plans). It covers:
  - porting the tokens, kit and characters into `src/`
  - the `avatar` schema change, in plan mode
  - removing `live_background`
  - the staff avatar select
  - re-theming the host console and staff pages
  - rebuilding each screen against its `design/screens/` reference at 390px
