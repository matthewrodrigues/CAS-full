# UI Redesign, Build Phase: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the approved design (`design/`) into the real app. That means:
- the new look and characters on every player screen and the big screen
- three hosts that rotate by round
- tap, then send
- animal avatars
- `live_background` removed
- the host console and staff pages re-themed

**Architecture:**
- **The look.** The design kit is plain CSS classes, ported as-is into `src/styles/kit.css`, with its tokens in `src/styles/tokens.css`. React screens render the same markup as the mockups. Characters are the approved SVG files, inlined by one `<Character>` component, so their `var(--color-char-*)` fills resolve.
- **Hosts.** Each round stores its host choice and, once picked, its resolved host. The server resolves it lazily and only once, so a reconnect never re-rolls it, and it sends the current and incoming host in `GameView.cast`.
- **Tap, then send** is client-only. The server already accepts a final submission at any time before the lock.

**Tech Stack:** React + Vite + TypeScript, Tailwind v4 + plain kit CSS, TanStack Query, Zustand, react-i18next; Hono, Drizzle + SQLite, zod; Vitest, Playwright + axe.

**Spec:**
- `docs/superpowers/specs/2026-11-15-ui-redesign-design.md`
- the binding decisions in `design/system/decisions.md`
- the visual references `design/screens/*.html` (screenshots in `design/review/shots/` after `npm run design:check`)
- the kit guide `design/system/kit.md`

## Global Constraints

- CLAUDE.md hard rules all apply. In particular:
  - no raw colors outside `src/styles/tokens.css`
  - every user-visible string goes through i18n, **including every host line and button**
  - schema changes only in `server/db/schema.ts` plus a generated migration (`npm run db:generate`)
  - game rules live in `server/game/`
  - zod on every input, and role checks on every route
- Definition of done per screen: tests pass, axe passes, and the screen matches its `design/screens/<name>.html` reference **at 390px** (the big screen at 1920×1080).
- Run Vitest, tsx and Playwright from **PowerShell**. Git Bash's `C:/` path casing breaks Vitest.
- **New dependencies need the user's approval before installing.** The only ones this plan adds are `@fontsource-variable/fredoka`, `@fontsource-variable/nunito` and `@fontsource-variable/shantell-sans`, replacing `@fontsource-variable/figtree` and `@fontsource-variable/fraunces` (Task 1, gated).
- Fixed names, verbatim:
  - hosts: `rocco`, `pebble`, `june`
  - host choices: `random`, `rocco`, `pebble`, `june`
  - expressions: `greeting`, `asking`, `waiting`, `cheering`, `consoling`, `relaxing`
  - animal avatars: `penguin-chick`, `giant-pacific-octopus`, `pacific-seahorse`, `moray-eel`, `mystery`
- Status words, verbatim (kit.md §16):
  - "Waiting for the host"
  - "Question live"
  - "Answers locked"
  - "Results are in"
  - "Paused by the host"
  - "Place your wager"
- Random host: picked when the round is first shown, never the previous round's host. The default choice is `random`. A round's host can change only before that round's first question opens.
- Tap, then send:
  - a tap circles an answer on this phone only
  - "That's our answer!" sends it for the team
  - the team can change and resend until the lock
  - at 5 seconds left, a circled answer that isn't the team's sent answer triggers the host nudge
- The tab bar shows on the lobby, the round break and every after-game screen. It's hidden on landing, join, and every question, wager, locked, reveal and paused screen.
- No `live_background` anywhere, and no violet variant.
- **The only prize is naming an animal** (user, 2026-11-16). There are no prize codes on any player screen. The server's code-redemption engine and the staff redeem pages stay as they are (re-themed only). Placeholder animal copy ("Professor Wiggles", locations, keeper updates) stays, also the user's decision.

## Review Focus

1. **Reconnecting mid-round** must show the same host. A random host is stored once, never re-rolled. Covered by Task 4 test `ensureRoundHost is stable across calls`.
2. **Changing a round's host while its intro is on screen** updates every phone and the big screen at once, but is refused once its first question has opened. Covered by Task 4 tests `set_round_host updates the incoming host during the round break` and `set_round_host refuses a started round`.
3. **A teammate sends a different answer while I have one circled.** My sheet shows the team's sent answer ("sent!") and keeps my circle, and my button reads "Send this one instead". Covered by Task 6 test `keeps my circle when a teammate sends another answer`.
4. **The nudge never fires after the lock**, or when my circle already matches the team's sent answer. Covered by Task 6 tests on `shouldNudge`.
5. **Existing events whose stored settings still contain `live_background`** load without error. Covered by Task 5 test `parseSettings ignores a stored live_background`.

---

### Task 1: Foundation: tokens, kit CSS, fonts (gated on font approval)

**Files:**
- Modify: `src/styles/tokens.css`. Replace its values with `design/system/tokens.css`'s `@theme`, `:root` shadcn mapping and `@theme inline` blocks. Drop the design file's duplicate plain-`:root` value block, since Tailwind emits `@theme` variables itself.
- Create: `src/styles/kit.css`, ported from `design/system/kit.css`, without its font `@import url(...)` lines.
- Modify: `src/index.css`. Import `./styles/kit.css` after tokens.
- Modify: `src/main.tsx`. Import the three new fonts instead of figtree and fraunces.
- Modify: `package.json` (dependencies).
- Modify: `src/styles/no-raw-colors.test.ts`. Also scan `.svg` files under `src/`.

**Interfaces:** Produces every kit class (`.screen`, `.paper`, `.option`, `.pill--*`, `.stage`, `.bubble`, `.btn`, `.tabbar`, `.list-row`, `.card`, `.big`, …) and the token names from `design/system/tokens.css` for all later tasks.

- [ ] **Step 1:** Ask the user to approve installing the three fonts and removing figtree and fraunces. Stop if they decline.
- [ ] **Step 2:** Add a test to `src/styles/no-raw-colors.test.ts`: `it('scans svg files too')`. Write a temp fixture string `'<rect fill="#000"/>'` through `findRawColors` and assert the guard's file filter includes `.svg`. Run `npx vitest run src/styles`. Expect FAIL.
- [ ] **Step 3:** Extend `SCANNED_EXTENSIONS` to `/\.(ts|tsx|css|svg)$/`. Port tokens and kit, swap the fonts (`npm install` the three, `npm uninstall` the two), and update `main.tsx` and `index.css`.
- [ ] **Step 4:** Run `npm test`, `npm run typecheck` and `npm run lint`. Expect all to pass.
- [ ] **Step 5:** Run `npm run e2e`. Expect it to pass: no markup has changed yet, only styles. Any axe contrast failure here means a token mapping is wrong. Fix it in tokens.css.
- [ ] **Step 6:** Commit: `Redesign foundation: tokens, kit CSS, Fredoka/Nunito/Shantell`.

### Task 2: `<Character>` and the art

**Files:**
- Create: `src/assets/characters/hosts/<host>/<expression>.svg` and `src/assets/characters/animals/<key>[-happy].svg` (copied from `design/characters/`, 28 files).
- Create: `src/components/character.tsx` and `src/components/character.test.tsx`.
- Create: `shared/characters.ts`.

**Interfaces:**
- Produces in `shared/characters.ts`:
  - `HOSTS = ['rocco','pebble','june'] as const`, `type Host`
  - `HOST_CHOICES = ['random', ...HOSTS] as const`, `type HostChoice`
  - `EXPRESSIONS` (the 6), `type Expression`
  - `ANIMAL_AVATARS` (the 5), `type AnimalAvatar`
- Produces `Character({ name, size, label }: { name: CharacterName; size: 48 | 64 | 96 | 128 | 160 | 240 | 400; label?: string }): JSX.Element` in `src/components/character.tsx`, where ``type CharacterName = `hosts/${Host}/${Expression}` | `animals/${AnimalAvatar}` | `animals/${AnimalAvatar}-happy` ``.
  - It renders `<span class="char char--{size}">` with the inlined SVG.
  - With `label`, the span gets `role="img"` and `aria-label`, and the SVG is `aria-hidden`. Without it, the whole thing is `aria-hidden`.
- Produces `hostCharacter(host: Host, expression: Expression): CharacterName` and `animalCharacter(avatar: AnimalAvatar, happy?: boolean): CharacterName`.

- [ ] **Step 1: Write failing tests in `character.test.tsx`:**
  - `it.each(every CharacterName)('has art for %s')`: the glob map has the key, and the SVG starts with `<svg` and contains `<title>`.
  - `it('labels a meaningful character')`: render `name="hosts/rocco/asking" label="Rocco asks"`, and expect `getByRole('img', { name: 'Rocco asks' })`.
  - `it('hides a decorative character')`: no `label`, and no `img` role is exposed.
- [ ] **Step 2:** Run `npx vitest run src/components/character.test.tsx`. Expect FAIL (no module). If the client test project has no DOM environment, give this file `// @vitest-environment jsdom`. jsdom ships with Vitest's deps; check before adding anything.
- [ ] **Step 3:** Implement it with `import.meta.glob('../assets/characters/**/*.svg', { query: '?raw', import: 'default', eager: true })`, inlined through `dangerouslySetInnerHTML`. The files are our own static art; note that in a comment.
- [ ] **Step 4:** Run `npm test`. Expect it to pass.
- [ ] **Step 5:** Commit: `Character component and final art`.

### Task 3: Animal avatars (server + staff select)

**Files:**
- Modify: `server/db/schema.ts`. Add `animals.avatar`: `text('avatar', { enum: ANIMAL_AVATARS }).notNull().default('mystery')` with a check constraint.
- Generate: a new migration (`npm run db:generate`).
- Modify:
  - `shared/game.ts`: add `avatar: AnimalAvatar` to `AnimalInfo`
  - `shared/api.ts`: add `avatar: z.enum(ANIMAL_AVATARS).default('mystery')` to `StaffCreateAnimalInput`
  - `server/game/animals.ts` (select and insert the avatar)
  - `server/db/seed-demo.ts` (the four demo animals get their keys)
- Modify: `src/routes/staff/staff-page.tsx`. Add an avatar `<select>` to the add-animal form, showing a 48px `<Character>` preview of the choice.
- Test: `server/tests/animals.test.ts`, `server/tests/schema.test.ts`.

**Interfaces:**
- Consumes `ANIMAL_AVATARS` (Task 2).
- Produces `AnimalInfo.avatar` for Tasks 9 and 10.

- [ ] **Step 1:** Write failing tests:
  - `animals.test.ts`: `it('stores the avatar staff choose')` creates an animal with `avatar: 'moray-eel'` and expects `animal.avatar` to be `'moray-eel'`.
  - `it('defaults a new animal to the mystery avatar')`.
  - `it('rejects an unknown avatar')`: 400 on `avatar: 'shark'`.
  - `schema.test.ts`: `it('seeds the demo animals with their avatars')` expects the penguin chick → `penguin-chick` and so on.
- [ ] **Step 2:** Run `npx vitest run server/tests/animals.test.ts server/tests/schema.test.ts`. Expect FAIL.
- [ ] **Step 3:** Implement the column, the migration, the types, the route and the seed.
- [ ] **Step 4:** Run `npm test`. Expect it to pass.
- [ ] **Step 5:** Add the staff select. Then run `npm run e2e -- rewards` and expect it to pass.
- [ ] **Step 6:** Commit: `Animal avatars: schema, API, seed, staff picker`.

### Task 4: Per-round hosts (game engine, plan mode)

Enter plan mode first, per CLAUDE.md, since this changes the schema and the game engine.

**Files:**
- Modify: `server/db/schema.ts`. Add to `rounds`:
  - `hostChoice: text('host_choice', { enum: HOST_CHOICES }).notNull().default('random')`
  - `host: text('host', { enum: HOSTS })` (nullable; null until resolved)

  Both get check constraints. Then generate the migration.
- Create: `server/game/hosts.ts`.
- Modify:
  - `server/game/flow.ts`: `open()` calls `ensureRoundHost` for the question's round; `next()` calls it for the **next** round when moving to `round_break`
  - `server/game/state.ts`: `getState` adds `cast`
  - `shared/game.ts`
  - `shared/api.ts`: `SetRoundHostInput = z.object({ event_id: id, round_id: id, host_choice: z.enum(HOST_CHOICES) })`
  - `server/api/game-routes.ts`
  - `src/lib/api.ts`
- Test: `server/tests/hosts.test.ts`, plus additions to `server/tests/routes.test.ts` and `authorization.test.ts`.

**Interfaces:**
- Produces in `server/game/hosts.ts`:
  - `pickHost(choice: HostChoice, previous: Host | null, rng: () => number): Host`. A non-random choice returns itself. `random` picks uniformly from `HOSTS` minus `previous`.
  - `ensureRoundHost(db: Db, roundId: string, rng?: () => number): Host`. If `rounds.host` is set, it returns it. Otherwise it resolves with `pickHost(hostChoice, hostOfRound(position - 1), rng)`, writes it, and returns it.
  - `setRoundHost(ctx: GameContext, input: { eventId: string; roundId: string; hostChoice: HostChoice }): GameResult<{ host_choice: HostChoice; host: Host | null }>`. It fails `round_started` if any question of this round has opened. That means the round's position is ≤ the position of the round of `game_state.current_event_question_id`, unless the phase is `lobby`, or `round_break` with this round being the next one. It writes `hostChoice`. If the round's host was already resolved (it's the incoming round during a break), it re-resolves it and broadcasts state. Otherwise it leaves `host` null.
  - `roundHosts(db: Db, eventId: string): { round_id: string; position: number; title: string; host_choice: HostChoice; host: Host | null; started: boolean }[]`.
- Produces in `shared/game.ts`: `GameView.cast: { host: Host; incoming_host: Host | null }`.
  - `host` is the current round's resolved host, or `'rocco'` in `lobby` and `ended`.
  - `incoming_host` is the next round's host in `round_break` (and `final_wager` if entered from a break), otherwise null.
- Produces routes, both with the `host` role (staff pass too):
  - `GET /api/round_hosts?event_id` → `{ rounds: RoundHost[] }`
  - `POST /api/set_round_host` (`SetRoundHostInput`) → `{ host_choice, host }`
- Produces client `api.roundHosts(eventId)` and `api.setRoundHost(input)`.

- [ ] **Step 1: Write failing tests in `server/tests/hosts.test.ts`:**
  - `pickHost returns a fixed choice as is`
  - `pickHost random never repeats the previous host`: 200 runs with `Math.random`, `previous: 'rocco'`; never `'rocco'`, and both others appear.
  - `pickHost random with no previous can pick any host`
  - `ensureRoundHost is stable across calls`: two calls return the same host and the DB row has it.
  - `opening round 1's first question resolves its host`: `getState().cast.host` is non-null.
  - `moving to round_break resolves the next round's host as incoming_host`
  - `set_round_host updates the incoming host during the round break`: choice `june` gives `cast.incoming_host === 'june'` and a state broadcast.
  - `set_round_host refuses a started round`: 409 `round_started`.
  - `the lobby and the end are hosted by Rocco`

  In `authorization.test.ts`: players get 403 on both routes.
- [ ] **Step 2:** Run `npx vitest run server/tests/hosts.test.ts server/tests/authorization.test.ts`. Expect FAIL.
- [ ] **Step 3:** Implement the schema and migration, `hosts.ts`, the flow hooks, `cast` in `getState`, the routes and the client API.
- [ ] **Step 4:** Run `npm test`. Expect it to pass, including the existing flow, simulator and reconnect tests.
- [ ] **Step 5:** Commit: `Per-round hosts: random without repeats, stored once, overridable until the round starts`.

### Task 5: Remove `live_background`

**Files:** `shared/settings.ts`, `shared/game.ts` (`PublicSettings`), `server/game/state.ts:78`, `src/routes/staff/staff-page.tsx:154`, `src/routes/play/question-screen.tsx:38`, the tests that mention it (`server/tests/{rewards,routes,schema}.test.ts`, `src/game/store.test.ts`), and `docs/SPEC.md` section 2's "Live-question background" row (now: "Paper answer sheet; no alternative background (removed in the 2026-11 redesign)").

- [ ] **Step 1:** Write a failing test in `server/tests/schema.test.ts`: `parseSettings ignores a stored live_background`. `parseSettings({ live_background: 'violet' })` doesn't throw, and the result has no `live_background` key.
- [ ] **Step 2:** Run it. Expect FAIL (the key survives).
- [ ] **Step 3:** Remove the field everywhere. Keep `z.object`'s default stripping so old stored JSON still parses.
- [ ] **Step 4:** Run `npm test` and `npm run typecheck`. Expect them to pass.
- [ ] **Step 5:** Commit: `Remove live_background (the paper sheet is the one live look)`.

### Task 6: Tap, then send, plus the nudge (game client)

**Files:**
- Create: `src/game/answer-sheet.ts` and `src/game/answer-sheet.test.ts`.
- Modify: `src/routes/play/answer-choice.tsx` and `src/routes/play/question-screen.tsx` (behavior only; the visual rebuild is Task 8).

**Interfaces:** Produces in `src/game/answer-sheet.ts`:
- `shouldNudge(input: { circled: number | null; sent: number | null; msLeft: number; locked: boolean }): boolean`. It's true when not locked, `0 < msLeft <= 5000`, `circled !== null` and `circled !== sent`.
- `sendLabel(circled: number | null, sent: number | null): 'send' | 'send_instead' | null`:
  - `'send'` when there's nothing sent yet and something is circled
  - `'send_instead'` when the circle differs from the sent answer
  - `null` when they match (the "Sent!" note shows instead)

Typed and number answers keep their draft autosave. Their send button is the same `"That's our answer!"` with the same `sendLabel` logic on text values.

- [ ] **Step 1: Write failing tests:**
  - `shouldNudge`:
    - `nudges at 5 s with an unsent circle`: `{ circled: 1, sent: null, msLeft: 5000, locked: false }` → true
    - `not at 5.1 s` → false
    - `not when the circle is the sent answer` (circled 1, sent 1) → false
    - `not after the lock` → false
    - `not with nothing circled` → false
  - `sendLabel`: `(1, null)` → `'send'`, `(2, 1)` → `'send_instead'`, `(1, 1)` → `null`, `(null, null)` → `null`
  - A component test in `answer-choice.test.tsx`:
    - `a tap circles without sending`: tap B, `onSend` not called, B has `aria-pressed="true"`
    - `keeps my circle when a teammate sends another answer`: rerender with `sent=3` while B is circled; D shows "sent!" and B stays pressed
- [ ] **Step 2:** Run `npx vitest run src/game/answer-sheet.test.ts src/routes/play`. Expect FAIL.
- [ ] **Step 3:** Implement. The answer sheet keeps `circled` in component state, keyed by `event_question_id`. "That's our answer!" calls the existing `submitAnswer({ is_draft: false })`.
- [ ] **Step 4:** Update the e2e helpers in `tests/e2e/support.ts`, so answering means: tap the option, then press "That's our answer!". Run `npm run e2e`. Expect it to pass.
- [ ] **Step 5:** Commit: `Tap, then send, with the 5-second nudge`.

### Shared pieces for Tasks 7–11

Task 7 creates these, and every screen task uses them:
- **`src/components/status-pill.tsx`:** `StatusPill({ status }: { status: 'waiting' | 'live' | 'locked' | 'results' | 'paused' | 'wager' })`. It renders the kit `.pill--*` with its icon and the i18n status word.
- **`src/game/cast.ts`:** `hostExpression(view: GameView): Expression`, mapping (test each in `cast.test.ts`):

  | Phase | Expression |
  |---|---|
  | `lobby` | greeting |
  | `live` / `final_live` | asking (waiting once my team has sent) |
  | `locked` / `final_locked` | waiting |
  | `revealed` / `final_revealed` | cheering if my team's result is correct, consoling if incorrect, waiting if no submission |
  | `round_break` | the incoming host greets, the outgoing host relaxes |
  | `paused` | relaxing |
  | `final_wager` | asking |
  | `ended` | cheering if my team placed 1–3, consoling otherwise |

- **`src/components/host-stage.tsx`:** `HostStage({ host, expression, line, tone })` renders `.stage` (`tone`: `'peach' | 'butter' | 'sky'`), `<Character>` and `.bubble`. Host lines are i18n keys under `host.lines.*`, with the copy taken from the mockups.
- **`tests/e2e/support.ts`:** `captureScreen(page, name: string)` saves `test-results/screens/<name>.png` and runs the existing axe check. Each screen task captures every state it builds, using the **same name as the mockup**, so the reviewer compares `test-results/screens/<name>.png` with `design/review/shots/screens__<name>.png`.

### Task 7: Play shell, landing, join, lobby (references: 5a mockups)

**Files:**
- Modify: `src/routes/play/play-layout.tsx`. Use the kit `.tabbar`, shown only in the phases the constraints list. Drop the old violet header. Each screen now owns its top row (`.screen__top`: `StatusPill` plus a hand note).
- Modify: `src/routes/landing.tsx`, `join-screen.tsx`, `team-screen.tsx`, `lobby-screen.tsx`, `src/i18n/en.json`.
- Create: `src/components/status-pill.tsx`, `src/game/cast.ts` + `cast.test.ts`, `src/components/host-stage.tsx`.

**References:** `landing`, `join-nickname`, `join-team`, `join-team-stress`, `lobby`, `lobby-stress`.

- [ ] **Step 1:** Write failing tests:
  - `cast.test.ts`: one case per row of the `hostExpression` table above.
  - The e2e `join.spec.ts`: `tab bar hidden on join, shown in the lobby`, and `captureScreen` for each reference.
- [ ] **Step 2:** Run `npx vitest run src/game/cast.test.ts`. Expect FAIL.
- [ ] **Step 3:** Rebuild the screens on kit classes, matching the references. Team rows use `.initial--sm`.
- [ ] **Step 4:** Run `npm test` and `npm run e2e -- join smoke`. Expect them to pass. Compare each captured screen with its reference at 390px, and fix the differences.
- [ ] **Step 5:** Commit: `Redesign: play shell, landing, join, lobby`.

### Task 8: The paper answer sheet (references: 5b mockups)

**Files:** `src/routes/play/`: question-screen, answer-choice, answer-text, question-media, wager-screen, locked-screen, reveal-screen, round-break-screen, paused-banner, result-badge; `src/components/countdown.tsx`; i18n.

**References:**
- `question-mc`, `question-mc-submitted`, `question-mc-nudge`
- `question-true-false`, `question-text`, `question-number`
- `question-image`, `question-audio` (captions on), `question-captain-only`, `question-stress`
- `wager`, `locked`, `reveal-correct`, `reveal-incorrect`
- `round-break`: the incoming host from `cast.incoming_host` (greeting), and the outgoing host small (relaxing)
- `paused`

- [ ] **Step 1:** Add the e2e cases to `questions.spec.ts` and `play-three.spec.ts`:
  - `captureScreen` for every reference state
  - `round break introduces the incoming host`: in `round_break`, the image named for `cast.incoming_host` is visible
  - `nudge appears at 5 s`: open a question with a 6-second duration via the e2e seed, circle without sending, and expect the nudge line within 2 s
- [ ] **Step 2:** Run `npm run e2e -- questions play-three`. Expect FAIL.
- [ ] **Step 3:** Rebuild the screens on the kit, matching the references, using `HostStage`, `StatusPill`, `hostExpression` and Task 6's logic.
- [ ] **Step 4:** Run `npm test` and `npm run e2e`. Expect them to pass. Compare against the references.
- [ ] **Step 5:** Commit: `Redesign: the paper answer sheet`.

### Task 9: After the game (references: 5c mockups)

**Files:** `src/routes/play/`: ended-screen, prize-list, leaderboard-page, rewards-page, after-game-forms, animals-page; `src/components/leaderboard-list.tsx`; i18n.

**References:**
- `ended-prizes`, `ended-prizes-stress`
- `leaderboard-tonight`, `leaderboard-stress`, `leaderboard-season`, `leaderboard-empty`
- `rewards`: naming only. Remove the existing prize-code list from `rewards-page.tsx`. `MyReward` UI goes; the API can stay.
- `feedback`
- `animals`, `my-animal`: avatar from `AnimalInfo.avatar`; the "meet the real one" `.photo-slot` uses `image_url` when it's set, otherwise the placeholder frame

- [ ] **Step 1:** Add the e2e cases to `results.spec.ts` and `rewards.spec.ts`:
  - `captureScreen` for each reference
  - `prize rows show each animal's avatar`
  - `only the top 3 leaderboard rows show an animal`
  - `my animal shows the real photo when one is set`
- [ ] **Step 2:** Run them. Expect FAIL.
- [ ] **Step 3:** Rebuild the screens.
- [ ] **Step 4:** Run `npm run e2e`. Expect it to pass. Compare against the references.
- [ ] **Step 5:** Commit: `Redesign: after the game`.

### Task 10: The big screen (references: 5d mockups)

**Files:** `src/routes/host/display-page.tsx` (split into `src/routes/host/display/*.tsx`, one file per phase view, if it grows past ~200 lines); i18n.

**References:**
- `big-lobby`: the QR uses `public_url`, as it does today
- `big-round-intro`, `big-question`, `big-locked`, `big-reveal`
- `big-leaderboard`: 8 rows per page, paging every 8 s, motion-guarded
- `big-prizes`

The page renders inside `.big .screen--night`.

- [ ] **Step 1:** Add `host.spec.ts` e2e cases at a 1920×1080 viewport:
  - `captureScreen` for each reference
  - `the big screen shows the round's host`
- [ ] **Step 2:** Run them. Expect FAIL.
- [ ] **Step 3:** Rebuild the display page.
- [ ] **Step 4:** Run `npm run e2e`. Expect it to pass. Compare against the references.
- [ ] **Step 5:** Commit: `Redesign: big screen`.

### Task 11: Host console and staff: re-theme, round hosts, avatars

**Files:** `src/routes/host/host-page.tsx`, `host-home.tsx`, `src/routes/staff/staff-page.tsx`; i18n.

**Reference:** `staff-round-hosts`.

- **Staff:** the event settings get the "Round hosts" control. It loads `api.roundHosts` and saves each change with `api.setRoundHost`. Started rounds are disabled with their resolved host shown.
- **Host console:** during the lobby and every round break, a compact "Next round's host" select uses the same endpoint.
- **Everything else** gets kit classes only (cards, buttons, fields, pills). The layout and behavior stay unchanged.

- [ ] **Step 1:** Add e2e cases:
  - `staff sets round 2's host to Pebble and the round break shows Pebble`
  - `host console can change the next round's host during a break`
  - `a started round's host can't be changed`
- [ ] **Step 2:** Run them. Expect FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run `npm run e2e`. Expect it to pass.
- [ ] **Step 5:** Commit: `Redesign: host console and staff, round hosts and avatars`.

### Task 12: Whole-app verification

- [ ] **Step 1:** Run `npm test`, `npm run typecheck`, `npm run lint` and `npm run e2e`. All must pass.
- [ ] **Step 2:** Every `design/screens/*.html` has a matching `test-results/screens/<name>.png`. Produce `docs/superpowers/plans/2026-11-16-ui-redesign-build-compare.md`, a table of every reference name with match / differs (what) after a side-by-side check. Fix every "differs" that isn't a deliberate data difference.
- [ ] **Step 3:** Grep `src/` for leftover old-look classes: `bg-brand-deep text-surface` headers, `shadow-pop`, `font-heading` used outside the kit. Remove them, or note why they stay.
- [ ] **Step 4:** Update `docs/SPEC.md` section 7: tokens, the kit, characters, the status words, and that the screens are built from `design/screens/`.
- [ ] **Step 5:** Commit: `Redesign build verified`. Then ask the user before pushing, merging or deploying. Remind them that the animal copy is placeholder text.
