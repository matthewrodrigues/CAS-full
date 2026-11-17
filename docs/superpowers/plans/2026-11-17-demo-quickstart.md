# Demo Quickstart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On DEMO1 only, a host can restart the demo to a fresh lobby and switch on an autopilot that runs the host steps by itself.

**Architecture:** Two new game modules in `server/game/`. `autopilot.ts` holds a pure "what's next after this phase" table and an in-memory scheduler; it is told about every phase change from `flow.ts`'s `write()`. `demo.ts` holds the DEMO1 guard and the restart. Two new host-only routes call them through `engine.ts`. The host console gains a Demo card.

**Tech Stack:** Hono + zod routes, better-sqlite3 + Drizzle, Vitest (fake timers), React + TanStack Query, react-i18next, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-17-demo-quickstart-design.md`

## Global Constraints

- Both actions only on the event whose `join_code` is `DEMO_JOIN_CODE` (`'DEMO1'`, `server/db/seed-demo.ts`). The server refuses any other event with the new error code `not_demo` (HTTP 403), whatever the client sends.
- Both routes are host-only (`requireRole('host')`, the same `host` guard as `/api/host_next`) and zod-validated.
- No schema change and no migration. Autopilot state lives in server memory: a restart turns it off.
- Autopilot never starts the game: in `lobby` it does nothing.
- Autopilot delays (ms): `locked` 3000 → reveal; `final_locked` 3000 → reveal; `revealed` 8000 → next; `round_break` 12000 → next; `final_wager` 30000 → next; `final_revealed` 10000 → next. `live`, `final_live`, `lobby`, `paused` and `ended` schedule nothing (live questions already auto-lock on their timer).
- The env var `AUTOPILOT_DELAY_MS`, when set to a positive integer, replaces every delay (for e2e only).
- No fake teams. Ending the game issues naming rights as usual; naming still needs staff approval.
- Project rules (CLAUDE.md): game rules in `server/game/`; every string in `src/i18n/en.json`; no raw colors outside `src/styles/tokens.css`; 44px targets; axe passes; vitest from PowerShell only.

## Review Focus

1. **A restart while autopilot has a step pending.** The pending step must not fire into the fresh lobby. Restart disarms autopilot's timer for that event (Task 1 test: "restart cancels a pending step").
2. **A host presses a button by hand while autopilot is on.** The manual move is a new phase, so autopilot re-schedules from it. No double advance (Task 1 test: "a manual move replaces the pending step").
3. **The restart must not touch another event's rows**, including a shared animal named by a different event ("Noodle") (Task 2 test).
4. **Restart during a live question.** The auto-lock timer must be disarmed, or it locks a question in the new lobby (Task 2 test: "restart disarms the auto-lock").
5. **Phones and the big screen already showing the end screen** return to the lobby without a reload (Task 3 e2e: the phone shows the lobby after the restart).

---

### Task 1: Autopilot (server)

**Files:**
- Create: `server/game/autopilot.ts`
- Modify: `server/game/context.ts:14` (add `autopilot` to `GameContext`)
- Modify: `server/game/flow.ts:31-35` (`write()` tells autopilot the new phase)
- Modify: `server/game/engine.ts:16-17` (create the autopilot; expose `setAutopilot`; accept `autopilotDelayMs?: number`)
- Modify: `server/index.ts:27` (pass `Number(process.env.AUTOPILOT_DELAY_MS) || undefined`)
- Modify: `shared/game.ts:86-91` (`HostView.autopilot: boolean`) and the builder of `HostView` in `server/game/state.ts` (fill it from `ctx.autopilot.isOn(eventId)`)
- Test: `server/tests/autopilot.test.ts`

**Interfaces:**
- Produces:
  - `export const AUTOPILOT_DELAYS_MS: Readonly<Partial<Record<Phase, number>>>` with the Global Constraints values.
  - `export function autopilotStep(phase: Phase): { op: 'reveal' | 'next'; delayMs: number } | null`. `reveal` for `locked`/`final_locked`, `next` for the other four scheduled phases.
  - `export type Autopilot = { isOn(eventId: string): boolean; set(eventId: string, on: boolean): void; onPhase(eventId: string, phase: Phase): void; cancel(eventId: string): void }`.
  - `export function createAutopilot(act: (eventId: string, op: 'reveal' | 'next') => void, overrideDelayMs?: number): Autopilot`. `onPhase` always clears the event's pending timer, then, if on and `autopilotStep(phase)` is non-null, arms one for its delay (or `overrideDelayMs`). `set(id, true)` arms for the event's current phase (the caller passes it via a following `onPhase`; see engine). `set(id, false)` and `cancel` clear it.
  - `GameContext.autopilot: Autopilot`.
  - Engine: `game.setAutopilot(eventId: string, on: boolean): GameResult<PublicGameState>`. It sets the flag, then calls `ctx.autopilot.onPhase(eventId, currentPhase)` so an already-settled phase starts counting. The demo guard is added in Task 2.
- `act` in the engine maps `reveal` → `flow.reveal(ctx, id)`, `next` → `flow.next(ctx, id)`, ignoring failures (a race with a manual press returns `wrong_phase`, which is fine).

- [ ] **Step 1: Write the failing tests** in `server/tests/autopilot.test.ts`:
  - `autopilotStep` table: `autopilotStep('locked')` → `{ op: 'reveal', delayMs: 3000 }`; `'revealed'` → `{ op: 'next', delayMs: 8000 }`; `'round_break'` → 12000; `'final_wager'` → 30000; `'final_revealed'` → 10000; `'final_locked'` → reveal 3000; `'lobby'`, `'live'`, `'final_live'`, `'paused'`, `'ended'` → `null`.
  - Scheduler with `vi.useFakeTimers()` and a spy `act`:
    - "does nothing while off": `onPhase('e', 'locked')`, advance 60 s → `act` not called.
    - "acts after the phase's delay": `set('e', true)`; `onPhase('e', 'locked')`; advance 2999 → not called; advance 1 → called once with `('e', 'reveal')`.
    - "a manual move replaces the pending step": on; `onPhase('e', 'revealed')`; advance 5000; `onPhase('e', 'locked')`; advance 3000 → called once with `'reveal'` (never `'next'`).
    - "waits while paused": on; `onPhase('e', 'paused')`; advance 60 s → not called.
    - "turning it off cancels": on; `onPhase('e', 'locked')`; `set('e', false)`; advance 10 s → not called. And `cancel('e')` does the same.
    - "the override delay applies to every step": `createAutopilot(act, 50)`; on; `onPhase('e', 'final_wager')`; advance 50 → called.
  - Engine integration, using `server/tests/game-setup.ts`: start a game, `game.setAutopilot(eventId, true)` while `locked`, advance 3000 → the state is `revealed`; the host's `get_state` has `host.autopilot === true`.
- [ ] **Step 2: Run** `npx vitest run server/tests/autopilot.test.ts` (PowerShell). Expected: FAIL, module not found.
- [ ] **Step 3: Implement** `server/game/autopilot.ts` with the interfaces above (one `Map<string, Timeout>` of pending timers and one `Set<string>` of on events). Wire it: `GameContext.autopilot`; `flow.write()` calls `ctx.autopilot.onPhase(eventId, state.phase)` with the phase of the state it just wrote, after `broadcastState`; the engine builds it with `act` and exposes `setAutopilot`; `HostView.autopilot`.
- [ ] **Step 4: Run** `npx vitest run server/tests/autopilot.test.ts` → PASS, then `npm test` and `npm run typecheck` → all pass (existing `HostView` fixtures in tests get `autopilot: false`).
- [ ] **Step 5: Commit** `git add server/game/autopilot.ts server/game/context.ts server/game/flow.ts server/game/engine.ts server/game/state.ts server/index.ts shared/game.ts server/tests/autopilot.test.ts` plus any fixture edits; message `Demo autopilot: runs the host steps on DEMO1 after each phase settles`.

### Task 2: DEMO1 restart and the two host routes (server)

**Files:**
- Create: `server/game/demo.ts`
- Modify: `shared/game.ts:206` (add `'not_demo'` to `GAME_ERROR_CODES`)
- Modify: `server/api/game-routes.ts:55` (`not_demo: 403` in `STATUS`) and `:167-172` (two routes)
- Modify: `server/game/engine.ts` (`restartDemo`; `setAutopilot` now refuses non-demo events)
- Modify: `src/i18n/en.json` `errors` (`"not_demo": "That only works on the demo game."`)
- Test: `server/tests/demo.test.ts`; `server/tests/authorization.test.ts` (route table)

**Interfaces:**
- Consumes: `Autopilot.cancel`, `game.setAutopilot` (Task 1); `DEMO_JOIN_CODE` from `server/db/seed-demo.ts`; `ctx.timers.disarm`; `broadcastState`.
- Produces:
  - `export function isDemoEvent(db: Db, eventId: string): boolean`
  - `export function restartDemo(ctx: GameContext, eventId: string): GameResult<PublicGameState>`. It returns `not_found` for an unknown event and `not_demo` for any event whose join code isn't `DEMO1`. In one transaction it:
    - deletes the event's `teams` (cascades to members, submissions, score events, naming rights) and `feedback`;
    - for `animals` where `named_event_id` = eventId, sets `name`, `named_at`, `named_by_team` and `named_event_id` to null;
    - clears `rounds.host` for the event's rounds;
    - clears `event_questions.revealed_at` and `skipped_at` for the event;
    - sets `events.status = 'ready'`;
    - resets `game_state` to `phase 'lobby'`, with every other column null.

    Then it calls `ctx.timers.disarm`, `ctx.autopilot.cancel` and `broadcastState`.
  - Routes, both `host` guard + `EventIdInput`:
    - `POST /api/host_demo_restart` → `game.restartDemo(event_id)`
    - `POST /api/host_demo_autopilot`, zod `{ event_id: string uuid, on: boolean }` → `game.setAutopilot(event_id, on)`
  - Client API (`src/lib/api.ts`): `api.demoRestart(eventId: string): Promise<PublicGameState>`, `api.demoAutopilot(eventId: string, on: boolean): Promise<PublicGameState>`.

- [ ] **Step 1: Write the failing tests** in `server/tests/demo.test.ts`, seeding DEMO1 with `seedDemo` plus one other event (an e2e code), as the existing tests do:
  - "restart returns an ended demo to a fresh lobby": play DEMO1 to `ended` with one team (via the existing helpers), naming rights awarded. After `restartDemo`: the phase is `lobby`, status `ready`, the team count for DEMO1 is 0, there are 0 naming rights for DEMO1's prizes, the animal DEMO1 named has `name === null`, and `rounds.host` is null for every DEMO1 round.
  - "restart leaves other events alone": the other event's teams, its game state and "Noodle" (the animal named by an earlier night) are unchanged.
  - "restart disarms the auto-lock": restart while `live`; advance past `closes_at` → the phase is still `lobby`.
  - "restart cancels a pending autopilot step": autopilot on, phase `locked`, restart, advance 10 s → still `lobby`.
  - "a non-demo event is refused": `restartDemo` and `setAutopilot` on the other event → `{ ok: false, error: 'not_demo' }`.
  - Route tests (`routes.test.ts` style): `POST /api/host_demo_restart` with a host session → 200; with a player session → 403; with no session → 401; with a non-UUID `event_id` → 400. `host_demo_autopilot` with `on: 'yes'` → 400.
  - Add both routes to the route table in `authorization.test.ts`.
- [ ] **Step 2: Run** `npx vitest run server/tests/demo.test.ts` → FAIL.
- [ ] **Step 3: Implement** `server/game/demo.ts`, the error code, the routes and the client API methods as above.
- [ ] **Step 4: Run** `npm test` and `npm run typecheck` → all pass.
- [ ] **Step 5: Commit** with message `Demo restart: DEMO1 back to a fresh lobby, host-only`.

### Task 3: The Demo card in the host console, and e2e

**Files:**
- Create: `src/routes/host/demo-card.tsx`
- Modify: `src/routes/host/host-page.tsx` (render `<DemoCard>` when `view.event.join_code === 'DEMO1'`)
- Modify: `src/i18n/en.json` (a `host.demo` block)
- Note: e2e already seeds DEMO1 (`scripts/e2e-prepare.ts:22`); `smoke` and `global-setup` only load its page, and `rewards.spec` only changes a DEMO1 setting. Make `demo.spec.ts` `test.describe.configure({ mode: 'serial' })`, start each test with a restart, and end by restarting, so DEMO1 is back in the lobby for any spec running alongside (workers: 2). Add `demo: 'DEMO1'` to `tests/e2e/constants.ts`.
- Modify: `playwright.config.ts` (the e2e server's env gets `AUTOPILOT_DELAY_MS: '300'`)
- Test: `tests/e2e/demo.spec.ts`

**Interfaces:**
- Consumes: `api.demoRestart`, `api.demoAutopilot`, `view.host.autopilot` (Tasks 1–2); the console's existing `live.refresh()`.
- Produces: `DemoCard({ eventId, autopilot }: { eventId: string; autopilot: boolean })`.

**Copy** (`host.demo.*`):
- `title`: "Demo"
- `body`: "Run the demo by itself, and start it over whenever you like."
- `autopilot`: "Autopilot"
- `autopilotOn`: "Autopilot is on: it reveals and moves on by itself."
- `autopilotHint`: "Press Start when everyone's in. Autopilot does the rest."
- `restart`: "Restart demo"
- `restartConfirm`: "Restart the demo? Everyone's scores and teams are cleared."
- `restartYes`: "Yes, restart"
- `restartNo`: "Keep playing"
- `restarted`: "The demo is back in the lobby."

**Layout:**
- A kit `.card` below the console's main card.
- A switch (`role="switch"`, `aria-checked`, label `autopilot`) with the hint line under it.
- A secondary button "Restart demo". Pressing it swaps in an inline confirm row (the `restartConfirm` text with `restartYes` and `restartNo`), with no browser dialog.
- An `aria-live="polite"` status line for `autopilotOn` and `restarted`.
- 44px targets. Kit classes only.

- [ ] **Step 1: Write the failing e2e** `tests/e2e/demo.spec.ts` (a host page on DEMO1, plus a player page via the `support.ts` helpers):
  - "restart returns everyone to the lobby":
    1. The player joins DEMO1 and makes a team.
    2. The host presses Start, then "Restart demo", then "Yes, restart".
    3. The player's page shows the "Waiting for the host" pill and the team screen.
    4. The host sees "The demo is back in the lobby."
  - "autopilot plays a question without host presses":
    1. Restart the demo first.
    2. The player joins.
    3. The host turns the Autopilot switch on and presses Start.
    4. The player taps and sends an answer.
    5. Without further host clicks, within 60 s the player sees the reveal ("Correct!" or "Not quite"), then the next question's live pill.
  - "the Demo card isn't on other events": open the host console for `E2E_CODES.afterGame` → no "Demo" heading.
  - Run `expectNoAxeViolations` on the host console with the card shown.
- [ ] **Step 2: Run** `npm run e2e -- tests/e2e/demo.spec.ts` → FAIL (no Demo card).
- [ ] **Step 3: Implement** `DemoCard`, its i18n and the `AUTOPILOT_DELAY_MS` e2e env.
- [ ] **Step 4: Run** `npm run e2e -- tests/e2e/demo.spec.ts` → PASS. Then the full `npm test`, `npm run typecheck`, `npm run lint` and `npm run e2e` → all pass.
- [ ] **Step 5: Commit** with message `Host console Demo card: autopilot switch and restart`.

### Task 4: Ship

- [ ] **Step 1:** Add a "Running the demo" section to `docs/RUNBOOK.md`:
  1. Sign in at `/host` and open DEMO1.
  2. In the Demo card, switch on Autopilot.
  3. Players join at `/play/DEMO1`.
  4. Press Start.
  5. To run it again, press "Restart demo".

  Note that a server restart turns autopilot off. Commit.
- [ ] **Step 2:** Ask the user before deploying. On approval:
  1. Back up the database (`DATA_DIR=/data npm run db:backup` over `fly ssh console`).
  2. Run `fly deploy --remote-only`. This network needs the IPv4 proxy: `HTTPS_PROXY`/`HTTP_PROXY=http://127.0.0.1:18080`.
  3. Check `/api/health`.
  4. On the live DEMO1, press Restart demo, which also resets the run that's already ended.
