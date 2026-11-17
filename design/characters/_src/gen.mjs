// Generates the character SVGs for design/characters/. Run: node gen.mjs <designDir>
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const out = process.argv[2]
const c = (n) => `var(--color-char-${n})`
const r1 = (n) => Math.round(n * 10) / 10

// ---------- primitives ----------
const P = (d, fill) => `<path d="${d}" fill="${fill}"/>`
const S = (d, stroke, w, extra = '') =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`
const circ = (x, y, r, f) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="${f}"/>`
const ell = (x, y, rx, ry, f, rot) =>
  `<ellipse cx="${r1(x)}" cy="${r1(y)}" rx="${r1(rx)}" ry="${r1(ry)}"${rot ? ` transform="rotate(${r1(rot)} ${r1(x)} ${r1(y)})"` : ''} fill="${f}"/>`
/** A soft lozenge limb from base to tip (penguin flippers, wings). */
const flip = (bx, by, tx, ty, w, f) => {
  const len = Math.hypot(tx - bx, ty - by)
  const rot = (Math.atan2(ty - by, tx - bx) * 180) / Math.PI
  return ell((bx + tx) / 2, (by + ty) / 2, len / 2, w / 2, f, rot)
}
const g = (t, inner) => `<g transform="${t}">${inner}</g>`

const DISC =
  circ(200, 206, 186, c('disc-rim')) + circ(200, 200, 184, c('disc')) + ell(200, 350, 104, 14, c('disc-rim'))

const SPARK_D = 'M0 -18C3 -5 5 -3 18 0C5 3 3 5 0 18C-3 5 -5 3 -18 0C-5 -3 -3 -5 0 -18Z'
const spark = (x, y, size) => g(`translate(${x} ${y}) scale(${r1(size / 36)})`, P(SPARK_D, c('honey')))
const HEART_D = 'M0 15C-23 1 -21 -16 -10 -16C-4 -16 -1 -12 0 -9C1 -12 4 -16 10 -16C21 -16 23 1 0 15Z'
const heart = (x, y, s = 1, rot = 0) => g(`translate(${x} ${y}) rotate(${rot}) scale(${s})`, P(HEART_D, c('mouth')))

// The asking prop: a blank index card with a honey rule and a "?" drawn as a path.
const card = (x, y, rot, s = 1.15) =>
  g(
    `translate(${x} ${y}) rotate(${rot}) scale(${s})`,
    `<rect x="-40" y="-30" width="80" height="60" rx="8" fill="${c('cream')}"/>` +
      P('M-40 -22a8 8 0 0 1 8 -8h64a8 8 0 0 1 8 8v3h-80z', c('cream-shade')) +
      S('M-29 -10h58', c('honey'), 4.5) +
      S('M-8 2q0 -10 8 -10q8 0 8 8q0 6 -8 8v4', c('ink'), 6) +
      circ(0, 21, 4, c('ink')),
  )

// The relaxing prop: a mug of cocoa with two curls of steam.
const mug = (x, y, steam) =>
  S(`M${x - 8} ${y - 30}q-9 -9 0 -18q9 -9 0 -18`, steam, 7) +
  S(`M${x + 10} ${y - 32}q-8 -8 0 -15q8 -8 0 -15`, steam, 7) +
  S(`M${x + 22} ${y - 10}q18 2 16 14q-2 12 -16 10`, c('honey-shade'), 9) +
  `<rect x="${x - 25}" y="${y - 24}" width="50" height="52" rx="12" fill="${c('honey')}"/>` +
  ell(x, y - 22, 22, 6, c('hair')) +
  `<rect x="${x - 25}" y="${y + 4}" width="50" height="9" fill="${c('honey-shade')}"/>`

// Little wave marks beside a waving hand.
const waves = (x, y, dir = -1) =>
  S(`M${x} ${y - 16}q${dir * 10} 16 0 32`, c('honey'), 9) + S(`M${x + dir * 18} ${y - 26}q${dir * 16} 26 0 52`, c('honey'), 9)

// ---------- faces ----------
const ink = c('ink')
const eyesDot = (L, R, y, { r = 11, dx = 0, dy = 0, rim = null } = {}) =>
  (rim ? circ(L, y, r + 3, rim) + circ(R, y, r + 3, rim) : '') + circ(L + dx, y + dy, r, ink) + circ(R + dx, y + dy, r, ink)
const eyesHappy = (L, R, y, col = ink, w = 9) =>
  S(`M${L - 14} ${y + 6}q14 -20 28 0`, col, w) + S(`M${R - 14} ${y + 6}q14 -20 28 0`, col, w)
const eyesCalm = (L, R, y, col = ink, w = 8) =>
  S(`M${L - 14} ${y - 3}q14 13 28 0`, col, w) + S(`M${R - 14} ${y - 3}q14 13 28 0`, col, w)
const blush = (L, R, y, rx = 15, ry = 9) => ell(L, y, rx, ry, c('blush')) + ell(R, y, rx, ry, c('blush'))

const mouthD = (x, y, w = 34, h = 24) =>
  P(`M${x - w / 2} ${y}H${x + w / 2}Q${x + w / 2 - 2} ${y + h} ${x} ${y + h + 1}Q${x - w / 2 + 2} ${y + h} ${x - w / 2} ${y}Z`, ink) +
  P(`M${x - w * 0.31} ${y + h - 6}Q${x} ${y + h - 15} ${x + w * 0.31} ${y + h - 6}Q${x + 6} ${y + h} ${x} ${y + h}Q${x - 6} ${y + h} ${x - w * 0.31} ${y + h - 6}Z`, c('mouth'))
const mouthW = (x, y, w = 6) => S(`M${x - 14} ${y}q7 8 14 0q7 8 14 0`, ink, w)
const mouthO = (x, y) => ell(x, y, 10, 10, ink) + ell(x, y + 4, 6, 4, c('mouth'))
const mouthSmile = (x, y, w = 24, sw = 6.5) => S(`M${x - w / 2} ${y}q${w / 2} ${w * 0.42} ${w} 0`, ink, sw)
const mouthWobble = (x, y, sw = 6) => S(`M${x - 15} ${y}Q${x - 8} ${y + 8} ${x} ${y + 4}Q${x + 8} ${y + 8} ${x + 15} ${y}`, ink, sw)

const browsRaised = (L, R, y, col = ink, w = 7) => S(`M${L - 16} ${y + 3}q16 -12 32 -1`, col, w) + S(`M${R - 16} ${y + 2}q16 -11 32 1`, col, w)
const browsFlat = (L, R, y, col = ink, w = 7) => S(`M${L - 14} ${y}h28`, col, w) + S(`M${R - 14} ${y}h28`, col, w)
const browsWorried = (L, R, y, col = ink, w = 7) =>
  S(`M${L - 17} ${y + 4}Q${L} ${y + 2} ${L + 15} ${y - 9}`, col, w) + S(`M${R + 17} ${y + 4}Q${R} ${y + 2} ${R - 15} ${y - 9}`, col, w)

// ---------- svg wrapper ----------
const files = []
const svg = (path, title, body) => {
  files.push(path)
  const text = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" role="img">\n<title>${title}</title>\n${body}\n</svg>\n`
  const full = join(out, 'characters', path + '.svg')
  mkdirSync(join(full, '..'), { recursive: true })
  writeFileSync(full, text)
}

const EXPR = ['greeting', 'asking', 'waiting', 'cheering', 'consoling', 'relaxing']

// =====================================================================================
// ROCCO, the Golden Gate Park raccoon
// =====================================================================================
{
  const TAIL = 'M262 318C318 318 352 280 348 226C346 196 330 178 312 172'
  const back = S(TAIL, c('fur'), 54) + S(TAIL, c('mask'), 54, ' stroke-dasharray="0 34 22 34 22 34 22 200" stroke-linecap="butt"')
  const body =
    ell(166, 348, 28, 13, c('mask')) +
    ell(234, 348, 28, 13, c('mask')) +
    ell(200, 296, 86, 60, c('fur-shade')) +
    ell(200, 306, 52, 42, c('cream'))
  const head =
    ell(116, 92, 36, 40, c('fur-shade'), -22) +
    ell(284, 92, 36, 40, c('fur-shade'), 22) +
    ell(120, 98, 18, 22, c('cream'), -22) +
    ell(280, 98, 18, 22, c('cream'), 22) +
    P('M200 70C282 70 324 116 330 172L352 196L326 206C314 252 264 272 200 272C136 272 86 252 74 206L48 196L70 172C76 116 118 70 200 70Z', c('fur')) +
    P('M106 186C112 146 162 140 200 166C238 140 288 146 294 186Z', c('cream')) +
    P('M86 200C96 168 150 162 200 190C250 162 304 168 314 200C304 238 250 244 222 224C210 216 190 216 178 224C150 244 96 238 86 200Z', c('mask')) +
    ell(200, 236, 48, 32, c('cream')) +
    ell(200, 216, 14, 10, ink)
  const L = 148, R = 252, EY = 203, cr = c('cream')
  const arm = (d) => S(d, c('fur-shade'), 30)
  const paw = (x, y, r = 18) => circ(x, y, r, c('mask'))
  const restL = ell(158, 302, 20, 16, c('mask'))
  const restR = ell(242, 302, 20, 16, c('mask'))
  const bl = blush(164, 236, 250, 12, 8)
  const faces = {
    greeting: eyesDot(L, R, EY, { r: 10.5, rim: cr }) + browsRaised(L, R, 154) + bl + mouthD(200, 231, 32, 22),
    asking: eyesDot(L, R, EY, { r: 10.5, rim: cr }) + browsRaised(L, R, 158) + bl + mouthW(200, 236),
    waiting: eyesDot(L, R, EY, { r: 9.5, dx: 4, dy: -3.5, rim: cr }) + browsFlat(L, R, 162) + bl + mouthSmile(200, 238, 20),
    cheering: eyesHappy(L, R, EY + 4, cr) + bl + mouthD(200, 231, 38, 27),
    consoling: eyesDot(L, R, EY + 1, { r: 10, rim: cr }) + browsWorried(L, R, 162) + bl + mouthWobble(200, 240),
    relaxing: eyesCalm(L, R, EY, cr) + bl + mouthSmile(200, 238, 24),
  }
  const arms = {
    greeting: restR + arm('M140 286Q84 262 68 150') + paw(66, 136, 22) + waves(36, 104),
    asking: restL + arm('M262 286Q298 262 312 214') + paw(314, 204) + card(338, 148, 10),
    waiting: arm('M142 284Q154 310 182 312') + arm('M258 284Q246 310 218 312') + paw(186, 312, 17) + paw(214, 312, 17),
    cheering:
      arm('M140 286Q84 262 68 150') + paw(66, 136, 21) + arm('M260 286Q316 262 332 150') + paw(334, 136, 21) +
      spark(36, 76, 40) + spark(200, 36, 34) + spark(366, 80, 28),
    consoling: restL + arm('M262 286Q262 306 232 300') + paw(224, 296) + heart(330, 100, 1.8, 12),
    relaxing: arm('M140 288Q166 324 210 318') + arm('M262 286Q280 300 274 314') + mug(246, 312, c('cream')) + paw(218, 316, 16) + paw(274, 316, 16),
  }
  const title = { greeting: 'greeting', asking: 'asking', waiting: 'waiting', cheering: 'cheering', consoling: 'consoling', relaxing: 'relaxing' }
  for (const e of EXPR) svg(`hosts/rocco/${e}`, `Rocco the raccoon, ${title[e]}`, DISC + back + body + head + faces[e] + arms[e])
}

// =====================================================================================
// PEBBLE, the adult African penguin in a bow tie
// =====================================================================================
{
  const body =
    ell(158, 340, 32, 15, c('honey-shade')) +
    ell(242, 340, 32, 15, c('honey-shade')) +
    P('M200 52C296 52 330 146 330 224C330 304 278 346 200 346C122 346 70 304 70 224C70 146 104 52 200 52Z', c('penguin')) +
    P('M200 146C184 108 116 104 108 162C102 212 106 334 200 334C294 334 298 212 292 162C284 104 216 108 200 146Z', c('cream')) +
    S('M122 286Q200 316 278 286', c('penguin'), 11) +
    circ(172, 306, 6, c('penguin')) +
    circ(228, 312, 5, c('penguin')) +
    S('M126 136q20 -16 42 2', c('pink'), 10) +
    S('M274 136q-20 -16 -42 2', c('pink'), 10)
  const bow = P('M200 258L164 240Q152 258 164 276Z', c('sky')) + P('M200 258L236 240Q248 258 236 276Z', c('sky')) + circ(200, 258, 11, c('sky-shade'))
  const L = 160, R = 240, EY = 198
  const beak = P('M180 208Q200 197 220 208Q209 228 200 230Q191 228 180 208Z', c('honey'))
  const beakOpen = (h = 30) =>
    P(`M182 210H218Q216 ${210 + h} 200 ${211 + h}Q184 ${210 + h} 182 210Z`, ink) +
    P(`M189 ${202 + h}Q200 ${194 + h} 211 ${202 + h}Q207 ${210 + h} 200 ${210 + h}Q193 ${210 + h} 189 ${202 + h}Z`, c('mouth')) +
    P('M177 209Q200 193 223 209Q200 222 177 209Z', c('honey'))
  const bl = blush(138, 262, 224, 16, 10)
  const F = c('penguin-shade')
  const restL = flip(98, 206, 72, 284, 36, F)
  const restR = flip(302, 206, 328, 284, 36, F)
  const faces = {
    greeting: eyesDot(L, R, EY, { r: 12 }) + browsRaised(L, R, 160) + bl + beakOpen(26),
    asking: eyesDot(L, R, EY, { r: 12 }) + browsRaised(L, R, 164) + bl + beak,
    waiting: eyesDot(L, R, EY, { r: 11, dx: 5, dy: -5 }) + browsFlat(L, R, 168) + bl + beak,
    cheering: eyesHappy(L, R, EY + 2) + bl + beakOpen(32),
    consoling: eyesDot(L, R, EY + 2, { r: 11 }) + browsWorried(L, R, 168) + bl + beak,
    relaxing: eyesCalm(L, R, EY) + bl + beak,
  }
  const arms = {
    greeting: bow + restR + flip(100, 204, 52, 136, 36, F) + waves(34, 140),
    asking: bow + restL + flip(302, 200, 344, 134, 36, F) + card(340, 92, 10),
    waiting: bow + flip(116, 262, 192, 314, 34, F) + flip(284, 262, 208, 314, 34, F),
    cheering: bow + flip(98, 204, 46, 140, 36, F) + flip(302, 204, 354, 140, 36, F) + spark(40, 82, 42) + spark(358, 78, 34) + spark(360, 214, 22),
    consoling: bow + restL + flip(302, 214, 232, 296, 34, F) + heart(334, 86, 1.8, 12),
    relaxing: bow + flip(114, 262, 222, 320, 34, F) + flip(300, 230, 286, 306, 32, F) + mug(256, 316, c('sky')),
  }
  for (const e of EXPR) svg(`hosts/pebble/${e}`, `Pebble the penguin, ${e}`, DISC + body + faces[e] + arms[e])
}

// =====================================================================================
// DR. JUNE, the night-shift scientist (redrawn)
// =====================================================================================
{
  const HX = 200, HY = 190, HR = 92
  const H = c('hair'), HS = c('hair-shade')
  // Back hair: a soft cloud of curls behind the head.
  let back = circ(HX, HY - 6, HR + 8, HS)
  for (const a of [170, 145, 118, 90, 62, 35, 10]) {
    const t = (a * Math.PI) / 180
    back += circ(HX + Math.cos(t) * (HR + 2), HY - 6 - Math.sin(t) * (HR + 2), 30, HS)
  }
  // Bun with a honey pencil through it.
  const bun =
    S('M138 34L262 94', c('honey'), 13) +
    circ(138, 34, 8, c('pink')) +
    P('M256 84L276 100L254 98Z', c('cream-shade')) +
    circ(170, 82, 20, H) + circ(230, 82, 20, H) + circ(200, 70, 36, H) +
    S('M190 78a13 13 0 1 1 20 -8', HS, 8)
  // Lab coat over a sky shirt, with shoes peeking out.
  const coat =
    ell(172, 348, 26, 12, HS) + ell(228, 348, 26, 12, HS) +
    P('M118 350C114 300 140 268 200 266C260 268 286 300 282 350Z', c('cream')) +
    P('M118 350C116 326 120 304 130 288L144 350Z', c('cream-shade')) +
    P('M282 350C284 326 280 304 270 288L256 350Z', c('cream-shade')) +
    P('M176 270L200 316L224 270Z', c('sky')) +
    P('M160 270L200 334L180 270Z', c('cream-shade')) +
    P('M240 270L200 334L220 270Z', c('cream-shade')) +
    `<rect x="236" y="304" width="30" height="8" rx="4" fill="${c('cream-shade')}"/>` +
    `<rect x="248" y="290" width="7" height="20" rx="3.5" fill="${c('sky-shade')}"/>`
  const head =
    circ(HX - HR + 2, HY + 22, 16, c('skin-shade')) + circ(HX + HR - 2, HY + 22, 16, c('skin-shade')) +
    circ(HX, HY, HR, c('skin'))
  // Curly fringe: a cap of hair with a scalloped (curly) hairline, plus ringlets framing the face.
  const pts = [[294, 182], [272, 144], [238, 126], [200, 134], [162, 126], [128, 144], [106, 182]]
  let fr = 'M106 182C96 112 146 86 200 86C254 86 304 112 294 182'
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2
    const dx = HX - mx, dy = HY - my, d = Math.hypot(dx, dy)
    fr += `Q${r1(mx + (dx / d) * 18)} ${r1(my + (dy / d) * 18)} ${x1} ${y1}`
  }
  fr += 'Z'
  const fringe =
    P(fr, H) +
    circ(110, 186, 20, H) + circ(104, 216, 16, H) + circ(108, 242, 12, H) +
    circ(290, 186, 20, H) + circ(296, 216, 16, H) + circ(292, 242, 12, H)
  const L = 158, R = 242, EY = 212
  const glasses =
    `<circle cx="${L}" cy="${EY - 2}" r="27" fill="none" stroke="${c('honey')}" stroke-width="8.5"/>` +
    `<circle cx="${R}" cy="${EY - 2}" r="27" fill="none" stroke="${c('honey')}" stroke-width="8.5"/>` +
    S(`M186 ${EY - 6}q14 -9 28 0`, c('honey'), 7.5)
  const bl = blush(134, 266, 250, 15, 9)
  const MY = 252
  const faces = {
    greeting: eyesDot(L, R, EY) + glasses + browsRaised(L, R, 164, H) + bl + mouthD(200, MY - 4, 32, 22),
    asking: eyesDot(L, R, EY) + glasses + browsRaised(L, R, 168, H) + bl + mouthO(200, MY + 2),
    waiting: eyesDot(L, R, EY, { r: 10, dx: 6, dy: -6 }) + glasses + browsFlat(L, R, 172, H) + bl + mouthSmile(200, MY, 20),
    cheering: eyesHappy(L, R, EY + 2) + glasses + bl + mouthD(200, MY - 6, 38, 27),
    consoling: eyesDot(L, R, EY + 1, { r: 10 }) + glasses + browsWorried(L, R, 172, H) + bl + mouthWobble(200, MY + 2),
    relaxing: eyesCalm(L, R, EY) + glasses + bl + mouthSmile(200, MY, 24),
  }
  const arm = (d) => S(d, c('skin'), 26) + S(d, c('cream-shade'), 36, ' stroke-dasharray="30 400"')
  const hand = (x, y, r = 16) => circ(x, y, r, c('skin'))
  const restL = arm('M136 292Q118 318 126 336') + hand(127, 340, 15)
  const restR = arm('M264 292Q282 318 274 336') + hand(273, 340, 15)
  const arms = {
    greeting: restR + arm('M136 292Q80 270 70 164') + hand(68, 150, 19) + waves(42, 160),
    asking: restL + arm('M264 290Q300 268 314 216') + hand(316, 204, 17) + card(336, 150, 10),
    waiting: arm('M136 292Q148 322 182 320') + arm('M264 292Q252 322 218 320') + hand(188, 320) + hand(212, 320),
    cheering: arm('M136 292Q80 270 70 164') + hand(68, 150, 19) + arm('M264 292Q320 270 330 164') + hand(332, 150, 19) +
      spark(44, 84, 40) + spark(356, 82, 32) + spark(356, 240, 22),
    consoling: restL + arm('M264 292Q264 314 232 308') + hand(226, 304) + heart(332, 112, 1.8, 12),
    relaxing: arm('M136 292Q166 330 214 320') + arm('M264 292Q284 306 276 318') + mug(248, 316, c('cream')) + hand(220, 320, 15) + hand(276, 320, 15),
  }
  for (const e of EXPR) svg(`hosts/june/${e}`, `Dr. June the scientist, ${e}`, DISC + back + bun + coat + head + fringe + faces[e] + arms[e])
}

// =====================================================================================
// ANIMALS
// =====================================================================================

// ---- penguin chick: a fluffy grey African penguin chick ----
{
  const FL = c('fluff'), FS = c('fluff-shade')
  const feet = ell(166, 344, 24, 11, c('penguin')) + ell(234, 344, 24, 11, c('penguin'))
  const fluffBody =
    ell(200, 222, 124, 124, FL) +
    circ(84, 214, 20, FL) + circ(80, 248, 18, FL) + circ(90, 280, 16, FL) +
    circ(316, 214, 20, FL) + circ(320, 248, 18, FL) + circ(310, 280, 16, FL) +
    circ(184, 98, 18, FL) + circ(208, 88, 20, FL) + circ(230, 102, 15, FL)
  const mask = circ(166, 210, 50, c('cream')) + circ(234, 210, 50, c('cream')) + ell(200, 246, 76, 50, c('cream'))
  const belly = ell(200, 308, 62, 34, c('cream-shade'))
  const L = 164, R = 236, EY = 214
  const beak = P('M186 230Q200 220 214 230Q207 245 200 246Q193 245 186 230Z', c('penguin'))
  const beakOpen =
    P('M186 234H214Q212 262 200 263Q188 262 186 234Z', ink) +
    P('M191 255Q200 248 209 255Q206 262 200 262Q194 262 191 255Z', c('mouth')) +
    P('M182 233Q200 220 218 233Q200 244 182 233Z', c('penguin'))
  const bl = blush(136, 264, 240, 16, 10)
  const wingsDown = flip(96, 236, 80, 300, 34, FS) + flip(304, 236, 320, 300, 34, FS)
  const wingsUp = flip(96, 232, 52, 176, 34, FS) + flip(304, 232, 348, 176, 34, FS)
  const base = DISC + feet + fluffBody + belly + mask
  svg('animals/penguin-chick', 'African penguin chick', base + wingsDown + eyesDot(L, R, EY) + bl + beak)
  svg('animals/penguin-chick-happy', 'African penguin chick, happy', base + wingsUp + eyesHappy(L, R, EY + 2) + bl + beakOpen + spark(330, 96, 40))
}

// ---- giant Pacific octopus ----
{
  const OC = c('octopus'), OS = c('octopus-shade')
  const arms = (raised) =>
    `<g fill="none" stroke-linecap="round" stroke-width="38">` +
    `<path d="M128 236C92 262 62 286 70 318C76 340 104 338 102 318" stroke="${OS}"/>` +
    (raised
      ? `<path d="M276 226C322 222 352 190 346 152C342 128 316 128 320 150" stroke="${OS}"/>`
      : `<path d="M272 236C308 262 338 286 330 318C324 340 296 338 298 318" stroke="${OS}"/>`) +
    `<path d="M160 256C146 292 116 318 132 338C144 352 166 342 158 324" stroke="${OC}"/>` +
    `<path d="M240 256C254 292 284 318 268 338C256 352 234 342 242 324" stroke="${OC}"/>` +
    `<path d="M196 262C192 300 184 326 200 342C214 354 228 336 214 326" stroke="${OC}"/>` +
    `</g>` +
    circ(102, 320, 5, c('cream')) + (raised ? circ(320, 150, 5, c('cream')) : circ(298, 320, 5, c('cream'))) +
    circ(158, 326, 5, c('cream')) + circ(242, 326, 5, c('cream'))
  const head =
    P('M200 58C292 58 326 128 318 196C312 250 270 272 200 272C130 272 88 250 82 196C74 128 108 58 200 58Z', OC) +
    circ(146, 116, 12, OS) + circ(252, 104, 9, OS) + circ(278, 140, 14, OS) + circ(120, 156, 7, OS)
  const bl = blush(136, 264, 222, 17, 10)
  svg('animals/giant-pacific-octopus', 'Giant Pacific octopus', DISC + arms(false) + head + bl + eyesDot(160, 240, 200, { r: 12 }) + mouthSmile(200, 224, 28, 7))
  svg('animals/giant-pacific-octopus-happy', 'Giant Pacific octopus, happy', DISC + arms(true) + head + bl + eyesHappy(160, 240, 202) + mouthD(200, 220, 34, 24) + spark(64, 104, 40))
}

// ---- Pacific seahorse: curled tail and snout ----
{
  const SH = c('seahorse'), SS = c('seahorse-shade')
  const tail = (happy) =>
    happy
      ? S('M200 300C200 344 238 362 274 350C308 338 310 292 278 284C254 278 238 298 252 314', SH, 28)
      : S('M206 300C206 344 168 362 132 350C98 338 96 292 128 284C152 278 168 298 154 314', SH, 28)
  const fin = ell(138, 258, 22, 36, SS, -18)
  const body = ell(204, 244, 66, 68, SH) + ell(222, 252, 36, 50, c('cream')) +
    S('M196 230q26 8 52 0', c('cream-shade'), 7) + S('M194 256q28 8 56 0', c('cream-shade'), 7) + S('M198 282q24 6 48 0', c('cream-shade'), 7)
  const crown = circ(160, 80, 15, SS) + circ(188, 66, 17, SS) + circ(216, 74, 14, SS)
  const head = crown + circ(190, 146, 76, SH)
  const snout = P('M236 150C266 152 292 158 308 162C326 166 326 194 308 196C290 198 264 200 236 204Z', SH) + ell(318, 179, 7, 12, SS)
  const L = 148, R = 222, EY = 152
  const bl = blush(128, 240, 178, 15, 9)
  svg('animals/pacific-seahorse', 'Pacific seahorse',
    DISC + tail(false) + fin + body + head + snout + eyesDot(L, R, EY, { r: 11 }) + bl + mouthSmile(186, 182, 22))
  svg('animals/pacific-seahorse-happy', 'Pacific seahorse, happy',
    DISC + tail(true) + fin + body + head + snout + eyesHappy(L, R, EY + 2) + bl + mouthD(186, 176, 28, 20) + spark(70, 110, 40))
}

// ---- moray eel peeking from a rock hole ----
{
  const EE = c('eel'), ES = c('eel-shade'), RK = c('rock'), RS = c('rock-shade')
  const rock =
    P('M78 330C52 268 100 214 200 210C300 214 348 268 322 330Q200 370 78 330Z', RK) +
    circ(96, 296, 13, RS) + circ(304, 304, 11, RS) + circ(296, 254, 8, RS) + circ(112, 256, 7, RS) +
    ell(200, 288, 84, 56, RS) + ell(200, 292, 72, 46, c('penguin-shade'))
  const lip = P('M122 306Q200 342 278 306L310 338Q200 372 90 338Z', RK) + S('M124 308Q200 344 276 308', RS, 9)
  const neck = S('M200 316C196 284 216 262 210 220', EE, 80) + S('M163 312C158 284 172 260 170 226', ES, 14) +
    circ(226, 270, 8, ES) + circ(230, 300, 6, ES)
  const face = (happy) => {
    const L = 164, R = 244, EY = 172
    return happy
      ? eyesHappy(L, R, EY + 2) + blush(140, 268, 196, 16, 10) + mouthD(204, 196, 38, 28)
      : eyesDot(L, R, EY, { r: 12 }) + blush(140, 268, 196, 16, 10) + ell(204, 208, 17, 15, ink) + ell(204, 215, 10, 6, c('mouth'))
  }
  const head = (rot, happy) =>
    g(`rotate(${rot} 210 170)`,
      P('M150 116Q170 82 214 86Q190 96 176 118Z', ES) +
      ell(206, 168, 98, 70, EE) + circ(124, 146, 8, ES) + circ(288, 150, 7, ES) + circ(274, 124, 6, ES) + face(happy))
  svg('animals/moray-eel', 'Moray eel', DISC + rock + neck + head(-6, false) + lip)
  svg('animals/moray-eel-happy', 'Moray eel, happy', DISC + rock + neck + head(-14, true) + lip + spark(330, 92, 40))
}

// ---- mystery: a soft blob with a question-mark tuft ----
{
  const MY = c('mystery'), MS = c('mystery-shade')
  const tuft = S('M168 80C164 46 192 28 216 32C244 36 250 70 228 82C214 90 208 96 208 110', MS, 22)
  const dot = circ(208, 128, 13, MS)
  const feet = ell(160, 342, 30, 14, MS) + ell(240, 342, 30, 14, MS)
  const body = P('M200 96C290 96 332 172 332 250C332 314 280 344 200 344C120 344 68 314 68 250C68 172 110 96 200 96Z', MY) +
    ell(200, 290, 70, 44, c('cream')) + dot
  const armsDown = flip(80, 250, 70, 296, 30, MS) + flip(320, 250, 330, 296, 30, MS)
  const armsUp = flip(84, 236, 50, 186, 30, MS) + flip(316, 236, 350, 186, 30, MS)
  const L = 158, R = 242, EY = 212
  const bl = blush(132, 268, 238, 16, 10)
  svg('animals/mystery', 'Mystery animal: who will it be?', DISC + tuft + feet + armsDown + body + eyesDot(L, R, EY, { r: 12 }) + bl + mouthSmile(200, 236, 26, 7))
  svg('animals/mystery-happy', 'Mystery animal, happy', DISC + tuft + feet + armsUp + body + eyesHappy(L, R, EY + 2) + bl + mouthD(200, 232, 36, 26) + spark(320, 92, 40) + spark(84, 120, 26))
}

writeFileSync(new URL('./gen-files.json', import.meta.url), JSON.stringify(files))
console.log(files.length, 'files')
