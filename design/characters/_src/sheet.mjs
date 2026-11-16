// Writes design/system/characters.html
import { writeFileSync } from 'node:fs'
const EXPR = ['greeting', 'asking', 'waiting', 'cheering', 'consoling', 'relaxing']
const MOMENT = {
  greeting: 'lobby and welcome',
  asking: 'a question is live',
  waiting: 'answer sent, waiting for the lock',
  cheering: 'correct, win, prizes',
  consoling: 'not quite, warmly',
  relaxing: 'round break or paused',
}
const groups = [
  {
    id: 'rocco', title: 'Rocco, the raccoon', note: 'The night’s main host. He greets the lobby and runs the final results and prizes. Mask, round ears and a ringed tail.',
    items: EXPR.map((e) => ({ key: `hosts/rocco/${e}`, name: e, cap: MOMENT[e] })),
  },
  {
    id: 'pebble', title: 'Pebble, the penguin', note: 'An adult African penguin in a sky-blue bow tie, with pink brows and a spotted chest.',
    items: EXPR.map((e) => ({ key: `hosts/pebble/${e}`, name: e, cap: MOMENT[e] })),
  },
  {
    id: 'june', title: 'Dr. June, the scientist', note: 'Redrawn: a curly bun with a pencil through it, curls framing her face, round honey glasses and a lab coat with the sleeves rolled up.',
    items: EXPR.map((e) => ({ key: `hosts/june/${e}`, name: e, cap: MOMENT[e] })),
  },
  {
    id: 'animals', title: 'Prize animals', note: 'Each animal has a neutral file and a happy file. The mystery animal stands in before a team’s animal is revealed.',
    items: [
      ['penguin-chick', 'Penguin chick'],
      ['giant-pacific-octopus', 'Giant Pacific octopus'],
      ['pacific-seahorse', 'Pacific seahorse'],
      ['moray-eel', 'Moray eel'],
      ['mystery', 'Mystery animal'],
    ].flatMap(([k, n]) => [
      { key: `animals/${k}`, name: n, cap: 'neutral' },
      { key: `animals/${k}-happy`, name: n, cap: 'happy' },
    ]),
  },
]

const fig = (it, size) =>
  size === 400
    ? `<figure class="sheet__fig"><span class="char char--400 sheet__big" data-character="${it.key}"></span><figcaption><strong>${it.name}</strong><br><span class="small">${it.cap}</span></figcaption></figure>`
    : `<figure class="sheet__fig sheet__fig--small"><span class="char char--48" data-character="${it.key}"></span><figcaption class="small">${it.name}${it.key.endsWith('-happy') ? ', happy' : ''}</figcaption></figure>`

const board = (gr, tone) => `
    <div class="sheet__board sheet__board--${tone}">
      <p class="sheet__label">${tone === 'paper' ? 'On paper' : 'On Midnight'}</p>
      <div class="sheet__big-row">
        ${gr.items.map((it) => fig(it, 400)).join('\n        ')}
      </div>
      <p class="sheet__label">At 48px</p>
      <div class="sheet__small-row">
        ${gr.items.map((it) => fig(it, 48)).join('\n        ')}
      </div>
    </div>`

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Character sheet</title>
<link rel="stylesheet" href="../system/tokens.css">
<link rel="stylesheet" href="../system/kit.css">
<script src="../system/include.js"></script>
<style>
  /* Sheet layout only. The characters themselves are the SVG files, inlined by include.js. */
  .sheet { max-width: 1340px; margin: 0 auto; padding: var(--space-6) var(--space-4) var(--space-10); display: flex; flex-direction: column; gap: var(--space-10); }
  .sheet__intro { max-width: 64ch; display: flex; flex-direction: column; gap: var(--space-3); }
  .sheet__group { display: flex; flex-direction: column; gap: var(--space-4); }
  .sheet__group > header { display: flex; flex-direction: column; gap: var(--space-2); max-width: 70ch; }
  .sheet__board { border-radius: var(--radius-card); padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-3); }
  .sheet__board--paper { background: var(--color-paper); box-shadow: var(--shadow-card); }
  .sheet__board--night { background: var(--color-brand-deep); color: var(--color-paper); }
  .sheet__label { font-size: var(--text-sm); font-weight: 700; }
  .sheet__big-row { display: flex; flex-wrap: wrap; gap: var(--space-4); }
  .sheet__small-row { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: flex-start; }
  .sheet__fig { margin: 0; display: flex; flex-direction: column; align-items: center; gap: var(--space-1); text-align: center; max-width: 100%; }
  .sheet__fig--small { width: 96px; }
  .sheet__big { max-width: 100%; height: auto; aspect-ratio: 1; }
</style>
</head>
<body>
<main class="sheet">
  <header class="sheet__intro">
    <p class="hand">Design kit · characters</p>
    <h1 class="h1">Who’s who tonight</h1>
    <p>Every host expression and every prize animal, at 400px and at 48px, on the paper card and on Midnight, the darkest surface. Each one is the shipped SVG file, placed with <code>data-character</code>, so this sheet also proves <code>include.js</code> loads them. A host’s body never changes between expressions; only the eyes, mouth, brows, arms and one small prop do.</p>
  </header>
${groups
  .map(
    (gr) => `
  <section class="sheet__group" aria-labelledby="g-${gr.id}">
    <header>
      <h2 class="h2" id="g-${gr.id}">${gr.title}</h2>
      <p>${gr.note}</p>
    </header>${board(gr, 'paper')}${board(gr, 'night')}
  </section>`,
  )
  .join('\n')}
</main>
</body>
</html>
`
writeFileSync('C:/dev/CAS/nightlife-trivia/design/system/characters.html', html)
console.log('ok')
