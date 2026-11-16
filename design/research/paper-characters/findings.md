# Research B: paper and characters

For the design lead of the warm, cozy, cute and character-led redesign. Every note below comes from looking at the saved image it cites. The images are gitignored and stay local. They are references for style only. Nothing here is art to trace.

Images 10, 11 and 12 are test pages the researcher built (in the scratchpad, not in the repo). They render the candidate fonts and paper treatments at 390px, with a real question and two 52px answer rows, so the treatments can be judged on the phone screen they're meant for. Image 12 is the same page with `filter: brightness(.55) contrast(.9)` as a rough stand-in for a dimmed phone in a dark bar.

## 1. Paper treatments

Legibility is rated 1–5 for a timed question at 390px in a dim bar, where 5 is "no cost to reading".

| Treatment | Legibility | At 390px | CSS / inline SVG feasibility | Image |
|---|---|---|---|---|
| **Plain warm sheet + soft shadow** (cream paper, 6px radius, a 2px flat "page edge" shadow under a soft drop shadow) | 5 | Reads like a sheet of paper even with no texture. The question sits at full contrast. | Pure CSS: `background`, `border-radius`, two `box-shadow`s. | 11 (A), 12 |
| **Grain / noise** (`feTurbulence` fractal noise in an SVG data URI, as a background) | 5 at low alpha | At 9% alpha it barely shows on a phone, especially when dimmed. Image 03's lit "rough paper" (feDiffuseLighting) is visible, but it's a grey watercolour stock that looks cold and busy behind text. | Inline SVG data URI, no image files. Keep alpha around 6–12% and baseFrequency around .8–1. Skip lighting filters: they cost more to render and make text look dirty. Use a static tile, never animated. | 03, 11 (A) |
| **Notepad rules + red margin** (`repeating-linear-gradient` rules, a 2px margin line) | 3 | It works only if line-height is locked to the rule pitch (32px here). Answer buttons can't sit on the rules, so the rules clash with the button borders and the sheet gets busy (11 B). Image 01, a fixed-width demo, overflows sideways at 390px and its margin and holes fall off-screen. When dimmed, the pale rules disappear (12). That's harmless, but then they add nothing. | Pure CSS gradients. Cheap. | 01, 05, 11 (B), 12 |
| **Punched holes** (radial-gradient circles down the left) | 3 | They cost about 40px of the 390px width. Small dark holes read as bullet points next to the answers (11 B), which confuses scanning. | Pure CSS (`radial-gradient`, repeat-y), with the holes showing the page background colour. | 05, 11 (B) |
| **Index card** (red top rule under a header line, then plain body) | 5 | Best fit at 390: one rule gives the "card" feel without striping the answer area. The header line naturally holds "Question 3 of 10" and the timer. | Pure CSS: one `border-bottom`. | 11 (C) |
| **Folded corner** (dog-ear, top right) | 5 | It reads clearly even at 31px and costs no width, because it sits in the top-right corner, away from the text. Lea Verou's versions (06) show it scaling from small to large notes. Keep it small. A large fold eats the header. | Pure CSS: an angled `linear-gradient` on the sheet plus a `::before` triangle with a small shadow (06, 11 C). | 06, 11 (C) |
| **Tape strip** (translucent washi strip, slightly rotated) | 5 (it sits off the text) | Very cute and cheap. It sits on the sheet's top edge, over the margin and outside the text. In image 02 the pastel paper with tape corners reads well at 390. Dimmed, the tape goes mustard (12), so give it a warmer, more opaque token. | Pure CSS: one absolutely positioned div or `::before`, with `rotate(-3deg)` and a semi-transparent token colour. Dashed side borders fake the torn tape ends. | 02, 11 (C), 12 |
| **Torn / deckle edge** (jagged top edge) | 4 | It reads as torn from a pad at 390 (11 D). The jag is about 10px high and costs almost no space. Use it on one edge only: four torn edges look messy. Image 04's generator gives regular zig-zag and scalloped edges, which read as a ticket or receipt more than torn paper. Scallops could suit a "prize ticket" in the reward flow. | CSS `mask` with an inline SVG path data URI, repeated on x, plus a solid gradient for the rest (11 D). Or the conic-gradient mask from image 04. Note: `box-shadow` is clipped by the mask, so put the shadow on a wrapper with `filter: drop-shadow()`. | 04, 11 (D) |
| **Pencil accents** (hand-drawn circle around the picked letter, hand-font labels) | 5 if limited to accents | A hand-drawn circle around the chosen "B" reads at once as "I circled this" (11 D). It's the most "answer sheet" detail of all, and it costs nothing in legibility. | Inline SVG path with `stroke-linecap: round`. It can be drawn on with `stroke-dashoffset`, off under reduced motion. | 11 (D) |
| **Wobbly hand-drawn borders** (PaperCSS's uneven `border-radius`, e.g. `255px 15px 225px 15px / 15px 225px 15px 255px`) | 4 | Buttons still look tappable and friendly at 390. A thin 1px dark line is weak when dimmed, so use 2px or more. A whole UI in this style starts to feel like a wireframe. | Pure CSS `border-radius`. | 13 |
| **Photo textures and rotated notes** (cork board, rotated sticky note) | 1 | The negative example: the rotated note overflows the 390 viewport and its text is cut off. The photo cork texture is about 640KB and busy. | Needs bitmap images, which breaks the rules. Don't. | 07 |

**Dim-bar notes (image 12):** pale rules and grain vanish when the screen is dimmed, so they never hurt but also stop helping. What does survive is shape: the sheet silhouette, tape, folded corner and torn edge. The rust accent colour at 18px loses contrast when dimmed. Make the accent ink darker than you think, and keep the question in the darkest ink. The 2px beige answer-row borders also fade, so the answer rows need a stronger border or a darker fill to stay findable.

## 2. Fonts

All verified with `npm view <package> name license` on 2026-11-15 (version 5.3.0 for each). The app already uses `@fontsource-variable/figtree` and `@fontsource-variable/fraunces`. These are proposed replacements.

| Font | Role | npm package | License (verified) | Why it's warm / cozy / cute (from image 10) |
|---|---|---|---|---|
| **Fredoka** | Headings, question text | `@fontsource-variable/fredoka` | OFL-1.1 | Fully rounded terminals and soft, chunky shapes. At 600 weight and 22px, "Which animal has three hearts?" is round and friendly but still sturdy. Its width is moderate, so a two-line question fits at 390. It's the most "cute" of the four without being childish. |
| **Nunito** | Body, answer labels, buttons | `@fontsource-variable/nunito` | OFL-1.1 | Rounded-terminal sans with normal proportions. It reads as a workhorse at 19–22px and pairs naturally with Fredoka (both rounded). At 800 weight it's wide and wraps sooner than Fredoka. |
| Baloo 2 | Alternate heading | `@fontsource-variable/baloo-2` | OFL-1.1 | Bouncy and condensed, so it fits the most text per line (the question fits in one line at 22px). Its tight spacing looks slightly cramped on a dim screen. |
| Quicksand | Alternate (not recommended for questions) | `@fontsource-variable/quicksand` | OFL-1.1 | Soft and geometric, but its thin strokes and wide letters wrap to three lines. It's the weakest in a dim bar. |
| **Shantell Sans** | Handwritten / pencil accent (question number, timer, scores, character speech) | `@fontsource-variable/shantell-sans` | OFL-1.1 | Designed as legible handwriting. At 20px, "Q3 of 10 · 20 sec left · 1,450 pts" is the clearest hand font on the sheet, with a large x-height and clear numbers. Its variable "Informal" and "Bounce" axes can make speech bubbles livelier without a second font. |
| Patrick Hand | Alternate accent | `@fontsource/patrick-hand` | OFL-1.1 | Neat marker print, used by PaperCSS (13). Legible at 20px but compact and small. Use about 22px for the same presence. Single weight. |
| Kalam | Alternate accent | `@fontsource/kalam` | OFL-1.1 | Slanted pen script. Legible at 20px, but the slant makes numbers wobble. Fine for short words. |
| Caveat | Not recommended at 20px | `@fontsource-variable/caveat` | OFL-1.1 | Pretty, but tiny x-height. At 20px it reads like 15px. Fine at 28px or more as decoration only. |
| Gaegu | Not recommended | `@fontsource/gaegu` | OFL-1.1 | Very cute pencil look, but thin and widely spaced. It reads small even at 700 weight. |
| Gochi Hand | Not recommended | `@fontsource/gochi-hand` | OFL-1.1 | Bold marker, legible, but uneven baseline and a loud look. Tiring in quantity. |

`@fontsource-variable/sniglet` does not exist (404). Only the static `@fontsource/sniglet` (OFL-1.1) does, which conflicts with the stack note that fonts are variable. Note too that Patrick Hand, Kalam, Gaegu and Gochi Hand exist only as static `@fontsource/*` packages. If the variable-only preference is strict, Shantell Sans is the only variable hand font of these.

## 3. Character styles

Three widely published, openly licensed flat emoji sets were rendered side by side at 120px, at 48px on cream and at 48px on a dark plum background (image 09), plus the react-kawaii illustration library (image 08). These are style references for proportion and detail level. Don't copy any glyph.

**Fluent Emoji Flat style (09, middle row) reads cutest at 48px.**
- Huge head-to-body ratio. The penguin and owl are one rounded blob with the head about 60% of the height.
- Eyes are small solid dots, set wide and low on the face, which is the core kawaii proportion.
- 3–4 flat fills per animal and no outline. The penguin is purple-black, white and orange.
- Shapes are circles and soft lozenges with no fine features (the octopus is a round head plus a ruffle of rounded tentacles).
- At 48px every animal is still recognizable from silhouette and one colour. On dark it holds up because the fills are saturated and the silhouette is chunky.

**Twemoji style (09, top row) is a solid middle ground.** It's flat, 2–4 colours, no outline, with slightly more natural proportions (the penguin has a body and flippers). It reads at 48px, but thinner parts like the snake's body and fish fins turn into strokes. The dark penguin nearly disappears into the dark background (09, dark strip), so a dark animal needs a light rim or a light backing disc.

**OpenMoji style (09, bottom row) reads least cute.** It uses a dark outline with realistic proportions (the penguin is a tall standing bird) and thin limbs. At 48px the 2px-equivalent outline is the only thing holding the shape together, and on the dark strip the outline merges with the background, so the owl and penguin get muddy. Outline styles need the outline drawn in a mid-tone ink, not black, or a backing shape.

**Kawaii face rules (react-kawaii, 08):**
- Faces are just two small dark eyes, a tiny open mouth and two soft blush dots, placed in the lower-middle third of a large rounded body.
- One body hue plus a darker shade of the same hue for depth (the astronaut, backpack and browser are all one green family), so each character is about 3 colours plus face ink.
- Swapping only the mouth and eye shapes (a "Blissful" mood selector exists) gives distinct expressions while the body stays identical. That's exactly what the host's six expressions need.

**What makes a character read as cute at 48px (summary):**
1. **Big head:** head 50–60% of the height, or head and body as one blob.
2. **Eyes low and wide:** below the midline of the head, about one eye-width apart or more. Solid dots, not detailed irises, with an optional single white highlight at large sizes only.
3. **3–5 flat fills** per character from a shared palette, plus one dark "face ink". One shade step gives depth instead of gradients.
4. **No outline, or a soft tinted outline.** Black outlines collapse at 48px on dark. If the lead wants a line, make it 2–3% of the viewBox (8–12 units in a 400 viewBox) in a deep warm tone, not black.
5. **Silhouette first:** each species has one unmistakable shape feature that survives at 48px. Suggested features:
   - penguin chick: fluffy grey round body, white face mask
   - octopus: dome head with curled arms
   - seahorse: curled tail and snout
   - eel: long open-mouthed head peeking from a rock hole, so it doesn't become a thin line
   - mystery animal: a soft question-mark tuft, or a shadowed silhouette with eyes
6. **Minimal interior detail:** at 48px, detail under about 4% of the size (16 units in a 400 viewBox) turns to noise, as with Twemoji's fish stripes and owl feathers.
7. **A backing disc** in a light paper tone behind every avatar keeps dark animals (penguin, eel) readable on any background, and makes the set look like one family.

## 4. Recommendations

**Paper treatment: an index card, with tape and a pencil hand.** The live question sits on a cream index card with:
- one red top rule separating the header ("Question 3 of 10" and the timer, in the hand font) from the question
- a small folded corner at top right
- a strip of washi tape at the top edge
- a hand-drawn pencil circle around the picked answer's letter
- a very light static feTurbulence grain (about 8%) as a bonus, not a requirement

Use the torn top edge for the wager or locked state, as if the sheet were torn off the pad, to signal the change of state without new chrome. Skip notepad rules, punched holes and photo textures.

Reasons:
- Every element sits on the card's edges, so the question and the 44px+ answer rows get a clean, full-contrast field (images 11 C and 12).
- It survives dimming, because its cues are shapes, not faint lines.
- It costs no width at 390px.
- All of it is CSS plus inline SVG with token colours.
- It feels cozy and handmade rather than school-like.

**Font pairing: Fredoka, Nunito and Shantell Sans.**

| Font | Package | Use |
|---|---|---|
| Fredoka | `@fontsource-variable/fredoka` | Question text and headings, 600 weight, 22px or more |
| Nunito | `@fontsource-variable/nunito` | Answers, body and buttons, 700 weight for answer rows |
| Shantell Sans | `@fontsource-variable/shantell-sans` | The handwritten accent: question number, timer, points, the host's speech bubbles and pencil notes, 20px or more |

All three are variable, OFL-1.1 and verified on npm, so they stay inside the variable-font stack. Fredoka and Nunito share rounded terminals, so they feel like one warm family. Shantell Sans is the only hand font tested that stays clearly legible, numbers included, at 20px on a dimmed screen (images 10 and 12). Keep the hand font for short accents, never for the question or the answers.

**Character style: chunky flat kawaii.** The proportion and detail level are like the Fluent Emoji Flat style in image 09, and the face is like react-kawaii in image 08.
- One rounded blob or a big-head body, head about 55–60% of the height.
- Solid dot eyes set low and wide, a tiny mouth, and blush dots.
- 3–4 flat fills per character from one shared token palette, plus a shared dark face ink. One shade step for depth, no gradients.
- No black outline. If a line is used, make it a thick, warm, deep-tone line.
- Every character sits on a light paper-tone disc.
- The host's expressions change only the eyes, mouth, brows and arms, never the body, so the host is the same character on every screen.

Reasons:
- In the side-by-side at 48px on light and dark (image 09), this is the style where every animal stays recognizable and cute.
- The outlined, realistic style (OpenMoji) goes muddy, and the more detailed flat style (Twemoji) loses thin parts and dark bodies.
- Few fills map cleanly to `--color-char-*` tokens.
- It matches the paper card's soft rounded shapes.

## 5. Image index

| File | What it is | Source |
|---|---|---|
| `01-notepad-rules-margin.png` | Ruled notebook demo at 390px: overflows sideways, margin and holes lost | codepen.io/magnificode/pen/rQpaBO |
| `02-paper-tape-pastel.png` | Pastel paper notes with sellotape corners and a top strip, hand font, at 390px | codepen.io/aitchiss/pen/QWKmPqx |
| `03-rough-paper-feturbulence.png` | Rough paper texture from SVG feTurbulence + diffuse lighting | codepen.io/Chokcoco/pen/OJWLXPY |
| `04-zigzag-scalloped-edges.png` | CSS mask generator for zig-zag, scalloped and wavy edges, at 390px | css-generators.com/custom-borders |
| `05-notepad-holes-desktop.png` | Same notebook demo as 01 at 1000px: rules, red margin, punched holes | codepen.io/magnificode/pen/rQpaBO |
| `06-folded-corner-notes.png` | Pure-CSS folded corners at three sizes | codepen.io/leaverou/pen/raGaNR |
| `07-sticky-note-pin-handwritten.png` | Negative example: photo cork texture, rotated sticky note cut off at 390px | codepen.io/glitchgirl/pen/KKKVKJZ |
| `08-kawaii-face-react-kawaii.png` | Kawaii flat SVG characters: one hue family, low dot eyes, blush | react-kawaii.vercel.app (MIT) |
| `09-flat-emoji-styles-48px-compare.png` | Twemoji vs Fluent Emoji Flat vs OpenMoji animals at 120px, 48px, and 48px on dark | Test sheet built from jdecked/twemoji 15.1.0 (CC-BY 4.0), microsoft/fluentui-emoji (MIT), openmoji 15.1.0 (CC BY-SA 4.0) |
| `10-font-specimens-390px.png` | Four heading/body candidates at 22px and six hand fonts at 20px, on cream paper at 390px | Test page, fonts from the fontsource packages above |
| `11-paper-treatments-390px.png` | Four treatments on a real question at 390px: A grain, B notepad and holes, C index card with fold and tape, D torn edge and pencil circle | Test page (CSS and inline SVG only) |
| `12-paper-treatments-dim-sim.png` | Same as 11 under a brightness(.55) dim-bar simulation | Test page |
| `13-papercss-wobbly-borders-390.png` | PaperCSS at 390px: wobbly hand-drawn border-radius buttons, Patrick Hand/Neucha type | getpapercss.com |
