# NightLife Trivia — Runbook

How to run a night with the pilot build. The build spec is [SPEC.md](SPEC.md).

## Pilot launch checklist (SPEC section 9)

- [ ] **The day before:** load the night's questions (`npm run import-questions -- night.csv --check`, then without `--check`), and preview the event on the big screen (`/host/<event>/display`) from a host session.
- [ ] **Before doors open:** the server is up and reachable from a phone on the venue Wi-Fi (open `/play/<code>` on a phone); back up the database with `npm run db:backup`.
- [ ] **At the host table:** host laptop or tablet signed in at `/host` (host passcode), projector on `/host/<event>/display`, a backup hotspot, and paper answer sheets for checking borderline answers.
- [ ] **At the prize desk:** a staff phone signed in at `/staff` (staff passcode), on the Redeem page.
- [ ] **After the night:** review flagged answers (the host console's "Answers to check" lists every undecided one, and overrides still count after the reveal), export results (`npm run db:backup`) and feedback, and download the newsletter list from `/staff/newsletter`.

## During the night

- The host console shows one main button: Start, Lock, Reveal, Next. Pause freezes the clock for everyone; Skip drops a question without scoring it.
- Questions lock themselves when time runs out (plus 1.2 s grace). A server restart re-arms the clock, or locks a question whose time ran out while it was down. Don't deploy on event days.
- Phones that drop off reconnect on their own and catch up; nothing typed is lost (answers save as drafts).
- Team names show on the big screen only once approved in the console.
- Prizes are issued when the host ends the game: tier 1 to the winning team, tier 2 to the runner-up, and the last tier to every team (each member gets a code). Staff redeem them once each.

## Settings

Staff can change each event's settings at `/staff/settings`: team size, who can answer (any member or captain only), speed bonus, grace window, typed-answer thresholds, and the live-question background (cream or violet).

## Load check

`npm run simulate -- --teams 40` against a running server plays the whole night with 40 fake teams and reports any lost answer. Run it before a pilot on the real host.

## Deploying to Fly.io

One always-on machine with one volume at `/data` (SPEC section 10). The `Dockerfile` builds the SPA and runs the server; `fly.toml` holds everything except the passcodes. Create the Fly account under an Academy-controlled email, and don't deploy on event days.

**First deploy**

1. Install `flyctl` and sign in: `fly auth login`.
2. Pick a unique app name, put it in `fly.toml` (`app = "…"`), and create the app: `fly apps create <name>`.
3. Create the volume in the app's region: `fly volumes create nightlife_data --region sjc --size 1`.
4. Set the passcodes as secrets, each at least 12 characters and different from each other. The server refuses to start otherwise. One way to generate a value: `node -e "console.log(require('crypto').randomBytes(12).toString('base64url'))"`. Then: `fly secrets set HOST_PASSCODE=<value> STAFF_PASSCODE=<other value>`.
5. Deploy: `fly deploy`. Then make sure there is exactly one machine: `fly scale count 1`.
6. Check `https://<name>.fly.dev/api/health` returns `{"ok":true}`, open `/host` and sign in, and open the start page on a phone.

**Every release:** `fly deploy`. The container applies database migrations before the server starts. A deploy restarts the machine and drops every live connection, so never deploy during an event.

**Scripts on the server.** They must write to the volume, so run them in `/app` with `DATA_DIR=/data`:

```
fly ssh console
cd /app
DATA_DIR=/data npm run db:seed        # the demo night, DEMO1
DATA_DIR=/data npm run db:backup      # before each event; writes to /data/backups
```

- **Questions:** copy the CSV up with `fly sftp shell` (`put night.csv /data/night.csv`). Then on the server run `DATA_DIR=/data npm run import-questions -- /data/night.csv --check`, and run it again without `--check`.
- **Backups:** download one with `fly sftp get /data/backups/<file>`. Fly also snapshots the volume daily.
- **Changing a passcode:** `fly secrets set` restarts the machine, so do it between events.
- **Server logs:** `fly logs`.
