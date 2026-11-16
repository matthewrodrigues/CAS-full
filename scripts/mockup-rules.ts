// File-level rules for the design mockups in design/ (docs/superpowers/plans/2026-11-15-ui-redesign-design-phase.md).
// The browser checks live in mockup-browser.ts; scripts/check-mockups.ts runs both.
import { readdirSync, readFileSync } from 'node:fs'
import { basename, join, relative, sep } from 'node:path'
import { findRawColors } from '../shared/raw-colors'

const PHONE = { width: 390, height: 844 }
const BIG_SCREEN = { width: 1920, height: 1080 }
const COLOR_SCANNED = /\.(html|css|svg|js)$/
/** The only design file allowed raw color values. */
const TOKENS_FILE = 'system/tokens.css'

/** Big-screen mockups are named big-*.html; everything else is a phone screen. */
export function viewportFor(file: string): { width: number; height: number } {
  return basename(file).startsWith('big-') ? BIG_SCREEN : PHONE
}

/** Every file under `root`, as forward-slash paths relative to it, skipping research/ (third-party references). */
function designFiles(root: string, dir = root): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    const rel = relative(root, path).split(sep).join('/')
    if (rel === 'research' || rel === 'review') return []
    return entry.isDirectory() ? designFiles(root, path) : [rel]
  })
}

/** The pages the checker visits: every .html except the generated gallery. */
export function mockupFiles(root: string): string[] {
  return designFiles(root).filter((file) => file.endsWith('.html') && file !== 'index.html')
}

export function scanDesignColors(root: string): { file: string; line: number; match: string }[] {
  return designFiles(root)
    .filter((file) => COLOR_SCANNED.test(file) && file !== TOKENS_FILE && file !== 'index.html')
    .flatMap((file) => findRawColors(readFileSync(join(root, file), 'utf8')).map(({ line, match }) => ({ file, line, match })))
}

const REQUIRED_HEAD = ['../system/tokens.css', '../system/kit.css', '../system/include.js']

/** Every mockup loads the kit the same way, so tokens and characters resolve. */
export function checkHead(html: string): string[] {
  return REQUIRED_HEAD.filter((href) => !html.includes(`"${href}"`)).map((href) => `missing ${href}`)
}
