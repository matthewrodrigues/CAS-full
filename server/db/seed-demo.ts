// Demo content (docs/SPEC.md section 4): one season, the "Deep Sea Night" theme, event DEMO1
// with four rounds and 29 questions covering every type, and three rewards. Host and staff
// access comes from the passcodes in .env, so no accounts are seeded.
import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { eq } from 'drizzle-orm'
import type { MediaKind, QuestionType, RoundFormat } from '../../shared/enums'
import { parseSettings } from '../../shared/settings'
import { validateQuestion, validateRounds } from '../game/content-rules'
import type { Db } from './client'
import { eventQuestions, events, gameState, questionAnswers, questions, rewards, rounds, seasons, themes } from './schema'

export const DEMO_JOIN_CODE = 'DEMO1'

type SeedQuestion = {
  type: QuestionType
  prompt: string
  options?: string[]
  correctOption?: number
  accepted?: string[]
  numeric?: number
  caption?: string
  funFact: string
  difficulty: 1 | 2 | 3
}

type SeedRound = { title: string; format: RoundFormat; media: MediaKind; questions: SeedQuestion[] }

const TRUE = 0
const FALSE = 1

const ROUNDS: SeedRound[] = [
  {
    title: 'Into the Abyss',
    format: 'standard',
    media: 'none',
    questions: [
      {
        type: 'mc',
        prompt: "What is the deepest known point in Earth's oceans?",
        options: ['Challenger Deep', 'Puerto Rico Trench', 'Tonga Trench', 'Java Trench'],
        correctOption: 0,
        funFact: 'Challenger Deep lies at the southern end of the Mariana Trench in the western Pacific.',
        difficulty: 1,
      },
      {
        type: 'typed',
        prompt: 'Which eight-armed animal has three hearts and blue blood?',
        accepted: ['octopus', 'octopuses', 'octopi', 'octopodes'],
        funFact: 'Two hearts pump blood through the gills and the third sends it around the body. Copper in its blood makes it blue.',
        difficulty: 1,
      },
      {
        type: 'true_false',
        prompt: 'Sunlight reaches the sea floor everywhere in the deep ocean.',
        correctOption: FALSE,
        funFact: 'Very little sunlight gets below about 200 meters, and none below about 1,000 meters.',
        difficulty: 1,
      },
      {
        type: 'closest_number',
        prompt: 'In what year did Jacques Piccard and Don Walsh first reach the bottom of Challenger Deep?',
        numeric: 1960,
        funFact: 'They spent about 20 minutes on the bottom in the bathyscaphe Trieste.',
        difficulty: 2,
      },
      {
        type: 'mc',
        prompt: 'What is the name for light made by living things, common in the deep sea?',
        options: ['Bioluminescence', 'Phosphorescence', 'Fluorescence', 'Incandescence'],
        correctOption: 0,
        funFact: 'About three quarters of the animals seen in the deep ocean can make their own light.',
        difficulty: 1,
      },
      {
        type: 'typed',
        prompt: 'Which deep-sea fish hunts with a glowing lure that grows from its head?',
        accepted: ['anglerfish', 'angler fish', 'angler', 'deep sea anglerfish'],
        funFact: 'In many anglerfish the glow comes from bacteria living inside the lure.',
        difficulty: 1,
      },
      {
        type: 'true_false',
        prompt: 'A giant squid has eyes about the size of a dinner plate.',
        correctOption: TRUE,
        funFact: 'Giant and colossal squid have the largest eyes in the animal kingdom, up to about 27 cm across.',
        difficulty: 2,
      },
      {
        type: 'closest_number',
        prompt: "About what percentage of Earth's surface is covered by ocean?",
        numeric: 71,
        funFact: "The ocean also holds about 97% of Earth's water.",
        difficulty: 1,
      },
      {
        type: 'mc',
        prompt: 'Which animal with a bright red plume lives in clusters around hydrothermal vents?',
        options: ['Giant tube worm', 'Bobbit worm', 'Bristle worm', 'Christmas tree worm'],
        correctOption: 0,
        funFact: 'Giant tube worms have no mouth or gut. Bacteria inside them turn chemicals from the vents into food.',
        difficulty: 2,
      },
      {
        type: 'typed',
        prompt: 'What is the name of the deepest ocean zone, below about 6,000 meters and found mostly in trenches?',
        accepted: ['hadal zone', 'hadal', 'hadopelagic zone', 'hadopelagic'],
        funFact: 'It is named after Hades, the Greek god of the underworld.',
        difficulty: 3,
      },
    ],
  },
  {
    title: 'Who Lives Down There?',
    format: 'picture',
    media: 'image',
    questions: [
      {
        type: 'typed',
        prompt: 'This deep-sea octopus is named after a cartoon elephant because of its ear-like fins. What is it?',
        accepted: ['dumbo octopus', 'dumbo', 'dumbo octopuses'],
        funFact: 'Dumbo octopuses have been filmed nearly 7,000 meters down, deeper than any other known octopus.',
        difficulty: 1,
      },
      {
        type: 'mc',
        prompt: 'This fish has a see-through head, and you can watch its eyes move inside it. What is it called?',
        options: ['Barreleye', 'Blobfish', 'Viperfish', 'Lanternfish'],
        correctOption: 0,
        funFact: 'Its tube-shaped eyes can turn inside the clear shield to look straight up or forward.',
        difficulty: 2,
      },
      {
        type: 'true_false',
        prompt: 'The blobfish looks just as blobby in its deep-sea home.',
        correctOption: FALSE,
        funFact: 'At depth the water pressure holds its body in shape. It only sags into a blob when brought to the surface.',
        difficulty: 2,
      },
      {
        type: 'closest_number',
        prompt: 'The colossal squid is the heaviest known invertebrate. The heaviest one ever measured weighed about how many kilograms?',
        numeric: 495,
        funFact: 'That squid was caught in the Ross Sea off Antarctica in 2007.',
        difficulty: 3,
      },
      {
        type: 'mc',
        prompt: 'This slow, cold-water shark lives as deep as 2,000 meters and may live for centuries. Which shark is it?',
        options: ['Greenland shark', 'Great white shark', 'Whale shark', 'Hammerhead shark'],
        correctOption: 0,
        funFact: 'Scientists estimated that one Greenland shark was around 400 years old.',
        difficulty: 2,
      },
      {
        type: 'typed',
        prompt: 'This eel can swallow prey bigger than itself, thanks to a huge jaw like a pelican’s. What is it called?',
        accepted: ['pelican eel', 'gulper eel', 'pelican gulper', 'umbrellamouth gulper'],
        funFact: 'Its stomach stretches to hold a big meal, and the tip of its tail glows.',
        difficulty: 3,
      },
      {
        type: 'true_false',
        prompt: 'The vampire squid drinks blood.',
        correctOption: FALSE,
        funFact: 'It eats "marine snow": drifting bits of dead plankton and debris that it gathers with sticky filaments.',
        difficulty: 2,
      },
      {
        type: 'closest_number',
        prompt: 'This sea cucumber lives on the abyssal plain. About how many meters deep is the ocean floor on average?',
        numeric: 3700,
        funFact: 'In the deepest trenches, sea cucumbers can make up most of the animal life on the bottom.',
        difficulty: 3,
      },
      {
        type: 'mc',
        prompt: 'This crab lives on hydrothermal vents and has hairy arms. What is its nickname?',
        options: ['Yeti crab', 'Bigfoot crab', 'Snow crab', 'Spider crab'],
        correctOption: 0,
        funFact: 'It grows bacteria on its hairy arms, waves them over the vents to help the bacteria grow, and then eats them.',
        difficulty: 1,
      },
    ],
  },
  {
    title: 'Ocean Sounds',
    format: 'sound',
    media: 'audio',
    questions: [
      {
        type: 'mc',
        prompt: 'Which whale, famous for its long and complex songs, is singing here?',
        options: ['Humpback whale', 'Blue whale', 'Sperm whale', 'Orca'],
        correctOption: 0,
        caption: '[Long moans and whoops that rise and fall]',
        funFact: 'The males in one population all sing the same song, and it slowly changes over the season.',
        difficulty: 1,
      },
      {
        type: 'typed',
        prompt: 'Which whale makes the loudest sounds of any animal, using clicks to hunt squid in the deep?',
        accepted: ['sperm whale', 'sperm whales', 'cachalot'],
        caption: '[Fast, sharp clicking]',
        funFact: 'Its clicks can reach about 230 decibels, and it dives deeper than 1,000 meters to hunt.',
        difficulty: 2,
      },
      {
        type: 'true_false',
        prompt: 'Sound travels faster in seawater than in air.',
        correctOption: TRUE,
        caption: '[A single sonar ping and its echo]',
        funFact: 'Sound moves about 1,500 meters per second in seawater, more than four times faster than in air.',
        difficulty: 1,
      },
      {
        type: 'closest_number',
        prompt: 'This low rumble is a blue whale. Blue whales are the largest animals ever known. About how many meters long can they grow?',
        numeric: 30,
        caption: '[A very low, rumbling hum]',
        funFact: 'Their calls are so low that people can barely hear them, but they carry for hundreds of kilometers.',
        difficulty: 2,
      },
      {
        type: 'mc',
        prompt: 'Snapping shrimp make this crackling. What makes the snap?',
        options: ['A collapsing bubble from the claw', 'Shells knocking together', 'Legs rubbing together', 'Teeth grinding'],
        correctOption: 0,
        caption: '[Constant crackling, like bacon frying]',
        funFact: 'The bubble collapses so fast that for an instant it gets about as hot as the surface of the Sun.',
        difficulty: 2,
      },
      {
        type: 'typed',
        prompt: 'Underwater microphones recorded this mystery sound in 1997. What one-word name was it given?',
        accepted: ['bloop', 'the bloop'],
        caption: '[A rising, low-pitched whoosh]',
        funFact: 'Scientists later traced it to ice cracking and breaking off Antarctica.',
        difficulty: 3,
      },
      {
        type: 'true_false',
        prompt: 'Orcas in different family groups use different dialects of calls.',
        correctOption: TRUE,
        caption: '[Squeaky whistles and pulsed calls]',
        funFact: 'Scientists can tell which family group an orca belongs to from its calls.',
        difficulty: 2,
      },
      {
        type: 'closest_number',
        prompt: 'In what year was the album "Songs of the Humpback Whale" released?',
        numeric: 1970,
        caption: '[Humpback whale song]',
        funFact: 'The album became a best seller and helped start the "Save the Whales" movement.',
        difficulty: 3,
      },
      {
        type: 'mc',
        prompt: 'Which animal makes these whistles and clicks, using echolocation to find fish?',
        options: ['Bottlenose dolphin', 'Sea turtle', 'Manatee', 'Moray eel'],
        correctOption: 0,
        caption: '[High whistles and fast clicks]',
        funFact: 'Each bottlenose dolphin has a signature whistle that works like its name.',
        difficulty: 1,
      },
    ],
  },
  {
    title: 'Final Wager',
    format: 'wager',
    media: 'none',
    questions: [
      {
        type: 'typed',
        prompt: 'The ocean zone from about 1,000 to 4,000 meters deep is nicknamed the midnight zone. What is its scientific name?',
        accepted: ['bathypelagic zone', 'bathypelagic', 'bathyal zone', 'bathyal'],
        funFact: 'Below it lie the abyssal zone and, in the trenches, the hadal zone.',
        difficulty: 3,
      },
    ],
  },
]

const DURATION_S: Record<QuestionType, number> = { mc: 20, true_false: 20, typed: 30, closest_number: 30 }
const WAGER_DURATION_S = 45
const POINTS = 10

/** Placeholder media under random names, so a file name can never give the answer away. */
function writePlaceholderMedia(kind: 'image' | 'audio', index: number, mediaDir: string): string {
  const name = `${randomUUID()}.${kind === 'image' ? 'svg' : 'wav'}`
  writeFileSync(join(mediaDir, name), kind === 'image' ? placeholderSvg(index) : toneWav(220 + 40 * index))
  return `/media/${name}`
}

function placeholderSvg(index: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
  <rect width="800" height="600" fill="#1F5C4D"/>
  <circle cx="${200 + index * 50}" cy="260" r="120" fill="#A9D8F5" opacity="0.35"/>
  <text x="400" y="320" text-anchor="middle" font-family="system-ui, sans-serif" font-size="48" fill="#FBF6EA">Picture ${index + 1}</text>
  <text x="400" y="380" text-anchor="middle" font-family="system-ui, sans-serif" font-size="24" fill="#FBF6EA">Placeholder image</text>
</svg>
`
}

/** One second of an 8-bit mono sine tone at 8 kHz, with short fades so it doesn't click. */
function toneWav(frequency: number): Buffer {
  const rate = 8000
  const samples = rate
  const wav = Buffer.alloc(44 + samples)
  wav.write('RIFF', 0)
  wav.writeUInt32LE(36 + samples, 4)
  wav.write('WAVEfmt ', 8)
  wav.writeUInt32LE(16, 16) // fmt chunk size
  wav.writeUInt16LE(1, 20) // PCM
  wav.writeUInt16LE(1, 22) // mono
  wav.writeUInt32LE(rate, 24)
  wav.writeUInt32LE(rate, 28) // bytes per second
  wav.writeUInt16LE(1, 32) // block align
  wav.writeUInt16LE(8, 34) // bits per sample
  wav.write('data', 36)
  wav.writeUInt32LE(samples, 40)
  for (let i = 0; i < samples; i++) {
    const fade = Math.min(1, i / 400, (samples - i) / 400)
    wav[44 + i] = Math.round(128 + 90 * fade * Math.sin((2 * Math.PI * frequency * i) / rate))
  }
  return wav
}

/** Seeds the demo event once. Running it again leaves an existing DEMO1 untouched. */
export function seedDemo(db: Db, { mediaDir }: { mediaDir: string }): { eventId: string; created: boolean } {
  const existing = db.select({ id: events.id }).from(events).where(eq(events.joinCode, DEMO_JOIN_CODE)).get()
  if (existing) return { eventId: existing.id, created: false }

  const roundProblems = validateRounds(ROUNDS.map((r, i) => ({ position: i + 1, format: r.format })))
  if (roundProblems.length) throw new Error(`Seed rounds are invalid: ${roundProblems.join('; ')}`)

  mkdirSync(mediaDir, { recursive: true })
  const seasonId = randomUUID()
  const themeId = randomUUID()
  const eventId = randomUUID()

  // Build every row first, so a content mistake fails before any row is written. Placeholder
  // media files are written while planning, though, so a failed seed can leave a few unused
  // files in the media folder (harmless: nothing points at them).
  let mediaIndex = 0
  const planned = ROUNDS.map((round, r) => ({
    round: { id: randomUUID(), eventId, position: r + 1, title: round.title, format: round.format },
    questions: round.questions.map((q, position) => {
      const mediaUrl = round.media === 'none' ? null : writePlaceholderMedia(round.media, mediaIndex++, mediaDir)
      const question = {
        id: randomUUID(),
        themeId,
        type: q.type,
        prompt: q.prompt,
        options: q.options ?? null,
        mediaKind: round.media,
        mediaUrl,
        caption: q.caption ?? null,
        funFact: q.funFact,
        difficulty: q.difficulty,
        author: 'Seed data',
      }
      const answer = {
        questionId: question.id,
        acceptedAnswers: q.accepted ?? [],
        correctOption: q.correctOption ?? null,
        numericAnswer: q.numeric ?? null,
      }
      const problems = validateQuestion(question, answer)
      if (problems.length) throw new Error(`Seed question "${q.prompt}" is invalid: ${problems.join('; ')}`)
      const wager = round.format === 'wager'
      return {
        question,
        answer,
        eventQuestion: {
          eventId,
          questionId: question.id,
          position: position + 1,
          durationS: wager ? WAGER_DURATION_S : DURATION_S[q.type],
          points: wager ? 0 : POINTS,
        },
      }
    }),
  }))

  db.transaction((tx) => {
    tx.insert(seasons).values({ id: seasonId, name: 'Fall 2026', startsOn: '2026-10-01', endsOn: '2026-12-31' }).run()
    tx.insert(themes).values({ id: themeId, name: 'Deep Sea Night', slug: 'deep-sea-night', accentToken: 'depth' }).run()
    tx.insert(events)
      .values({
        id: eventId,
        seasonId,
        themeId,
        // Thursday 29 October 2026, 6 pm in San Francisco (PDT, UTC-7).
        startsAt: Date.UTC(2026, 9, 30, 1, 0),
        joinCode: DEMO_JOIN_CODE,
        status: 'ready',
        settings: parseSettings({}),
      })
      .run()
    tx.insert(gameState).values({ eventId, phase: 'lobby' }).run()
    for (const { round, questions: rows } of planned) {
      tx.insert(rounds).values(round).run()
      for (const row of rows) {
        tx.insert(questions).values(row.question).run()
        tx.insert(questionAnswers).values(row.answer).run()
        tx.insert(eventQuestions).values({ ...row.eventQuestion, roundId: round.id }).run()
      }
    }
    // Placeholders until the Academy sets the prize list (section 12). No reward involves drinks.
    tx.insert(rewards)
      .values([
        { name: 'Top team prize', tier: 1, description: 'Placeholder for the first-place prize.', expiresAfterDays: 30 },
        { name: 'Runner-up prize', tier: 2, description: 'Placeholder for the second-place prize.', expiresAfterDays: 60 },
        { name: 'Thanks for playing', tier: 3, description: 'Placeholder for a small prize for every team.', expiresAfterDays: 90 },
      ])
      .run()
  })

  return { eventId, created: true }
}
