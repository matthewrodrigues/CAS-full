# Ahead: style findings for the NightLife Trivia redesign

Research for the design lead. Ahead (iOS, "the Duolingo for emotions", Apple Design Award 2024 finalist, Social Impact) is our reference for **feel only**. Everything below describes style so we can borrow the mood: warm, cozy, cute and character-led. None of it is art to trace.

**Sources**
- App Store listing (apps.apple.com/us/app/id1570430177): 6 iPhone screenshots, files 01–06. The listing has **no app preview video**, so there is no poster frame to save.
- screensdesign.com: the showcase page (7 screens) plus the app page (`/apps/ahead-emotions-coach/`, 5 more public screens used here and a 16-minute screen recording). Files 07–18 are stills. Files 19–21 are frames taken from the recording. Only its first ~25 seconds are unblurred; screensdesign blurs the rest for logged-out visitors.
- The Apple Design Awards 2024 page lists Ahead as a finalist but served no images of it that could be fetched. Mobbin was not used.

Hex values are **approx.** Most were sampled from a pixel of the named file. Values marked "(by eye)" are estimated from looking at the image. Screens on screensdesign are 640 px wide, compressed WebP, so expect ±5% drift.

---

## 1. Palette

**Two worlds.** Marketing and "immersive" moments sit on deep violet. The working app screens sit on near-white with one pastel field behind the character.

| Role | Hue | Approx. hex | Seen in |
|---|---|---|---|
| Deep night background, top | inky violet | approx. `#321661` | `01-appstore-home-levels-streak.png` |
| Deep background, bottom of gradient | brighter royal violet | approx. `#5A2DB5` (by eye) | `01`, `04-appstore-human-faces-ghost-guide.png` |
| Immersive in-app background | dusky indigo | approx. `#432E95` | `10-flow-social-proof-chart-faces.webp`, `13-flow-ai-coach-story-card.webp` |
| Card on indigo | lighter translucent indigo | approx. `#5846A3`; a darker review card approx. `#2E2067` | `13`, `10` |
| Headline accent word on violet | bright lavender | approx. `#C77DFF` (by eye) | `01`, `03`, `04`, `05` |
| Main app background | near-white, cool | approx. `#FDFDFD` | `11-flow-journey-home-level1-tabbar.webp` |
| Character field / profile header | pale lilac | approx. `#F3E5FC`–`#F4DFFD` | `06-appstore-profile-level-streak.png`, `14-flow-deep-breath-ghost-lilac.webp` |
| Character tile behind the ghost | pale mint | approx. `#DAEEE3` | `07-flow-commit-checkmark-ghost-tile.webp` |
| Primary button / progress fill / active tab | saturated blue-violet | approx. `#6940F2` (also `#6442F0`, `#6741F2`) | `07`, `06`, `11`, `12-flow-reward-gem-unlocked-confetti.webp` |
| Disabled primary button | pale violet, low-contrast white label | approx. `#DFD4FE` | `13` |
| Mascot body | soft lilac | approx. `#E2BFF7`–`#E5BEFB`; scallop hem one step darker approx. `#D3ABE6` | `06`, `14` |
| Eyes / mouths | deep plum, not black | approx. `#491249`–`#4C0D4E` | `06`, `07` |
| Level badge pill | charcoal | approx. `#2F2C2F` | `11` |
| Reward gold (sun badge, stars, wand, laurels) | warm marigold | approx. `#FABC1F` | `06`, `15-flow-welcome-laurels-proof.webp` |
| Streak flame | coral-red | approx. `#FD5F54` | `01` |

**The "emotion" set.** Saturated, flat tile colors, one per topic (`03-appstore-emotion-face-tiles.png`): coral approx. `#FD5F53`, sunflower approx. `#FED756`, jade approx. `#39B27D`, sky approx. `#B1E9FF`, periwinkle approx. `#C0B3F9`, bubblegum approx. `#FF7DB3`. The same family shows up in the lesson tiles: jade approx. `#4BBC91` (`05-appstore-level-lesson-tiles.png`) and butter card approx. `#FEE388` (`02-appstore-pick-journeys-cards.png`).

**Text.** Headings are near-black, warm charcoal rather than pure black (by eye, `07`, `11`). Secondary text is mid grey (`05`, `06`). On violet, text is white, with the key words in lavender (`01`, `04`).

**Bright colors per screen.** Working screens hold to **one brand violet plus one or two pastel fields**. For example, `07` has violet button + mint tile + lilac ghost, `14` is all lilac with one orange sun, and `09-flow-analyzing-ghost-hourglass.webp` is white + lilac + violet bars. Only "catalog" screens break this (`03`, `05`, `11` show four to six tile colors at once), and each tile there is a single flat color. Celebration screens add confetti in many colors for a moment (`12`, `20-video-0016s-commit-confetti.png`).

## 2. Shape and corners

- **Everything is rounded, nothing is pill-perfect by default.** Buttons are wide rectangles with modest corners: about 12–14 px on a 390 px-wide phone, not full pills (`07`, `15`, `16-flow-welcome-flying-ghost-buttons.webp`, `17-flow-signup-ghost-bag-of-faces-transition.webp`).
- **Cards and tiles are squircle-ish**, roughly 16–24 px radius at phone scale: emotion tiles (`03`), journey cards (`02`), stat cards (`06`), the AI story card (`13`), the character tile (`07`).
- **Lesson icons are app-icon-like rounded squares** (about 25% corner radius) with art that breaks out of the frame: a ghost's arm, a squiggle and a red star poke past the edge (`05`, `11`).
- **Big hero curves.** The phone frame in marketing shots has a very large top radius, and the lilac profile header ends in a gentle downward arc behind the stats card (`06`). Soft white clouds made of overlapping circles fill the bottom of every marketing shot (`01`, `02`, `04`).
- **Pills are reserved for small labels**: the "LEVEL 1/3" badge (`05`, `11`), the "Science Policy" chip (`18-flow-science-trust-no-character.webp`), circular icon buttons (settings, close and profile, `06`, `11`), and the center tab button (a circle with a halo ring, `11`).
- **Blobs.** The mascot is a blob: a tall rounded-top capsule with a scalloped hem (`06`, `07`, `14`). Angry shapes are spiky stars (`01`, `05`, `11`). Calm shapes are round and smooth. Shape carries the emotion.

## 3. Edges and shadows

- **Mostly flat.** Illustrations have no outlines and no drop shadows. Depth comes from a second, darker tone of the same hue, like the ghost's hem and arm (`06`, `14`).
- **Very soft, wide, low-opacity shadows** under floating elements: the white stats card on the lilac header (`06`), round icon buttons (`06`, `11`), the primary button (a faint violet glow underneath, `07`, `15`), and the center tab button (`11`).
- **Hairline borders** (about 1 px light grey) on secondary cards and inputs: the stat cards in `06`, the input fields in `17`, the empty "+ 2nd journey" slots in `02`.
- **A colored glow instead of an outline for "selected"**: the chosen journey has a violet ring plus a check badge (`02`).
- **Small ground shadows**: a flat grey pill under the ghost when it stands or hovers (`09`, `14`, `21-video-0003s-breath-ghost-small.png`). It reads as "floating" without any realistic shadow.

## 4. Type

- **One geometric sans, not rounded.** Clean, round bowls, single-storey "g", slightly wide. It is in the Gilroy/Mont family of geometric grotesques (by eye; the exact face isn't confirmed) (`01`, `03`, `11`).
- **Marketing headlines mix weights in one line**: a Light/Regular phrase with one Bold phrase in lavender ("Feel calmer in just **2 weeks**", "Take fun, **5-min steps** every day") (`04`, `05`). This is the most recognizable Ahead type move.
- **In-app headings** are Medium/Semibold, centered, sentence case, about 22–26 px at phone scale, one to two lines: "Find your tools", "Are you ready to invest in yourself?", "Analyzing your answers…" (`07`, `09`, `11`).
- **Body and subtext** are Regular, mid grey, centered under the heading, about 15–17 px (`05`, `11`).
- **Labels on tiles** are white Bold on the saturated tile (`03`). Labels under icons are dark Medium, two lines, centered (`05`).
- **Small caps for status only**: "LEVEL 3", weekday letters "MON TUE…", "YOU UNLOCKED THIS GEM:" (`05`, `11`, `12`).
- Headings feel **calm and plain-spoken**, never shouty. Excitement comes from the characters and color, not the type.

## 5. Characters

- **Cast.** The star is a **lilac ghost-blob mascot** that appears on nearly every screen (`06`, `07`, `09`, `14`, `16`). Each topic also has a flat **emotion face** (a colored square with only eyes and a mouth, `03`). There are spiky "anger" creatures (`05`, `11`), a mint creature with glasses (`02`), a calm blue blob (`02`), and simple human heads for real-life scenarios (`04`, `05`).
- **Shape language.** One simple silhouette per character: capsule body, scalloped hem, two stubby round "hands" floating near the body, no legs (`06`, `14`). Bad feelings are spiky and angular (`05`). Good ones are rounded.
- **Line.** **No outlines at all.** Shapes are filled flat color (`06`, `14`). The only "line" is the facial features: brows, closed-eye arcs and smiles drawn as thick round-capped strokes (`03`, `14`).
- **Shading.** At most one shadow tone of the body hue, used for the hem, the far arm and overlaps (`06`, `14`, `16`). No gradients on the characters themselves; the marketing backgrounds behind them do use gradients (`01`).
- **Eyes.** Large white circles with big plum pupils set high and wide, often looking sideways. The face sits in the top third of the body (`06`, `07`, `03`). Closed eyes are downward arcs for calm (`09`, `14`). A wink is one arc plus one open eye (`06`, `03` "Positivity"). Brows are thick bars, used only when the emotion needs them (anger and confidence in `03`).
- **Mouths.** Tiny: a short smile arc, a wavy "upset" line, an open "D" with a pink tongue for delight (`06`, `03`). There is a dot nose between the eyes on most faces (`03`, `07`).
- **Proportions.** The face is small relative to the body, with lots of empty body below it. That calm emptiness is part of the cuteness (`06`, `14`). On emotion tiles the face is everything and there is no body (`03`).
- **Colors per character.** Two to three: body, a body shade, plum features (plus white eye discs). Props add one accent: a yellow star wand and an orange cape (`04`, `06`), an orange sun (`14`).
- **Expressions.** Calm, closed eyes (`14`); sleepy/thinking with an hourglass (`09`); cheeky wink with a wand (`06`); waving (`19-video-0009s-ghost-hand-demo-check.png`); flying like a rocket (`16`); worried (`11`); frowning while hugging a sack of emotion faces (`17`).
- **How a character guides a step.**
  - It sits **center stage, above the heading** or between the heading and the action. It is never in a corner (`07`, `09`, `14`).
  - It usually stands on a pastel field: a mint rounded tile (`07`) or a full lilac screen (`14`).
  - It "talks" through **the screen's own heading**, not speech bubbles: "Take a deep breath" sits directly under the ghost (`14`), and "Analyzing your answers…" sits under the ghost holding an hourglass (`09`). The character acts out the step; the text names it.
  - **Speech bubbles appear only as small white label tags** pointing at a face on a chart ("Other people" / "Ahead members", `10`) and as a tiny "…" bubble over a character in a card (`02`).
  - For the AI coach, the character shrinks to a **small avatar next to a name** ("Ahead AI") at the top of a text card, like a chat sender (`13`).
  - It **demonstrates the gesture**: a lilac hand draws the checkmark on the mint tile before the user does it (`19`).

## 6. Cards and layout

- **One idea per screen.** Each onboarding step is one question or statement, one visual and one button (`07`, `14`, `15`, `18`). Lesson content is a story-style card with a segmented progress bar at the bottom, one paragraph per card (`13`).
- **Vertical rhythm:** heading at the top third, character in the middle, action pinned to the bottom (`07`, `09`, `12`). There is generous empty space above and below the character, often 30–40% of the screen (`14`).
- **Single full-width primary button**, about 52–56 px tall, fixed near the bottom with about 16 px side margins (`07`, `12`, `15`, `18`). A secondary action is a pale-violet filled button underneath (`16`), or a grey text link (`08-flow-signup-flying-ghost.webp`).
- **Button copy is personal and first-person:** "I promise myself", "I'm ready", "Makes sense", "Had fun! Now I'm done!", "Interesting" (`07`, `10`, `18`, `12`, `13`).
- **Grids** for choosing: two-column tiles of varied height in a playful masonry (`03`), two-column journey cards with an "Add/Added" button inside each card (`02`), and a two-column icon grid of lessons, with the first one centered alone (`05`, `11`).
- **Bottom sheets** with large top radius for sign-up over a dimmed screen (`08`).
- **Margins** are about 16–20 px at phone width. Cards stack with about 12–16 px gaps (`06`).
- **Tab bar:** five tabs with outline icons, active in violet, plus a raised circular center action (`11`).

## 7. Rewards and progress

- **Streak:** a coral flame with a count in the top bar (`01`, `11`), and a "63 Daily streak" stat card (`06`).
- **Week strip:** seven weekday circles that fill violet with a white check when done. Today is a solid dot, the future is empty rings, and an underline progress bar runs under the strip (`01`, `11`).
- **Levels:** a small purple-and-grey castle with a flag and a charcoal "LEVEL N" pill. Each level has a title and subtitle ("Find your tools", "Make sure to notice") (`05`, `11`). The profile shows a gold sun badge with the level number, "Lv. 5", a thick violet progress bar and a percentage (`06`).
- **Journey progress:** a thin violet bar with a % under the journey name (`01`, `11`).
- **Completed lessons:** a violet check badge on the tile's corner (`01`).
- **Unlock rewards:** a treasure chest held by the ghost, "YOU UNLOCKED THIS GEM:", a collectible comic (licensed third-party art, not Ahead's), and full-screen confetti (`12`).
- **Commitment celebration:** confetti bursts from the drawn checkmark and the button changes to "Making a promise…" (`20`).
- **Stats as soft cards:** "41/45 daily activities", "63 daily streak", "8h 12m time spent", each with one small colored icon (`06`).
- **Social proof:** gold laurels around big numbers (`15`, `02`).

## 8. Motion

The App Store listing has no preview video. What follows comes from the first ~25 s of the screensdesign recording (the rest is blurred) and from stills. **Everything here is inferred** unless it says it was seen in sequence.

- **Seen in sequence (video, 7–17 s):** on the "commit" step, a lilac hand slides in over the mint tile and traces a green checkmark. Then the hand leaves and the ghost appears in the tile (`19`, then `07`). After the user draws the check, confetti bursts from the drawing, the button fades to pale and reads "Making a promise…", and the next screen follows (`20`).
- **Seen in sequence (video, 0–4 s):** on "Take a deep breath" the ghost is noticeably smaller at 3 s (`21`) than in the settled still (`14`), and its ground shadow stays put. **Inferred:** a slow scale/rise "breathing" loop.
- **Inferred from stills:** the flying ghost (`16`, `08`) has a rocket-flame tail and scattered sparkles and planets, which suggests a gentle hover or float loop. The hourglass in `09` probably flips while the three progress bars fill in turn. The bag of emotion faces in `17` is caught mid-transition, over the sign-up form, which suggests a character "carries" the user's input into the next step.
- **Inferred:** the segmented bar on story cards (`13`) points to auto-advancing or tap-advancing cards, like Instagram stories.
- The overall motion vocabulary is **soft and bouncy, one hero animation per screen, then rest**. No flashing and no persistent busy background motion was seen (`14`, `19`, `20`).

## 9. What makes it warm, cozy and cute

1. **One lovable mascot, center stage, acting out the step.** It breathes on the breathing screen, holds an hourglass while "analyzing" and holds the treasure chest on the reward. The heading only names what the character is already doing (`09`, `12`, `14`).
2. **Faces that are mostly eyes.** Big white eye discs with large dark pupils set high, a tiny mouth and a dot nose. Expression comes from brows and eyelid arcs, not detail (`03`, `06`, `14`).
3. **Flat, outline-free shapes with a single same-hue shade**, and features in a deep plum instead of black, so nothing feels harsh (`06`, `14`, `07`).
4. **A pastel "stage" behind the character.** A pale tinted tile or a full-screen pastel wash makes a cozy pocket on an otherwise quiet white screen (`07`, `14`, `06`).
5. **One idea, one button, lots of air.** A centered heading, one picture, one full-width button, and the step never asks two things (`07`, `15`, `18`).
6. **First-person, warm button copy.** The user "says" the button ("I'm ready", "Had fun! Now I'm done!"), which makes every tap a tiny agreement with the character (`07`, `10`, `12`).
7. **Small, frequent, physical rewards.** Check badges, a filling week strip, a flame count and confetti on a hand-drawn gesture. Each celebration is brief and personal (`01`, `11`, `12`, `20`).
8. **Shape = feeling.** Calm and happy things are round blobs; frustration is a spiky star. That gives instant emotional reading with no words (`03`, `05`, `11`).

## 10. What to avoid copying

- **The lilac ghost itself.** A capsule/ghost body with a scalloped hem, floating stubby hands, a star wand and an orange cape is Ahead's signature mascot (`04`, `06`, `07`, `16`). Our host must have a different silhouette (an Academy animal or a person). It must not be a lilac ghost blob, and it needs no scalloped hem, no wand and no cape.
- **The emotion-face tiles.** Full-bleed colored squares with only eyes and a mouth and a white Bold label (`03`). Don't make "face-only colored squares" for our animals or categories.
- **The violet brand scheme.** Deep violet `#321661`→royal violet gradients with lavender keyword highlights, plus a `#6940F2` blue-violet primary, plus a lilac mascot (`01`, `04`, `07`). Pick a different primary hue family. Our warm Academy-at-night palette should not read as purple-on-purple.
- **The Light/Bold lavender headline mix** ("Feel calmer in just **2 weeks**", `04`, `05`). It reads as their marketing voice.
- **The level castle with a "LEVEL N" charcoal pill** (`05`, `11`) and the **Mon–Sun circle strip with a flame counter** (`01`, `11`). Both are Ahead's (and Duolingo's) recognizable progress chrome. We have one night per game, so we don't need daily-streak UI at all.
- **The treasure-chest "YOU UNLOCKED THIS GEM" screen** (`12`) and the **"draw a checkmark to commit" gesture** (`07`, `19`, `20`). Both are distinctive interactions.
- **Clouds made of white circles at the bottom of a violet gradient** (`01`, `02`, `04`). It is their store-art framing.
- **App-icon-style lesson tiles with art breaking out of the frame** in a two-column grid (`05`, `11`).

## 11. Image index

All files are in `design/research/ahead/` (gitignored, third-party, for reference only).

| File | What it shows |
|---|---|
| `01-appstore-home-levels-streak.png` | App Store #1: "The Duolingo for Emotional Intelligence"; home with week strip, flame streak, Level 1 castle and lesson tiles; ghost with wand and cape on clouds |
| `02-appstore-pick-journeys-cards.png` | App Store #2: "2 million people / 4.8 stars"; "Pick your journeys" pastel cards with Add/Added buttons; mint glasses character and calm blue blob |
| `03-appstore-emotion-face-tiles.png` | App Store #3: "Explore journeys" masonry of six saturated face-only tiles (Anger, Confidence, Anxiety, Procrastination, Positivity, Heartbreak) |
| `04-appstore-human-faces-ghost-guide.png` | App Store #4: "Feel calmer in just 2 weeks"; simple human head illustrations; large ghost with wand and cape |
| `05-appstore-level-lesson-tiles.png` | App Store #5: Level 3 castle, "Make sure to notice", two-column grid of app-icon-style lesson tiles |
| `06-appstore-profile-level-streak.png` | App Store #6: profile with winking ghost on a lilac header, Lv. 5 progress card, streak and stat cards |
| `07-flow-commit-checkmark-ghost-tile.webp` | Onboarding: "Are you ready to invest in yourself?", ghost on mint tile, draw-a-checkmark pad, "I promise myself" button |
| `08-flow-signup-flying-ghost.webp` | Sign-up bottom sheet over a dimmed welcome screen with the flying ghost |
| `09-flow-analyzing-ghost-hourglass.webp` | "Analyzing your answers…": sleepy ghost holding an hourglass, three violet progress bars |
| `10-flow-social-proof-chart-faces.webp` | Indigo screen with a chart, angry and calm face markers with white label tags, review card, "I'm ready" |
| `11-flow-journey-home-level1-tabbar.webp` | Journey home: Anger 3%, empty week strip, Level 1 castle, lesson tiles, five-tab bar with raised center button |
| `12-flow-reward-gem-unlocked-confetti.webp` | Reward: ghost holding a treasure chest, "YOU UNLOCKED THIS GEM:", licensed third-party comic, confetti, "Had fun! Now I'm done!" |
| `13-flow-ai-coach-story-card.webp` | "Ahead AI" story card on indigo with a small avatar, one paragraph, segmented progress, disabled "Interesting" button |
| `14-flow-deep-breath-ghost-lilac.webp` | Full-lilac screen: calm closed-eyed ghost, sun and cloud, "Take a deep breath" |
| `15-flow-welcome-laurels-proof.webp` | "Meet your personal emotions coach" with gold laurels around stats, "Let's go!" |
| `16-flow-welcome-flying-ghost-buttons.webp` | Welcome: rocket-flying ghost with sparkles and planets, "Get started" plus a pale secondary button |
| `17-flow-signup-ghost-bag-of-faces-transition.webp` | Mid-transition: grumpy ghost carrying a sack of colored emotion faces over the sign-up form |
| `18-flow-science-trust-no-character.webp` | Character-free trust screen: "Science Policy" chip, university logos, "Makes sense" |
| `19-video-0009s-ghost-hand-demo-check.png` | Video frame (0:09): a lilac hand demonstrates drawing the green check on the mint tile |
| `20-video-0016s-commit-confetti.png` | Video frame (0:16): confetti bursting from the drawn check, button changes to "Making a promise…" |
| `21-video-0003s-breath-ghost-small.png` | Video frame (0:03): the breathing ghost at a smaller scale than in file 14 (breathing loop) |

Frames 19–21 show a stray recording-cursor arrow from the source video. Ignore it.
