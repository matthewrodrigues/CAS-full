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
