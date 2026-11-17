# NightLife Trivia design kit

The feel, every time: **warm, cozy, cute and character-led.** A screen without a character needs a reason.

The look is **"Lamplight at the Academy"**: cream index cards under a honey lamp, a midnight-blue sky, cocoa ink, and a soft pastel stage where the host stands. It's night, but cozy, never spooky.

Files:
- `tokens.css`: every color, shadow and font. It's the only file with raw colors.
- `kit.css`: every class below.
- `host-options.html`: the three host options.
- `../screens/question-mc.html`: the reference screen. When this spec is unclear, copy what that screen does.

Every mockup's `<head>` links `../system/tokens.css` and `../system/kit.css`, and loads `../system/include.js`. Don't write new CSS in a mockup. If you need something the kit lacks, add it to `system/kit-additions/<your-area>.css` using tokens only, and flag it.

---

## 1. Color

Use tokens by name. Each one has a job, so don't use it for anything else.

| Token | Job |
|---|---|
| `--color-bg` (Oat) | the page behind everything |
| `--color-surface` (Milk) | options, inputs, list rows, bubbles |
| `--color-paper` | the index card |
| `--color-ink` (Cocoa) | all body text |
| `--color-ink-muted` (Walnut) | secondary text |
| `--color-pencil` (Sepia) | hand-font accents: question number, timer, points, ranks |
| `--color-brand` (Night sky) | the one primary button |
| `--color-pen` (same hue as brand) | "your pick": the pen circle, the picked border, "sent!" |
| `--color-brand-soft` | the picked option's fill and the "you" row |
| `--color-brand-deep` (Midnight) | the darkest surface: big screen, the locked pill, button edges |
| `--color-rule` (Honey) | the card's one header rule. It's decorative, never text |
| `--color-stage`, `-butter`, `-sky` | the pastel stage behind a character |
| `--color-win` (Lamplight) | winners and the top three. Use dark text only |
| `--color-urgent` (Poppy) | the timer at 5 seconds or less. Use dark text only |
| `--color-correct` (Fern) | correct, and only correct. Use dark text only |
| `--color-incorrect` (Tomato) | incorrect, errors and destructive actions |
| `--color-focus` (Orchid) | the focus ring only |
| `--color-line`, `--color-paper-edge`, `--color-tape*`, `--color-stage-deco` | decorative edges. Never use them for text |
| `--color-char-*` | character art only |

**Rules**
- **Green means correct and red means incorrect.** Neither is ever decoration, and each always comes with an icon and a word (`.result`).
- **Two or three bright colors per screen at most.** The calm base doesn't count: Oat, Milk, paper, Cocoa and the line tones. "Bright" means brand, a stage pastel, win, urgent, correct or incorrect.
  - The question screen uses brand, peach stage and honey (the rule and tape).
  - A reveal uses peach or sky stage plus correct or incorrect, and drops brand if it can.
  - **On a reveal, correct and incorrect count as one pair.** "Wrong, and here's the right one" needs both, so it isn't a fourth color.
- **Contrast:** every text pair is listed with its ratio at the top of `tokens.css`. Don't invent new pairs. If you must, check 4.5:1, or 3:1 for text 24px and up.
- **No violet anywhere.** The night is midnight blue and the warmth is honey and peach.

## 2. Fonts

They're loaded in `kit.css` from the jsDelivr builds of the same fontsource packages. The build self-hosts them, and adding the packages needs approval at build time.

| Font | Package | Token | Use |
|---|---|---|---|
| Fredoka | `@fontsource-variable/fredoka` | `--font-heading` | headings and the question, weight 600 |
| Nunito | `@fontsource-variable/nunito` | `--font-sans` | answers (700), body (400–600), buttons (800) |
| Shantell Sans | `@fontsource-variable/shantell-sans` | `--font-hand` | short accents only: question number, timer, points, ranks, the host's speech, "sent!" |

Never use the hand font for the question, the answers, or anything longer than a sentence.

## 3. Type scale (phone, then big screen)

| Variable | Phone | Big | Class | Use |
|---|---|---|---|---|
| `--text-display` | 38 | 88 | `.display` | the one big word or number on a hero screen ("You won!", the final score) |
| `--text-h1` | 30 | 64 | `.h1` | screen titles |
| `--text-h2` | 24 | 44 | `.h2` | section titles, true/false labels, result badges |
| `--text-question` | **24** | 64 | `.question` | the question. Mark it `data-role="question"` |
| `--text-question-min` | **20** | 52 | `.question.question--long` | prompts over about 110 characters. Never smaller |
| `--text-lg` | 20 | 38 | `.hand`, `.option`, `.btn` | answers, buttons, the hand font |
| `--text-md` | 18 | 30 | `.body` (the default) | body, list names |
| `--text-sm` | 16 | 26 | `.small` | the smallest text allowed: captions and hints |

Line height is 1.45 for body text and 1.25 for the question.

## 4. Spacing

Use a 4px base and only these steps: `--space-1` 4, `-2` 8, `-3` 12, `-4` 16, `-5` 20, `-6` 24, `-8` 32, `-10` 40, `-14` 56. The `.big` class scales the larger steps.

- **Phone:** 16px side gutters (`.screen`), 16px between blocks, 12px between options, 20px inside the card.
- **Leave air.** Following Ahead's lesson, one idea per screen. If a screen feels full, cut something rather than shrinking it.

## 5. Corners and edges

Round means happy.

| Variable | Size | Use |
|---|---|---|
| `--radius-control` | 18px | buttons, options, inputs |
| `--radius-card` | 22px | the stage, list rows, bubbles |
| `--radius-pill` | full | pills and tags |
| `--radius-paper` | 10px | **the paper card only**. A real index card has small corners, and that contrast is what makes it read as paper |

Edges are flat and warm, never black and never blurred hard:
- Cards sit on a 3px "page edge" (`--color-paper-edge`) plus a soft cocoa shadow.
- Options sit on a 3px line edge.
- The primary button sits on a 4px Midnight edge and presses down 2px when tapped.

---

## 6. Layout classes

| Class | When |
|---|---|
| `.screen` | Wrap every phone screen in it. It's 390 wide, a column, with 16px gutters |
| `.screen__top` | The first row: the status pill on the left, a hand-font note on the right ("Round 1 of 4"). At least 44px tall |
| `.screen__main` | The middle column, if you need to group things |
| `.screen__actions` | The bottom: the one primary button, plus at most one quiet line under it. `margin-top: auto` keeps it low |
| `.screen--night` | A Midnight screen with paper-colored text. Use it on the big screen, and rarely on the phone (never for a timed question) |
| `.screen--big` | The big-screen grid, 1920×1080: a 640px stage column and a paper column. Put `.big` on `<body>` as well |
| `.stack` / `--tight` / `--loose` | Vertical groups with 12, 8 or 24px gaps |
| `.row` / `.row--between` | Horizontal groups |
| `.row--wide` | A row with room-scale air (32px phone, 56px big): the big-screen QR and join words, or a host and its bubble |
| `.center` | Centered text |
| `.link-row` | A centered, wrapping row of footer links (landing). Each link is a full 44px target |
| `nav.tabbar` > `ul.tabbar__list` > `a.tabbar__link` (+ `.tabbar__icon`) | The player app's four tabs: Play, Leaderboard, Rewards, Animals. The current tab has `aria-current="page"`, a brand icon and a short bar on top (a shape, not just color). It's the last child of `.screen`, after `.screen__actions`, full bleed. See "Where the tab bar shows" below |
| `.seg` > `a.seg__link` | A two-way switch between views of one list (Tonight / Season). Links with `aria-current="page"`, so each view is its own URL |
| `.big-col` | Big screen: a grid column that centers its content vertically (the paper column) |
| `.list--cols-3` | Big screen: a list in three columns (teams in the lobby) |
| `.avatar-row` | A centered row of animal avatars under a caption ("Tonight's prizes" on the big-screen or phone lobby) |
| `.sr-only` | Text for screen readers only |
| `.mock-controls` | **Mockups only:** a row of links that flips a mockup's state. Put it after `</main>` |

**The phone recipe**, top to bottom:
1. `.screen__top` with the status pill
2. the character (on a `.stage`)
3. the one idea (paper card, form or list)
4. `.screen__actions` with the one primary button

The question screen is exactly this.

**Where the tab bar shows**
- **Shown** on `lobby`, `lobby-stress`, `round-break` and every after-game screen (ended, leaderboard, rewards, redeem, feedback, animals). Play is the current tab on the lobby, round break, ended and feedback.
- **Hidden** on `landing` and `join-*` (no session yet), `staff-round-hosts` (staff), and every timed or in-flow sheet: `question-*`, `wager`, `locked`, `reveal-*`, `paused`. The sheet is one idea per screen, the button must stay in thumb reach, and nobody opens the leaderboard mid-question.

## 7. The paper card

```html
<article class="paper">
  <header class="paper__head">
    <div class="paper__meta"><p class="hand">Question 1 of 10</p><p class="small">Into the Abyss · 10 points</p></div>
    <div class="countdown" role="timer">…</div>
  </header>
  <div class="paper__body">
    <h1 class="question" data-role="question">…</h1>
    <ul class="options">…</ul>
  </div>
</article>
```

| Class | What it is |
|---|---|
| `.paper` | The cream index card. It has washi tape centered on the top edge, a small folded corner at top right and a page-edge shadow |
| `.paper__head` | The ruled header. Question number and points go on the left in the hand font, and the countdown on the right. Its one **honey** rule runs edge to edge. The rule is never red, because red means incorrect |
| `.paper__meta` | The left side of the header |
| `.paper__body` | The question and the answers, with 16px gaps |
| `.paper--no-tape` | Drops the tape when something sits right above the card and the tape would collide with it |
| `.paper--torn` inside `.paper-shadow` | "Torn off the pad": a jagged top edge, with no tape and no fold. Use it for **wager** and **locked**. The wrapper carries the shadow, because a mask clips box-shadow |
| `.note` (+ `.note__icon`) | A dashed paper slip for hand-written notes: "Sent!", or "Only your captain can answer". The icon is in pen blue, never green |
| `.fact` > `.fact__icon` + `.fact__label` + `<p>` | The fun fact at the foot of a reveal card: a dashed rule, a pencil lightbulb and a hand-font label ("Fun fact"), then the sentence in Nunito. On the big screen the sentence is `--text-lg` (use a `<p>`, never `.h2`) |
| `.tally` > `.tally__num` + `.tally__label` | A big Fredoka number with its label on one baseline: the round-break score, the wager's points |
| `figure.media` > `.media__frame` + `figcaption` | A picture question's image, framed 2:1 on the card, with a small caption |
| `.clip` > `.clip__bar` (`.clip__play`, `.clip__track` > `.clip__fill`, `.clip__time`, `.clip__cc`) + `.clip__caption` (`.clip__caption-label`) | A sound question's player. Set `--played` (0–1) on the fill. Captions show by default; `.clip__cc` (`aria-pressed`) toggles them |
| `.caption-line` (+ `.caption-line__icon`) | A static caption on paper: an icon plus words (the big screen's spoken caption for a sound question). The player's live captions stay `.clip__caption` |

**Paper rules**
- **Where paper is used:** the question in every type, the wager, locked, the reveal with its fun fact, and the round-break summary card.
  - That's one card per screen. The big screen uses the same card at `.big` scale.
- **Where it isn't:** lists (leaderboard, animals, rewards), forms (join, team, feedback), status chrome, buttons, and anything the player scrolls through.
  - Those use `--color-surface` rows and cards with `--radius-card`.
  - Paper means "this is the game sheet". Keep that meaning.
- Never put grain, notepad lines, holes or rotation on the card. Its cues are shapes (tape, fold, rule and torn edge), because shapes survive a dimmed phone.
- The question is always in the darkest ink (`--color-ink`) on plain paper.
- The tape sits 13px above the card on the phone and 20px above it on the big screen (where it's 176×40 and the fold is 40px). Leave at least 16px of gap above a `.paper` on the phone, and 24px on the big screen.

## 8. Buttons

| Class | When |
|---|---|
| `.btn.btn--primary.btn--block` | **One per screen.** It's the step's main action, in `.screen__actions`. The copy is first-person and warm (§13) |
| `.btn.btn--secondary` | A second, equal-weight choice (e.g. "Not now" next to a sign-up). It's Milk with a Bark border. Use it rarely |
| `.btn.btn--quiet` | A text action like "Skip" or "Change team". It's still 44px tall |
| `:disabled` | Nothing to do yet (no answer picked). It turns paper-edge tan with Walnut text and loses its edge. Say why nearby in a `.small.muted` line |
| `.btn__icon` | An optional 24px icon before the label |
| `.btn.btn--quiet.back-link` | "< All animals" in `.screen__top`: a quiet button with a chevron that never wraps. It sits on the left of the top row |

Buttons are 58px tall on the phone and 96px on the big screen.

**Where the primary goes.** On a play screen it's in `.screen__actions` at the bottom. On a scrolling tab page (rewards, feedback, my animal), the one primary sits directly under the form or card it acts on.

## 9. Answer options

| Class / state | What |
|---|---|
| `ul.options` (`aria-label="Answers"`) | The list. Options sit 12px apart. On the big screen it becomes a 2×2 grid |
| `button.option[aria-pressed]` | One multiple-choice row: `.option__letter` (A–D, hand font, in an answer-sheet bubble) + `.option__label`. It's 60px tall at minimum, and long labels wrap |
| **picked:** `aria-pressed="true"` (or `.is-picked`) | Gets a pen-blue border and edge, a pale blue fill, and **a hand-drawn pen circle around the letter**. The circle is the non-color cue |
| **submitted:** picked + `<span class="option__note">sent!</span>` | The server has the answer. Add a `.note` under the card ("Sent! Tap another answer to change it before time's up."), and the host switches to `waiting` |
| **disabled:** `disabled` | For paused, captain-only and locked. It turns paper with a dashed border and no edge. **The text stays full ink**, so players can still read their answer |
| `.options.options--tf` + `.option.option--tf` | True/false: two tall tiles side by side, with the word in Fredoka 24 under its bubble. A `.option__note` sits under the word, never over the pen circle |
| `.option__sub` | A second, muted line inside an option-style row (join-team: "3 players · Sam is captain") |
| `div.option.option--static` | A non-interactive option row (reveal, big screen). Same look, default cursor |
| `[aria-disabled="true"]` | The disabled look on a static option (big-screen locked), where `disabled` isn't available |
| `.is-correct` / `.is-incorrect` | Reveal only. Puts a colored border on the option, **always** with a `.result` badge on the screen |
| `.option__mark.option__mark--correct` / `--incorrect` | Reveal only: **replaces `.option__letter`** on a revealed row with a filled Fern check or Tomato cross, so the row never relies on its border alone. Same on the big screen |
| `.option__note--muted` | A quiet Walnut row tag ("our pick") on a reveal, where brand is dropped |
| `.option.option--answer` | Big screen: the one revealed answer, full width and one type step up |
| `.field` > `.field__label`, `.field__input`, `.field__foot` > `.field__count` | Typed answers: a 60px input with a hand-font counter ("12 / 200"). The counter never wraps |
| `.field__error` (+ an icon `svg`) and `.field__input[aria-invalid="true"]` | A form error: Tomato text with an icon (never color alone), inside `role="alert"`, and a Tomato input border |
| `.field__input.field__input--area` | A multi-line `<textarea>` (feedback), 120px tall, in body weight |
| `.select` > `select.field__select` | A labeled select with a drawn chevron (the staff event picker) |
| `fieldset.choices` > `label.choice` (`input[type=radio]`, `.choice__avatar` or `.choice__random`) | A picture radio group: four 96px choices with a 48px avatar (staff round hosts). The picked one gets the same pen circle as a picked answer |
| `fieldset.rating` > `.rating__legend` + `.rating__stars` > `label.rating__star` (+ `.is-on`) | 1–5 stars, each a 52px label around a real radio |
| `label.check` > `.check__control` (`input` + `.check__box`) + `.check__text` | A consent checkbox, unticked by default, with a 44px target |
| `.field--number` | Closest number: a big centered Fredoka number, with `inputmode="decimal"` |
| `.field--submitted` | A typed or number answer that's been sent, in pen blue with the same `.note` |

One tap picks, and the primary button ("That's our answer!") sends. Picking another option after sending changes the button to "Send this one instead".

## 10. Status pill, countdown, results

**Status pill:** every play screen shows exactly one, in `.screen__top`, inside `role="status" aria-live="polite"`. It always has an icon or dot plus words.

| Class | Words | Look |
|---|---|---|
| `.pill.pill--waiting` | Waiting for the host | butter, with an hourglass icon |
| `.pill.pill--live` | Question live | mist, with a slow-breathing brand dot (`.pill__dot`) |
| `.pill.pill--locked` | Answers locked | Midnight, with a lock icon |
| `.pill.pill--results` | Results are in | sky, with a star icon |
| `.pill.pill--paused` | Paused by the host | butter, with a pause icon (two bars) |
| `.pill.pill--wager` | Place your wager | mist, with the slow-breathing brand dot, because it's a live input like "Question live" |

Use `.pill__icon` for a 20px inline SVG drawn with `stroke="currentColor"`. On the big screen the icon is 36px and the dot is 18px. On a Midnight screen `.pill--locked` gets a Mist outline so it keeps its shape.

**Pill, tag or chip?**
- `.pill`: the game's status. One per play screen.
- `.tag`: "You", after your name in a list.
- `.chip` (+ `.chip__icon`): an item's status, icon plus words, such as a prize ready or a name approved. `.chip--win` (Lamplight) for that good news; plain (Oat) for the rest.

**Countdown** (`.countdown`, `role="timer"`):
- a drawn ring (`.countdown__ring` > `.countdown__track` + `.countdown__fill` with `pathLength="100"`) and the seconds (`.countdown__num`) in the hand font
- set `--left` (0–1) once a second
- add `.is-urgent` at 5 seconds or less: the ring fills Poppy and the number stays Cocoa
- `.countdown--xl` on the big screen: a 200px ring with the seconds at display size

The number always ticks, because it's information. Only the ring's glide is motion, so it stops under reduced motion.

**Result badges** (`.result`, always color + icon + word):
- `.result--correct`: Fern with Cocoa text, a check icon and "Correct!"
- `.result--incorrect`: Tomato with paper text, a cross icon and "Not quite"

Use `.result__icon` for a 32px SVG with `stroke="currentColor"`.

## 11. Characters on screen

| Class | What |
|---|---|
| `<span class="char char--96" data-character="host/asking">` | Places a character. Sizes: `--48`, `--64`, `--96`, `--128`, `--160`, `--240`, `--400` |
| `.char--idle` | A slow breathing loop. One character per screen at most, and never during a timed question |
| `.stage` | The pastel field (peach by default) with a few tiny stars. The character goes left and a `.bubble` goes right |
| `.stage--butter` | waiting, lobby, round break |
| `.stage--sky` | results, the end |
| `.stage--hero` | Tall and centered: the character, then the heading under it. For lobby, reveal, round break, the end and prizes |
| `.bubble` | The host's speech in the hand font, with its tail pointing left at the speaker |
| `.bubble--down` | The tail points down, for a bubble above a centered character |
| `.bubble--fit` | A bubble that keeps its own size. In a `.stage--hero` every bubble does this automatically, centered. In a `.row`, add `.bubble--fit` so it doesn't stretch to fill the width (the big-screen outgoing host) |
| `.initial` / `.initial--sm` | A player's or team's initial in a hand-font bubble, where a list row would hold an avatar (players and teams have no character). 48px in the lobby; `--sm` (38px) in join-team rows. Never use `.option__letter` for this, because it reads as an answer choice |

**Character sizes**

| Where | Phone | Big screen |
|---|---|---|
| Timed screens (question, wager) | 96px host, side by side with a bubble | 400px |
| Hero screens | 160–240px | 400px |
| List avatars (leaderboard, animals, prizes) | 48px | 96px, including the big-screen prize list |
| A group of prize avatars under a caption (`.avatar-row`, lobby) | 48px | 128px |

Teams don't own animals. On a leaderboard only the top 3 show their **prize** animal; ranks 4 and below have no avatar.

## 12. List rows

`ol.list` > `li.list-row` holds:
- `.list-row__rank`: a hand-font number
- a `.char.char--48` avatar
- `.list-row__name`, with an optional `.list-row__sub` under it
- `.list-row__score`: hand font, tabular

| Modifier | What |
|---|---|
| `.is-top` | Ranks 1–3. The rank sits in a Lamplight bubble |
| `.is-you` | Your team. Pen-blue ring and pale blue fill, plus `<span class="tag">You</span>` after the name, so you can find your team in a 20-team list |
| `a.list-row` | A tappable row (Animals tab). It's already over 44px tall |

A row's text is always Cocoa, on any background (including Midnight).

| Class | What |
|---|---|
| `.list--board` | The big leaderboard and prize list: names and scores one type step up |
| `.chip` | An item's status inside a row or card (see §10) |
| `.card` (+ `.card__head`, `.card__head--split`) | **The one Milk card** for things that aren't the game sheet: a form section, a team list, a won prize, an animal's facts. `.card__head` is an icon or avatar plus a title; `--split` puts a title on the left and a note on the right |
| `.code-display` / `.code-display--xl` | A code to read aloud or type: Fredoka, spaced, tabular. The prize code on the phone; `--xl` for the big-screen join code. Its color inherits, so it works on Milk or Midnight |
| `.qr` | A QR's quiet zone: a plain Milk square, 232px on the phone and 440px on the big screen. Keep characters away from it |
| `figure.photo-slot` > `.photo-slot__frame` + `.photo-slot__caption` | "Meet the real one": the animal's photo. Until staff add one, an empty paper frame with a dashed border and a Walnut icon |
| `ol.feed` > `li.feed__item` (`.feed__date`, `.feed__who`) | Keeper updates, newest first, as a timeline with honey dots |

Names wrap; they're never cut off. Names go up to 30 characters for a team and 24 for a nickname. Headings (`.display`, `.h1`, `.h2`) wrap anywhere too, so a long team name needs no utility class.

## 13. Big screen

Put `.big` on `<body>` and use `.screen.screen--big.screen--night`. Every size variable scales up, so all the classes above just work:

| Element | Big-screen size |
|---|---|
| question | 64px |
| options | a 104px-tall 2×2 grid |
| host | 400px, on a `.stage.stage--hero` in the left column |

The paper card sits in the right column on Midnight, inside `.big-col`.

| Class | What |
|---|---|
| `.hand.hand--night` | The hand-font note on Midnight (top right, "Round 1 of 4"), in Mist. Pencil is too dark there |
| `.muted--night` | Secondary text on Midnight, in Mist: the night pair of `.muted` |

Every big-screen rank takes the 60px width of the top-three bubble, so names line up down the list.

Read it from across the room. Show no more than the top 8 rows of a leaderboard at once, and page through the rest.

---

## 14. Motion

Motion is subtle and brief, and it never flashes. **All of it** sits inside `@media (prefers-reduced-motion: no-preference)`. Under reduced motion nothing animates, and the state still changes instantly.

| What | How | Duration |
|---|---|---|
| A card arrives (`.paper`, `.paper-shadow`, `.enter`) | Rises 10px and fades in | 420ms |
| The pen circle on a pick | Pops and rotates in | 260ms, slight bounce |
| A bubble or result badge | Scales in from 92% | 260ms, starting after 120ms for bubbles |
| Button or option press | Moves down 2px and loses its edge | 120ms |
| The countdown ring | Glides once a second | 1s, linear |
| The live dot | Opacity breathes between 55% and 100% | 2.4s loop |
| `.char--idle` | Rises 1.5% and squashes a little | 3.6s loop. Only on non-timed screens, one character only |

Never move answers, the question or the button during a timed question. Celebrations stay small and brief: the host's cheer plus a sparkle or two, with no confetti storms and no screen shake.

---

## 15. Character style guide

The style is **chunky flat kawaii.** The host and the animals are one set, drawn by the same rules.

**Canvas**
- `viewBox="0 0 400 400"` and a `<title>` (the species or expression).
- No `<text>`.
- Fills and strokes come only from `var(--color-char-*)`.

**Layer order** (every file):
1. **Backing disc:** `circle(200,206) r186` in `--color-char-disc-rim`, then `circle(200,200) r184` in `--color-char-disc`.
2. **Ground shadow:** `ellipse(200,350) rx104 ry14` in `--color-char-disc-rim`.
3. **Back parts:** tail, back arms, hair behind the head.
4. **Body.**
5. **Head.**
6. **Face.**
7. **Front arms and props.**

The disc is part of the art, so a character reads on any background, from paper to Midnight.

**Shape language**
- Everything is built from circles, ellipses and soft lozenges, with no sharp corners. The only points allowed are small, deliberate ones, like the raccoon's cheek tufts or the penguin's beak.
- Each character has **one silhouette feature** that survives at 48px:

| Character | Silhouette feature |
|---|---|
| raccoon host | mask, round ears and a ringed tail |
| penguin chick | a fluffy round grey body with a white face mask |
| octopus | a dome head with curled arms |
| seahorse | a curled tail and a snout |
| moray eel | an open-mouthed head peeking out of a rock hole |
| mystery | a soft blob with a question-mark tuft |

**Proportions**
- The head is 55–60% of the character's height, or head and body are one blob (octopus, penguin).
- The character fills about 75% of the disc: from about y 55 to y 350, and x 60 to 340.
- Props and sparkles may poke just past the disc's edge.

**Line**
- No outlines.
- The only strokes are face strokes, limbs drawn as fat round-capped strokes (30–54 units), and small props.
- Face strokes are 5.5–9 units with round caps.
- Nothing finer than about 16 units carries meaning, because it turns to noise at 48px.

**Fills**
- Use 3–4 flat fills per character: a body color, its `-shade` step, `--color-char-cream`, and one accent such as honey.
- Add the shared face ink `--color-char-ink` and blush `--color-char-blush` on top.
- No gradients, no black, no opacity tricks.
- Depth comes only from the shade step: back arms, ears, tails and undersides.

**Face rules**
- **Eyes are small solid dots set low and wide:**
  - r 10–12
  - about 80–100 units apart
  - below the middle of the head
  - never big white discs with large pupils
- When the eyes sit on a dark patch (the raccoon's mask), they get a thin cream rim, 2–3 units, so they still read.
- **Blush:** two soft ellipses (rx 11–19) just below and outside the eyes. It's always there.
- **Mouth:** small, under and between the eyes. Use one of:
  - a smile arc
  - a "w"
  - an "o" (ink with a tiny tongue)
  - an open "D" (ink with a `--color-char-mouth` tongue)
- **Brows:** short arcs in ink (or hair color), used for asking, consoling and greeting.

**Host expressions** change only the eyes, mouth, brows and arms (plus one small prop). **The body never changes.** That's how players know it's the same host on every screen.

| Expression | Eyes | Mouth | Brows | Arms and prop | Reads as |
|---|---|---|---|---|---|
| `greeting` | open dots | open "D" smile | raised | one arm up, waving | "Hi! Come on in" |
| `asking` | open dots, looking at you | small "w" or "o" | raised arcs | one arm holding up a blank index card with a "?" (drawn as a path) | "Here's the question" |
| `waiting` | dots glancing up and aside | small closed smile | flat | both paws together on the belly | "Got it, let's see…" |
| `cheering` | happy closed arcs (∩) | big open "D" | none | both arms up, plus 1–3 honey sparkles | "Yes!" |
| `consoling` | soft dots with brows tilted up in the middle | small wobbly smile | tilted, worried-kind | one arm on the chest, or a little wave | "Aw, next one!" |
| `relaxing` | closed calm arcs (∪) | gentle smile | none | arms behind the head, or holding a mug | "Take a breather" |

To keep expressions distinct at a glance, check them at 48px: asking has the card, cheering has both arms up, waiting has the paws together, and relaxing has closed eyes. If two look alike at 48px, change the arms.

**Animals** follow the same rules, with the same disc, ink, blush and dot eyes. Each animal has two files:
- `<key>.svg`: neutral, with a small smile.
- `<key>-happy.svg`: closed happy arcs, an open smile and one sparkle. Body pose changes are allowed, like a raised tentacle or a curled tail.

Animals never get the host's index card. The octopus in `host-options.html` is the reference animal.

**Which expression fits which moment**

| Game moment | Host |
|---|---|
| Landing, join, lobby, big-screen lobby | `greeting` |
| A question is live (phone and big screen) | `asking` |
| Answer sent, locked, waiting for the reveal, waiting for the host | `waiting` |
| Reveal: your team was right, the end with a win, prize won | `cheering` |
| Reveal: your team was wrong, a team that won nothing at the end | `consoling` |
| Round break | incoming host `greeting`; outgoing host `relaxing` (small) |
| Paused, feedback and newsletter | `relaxing` |
| Leaderboard | `cheering` for the top, otherwise `waiting`. The animals appear as avatars |

**Screens where the character steps back** (the reason is required): the join and team **forms** use a 64px host next to the heading, not a stage, so the keyboard has room. The redeem QR screen shows no character near the code, so it scans cleanly.

---

## 16. Copy voice

The host is a friendly regular at the bar. Short sentences, warm, a little playful, never sarcastic.

**Button copy** is first-person and warm, the player "saying" it:
- That's our answer!
- Send this one instead
- We're in!
- Let's play!
- Lock in our wager
- Show me my animal

Avoid "Submit", "OK" and "Continue".

**The host's speech** in the bubble:
- six words or fewer
- in the hand font, ending with "!" or "…"
- e.g. "Let's start in the deep end!", "Got it! Fingers crossed…", "Ooh, so close!"

**Status words** are fixed: "Waiting for the host", "Question live", "Answers locked", "Results are in", "Paused by the host" and "Place your wager". The last two are provisional defaults until review 2 (`decisions.md`).

**Correct/incorrect** words are fixed: "Correct!" and "Not quite". Never write "Wrong!" or "Fail".

**General**
- Use sentence case everywhere.
- Use numbers as digits.
- Use the demo seed's real copy. Every string goes through i18n in the build, so never bake text into SVGs.
