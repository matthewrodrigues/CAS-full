# NightLife Trivia

Mobile web trivia game for Thursday NightLife at the California Academy of Sciences. The full spec is `docs/SPEC.md`; read the relevant sections before planning any task. Build one milestone at a time and stop after each for review.

**Stack:** React + Vite + TypeScript, Tailwind, shadcn/ui, TanStack Query, Zustand, react-i18next. Server: Node + Hono + WebSocket, SQLite via better-sqlite3 + Drizzle, zod.

**Commands:** `npm run dev` (Vite + server), `npm test`, `npm run e2e`, `npm run db:generate`, `npm run db:migrate`, `npm run db:seed`, `npm run db:backup`, `npm run simulate -- --teams 40`, `npm run import-questions -- <file.csv>`.

**Hard rules:**
- Never send `question_answers` or answer fields to the client.
- Every API route and WebSocket message checks the session and role and validates input with zod.
- Schema changes only in `server/db/schema.ts` plus a generated migration; never edit a migration that has been applied.
- Game rules live in `server/game/`, not in React or route handlers.
- Parameterized SQL only. SQLite runs with `foreign_keys = ON` and WAL mode.
- One server instance; don't add anything that assumes more than one.
- No raw color values (hex, `rgb()`/`hsl()`/`oklch()`, Tailwind's built-in palette) outside `src/styles/tokens.css`.
- Every user-visible string goes through i18n.
- Accessible by default: labels, focus states, 44px targets, aria-live for phase changes.

**Definition of done for any task:** tests pass, axe passes, the screen matches its `design/screens/` reference at 390px wide, and no rule above is broken.

**Working style:** use plan mode for schema or game-engine changes; keep changes scoped to one task; ask before adding dependencies or changing a decision in section 2 of the spec. The dev machine is Windows, so npm scripts must be cross-platform (no inline `VAR=value`, no `rm -rf`; use a small Node script instead).
