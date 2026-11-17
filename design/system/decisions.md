# Design decisions

## Review 1 (2026-11-15)

**1. Rocco the raccoon is the night's main host.** He greets everyone in the lobby and runs the final results and prizes. (Option C in `host-options.html`.)

**2. All three hosts take turns, one per round (new feature).** The user's idea; they confirmed this proposal:
- Each round has a host setting: **Rocco, Pebble, Dr. June or Random**. The default for every round is **Random**.
- Random picks a host when the round starts and never repeats the previous round's host.
- Staff set it in the event settings. The live host can override it from the console before a round starts.
- When a new host takes over, the round-break screen introduces them ("Pebble's taking Round 2!"), on phones and the big screen.
- **Pebble stays an adult African penguin in a bow tie**, clearly different from the fluffy grey penguin-chick prize avatar.
- **Dr. June needs another drawing pass.** The lead called her the weakest of the three, with hair that reads like a helmet. She must reach the same quality bar as Rocco.

**3. Tap, then send.** Tapping an answer circles it on your own sheet only. "That's our answer!" sends it for the team, and a team can change and resend until the question locks. The user chose this after trying both flows side by side.
- Players can forget to send, so the host nudges near the end: at 5 seconds, if your circled answer isn't sent, the host says something like "Don't forget to send!"
- This changes today's one-tap behavior (`src/routes/play/answer-choice.tsx`), so the build plan updates the answer flow and its tests.

**4. The look is approved: "Lamplight at the Academy"** (`tokens.css`, `kit.css`, `kit.md`). The user approved the oat and cream colors, the honey tape, the handwritten touches and the midnight-blue accents as they are.

## Provisional defaults (orchestrator, 2026-11-16): confirm at review 2

The Task 6 review raised these for the user. Each one is applied as below so the fixes can proceed, and each will be asked at review 2.
- **Status words:** two are added to the kit's four. "Paused by the host" (`.pill--paused`) and "Place your wager" (for the wager screen).
- **The tab bar** shows on the lobby, the round break and every after-game screen. It's hidden on landing, join, staff, and every question, wager, locked, reveal and paused screen, so nobody opens the leaderboard mid-question.
- **Made-up copy stays as clearly placeholder content:** the "NightLife tote bag" prize and its pickup/expiry, the animal locations, keeper updates and "Professor Wiggles".

## Review 2 (2026-11-16)

**The user approved the full design set** ("I like what I see"). The four provisional defaults above were not separately answered, so they stand as approved-by-default:
- the two new status words
- the tab bar hidden during play
- the tote-bag prize kept as placeholder copy
- the animal copy kept as placeholder copy

The build plan lists the two copy items as open questions to confirm with the user before deploying.

**Follow-ups during build planning (2026-11-16, the user):**
- **"The prize should be naming an animal."** It's the only prize. The made-up tote bag and prize code are gone: the prize-code section is removed from `rewards.html`, and `redeem-code.html` is deleted. The server's code-redemption engine and the staff redeem pages are left as they are (re-themed only), with no player-facing prize codes.
- **"Keep the placeholder animal names."** "Professor Wiggles" and the other placeholder animal copy stay.
