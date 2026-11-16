import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'

// The kit's own scale variables must not reuse Tailwind v4 theme namespaces: kit.css is global, so a
// `--text-sm` here would silently restyle every `text-sm` utility in the app.
const COLLIDING = /^\s*--(text|ease|radius|spacing|font|shadow|breakpoint|container|animate|blur|leading|tracking)(-[\w-]+)?\s*:/

it('kit.css defines no custom property in a Tailwind theme namespace', () => {
  const css = readFileSync(fileURLToPath(new URL('./kit.css', import.meta.url)), 'utf8')
  const hits = css.split('\n').flatMap((line, i) => (COLLIDING.test(line) ? [`kit.css:${i + 1} ${line.trim()}`] : []))
  expect(hits).toEqual([])
})
