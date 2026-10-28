# NightLife Trivia

Live trivia for Thursday NightLife at the California Academy of Sciences: players join from their phones, a host runs the night, and the big screen shows the game. The build spec is [docs/SPEC.md](docs/SPEC.md).

## Setup

Requires Node 22.22 or newer.

```sh
npm install
npx playwright install chromium   # once, for end-to-end tests
cp .env.example .env              # then set HOST_PASSCODE and STAFF_PASSCODE to log in as host/staff
npm run db:migrate                # creates data/app.db
npm run db:seed                   # demo event DEMO1 ("Deep Sea Night"); safe to run again
npm run dev                       # web on http://localhost:5173, API on :3000
```

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Vite and the API server together, with `/api`, `/ws` and `/media` proxied to the server |
| `npm test` | Vitest: client and server projects |
| `npm run e2e` | Playwright against the dev server (starts it if needed) |
| `npm run typecheck` / `npm run lint` | TypeScript and oxlint |
| `npm run build` then `npm start` | Production build; one Node process serves the API and the built app |
| `npm run db:generate` | Create a migration after changing `server/db/schema.ts` |
| `npm run db:migrate` / `db:seed` / `db:backup` | Apply migrations, load seed data, copy the database to `data/backups/` |

## The game engine

Everything the game decides happens on the server, in `server/game/`; the browser only draws what it is told. Route handlers check the session, validate input with zod and call `createGame()`'s operations (`server/game/engine.ts`).

- **Flow** (`flow.ts`): `host_next` is the one "advance" action through the phases in docs/SPEC.md section 5 (lobby → live → locked → revealed → … → round_break → final_wager → final_live → … → ended). `host_lock`, `host_reveal`, `host_skip`, `host_pause` and `host_resume` do what they say. A pause stops the clock and shifts `closes_at` on resume.
- **Auto-lock** (`timers.ts`): when a question opens, a timer locks it at `closes_at` + the grace window (`grace_ms`, 1.2 s) + the largest `extra_time_s` among the night's players. On startup the server re-arms the timer for an open question, or locks it at once if its deadline has passed.
- **Submissions** (`submissions.ts`): one row per team per question. A submit always replaces it; a draft only replaces a draft. Answers are accepted only while live and before the player's deadline, at most 5 writes per player per second.
- **Scoring** (`scoring.ts`): answers are graded at lock (typed answers by trigram similarity, `matching.ts`) and scored at reveal. Borderline typed answers wait in the host's review queue; an override after the reveal writes an `adjust` score event for the difference. The final wager adds or subtracts the wager, capped at the team's score.
- **Real-time** (`server/realtime/rooms.ts`, `server/api/ws-route.ts`): `/ws?event_id=…` needs a session and the same Origin. It sends `state` on every phase change, `team_submission` to a team's own room, and counts and the review queue to hosts. Clients should still call `get_state` on every reconnect.

`server/tests/full-game.test.ts` plays DEMO1 from lobby to ended over HTTP and checks the final leaderboard.

## The player app

`/play/:joinCode` (try `/play/DEMO1`): pick a nickname, start or join a team, and play from your phone. The Play tab follows the game phase by phase (lobby, live question, locked, reveal, round break, final wager, end); Leaderboard shows tonight's teams; Rewards is an empty state until Milestone 6. `src/game/` holds the client's logic (clock sync, the message reducer, the phase announcer) and `src/routes/play/` its screens. Screens are token-only placeholders until designs land in `design/screens/`.

## Test databases

Unit tests use in-memory SQLite. `npm run e2e` starts its own servers on ports 5174 (web) and 3101 (API) with `DATA_DIR=data/e2e`. `scripts/e2e-prepare.ts` deletes that folder, migrates and seeds DEMO1 plus one event per spec file, so every run starts fresh and `data/app.db` is never touched.
