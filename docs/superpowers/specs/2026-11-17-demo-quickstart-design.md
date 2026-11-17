# Demo quickstart: restart and autopilot for DEMO1

## Why

The live demo (DEMO1 on https://nightlife-trivia.fly.dev) can be played only once. After the game ends it stays ended, so every new run-through needs someone to reset the database by hand. Running the game also takes a second person, or a second device, pressing the host console's button about 100 times. The user wants the demo to be **replayable**, with **the host steps simulated**, so one person can show it by just playing on a phone or with the big screen up.

## Approaches

- **A. A demo panel in the host console (chosen by the user).** On DEMO1 only, the console gets "Restart demo" and an "Autopilot" switch. It sits behind the host passcode, and real events are untouched.
- B. A public "Try the demo" button that makes each visitor their own copy of the demo. Nicer for strangers trying it alone, but every press creates an event in the live database, which needs cleanup, rate limits and abuse protection. Rejected: about 2–3× the work, for an audience that isn't the goal.
- C. Restart only, with no autopilot. Rejected: it doesn't simulate the host, which was half the ask.

## Goals

- A host can return DEMO1 to a fresh lobby in one press, as many times as they like.
- With autopilot on, the night runs itself from the first question to the end: lock, reveal, next, round breaks, the final wager and the final results.
- Both work from a phone (the host console is already phone-friendly).

## Non-goals and anti-goals

- **Not** available on any event but DEMO1. The server refuses both actions for any other event, whatever the client sends. A real event must never be resettable.
- **Not** public: host role only, like every other host action.
- No fake teams or bots. The people at the demo are the players. (`npm run simulate` still exists for load tests.)
- No change to how real events run.

## Behaviour

**Restart demo** (a host action; DEMO1 only; works in any phase; asks "Restart the demo? Everyone's scores and teams are cleared." before it runs). It:
- deletes DEMO1's teams (their members, submissions and score events go with them), any naming rights and feedback tied to DEMO1 (the demo never issues prize codes in the first place: reward awards carry no event, so a restart could not take them back);
- un-names any animal that a DEMO1 prize named (`named_event_id` = DEMO1), so the prizes can be won again;
- clears the per-round host picks (`rounds.host`), so Random re-rolls next time;
- sets the event back to `ready` and the game state to `lobby`, and broadcasts it, so open phones and the big screen return to the lobby at once;
- keeps players' guest accounts, so they can rejoin straight away and make a new team.

**Autopilot** (a host toggle on DEMO1; *my call:* held in server memory, not the database, so a server restart turns it off. The app runs on one instance, and this keeps it free of schema changes):
- It doesn't start the game. In the lobby it waits for the host to press the normal start button, so people have time to join.
- From then on it presses the host's primary button for them, on a timer after each phase settles. *My call on the timings:*

  | Phase | What autopilot does |
  |---|---|
  | question live | nothing: the question locks itself when its timer runs out, as today |
  | locked | reveal after 3 s |
  | revealed | next question after 8 s (time to read the fun fact) |
  | round break | next round after 12 s (time for the hand-over) |
  | final wager | starts the final question after 30 s |
  | final revealed | ends the game after 10 s |
- Paused means paused: autopilot waits until the host resumes. Any manual host press resets the wait, so the host can still drive by hand.
- Ending the game issues the naming prizes as usual. Naming still needs staff approval, which is out of scope.

## Where it lives

- The autopilot rules and the reset go in `server/game/` (a new `demo.ts`). They reuse `flow.ts`'s transitions, the same functions the host's buttons call.
- Two host operations, zod-validated and host-only like the rest: `host_demo_restart` and `host_demo_autopilot { on: boolean }`. The server checks the event's join code is `DEMO1` (`DEMO_JOIN_CODE`).
- The host console (`src/routes/host/host-page.tsx`) shows a "Demo" card on DEMO1 only, with the Restart button (confirm first) and the Autopilot switch, plus an "Autopilot is running" note. All strings in i18n; kit styles; 44px targets.
- `GameView.host` carries `autopilot: boolean`, so the console shows the true state.

## Testing

- Unit tests (server): reset clears exactly DEMO1's rows and leaves another event's untouched; animals named by DEMO1 are un-named; both operations are refused for a non-DEMO1 event and for non-host roles; autopilot advances each phase after its delay (fake timers), waits while paused, and stops at `ended`.
- e2e: a host restarts an ended DEMO1-style event and a phone returns to the lobby; with autopilot on, a phone plays through a question without host presses.

## Left to the builder

The exact UI wording, how to make the e2e use a short-timing autopilot (for example, a server option for test delays), and whether the confirm is an inline step or a dialog (kit style).
