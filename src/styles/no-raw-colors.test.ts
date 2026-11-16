import { readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { findRawColors } from '../../shared/raw-colors'

// Enforces "no raw color values outside src/styles/tokens.css" (CLAUDE.md, docs/SPEC.md section 7).

const SRC_DIR = fileURLToPath(new URL('..', import.meta.url))
const ALLOWED_FILES = new Set(['styles/tokens.css'])
const SCANNED_EXTENSIONS = /\.(ts|tsx|css)$/
const TEST_FILE = /\.test\.(ts|tsx)$/

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return SCANNED_EXTENSIONS.test(entry.name) && !TEST_FILE.test(entry.name) ? [path] : []
  })
}

describe('raw color guard', () => {
  it('finds no raw color values in src/ outside tokens.css', () => {
    const violations = sourceFiles(SRC_DIR).flatMap((file) => {
      const relativePath = relative(SRC_DIR, file).split(sep).join('/')
      if (ALLOWED_FILES.has(relativePath)) return []
      return findRawColors(readFileSync(file, 'utf8')).map(
        (v) => `src/${relativePath}:${v.line} ${v.rule}: ${v.match}`,
      )
    })
    expect(violations).toEqual([])
  })

  it.each([
    'color: #fbf6ea;',
    'className="bg-[#fff]"',
    'background: rgb(0 0 0 / 50%);',
    'className="bg-[oklch(0.7_0.1_200)]"',
    'className="bg-green-500"',
    'className="hover:text-white"',
    'className="bg-black/50"',
  ])('catches %s', (sample) => {
    expect(findRawColors(sample)).not.toEqual([])
  })

  it.each([
    'className="bg-brand text-ink hover:bg-primary/80"',
    'className="border border-transparent ring-ring"',
    'hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]',
    'outline: 2px solid var(--color-focus);',
  ])('allows %s', (sample) => {
    expect(findRawColors(sample)).toEqual([])
  })
})
