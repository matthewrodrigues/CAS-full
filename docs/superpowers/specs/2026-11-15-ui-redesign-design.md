# UI redesign: warm, cozy, cute and character-led

Date: 2026-11-15. Status: ready for the user's approval.

## Intent

The current UI works but looks like a placeholder: most screens say so in code, and the look ("nature after dark") was never designed screen by screen. The user wants players at Thursday NightLife to open the app in a loud, busy bar and feel that it is **warm, cozy, cute and character-led**: soft, rounded and friendly, with characters and the Academy's animals as the stars. Every design agent's brief uses these four words.

**Character-led** means the characters carry the experience, not decorate it: the host character guides each step (greets you in the lobby, asks each question, reacts at the reveal, cheers at the end), and the animals are the prizes you play for and follow afterward. A screen without a character on it should be the exception, and needs a reason (e.g. a form where a character would get in the way).

The inspiration is the iOS app **Ahead** (anger and stress relief, "the Duolingo for emotions"): friendly illustrated characters, short card-sized steps, soft rounded shapes, small rewards. We borrow its feel. We never copy its art, characters, layouts or branding.

## Goals

1. **Animal avatars.** Every animal a team can win naming rights to gets an illustrated avatar. They form one matching set and appear wherever an animal appears: the prize list, ended screen, Rewards, the Animals tab and My Animal feed, and the big screen's prize reveal.
2. **A host character** who "asks" each question, on the phone and the big screen. The human host still runs the night from the host console; the character is the on-screen face of the game (lobby greeting, asking each question, reacting at the reveal, round breaks, the end).
3. **A paper answer sheet.** The live question screen looks and feels like paper (a sheet, card or notepad: the design lead decides) for every question type: multiple choice, true/false, typed, closest number, with image or audio. The same treatment carries through the wager, locked and reveal screens.
4. **Every player screen and the big screen restyled** to the new look (SPEC section 7's screen list).
5. **Three hosts, one per round** (added at review 1, see `design/system/decisions.md`):
   - Rocco the raccoon is the main host for the lobby, the end and prizes.
   - Each round is hosted by Rocco, Pebble (penguin) or Dr. June (scientist), chosen per round in the event settings. Random is the default and never repeats the previous round's host. The live host can override before a round starts.
   - The round break introduces the incoming host.
6. **Tap, then send** (added at review 1): a tap circles an answer on your own sheet, and "That's our answer!" sends it for the team. Teams can change and resend until the lock, and the host nudges at 5 seconds if a circled answer isn't sent.

## Non-goals

- No new game features or rule changes beyond goals 5 and 6, which the user added at review 1. Otherwise: same phases, same data, same API, except the small additions needed to show avatars (below) and each round's host.
- Host console and staff pages are **re-themed only** (new tokens and fonts apply automatically through the shared components), not redesigned.
- No dark mode (still out of scope, SPEC section 7).
- No native app.

## Anti-goals (fails even if it technically works)

- It looks like Ahead: traced or near-copied characters, its palette or screens lifted directly.
- Characters that don't match: the host looks different on two screens, or the animals look like they come from different sets.
- Cute at the cost of play: question text smaller than 20px, tap targets under 44px, low contrast in a dim bar, motion that distracts during a timed question, or a big screen that can't be read across the room.
- Paper as a gimmick: a texture that hurts legibility or makes a timed screen feel slow.

## Constraints (from the codebase and SPEC section 7)

- **Tokens only.** Every color is a token in `src/styles/tokens.css`; `src/styles/no-raw-colors.test.ts` fails on raw colors in components. The token *values* and *names* may change in the redesign. Fonts and radii also live there.
- **Green means correct.** Correct/incorrect always pairs color with an icon and a word. Brand and decoration colors must not read as correct/incorrect.
- UI rules stay: question text ≥ 20px, tap targets ≥ 44px, one primary button per screen, two or three bright colors per screen, clear status on every play screen, friendly empty states, subtle motion fully disabled under `prefers-reduced-motion`, no flashing, `aria-live` phase announcements, captions on by default for audio.
- **The `live_background` setting is dropped (user decision, 2026-11-15).** The paper sheet is the one live-question look. Remove the setting from staff settings, `shared/game.ts`, `server/game/`, `question-screen.tsx` and its tests, and update SPEC section 2's "Live-question background" row to match. The A/B test isn't planned.
- **The agents' SVG art is the final art that ships (user decision).** There's no illustrator step. So the character work has a quality bar: every character must read clearly at 48px and at full big-screen size; the host and the animals must look like one set; and expressions must be distinct at a glance. It gets at least one revision round after each user review. If the user rejects every host option at review 1, the lead produces a second round of options before the swarm starts.
- **Only the user reviews (user decision).** No Academy sign-off gate; the two user reviews are the only approvals.
- Stack: React, Tailwind v4, shadcn/ui (`src/components/ui`), self-hosted variable fonts via `@fontsource-variable`. Fonts may change; they stay self-hosted.
- Definition of done (CLAUDE.md): tests and axe pass, and each screen matches its `design/screens/` reference **at 390px wide**. So phone mockups are designed at 390px, and the big screen at 1920×1080.
- Every user-visible string goes through i18n, including any text a character "says".
- The avatar field (below) is a schema change: `server/db/schema.ts` plus a generated migration, planned in plan mode.
- **Base branch:** the redesign branches off `animal-naming` (08cc77d), the code the live demo runs. Its migration comes after the existing ones on that branch. Merging the milestone stack to `main` is a separate decision, not part of this work.
- The demo is live at https://nightlife-trivia.fly.dev. Deploying the redesign needs the user's approval, and never during an event.

## Approaches considered (the design workflow)

1. **One designer does everything.** Consistent, but slow and serial. Rejected: the user wants parallelism.
2. **Research, then a swarm of designers straight off the research.** Fast, but five designers working from the same notes will make five different looks. Rejected.
3. **Research → a design lead sets the visual language → a parallel swarm designs the screens from the lead's kit → a consistency review.** Chosen. The lead's step is short and is what makes the parallel step safe. The user reviews after the lead and again after the full set, while changes are still cheap.

## The workflow (as decided)

**1. Research: 2 agents, in parallel.** Output goes in `design/research/`.
- **A: Ahead.** Uses the user's Chrome to study Ahead's App Store screenshots (apps.apple.com/us/app/id1570430177) and the fuller flows on screensdesign.com. Saves the screenshots as images and writes specific notes: palette, corner radius, shadows/edges, type, how characters are drawn (shape language, line, shading, expressions), how a character guides a step, card layout, rewards, motion.
- **B: Paper and characters.** References for a paper feel that stays legible on a phone (paper grain, torn/punched edges, notepad lines, handwritten accents) and for warm, cozy character styles that work as small SVGs.
- Both agents describe style; neither produces art to be traced.

**2. Design lead: 1 agent.** Reads both research briefs and this doc and produces the kit in `design/system/`:
- token values (colors, fonts, radii, shadows) to replace `tokens.css`, with the correct/incorrect rule kept;
- the paper treatment, as a reusable component spec;
- the character style guide: shape language, line weight, palette, expressions; **2–3 options for who the host character is** (e.g. an Academy animal or a friendly scientist), each sketched;
- one fully designed sample screen (the live question on paper) in HTML.
- ★ **User review 1:** the user picks the host character and approves or redirects the look.

**3. Design swarm: 5 agents, in parallel**, each given the approved kit. Output is clickable HTML mockups in `design/screens/` (SPEC section 7 already says screens are built to match their reference there), using the kit's tokens:
- **Joining:** landing, join, team, lobby.
- **The paper sheet:** question (all four types, with image and audio), wager, locked, reveal and fun fact, round break, paused.
- **After the game:** ended and prizes, leaderboard (tonight and season), Rewards and redemption QR, feedback and newsletter, Animals tab and My Animal feed.
- **Big screen:** lobby with QR, the host character asking the question, locked, reveal, leaderboard, prize reveal.
- **Characters:** the host (every expression the screens need) and an avatar for every animal, as one SVG set. This one agent owns all character art so it stays one style; screen designers use placeholders until it lands.

**4. Consistency review: 1 agent.** Checks every mockup against the kit and against each other (corners, edges, paper, character use, color counts, the UI rules above) and lists the fixes; the owning designers apply them.
- ★ **User review 2:** the full set.

**5. Implementation plan, then build.** Written after review 2 (superpowers:writing-plans).

## Data needed for avatars (my call)

Animals have `species` and an optional `image_url` (a photo), but no avatar. Proposal: each animal gets an `avatar` key that picks an SVG from the character set bundled in the app (e.g. `octopus`), not an upload, so staff choose from the set and avatars always match. A species without a drawn avatar falls back to a generic, cute "mystery animal". The demo's four animals (penguin chick, giant Pacific octopus, Pacific seahorse, moray eel) get avatars first; the set grows over time.

- **Launch set (my call):** the four demo animals plus the mystery fallback. The key is a fixed list in `shared/`, validated with zod; adding a species is a code change plus a deploy, done between events.
- **Picking an avatar (my call):** the existing staff "add animal" form (`src/routes/staff/staff-page.tsx`) gets one avatar select. This is the only staff-page change beyond the re-theme.
- **Avatar vs photo (my call):** the avatar is the animal's face everywhere. The optional `image_url` photo, which the player UI doesn't show today, appears only on the Animals tab / My Animal detail as "meet the real one". The schema keeps `image_url` unchanged.

## My calls (the user can override)

- Host console and staff: re-theme only.
- Colors may change completely: the current ones are ours, not Academy branding (SPEC section 13 still lists Academy brand guidelines as possibly changing tokens later).
- Characters are SVG in code: crisp at any size, small, and recolorable through tokens.
- Designs are HTML mockups reviewed in the browser, then built into the React screens.

## Left to the builder and the design agents

- The exact paper treatment (sheet, card, notepad) and how far it extends beyond the question screen.
- Fonts, palette, character expressions and motion, within the constraints above.
- How mockups are split into HTML files, and how the research images are named.
