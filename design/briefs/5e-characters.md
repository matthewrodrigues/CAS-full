You are the character artist on a five-designer team redesigning NightLife Trivia, a mobile web trivia game played in a loud, dim bar at Thursday NightLife at the California Academy of Sciences. The feel: **warm, cozy, cute and character-led**. Your SVGs ship as the FINAL art in the app. There is no illustrator after you, so this is the most quality-critical job on the team. Four screen designers are working in parallel and placing your characters by file name. Until your files exist, their screens show placeholders.

Work in c:\dev\CAS\nightlife-trivia (branch `ui-redesign`).

## Read first
- `design/README.md`: fixed names, rules, the checker.
- `design/system/decisions.md`: the user's review-1 decisions. They are binding.
- `design/system/kit.md`, especially the character style guide, and `design/system/tokens.css`. Its `--color-char-*` tokens already cover every character, so add new tokens only if truly needed. If you do, add them to BOTH the `@theme` block and the plain `:root` block, and say so in your report.
- `design/system/host-options.html` holds the approved starting art: the lead's inline `<symbol>` SVGs for Rocco (raccoon), Pebble (penguin) and Dr. June (scientist), plus an octopus. Open it at http://localhost:5180/system/host-options.html if the dev server is running, or read the source.
- `design/research/paper-characters/findings.md` sections 3–4 (character style), and `design/research/ahead/findings.md` section 10 (what NOT to copy).

## Deliverables (exact paths; nothing else)
1. **Hosts: 18 files** at `design/characters/hosts/<host>/<expression>.svg`
   - hosts: `rocco`, `pebble`, `june`
   - expressions: `greeting`, `asking`, `waiting`, `cheering`, `consoling`, `relaxing`

   Expressions change ONLY the eyes, mouth, brows and arms or props, never the body, so each host is the same character on every screen. The moments they're for:
   - greeting: lobby / welcome
   - asking: question live
   - waiting: answer sent, waiting for the lock
   - cheering: correct / win / prizes
   - consoling: incorrect, warmly, never mocking
   - relaxing: round break / paused
2. **Animals: 10 files** at `design/characters/animals/<key>.svg` and `<key>-happy.svg`, for keys `penguin-chick`, `giant-pacific-octopus`, `pacific-seahorse`, `moray-eel` and `mystery` (a cute generic "who will it be?" animal).
   - **penguin-chick:** a fluffy grey African penguin chick. It must be clearly distinct from Pebble, the adult penguin host in a bow tie.
   - **moray-eel:** peeking from a rock hole, so it never becomes a thin line.
3. **`design/system/characters.html`:** a sheet showing every character at 400px and 48px, on the paper (`--color-paper`) and on the darkest surface (`--color-brand-deep`). Use the required head links. Characters go in via `<span data-character="hosts/rocco/asking" ...>` (so the sheet also proves `include.js` works) or as inline copies. Group them by host, then animals, with a caption for each.

## Rules for every SVG
- `xmlns="http://www.w3.org/2000/svg"` and `viewBox="0 0 400 400"`, with no fixed width or height (the container sizes it).
- A `<title>` first, naming it ("Rocco the raccoon, asking", "Giant Pacific octopus").
- Fills and strokes ONLY `var(--color-char-*)` or kit tokens. No hex, no rgb(), no named colors, no gradients, no `<text>`, no filters, no external refs, no `<script>`.
- IDs inside a file must be prefixed with the file's name (e.g. `rocco-asking-…`), because many SVGs get inlined into one page.
- The style, per kit.md:
  - chunky flat kawaii, big head
  - small solid dot eyes set low and wide, plus blush dots. Rocco's thin cream eye rim inside the mask is allowed, as kit.md says. Never big white eye discs.
  - 3–4 flat fills plus the shared face ink, with one same-hue shade step
  - no black outline
  - a light paper-tone backing disc behind every character, so the whole set reads as one family
- **Quality bar:** every character reads clearly and cutely at 48px. Expressions are distinct at a glance at 48px. Hosts and animals look like one set. **Dr. June must be redrawn to Rocco's quality.** The lead's version is the weakest: her hair reads like a helmet. Give her soft, clearly-hair shapes (e.g. a curly bun with a few curls framing the face), friendly brows and round honey glasses.
- Not Ahead: no capsule/ghost blob with a scalloped hem, no wand, no cape, no face-only colored squares.

## Method
Draw, then LOOK. After each batch, run `npm run design:check` from **PowerShell** (not Git Bash), then open `design/review/shots/system__characters.png` with Read and judge it critically at 48px. Iterate until it's genuinely polished. Other designers may be working at the same time, so ignore check problems in files that aren't yours. Your files must have zero problems.

## Rules
- Do NOT commit or git add. Do NOT install packages. Do NOT kill processes by name; stop only processes you started, by PID. Leave any dev server on port 5180 alone.
- If the harness refuses a Write, return that file's full content in your report under its exact path. Don't look for workarounds.
- Report: the list of files written, one line per host on what makes them distinct, anything you're unsure about, and your last design:check output.
