// Generates the 5c "after the game" mockups into design/screens/. Output is plain static HTML.
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const OUT = process.argv[2]

// ------------------------------------------------------------------ icons (stroke currentColor)
const svg = (cls, body, extra = '') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${body}</svg>`
const I = {
  play: '<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.6"/><path d="M12 17h.01"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4"/><path d="M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4"/><path d="M8 20h8"/>',
  gift: '<rect x="3.5" y="8" width="17" height="5" rx="1.5"/><path d="M5.5 13v7h13v-7"/><path d="M12 8v12"/><path d="M12 8C10 4 6.5 4 6.5 6.3S12 8 12 8Zm0 0c2-4 5.5-4 5.5-1.7S12 8 12 8Z"/>',
  paw: '<circle cx="6.5" cy="10.5" r="1.7"/><circle cx="10" cy="6.5" r="1.7"/><circle cx="14" cy="6.5" r="1.7"/><circle cx="17.5" cy="10.5" r="1.7"/><path d="M12 12.5c-3 0-5.5 3.4-5.5 5.3 0 1.4 1.1 2.2 2.5 2.2 1.3 0 1.9-.6 3-.6s1.7.6 3 .6c1.4 0 2.5-.8 2.5-2.2 0-1.9-2.5-5.3-5.5-5.3Z"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
  hourglass: '<path d="M6 3h12"/><path d="M6 21h12"/><path d="M8 3v2.5c0 2 4 3.5 4 6.5s-4 4.5-4 6.5V21"/><path d="M16 3v2.5c0 2-4 3.5-4 6.5s4 4.5 4 6.5V21"/>',
  pin: '<path d="M12 21s-6.5-6-6.5-11.5a6.5 6.5 0 0 1 13 0C18.5 15 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.4"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  camera: '<rect x="3" y="6.5" width="18" height="13.5" rx="3"/><circle cx="12" cy="13.2" r="3.6"/><path d="M8.5 6.5 10 4h4l1.5 2.5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20Z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
  alert: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5v5"/><path d="M12 16.2h.01"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
}

// ------------------------------------------------------------------ shared pieces
const head = (title) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="stylesheet" href="../system/tokens.css">
<link rel="stylesheet" href="../system/kit.css">
<link rel="stylesheet" href="../system/kit-additions/after.css">
<script src="../system/include.js"></script>
</head>
<body>
`
const PILL = {
  results: `<span class="pill pill--results">${svg('pill__icon', I.star)}Results are in</span>`,
  waiting: `<span class="pill pill--waiting">${svg('pill__icon', I.hourglass)}Waiting for the host</span>`,
}
const status = (kind = 'results') => `<div role="status" aria-live="polite" id="phase">
      ${PILL[kind]}
    </div>`
const top = (kind = 'results', right = '<p class="hand hand--sm">Game DEMO1</p>') => `  <div class="screen__top">
    ${status(kind)}
    ${right}
  </div>`

const TABS = [
  ['play', 'Play', 'ended-prizes.html', I.play],
  ['leaderboard', 'Leaderboard', 'leaderboard-tonight.html', I.trophy],
  ['rewards', 'Rewards', 'rewards.html', I.gift],
  ['animals', 'Animals', 'animals.html', I.paw],
]
const tabbar = (active) => `  <nav class="tabbar" aria-label="Game sections">
    <ul class="tabbar__list">
${TABS.map(([key, label, href, icon]) => `      <li><a class="tabbar__link" href="${href}"${key === active ? ' aria-current="page"' : ''}>${svg('tabbar__icon', icon)}${label}</a></li>`).join('\n')}
    </ul>
  </nav>`

const seg = (active) => `<nav class="seg" aria-label="Leaderboard view">
    <a class="seg__link" href="leaderboard-tonight.html"${active === 'tonight' ? ' aria-current="page"' : ''}>Tonight</a>
    <a class="seg__link" href="leaderboard-season.html"${active === 'season' ? ' aria-current="page"' : ''}>Fall 2026 season</a>
  </nav>`

const char = (key, size, label) =>
  label
    ? `<span class="char char--${size}" data-character="${key}" role="img" aria-label="${label}"></span>`
    : `<span class="char char--${size}" data-character="${key}" aria-hidden="true"></span>`

const mock = (links) => `<nav class="mock-controls" aria-label="Mockup states">
  <span>Mockup state:</span>
${links.map(([href, label]) => `  <a href="${href}">${label}</a>`).join('\n')}
</nav>`

const foot = (script = '') => `${script ? `\n<script>\n${script.trim()}\n</script>` : ''}
</body>
</html>
`

const ANIMALS = {
  penguin: { key: 'penguin-chick', species: 'African penguin chick', sci: 'Spheniscus demersus', exhibit: 'African Hall penguin colony' },
  octopus: { key: 'giant-pacific-octopus', species: 'Giant Pacific octopus', sci: 'Enteroctopus dofleini', exhibit: 'Steinhart Aquarium, Northern California Coast' },
  seahorse: { key: 'pacific-seahorse', species: 'Pacific seahorse', sci: 'Hippocampus ingens', exhibit: 'Steinhart Aquarium, Water Planet' },
  eel: { key: 'moray-eel', species: 'Moray eel', sci: 'Gymnothorax javanicus', exhibit: 'Philippine Coral Reef' },
}

const youTag = ' <span class="tag">You</span>'
const pts = (n) => `${n}<span class="sr-only"> points</span>`
const ptsText = (n) => `${n} pts`

/** A leaderboard row. prize = an ANIMALS entry for the top three. */
function boardRow({ rank, name, points, you = false, prize = null, sub = null, id = null }) {
  const cls = ['list-row', rank <= 3 && points > 0 ? 'is-top' : '', you ? 'is-you' : ''].filter(Boolean).join(' ')
  const subLine = sub ?? (prize ? `Names the ${prize.species}` : null)
  return `      <li class="${cls}"${you ? ' aria-current="true"' : ''}${id ? ` id="${id}"` : ''}>
        <span class="list-row__rank"><span class="sr-only">Rank </span>${rank}</span>
        ${prize ? char(`animals/${prize.key}`, 48) : ''}
        <span class="list-row__name">${name}${you ? youTag : ''}${subLine ? `<span class="list-row__sub">${subLine}</span>` : ''}</span>
        <span class="list-row__score">${pts(points)}</span>
      </li>`
}

const files = {}

// ================================================================== ended-prizes
const TONIGHT = [
  { rank: 1, name: 'Lanternfish Lounge', points: 196, prize: ANIMALS.penguin },
  { rank: 2, name: 'The Blobfish Brigade', points: 182, prize: ANIMALS.octopus, you: true },
  { rank: 3, name: 'Squid Vicious', points: 175, prize: ANIMALS.seahorse },
  { rank: 4, name: 'Sea Pickles', points: 164 },
  { rank: 5, name: 'The Abyssal Pals', points: 158 },
  { rank: 6, name: 'Trench Coats', points: 147 },
  { rank: 7, name: 'Krill Seekers', points: 139 },
  { rank: 8, name: 'Benthic Bunch', points: 121 },
  { rank: 9, name: 'Hagfish Huddle', points: 104 },
  { rank: 10, name: 'Vampire Squad', points: 96 },
]

/** The prize list on the ended screen: the animal is the star, the team is the sub line. */
function prizeRow({ place, animal, team, points, you = false }) {
  return `      <li class="list-row is-top${you ? ' is-you' : ''}"${you ? ' aria-current="true"' : ''}>
        <span class="list-row__rank"><span class="sr-only">Place </span>${place}</span>
        ${char(`animals/${animal.key}-happy`, 48)}
        <span class="list-row__name">${animal.species}<span class="list-row__sub">${team}${you ? youTag : ''}</span></span>
        <span class="list-row__score">${pts(points)}</span>
      </li>`
}

function endedScreen({ title, stress }) {
  const winner = stress
    ? {
        display: 'Tied for 3rd!',
        body: 'Thanks for playing! Your team finished #3 with 168 points, level with Mariana Trench Coat Collective.',
        bubble: 'A tie! You both win!',
      }
    : { display: '2nd place!', body: 'Thanks for playing! Your team finished #2 with 182 points.', bubble: 'Woo! Look at you go!' }
  const prizes = stress
    ? [
        prizeRow({ place: 1, animal: ANIMALS.penguin, team: 'Hydrothermal Vent Enthusiasts!', points: 201 }),
        prizeRow({ place: 2, animal: ANIMALS.octopus, team: 'Colossal Squid Appreciators', points: 187 }),
        prizeRow({ place: 3, animal: ANIMALS.seahorse, team: 'The Bioluminescent Know-It-All', points: 168, you: true }),
        prizeRow({ place: 3, animal: ANIMALS.seahorse, team: 'Mariana Trench Coat Collective', points: 168 }),
      ]
    : [
        prizeRow({ place: 1, animal: ANIMALS.penguin, team: 'Lanternfish Lounge', points: 196 }),
        prizeRow({ place: 2, animal: ANIMALS.octopus, team: 'The Blobfish Brigade', points: 182, you: true }),
        prizeRow({ place: 3, animal: ANIMALS.seahorse, team: 'Squid Vicious', points: 175 }),
      ]
  const prizeIntro = stress
    ? 'The top 3 teams each name a real Academy animal. Tied teams both suggest a name, and Academy staff pick one.'
    : 'The top 3 teams each name a real Academy animal.'
  const youName = stress ? 'The Bioluminescent Know-It-All' : 'The Blobfish Brigade'
  return `${head(title)}
<main class="screen">
${top()}

  <section class="stage stage--sky stage--hero" aria-labelledby="place">
    <span class="sparkle" style="top: 64px; left: 84px" aria-hidden="true"></span>
    <span class="sparkle sparkle--sm" style="top: 120px; right: 78px" aria-hidden="true"></span>
    <p class="bubble bubble--down" id="speech">${winner.bubble}</p>
    <span id="host-cheer">${char('hosts/rocco/cheering', 160, 'Rocco the raccoon, cheering')}</span>
    <span id="host-console" hidden>${char('hosts/rocco/consoling', 160, 'Rocco the raccoon, consoling')}</span>
    <div class="stack stack--tight">
      <h1 class="display" id="place">${winner.display}</h1>
      <p class="body" id="summary">${winner.body}</p>
    </div>
  </section>

  <section class="stack" aria-labelledby="prizes-title">
    <div class="stack stack--tight">
      <h2 class="h2" id="prizes-title">Tonight's prizes</h2>
      <p class="small muted">${prizeIntro}</p>
    </div>
    <ol class="list" id="prizes">
${prizes.join('\n')}
    </ol>
  </section>

  <div class="screen__actions">
    <a class="btn btn--primary btn--block" href="rewards.html" id="primary">Let's name our ${stress ? 'seahorse' : 'octopus'}!</a>
    <a class="btn btn--quiet" href="feedback.html">Tell us how tonight went</a>
  </div>
${tabbar('play')}
</main>

${mock(
  stress
    ? [
        ['ended-prizes.html', 'Won a prize'],
        ['ended-prizes.html?state=none', 'No prize'],
        ['ended-prizes-stress.html', 'Tie, long names'],
      ]
    : [
        ['ended-prizes.html', 'Won a prize'],
        ['ended-prizes.html?state=none', 'No prize'],
        ['ended-prizes-stress.html', 'Tie, long names'],
      ],
)}
${foot(
  stress
    ? ''
    : `
  // Mockup behavior: ?state=none is a team that finished outside the top 3. Rocco consoles instead.
  if (new URLSearchParams(location.search).get('state') === 'none') {
    document.getElementById('host-cheer').hidden = true
    document.getElementById('host-console').hidden = false
    document.querySelectorAll('.sparkle').forEach((s) => s.remove())
    document.getElementById('speech').textContent = 'So close! See you Thursday?'
    document.getElementById('place').textContent = '7th place'
    document.getElementById('summary').textContent = 'Thanks for playing! Your team finished #7 with 139 points.'
    document.querySelectorAll('#prizes .is-you').forEach((row) => {
      row.classList.remove('is-you')
      row.removeAttribute('aria-current')
      row.querySelector('.tag')?.remove()
    })
    const primary = document.getElementById('primary')
    primary.textContent = 'Show me the leaderboard'
    primary.href = 'leaderboard-tonight.html'
  }
`,
)}`
}
files['ended-prizes.html'] = endedScreen({ title: 'Ended: final result and prizes', stress: false })
files['ended-prizes-stress.html'] = endedScreen({ title: 'Ended: a tie and long team names', stress: true })

// ================================================================== leaderboards
function boardScreen({ title, rows, view = 'tonight', heading, intro, bubble, stress = false, jumpTo = null }) {
  const jump = jumpTo
    ? `
  <a class="list-row is-you" href="#you-row">
    <span class="list-row__rank">${jumpTo.rank}</span>
    <span class="list-row__name">You're ${jumpTo.rank}th of ${rows.length}<span class="list-row__sub">${jumpTo.name} · ${ptsText(jumpTo.points)}</span></span>
    <span class="list-row__score">${svg('btn__icon', '<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>')}<span class="sr-only">Jump to your team</span></span>
  </a>`
    : ''
  return `${head(title)}
<main class="screen">
${top()}

  <section class="stage stage--sky" aria-label="Your host">
    ${char('hosts/rocco/cheering', 96, 'Rocco the raccoon, cheering')}
    <p class="bubble">${bubble}</p>
  </section>

  ${seg(view)}

  <div class="stack stack--tight">
    <h1 class="h1">${heading}</h1>
    <p class="small muted">${intro}</p>
  </div>
${jump}
  <ol class="list" aria-label="${heading}">
${rows.map(boardRow).join('\n')}
  </ol>
${tabbar('leaderboard')}
</main>

${mock([
  ['leaderboard-tonight.html', 'Tonight'],
  ['leaderboard-stress.html', '20 teams'],
  ['leaderboard-season.html', 'Season'],
  ['leaderboard-empty.html', 'No scores yet'],
])}
${foot()}`
}

files['leaderboard-tonight.html'] = boardScreen({
  title: "Leaderboard: tonight",
  rows: TONIGHT,
  heading: "Tonight's leaderboard",
  intro: 'Final scores. The top 3 teams each name an Academy animal.',
  bubble: 'What a night, everyone!',
})

const STRESS = [
  { rank: 1, name: 'Hydrothermal Vent Enthusiasts!', points: 201, prize: ANIMALS.penguin },
  { rank: 2, name: 'Colossal Squid Appreciators', points: 187, prize: ANIMALS.octopus },
  { rank: 3, name: 'Mariana Trench Coat Collective', points: 176, prize: ANIMALS.seahorse },
  { rank: 4, name: 'Lanternfish Lounge', points: 168 },
  { rank: 4, name: 'Dumbo Octopus Fan Club Annex', points: 168 },
  { rank: 6, name: 'Sea Pickles', points: 160 },
  { rank: 7, name: 'The Midnight Zone Night Owls', points: 155 },
  { rank: 8, name: 'Krill Seekers', points: 149 },
  { rank: 9, name: 'Abyssopelagic and Proud of It', points: 142 },
  { rank: 10, name: 'Trench Coats', points: 137 },
  { rank: 11, name: 'The Bioluminescent Know-It-All', points: 131, you: true, id: 'you-row' },
  { rank: 12, name: 'Benthic Bunch', points: 126 },
  { rank: 13, name: 'Pistol Shrimp Sharpshooters', points: 118 },
  { rank: 14, name: 'Hagfish Huddle', points: 111 },
  { rank: 15, name: 'Vampire Squad', points: 104 },
  { rank: 16, name: 'Barreleye Fish Appreciators', points: 97 },
  { rank: 17, name: 'The Abyssal Pals', points: 88 },
  { rank: 18, name: 'Yeti Crab Hairy Arms Society', points: 79 },
  { rank: 19, name: 'Gulper Eels', points: 64 },
  { rank: 20, name: 'Sperm Whale Click Club', points: 51 },
]
files['leaderboard-stress.html'] = boardScreen({
  title: 'Leaderboard: 20 teams',
  rows: STRESS,
  heading: "Tonight's leaderboard",
  intro: 'Final scores for 20 teams. The top 3 teams each name an Academy animal.',
  bubble: 'Twenty teams! What a crowd!',
  stress: true,
  jumpTo: STRESS[10],
})

const SEASON = [
  { rank: 1, name: 'Priya', points: 581, sub: '3 nights · Lanternfish Lounge' },
  { rank: 2, name: 'CaptainCuttlefishFan2026', points: 554, sub: '3 nights · Sea Pickles' },
  { rank: 3, name: 'Dev', points: 540, sub: '3 nights · Lanternfish Lounge' },
  { rank: 4, name: 'Maya', points: 512, sub: '3 nights · The Blobfish Brigade', you: true },
  { rank: 5, name: 'Sam the Squid', points: 497, sub: '3 nights · Squid Vicious' },
  { rank: 6, name: 'Rosa', points: 471, sub: '3 nights · The Abyssal Pals' },
  { rank: 7, name: 'Jonah K', points: 433, sub: '2 nights · Trench Coats' },
  { rank: 8, name: 'Alex', points: 402, sub: '3 nights · Krill Seekers' },
  { rank: 9, name: 'Mei', points: 376, sub: '2 nights · The Blobfish Brigade' },
  { rank: 10, name: 'Tomás', points: 351, sub: '2 nights · Benthic Bunch' },
]
files['leaderboard-season.html'] = boardScreen({
  title: 'Leaderboard: season',
  rows: SEASON,
  view: 'season',
  heading: 'Fall 2026 season',
  intro: 'Every player gets their team’s points each night. Scores run Oct 1 to Dec 31.',
  bubble: 'Look who keeps coming back!',
})

// ------------------------------------------------------------------ leaderboard-empty
files['leaderboard-empty.html'] = `${head('Leaderboard: no scores yet')}
<main class="screen">
${top('waiting')}

  ${seg('tonight')}

  <section class="stage stage--butter stage--hero" aria-labelledby="empty-title">
    <p class="bubble bubble--down">Warming up the scoreboard…</p>
    ${char('hosts/rocco/waiting', 160, 'Rocco the raccoon, waiting')}
    <div class="stack stack--tight">
      <h1 class="h1" id="empty-title">No scores yet</h1>
      <p class="body">Scores appear once the round starts.</p>
    </div>
  </section>

  <section class="card" aria-labelledby="prizes-title">
    <h2 class="h2" id="prizes-title">Tonight's prizes</h2>
    <p class="body">Finish in the top 3 and your team names one of these real Academy animals.</p>
    <ol class="list">
      <li class="list-row is-top"><span class="list-row__rank"><span class="sr-only">Place </span>1</span>${char('animals/penguin-chick', 48)}<span class="list-row__name">African penguin chick<span class="list-row__sub">African Hall penguin colony</span></span></li>
      <li class="list-row is-top"><span class="list-row__rank"><span class="sr-only">Place </span>2</span>${char('animals/giant-pacific-octopus', 48)}<span class="list-row__name">Giant Pacific octopus<span class="list-row__sub">Steinhart Aquarium, Northern California Coast</span></span></li>
      <li class="list-row is-top"><span class="list-row__rank"><span class="sr-only">Place </span>3</span>${char('animals/pacific-seahorse', 48)}<span class="list-row__name">Pacific seahorse<span class="list-row__sub">Steinhart Aquarium, Water Planet</span></span></li>
    </ol>
  </section>

  <div class="screen__actions">
    <a class="btn btn--primary btn--block" href="lobby.html">Take me back to the game</a>
  </div>
${tabbar('leaderboard')}
</main>

${mock([
  ['leaderboard-tonight.html', 'Tonight'],
  ['leaderboard-stress.html', '20 teams'],
  ['leaderboard-season.html', 'Season'],
  ['leaderboard-empty.html', 'No scores yet'],
])}
${foot()}`

// ================================================================== rewards
const oct = ANIMALS.octopus
files['rewards.html'] = `${head('Rewards: name your animal')}
<main class="screen">
${top()}

  <div class="row">
    ${char('hosts/rocco/cheering', 64, 'Rocco the raccoon, cheering')}
    <h1 class="h1">Rewards</h1>
  </div>

  <section class="card" aria-labelledby="naming-title">
    <div class="card__head">
      <span id="avatar-plain">${char(`animals/${oct.key}`, 96)}</span>
      <span id="avatar-happy" hidden>${char(`animals/${oct.key}-happy`, 96)}</span>
      <div class="stack stack--tight">
        <p class="small muted">Place 2 · The Blobfish Brigade</p>
        <h2 class="h2" id="naming-title">Name the Giant Pacific octopus</h2>
      </div>
    </div>
    <p class="small muted row">${svg('btn__icon', I.pin)}<span>See it at ${oct.exhibit}</span></p>
    <p class="body">Can change the color and texture of its skin in a fraction of a second, and loves puzzle feeders.</p>
    <div role="status" aria-live="polite" id="naming-status">
      <p class="chip chip--win">${svg('chip__icon', I.star)}<span>Your team won the right to name this animal!</span></p>
    </div>
    <form class="stack" id="naming-form" novalidate>
      <div class="field">
        <label class="field__label" for="animal-name" id="name-label">Your team's name for it</label>
        <input class="field__input" id="animal-name" maxlength="30" autocomplete="off" value="Professor Wiggles" aria-describedby="name-foot">
        <div class="field__foot" id="name-foot"><span>Academy staff check every name.</span><span class="field__count" id="name-count">17 / 30</span></div>
      </div>
      <button type="submit" class="btn btn--primary btn--block" id="suggest">Suggest this name</button>
    </form>
    <a class="btn btn--primary btn--block" href="my-animal.html" id="show-animal" hidden>Show me my animal</a>
    <a class="btn btn--quiet" href="my-animal.html" id="follow-link">Follow its updates</a>
  </section>

  <section class="stack" aria-labelledby="codes-title">
    <div class="stack stack--tight">
      <h2 class="h2" id="codes-title">Prize codes</h2>
      <p class="small muted">Show this code to staff to collect your prize.</p>
    </div>
    <ul class="list">
      <li><a class="list-row" href="redeem-code.html">
        <span class="list-row__rank">${svg('btn__icon', I.gift)}</span>
        <span class="list-row__name">NightLife tote bag<span class="list-row__sub">Ready to collect · Expires Dec 12</span></span>
        <span class="list-row__score">${svg('btn__icon', I.chev)}<span class="sr-only">Show my code</span></span>
      </a></li>
    </ul>
  </section>
${tabbar('rewards')}
</main>

${mock([
  ['rewards.html', 'Pick a name'],
  ['rewards.html?state=pending', 'With staff'],
  ['rewards.html?state=rejected', 'Name not used'],
  ['rewards.html?state=approved', 'Approved'],
])}
${foot(`
  // Mockup behavior: the naming right's states. Suggesting a name sends it to staff (pending).
  const STAR = ${JSON.stringify(svg('chip__icon', I.star))}
  const CLOCK = ${JSON.stringify(svg('chip__icon', I.clock))}
  const PEN = ${JSON.stringify(svg('chip__icon', I.pencil))}
  const CHECK = ${JSON.stringify(svg('chip__icon', I.check))}
  const input = document.getElementById('animal-name')
  const count = document.getElementById('name-count')
  const statusBox = document.getElementById('naming-status')
  const form = document.getElementById('naming-form')
  const label = document.getElementById('name-label')
  const title = document.getElementById('naming-title')
  const suggest = document.getElementById('suggest')
  const chip = (win, icon, words) => '<p class="chip' + (win ? ' chip--win' : '') + '">' + icon + '<span>' + words + '</span></p>'

  function show(state, proposed) {
    const decided = state === 'approved'
    form.hidden = decided
    document.getElementById('show-animal').hidden = !decided
    document.getElementById('follow-link').hidden = decided
    document.getElementById('avatar-plain').hidden = decided
    document.getElementById('avatar-happy').hidden = !decided
    label.textContent = state === 'open' ? "Your team's name for it" : 'Suggest a different name'
    title.textContent = decided ? proposed + ' the Giant Pacific octopus' : 'Name the Giant Pacific octopus'
    statusBox.innerHTML = {
      open: chip(true, STAR, 'Your team won the right to name this animal!'),
      pending: chip(false, CLOCK, '\\u201c' + proposed + '\\u201d is with Academy staff for approval.'),
      rejected: chip(false, PEN, 'Staff couldn\\u2019t use \\u201c' + proposed + '\\u201d. Try another name.'),
      approved: chip(true, CHECK, 'Approved! The animal is now called ' + proposed + '.'),
    }[state]
    if (state !== 'open') input.value = ''
    update()
  }
  function update() {
    count.textContent = input.value.length + ' / 30'
    suggest.disabled = !input.value.trim()
  }
  input.addEventListener('input', update)
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    if (input.value.trim()) show('pending', input.value.trim())
  })
  const state = new URLSearchParams(location.search).get('state')
  if (state === 'pending') show('pending', 'Professor Wiggles')
  if (state === 'rejected') show('rejected', 'Octo McOctoface')
  if (state === 'approved') show('approved', 'Professor Wiggles')
  update()
`)}`

// ------------------------------------------------------------------ redeem-code
// A deterministic QR-like placeholder: three finder squares plus seeded modules. The app draws the real one.
function qrPlaceholder() {
  const n = 25
  let seed = 7
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  const finder = (x, y) =>
    `<path d="M${x} ${y}h7v7h-7z M${x + 1} ${y + 1}v5h5v-5z" fill-rule="evenodd"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3"/>`
  const inFinder = (x, y) => (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9)
  const cells = []
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!inFinder(x, y) && rnd() < 0.48) cells.push(`M${x} ${y}h1v1h-1z`)
  return `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" fill="var(--color-ink)" aria-hidden="true">${finder(0, 0)}${finder(n - 7, 0)}${finder(0, n - 7)}<path d="${cells.join('')}"/></svg>`
}
files['redeem-code.html'] = `${head('Rewards: redeem code')}
<!-- No character on this screen (kit.md section 15): the QR stays clear of art so it scans cleanly. -->
<main class="screen">
  <div class="screen__top">
    <a class="btn btn--quiet back-link" href="rewards.html">${svg('btn__icon', I.back)}My rewards</a>
    ${status()}
  </div>

  <section class="stack center" aria-labelledby="reward-title">
    <h1 class="h1" id="reward-title">NightLife tote bag</h1>
    <p class="body muted">Pick it up at the info desk before you head home.</p>
    <div role="status" aria-live="polite" id="code-status">
      <p class="chip chip--win" id="chip-ready">${svg('chip__icon', I.check)}<span>Ready to collect</span></p>
      <p class="chip" id="chip-done" hidden>${svg('chip__icon', I.check)}<span>Collected</span></p>
      <p class="chip" id="chip-expired" hidden>${svg('chip__icon', I.clock)}<span>Expired</span></p>
    </div>
  </section>

  <section class="stack center" aria-label="Your prize code" id="code-block">
    <div class="qr" role="img" aria-label="QR code for NightLife tote bag" id="qr">${qrPlaceholder()}</div>
    <p class="small muted">Staff can also type it in:</p>
    <p class="code-display" aria-label="Code: K 7 Q M R X 4 T P A">K7QMR X4TPA</p>
    <p class="small muted" id="expiry">Expires Dec 12, 2026</p>
  </section>

  <p class="note" id="bright-note">
    ${svg('note__icon', I.sun)}
    <span>Turn your screen brightness up so staff can scan it.</span>
  </p>

${tabbar('rewards')}
</main>

${mock([
  ['redeem-code.html', 'Ready'],
  ['redeem-code.html?state=redeemed', 'Collected'],
  ['redeem-code.html?state=expired', 'Expired'],
])}
${foot(`
  // Mockup behavior: once a code is collected or expired, the app stops showing the QR.
  const state = new URLSearchParams(location.search).get('state')
  if (state === 'redeemed' || state === 'expired') {
    document.getElementById('chip-ready').hidden = true
    document.getElementById(state === 'redeemed' ? 'chip-done' : 'chip-expired').hidden = false
    document.getElementById('qr').hidden = true
    document.getElementById('bright-note').hidden = true
    document.getElementById('expiry').textContent = state === 'redeemed' ? 'Collected Nov 12, 2026. Enjoy!' : 'This code expired on Dec 12, 2026.'
  }
`)}`

// ================================================================== feedback
const stars = [1, 2, 3, 4, 5]
  .map(
    (v) => `        <label class="rating__star${v <= 4 ? ' is-on' : ''}">
          <input type="radio" name="rating" value="${v}"${v === 4 ? ' checked' : ''}>
          <svg viewBox="0 0 24 24" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true">${I.star}</svg>
          <span class="sr-only">${v} star${v === 1 ? '' : 's'}</span>
        </label>`,
  )
  .join('\n')
files['feedback.html'] = `${head('Feedback and newsletter')}
<main class="screen">
${top()}

  <section class="stage" aria-label="Your host">
    <span id="host-relax">${char('hosts/rocco/relaxing', 96, 'Rocco the raccoon, relaxing')}</span>
    <span id="host-cheer" hidden>${char('hosts/rocco/cheering', 96, 'Rocco the raccoon, cheering')}</span>
    <p class="bubble" id="speech">Put your feet up and spill!</p>
  </section>

  <form class="card" id="feedback-form" aria-labelledby="feedback-title" novalidate>
    <h1 class="h1" id="feedback-title">How was tonight?</h1>
    <fieldset class="rating">
      <legend class="rating__legend">Rate the game from 1 to 5</legend>
      <div class="rating__stars">
${stars}
      </div>
    </fieldset>
    <div class="field">
      <label class="field__label" for="comment">Anything to tell us? (optional)</label>
      <textarea class="field__input field__input--area" id="comment" maxlength="1000" rows="3" aria-describedby="comment-foot">Loved the octopus round! Could the audio questions be a little louder?</textarea>
      <div class="field__foot" id="comment-foot"><span>Only Academy staff read this.</span><span class="field__count" id="comment-count">69 / 1000</span></div>
    </div>
    <button type="submit" class="btn btn--primary btn--block" id="send">Send my feedback</button>
  </form>
  <div role="status" aria-live="polite"><p class="note" id="feedback-thanks" hidden>
    ${svg('note__icon', I.heart)}
    <span>Thanks for the feedback!</span>
  </p></div>

  <form class="card" id="news-form" aria-labelledby="news-title" novalidate>
    <h2 class="h2" id="news-title">Hear about the next NightLife</h2>
    <div class="field">
      <label class="field__label" for="email">Email</label>
      <input class="field__input" id="email" type="email" autocomplete="email" placeholder="you@example.com">
    </div>
    <label class="check">
      <span class="check__control">
        <input type="checkbox" id="consent" aria-describedby="consent-error">
        <span class="check__box">${svg('', I.check, ' stroke-width="3"').replace('class=""', '')}</span>
      </span>
      <span class="check__text">Yes, email me about NightLife events. I can unsubscribe any time.</span>
    </label>
    <div role="alert" id="consent-error"></div>
    <button type="submit" class="btn btn--secondary btn--block">Sign me up</button>
    <a class="btn btn--quiet" href="#privacy">How we use your data</a>
  </form>
  <div role="status" aria-live="polite"><p class="note" id="news-thanks" hidden>
    ${svg('note__icon', I.mail)}
    <span>You're signed up.</span>
  </p></div>
${tabbar('play')}
</main>

${mock([
  ['feedback.html', 'Filling in'],
  ['feedback.html?state=consent', 'Consent missing'],
  ['feedback.html?state=thanks', 'All sent'],
])}
${foot(`
  // Mockup behavior: stars fill up to the pick, feedback sends with a rating, and the newsletter
  // needs the (unticked) consent box before it sends.
  const stars = [...document.querySelectorAll('.rating__star')]
  const paint = () => {
    const picked = stars.findIndex((s) => s.querySelector('input').checked)
    stars.forEach((s, i) => s.classList.toggle('is-on', i <= picked))
    document.getElementById('send').disabled = picked === -1
  }
  stars.forEach((s) => s.querySelector('input').addEventListener('change', paint))
  const comment = document.getElementById('comment')
  comment.addEventListener('input', () => (document.getElementById('comment-count').textContent = comment.value.length + ' / 1000'))

  const thankFeedback = () => {
    document.getElementById('feedback-form').hidden = true
    document.getElementById('feedback-thanks').hidden = false
    document.getElementById('host-relax').hidden = true
    document.getElementById('host-cheer').hidden = false
    document.getElementById('speech').textContent = 'Thanks, pal! See you Thursday!'
  }
  document.getElementById('feedback-form').addEventListener('submit', (event) => {
    event.preventDefault()
    thankFeedback()
  })

  const consent = document.getElementById('consent')
  const error = document.getElementById('consent-error')
  const ALERT = ${JSON.stringify(svg('btn__icon', I.alert))}
  const needConsent = () => (error.innerHTML = '<p class="field__error row">' + ALERT + '<span>Tick the box to agree first.</span></p>')
  consent.addEventListener('change', () => (error.innerHTML = ''))
  const thankNews = () => {
    document.getElementById('news-form').hidden = true
    document.getElementById('news-thanks').hidden = false
  }
  document.getElementById('news-form').addEventListener('submit', (event) => {
    event.preventDefault()
    if (!consent.checked) return needConsent()
    thankNews()
  })

  const state = new URLSearchParams(location.search).get('state')
  if (state === 'consent') {
    document.getElementById('email').value = 'maya@example.com'
    needConsent()
  }
  if (state === 'thanks') {
    thankFeedback()
    thankNews()
  }
  paint()
`)}`

// ================================================================== animals
function animalRow({ animal, name, sub, latest, you = false, href = 'my-animal.html', happy = false }) {
  return `      <li><a class="list-row${you ? ' is-you' : ''}" href="${href}">
        ${char(`animals/${animal.key}${happy ? '-happy' : ''}`, 48)}
        <span class="list-row__name">${name}${you ? youTag : ''}<span class="list-row__sub">${sub}</span>${latest ? `<span class="list-row__sub">${latest}</span>` : ''}</span>
        <span class="list-row__score">${svg('btn__icon', I.chev)}</span>
      </a></li>`
}
files['animals.html'] = `${head('Animals tab')}
<main class="screen">
${top()}

  <div class="stack stack--tight">
    <h1 class="h1">Academy animals</h1>
    <p class="body muted">Follow the animals trivia teams have named and see news from the keepers.</p>
  </div>

  <section class="stack" aria-labelledby="mine-title">
    <h2 class="h2" id="mine-title">Animals you follow</h2>
    <ul class="list">
${animalRow({ animal: oct, name: 'Professor Wiggles', sub: 'Giant Pacific octopus · named by your team', latest: 'Nov 13: Opened its first puzzle feeder in under four minutes.', you: true, happy: true })}
    </ul>
  </section>

  <section class="stack" aria-labelledby="tonight-title">
    <div class="stack stack--tight">
      <h2 class="h2" id="tonight-title">Tonight's animals</h2>
      <p class="small muted">Tonight's winning teams are picking their names now.</p>
    </div>
    <ul class="list">
${animalRow({ animal: ANIMALS.penguin, name: 'African penguin chick', sub: 'No name yet · ' + ANIMALS.penguin.exhibit })}
${animalRow({ animal: ANIMALS.seahorse, name: 'Pacific seahorse', sub: 'No name yet · ' + ANIMALS.seahorse.exhibit })}
    </ul>
  </section>

  <section class="stack" aria-labelledby="all-title">
    <h2 class="h2" id="all-title">Named by trivia winners</h2>
    <ul class="list">
${animalRow({ animal: ANIMALS.eel, name: 'Noodle', sub: 'Moray eel · named by The Anglerfish Five', latest: 'Nov 10: Weighed in at a healthy 2.1 kg at this week’s checkup.' })}
    </ul>
  </section>
${tabbar('animals')}
</main>

${mock([
  ['animals.html', 'Animals tab'],
  ['my-animal.html', 'My animal'],
])}
${foot()}`

// ------------------------------------------------------------------ my-animal
files['my-animal.html'] = `${head('My animal')}
<main class="screen">
  <div class="screen__top">
    <a class="btn btn--quiet back-link" href="animals.html">${svg('btn__icon', I.back)}All animals</a>
    ${status()}
  </div>

  <section class="stage stage--hero" aria-labelledby="animal-name">
    ${char(`animals/${oct.key}-happy`, 160, 'Professor Wiggles, a giant Pacific octopus, looking happy')}
    <div class="stack stack--tight">
      <h1 class="h1" id="animal-name">Professor Wiggles</h1>
      <p class="body">Giant Pacific octopus · <i>${oct.sci}</i></p>
      <p class="small muted">Named by The Blobfish Brigade on Nov 12</p>
    </div>
  </section>

  <section class="card" aria-label="About Professor Wiggles">
    <p class="body row">${svg('btn__icon', I.pin)}<span>See it at ${oct.exhibit}</span></p>
    <p class="body">Can change the color and texture of its skin in a fraction of a second, and loves puzzle feeders.</p>
  </section>

  <button type="button" class="btn btn--primary btn--block" id="follow" aria-pressed="false">${svg('btn__icon', I.heart)}<span>Follow this animal</span></button>

  <section class="stack" aria-labelledby="real-title">
    <h2 class="h2" id="real-title">Meet the real one</h2>
    <figure class="photo-slot">
      <div class="photo-slot__frame" role="img" aria-label="Photo of Professor Wiggles, coming soon">${svg('', I.camera, ' stroke-width="1.6"').replace('class=""', '')}</div>
      <figcaption class="photo-slot__caption">Professor Wiggles at home in the Northern California Coast tank. Say hi on your next visit!</figcaption>
    </figure>
  </section>

  <section class="stack" aria-labelledby="updates-title">
    <h2 class="h2" id="updates-title">Updates</h2>
    <ol class="feed">
      <li class="feed__item">
        <time class="feed__date" datetime="2026-11-15">Nov 15</time>
        <p class="body">Professor Wiggles spent the whole morning exploring a new rock pile the keepers built in the tank. It tucked itself into the deepest gap, turned the same rusty red as the rocks, and only came out when the crab treats arrived. Come by in the afternoon, when it's usually most active, and look low on the left side of the window.</p>
        <p class="feed__who">From the Steinhart Aquarium keepers</p>
      </li>
      <li class="feed__item">
        <time class="feed__date" datetime="2026-11-13">Nov 13</time>
        <p class="body">Opened its first puzzle feeder in under four minutes.</p>
        <p class="feed__who">From the Steinhart Aquarium keepers</p>
      </li>
    </ol>
  </section>
${tabbar('animals')}
</main>

${mock([
  ['my-animal.html', 'Not following'],
  ['my-animal.html?state=following', 'Following'],
  ['animals.html', 'Animals tab'],
])}
${foot(`
  // Mockup behavior: the follow toggle. Following drops to a secondary button you can tap to stop.
  const follow = document.getElementById('follow')
  const set = (on) => {
    follow.setAttribute('aria-pressed', String(on))
    follow.classList.toggle('btn--primary', !on)
    follow.classList.toggle('btn--secondary', on)
    follow.querySelector('span').textContent = on ? 'Following · tap to stop' : 'Follow this animal'
  }
  follow.addEventListener('click', () => set(follow.getAttribute('aria-pressed') !== 'true'))
  if (new URLSearchParams(location.search).get('state') === 'following') set(true)
`)}`

for (const [name, html] of Object.entries(files)) writeFileSync(join(OUT, name), html)
console.log('wrote', Object.keys(files).length, 'files')
