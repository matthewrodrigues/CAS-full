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
