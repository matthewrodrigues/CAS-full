# design/

Mockups for the warm, cozy, cute and character-led redesign. The spec is `docs/superpowers/specs/2026-11-15-ui-redesign-design.md`, and the plan is `docs/superpowers/plans/2026-11-15-ui-redesign-design-phase.md`.

| Folder | What lives there |
|---|---|
| `research/` | Research findings (`findings.md`, committed) and reference screenshots (gitignored, local only, third-party) |
| `system/` | The kit: `tokens.css` (the **only** file with raw colors), `kit.css`, `kit.md`, `include.js`, `decisions.md` |
| `characters/` | Character SVGs: `hosts/<host>/<expression>.svg`, `animals/<key>.svg` and `<key>-happy.svg`, and `placeholder.svg` |
| `screens/` | One HTML mockup per screen state. Phone screens are 390×844. Big-screen files are named `big-*.html` and are 1920×1080 |
| `review/` | Generated screenshots (gitignored) and `consistency.md` |

## Commands

- `npm run design:serve` serves this folder at http://localhost:5180/. The gallery is at `/`, after a check has generated it.
- `npm run design:check` checks every mockup and writes the gallery. It must pass before you report work done.
- On Windows, run both from PowerShell. Vitest misbehaves under Git Bash's `C:/` path casing.

What `design:check` enforces:
- every page links `../system/tokens.css` and `../system/kit.css` and loads `../system/include.js`
- no raw colors outside `system/tokens.css`, including in SVGs
- axe (WCAG 2 A/AA), which covers contrast
- every tap target is at least 44×44, with links inside a sentence exempt
- `[data-role="question"]` text is at least 20px
- no animation runs under `prefers-reduced-motion: reduce`

## Fixed names

- **Hosts:** `rocco` (main host), `pebble`, `june`. Each round has one; see `system/decisions.md`.
- **Host expressions:** `greeting`, `asking`, `waiting`, `cheering`, `consoling`, `relaxing`.
- **Animal keys:** `penguin-chick`, `giant-pacific-octopus`, `pacific-seahorse`, `moray-eel`, `mystery`.
- **To place a character,** use `<span data-character="hosts/rocco/asking"></span>` or `<span data-character="animals/moray-eel-happy"></span>`. `include.js` inlines the SVG, or shows the placeholder until it's drawn. If the character carries meaning, give the span `role="img"` and `aria-label` (axe rejects `aria-label` on a bare span); otherwise leave it decorative.
- **Character SVGs:**
  - `viewBox="0 0 400 400"`
  - fills and strokes only `var(--color-char-*)` or kit tokens
  - no `<text>`
  - a `<title>` naming the species or expression

## Rules

- **The feel:** warm, cozy, cute and character-led. A screen without a character needs a reason.
- **Ahead is inspiration for the feel only.** Never trace or near-copy its art, characters, layouts or palette.
- **Color meaning:** green means correct and red means incorrect. Correct/incorrect pairs color with an icon and a word. Use two or three bright colors per screen at most, and one primary button.
- **Copy:** use real English copy from `server/db/seed-demo.ts`. No text inside SVGs.
- **Text limits:** nickname 24, team name 30, typed answer 200, animal name 30.
- **Missing components:** use kit classes and tokens only. If you need something the kit lacks, add it to `system/kit-additions/<your-area>.css` and say so.
- **Agents don't commit.** The orchestrator checks and commits.
