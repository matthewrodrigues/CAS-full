import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, type Browser } from '@playwright/test'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { checkPage, startDesignServer, type DesignServer } from './mockup-browser'
import { checkHead, mockupFiles, scanDesignColors, viewportFor } from './mockup-rules'

const fixtures = fileURLToPath(new URL('./fixtures/mockups', import.meta.url))

describe('mockup rules', () => {
  it('sizes big-screen mockups at 1920x1080 and phone mockups at 390x844', () => {
    expect(viewportFor('design/screens/big-lobby.html')).toEqual({ width: 1920, height: 1080 })
    expect(viewportFor('design/screens/lobby.html')).toEqual({ width: 390, height: 844 })
  })

  it('lists mockups but not the gallery or research pages', () => {
    const files = mockupFiles(fixtures)
    expect(files).toContain('screens/ok.html')
    expect(files).not.toContain('index.html')
    expect(files).not.toContain('research/x.html')
  })

  it('finds raw colors in mockups and SVGs but allows the tokens file', () => {
    const found = scanDesignColors(fixtures)
    expect(found).toContainEqual({ file: 'screens/raw.html', line: 3, match: '#ff0000' })
    expect(found.map((v) => v.file)).toContain('characters/raw.svg')
    expect(found.map((v) => v.file)).not.toContain('system/tokens.css')
  })

  it('reports each missing head link', () => {
    expect(checkHead('<head></head>')).toEqual(['missing ../system/tokens.css', 'missing ../system/kit.css', 'missing ../system/include.js'])
  })
})

describe('mockup browser checks', () => {
  let server: DesignServer
  let browser: Browser
  beforeAll(async () => {
    server = await startDesignServer(fixtures)
    browser = await chromium.launch()
  }, 60_000)
  afterAll(async () => {
    await browser?.close()
    await server?.close()
  })

  const check = async (file: string) => {
    // axe needs a page from an explicit context.
    const context = await browser.newContext()
    try {
      return await checkPage(await context.newPage(), server.url, file)
    } finally {
      await context.close()
    }
  }

  it('passes a clean page', async () => {
    expect(await check('screens/ok.html')).toEqual([])
  }, 60_000)

  it('reports axe contrast violations', async () => {
    expect((await check('screens/low-contrast.html')).join('\n')).toMatch(/axe color-contrast/)
  }, 60_000)

  it('reports tap targets under 44px', async () => {
    expect((await check('screens/small-target.html')).join('\n')).toMatch(/tap target 30x30/)
  }, 60_000)

  it('reports question text under 20px', async () => {
    expect((await check('screens/small-question.html')).join('\n')).toMatch(/question text 16px/)
  }, 60_000)

  it('shows the placeholder for a character that is not drawn yet', async () => {
    // The real include.js and placeholder, served from a scratch root that also has an index.html,
    // so a server answering unknown paths with index.html (an SPA fallback) would be caught.
    const scratch = mkdtempSync(join(tmpdir(), 'design-include-'))
    const design = fileURLToPath(new URL('../design', import.meta.url))
    for (const dir of ['system', 'characters', 'screens']) mkdirSync(join(scratch, dir))
    copyFileSync(join(design, 'system/include.js'), join(scratch, 'system/include.js'))
    copyFileSync(join(design, 'characters/placeholder.svg'), join(scratch, 'characters/placeholder.svg'))
    writeFileSync(join(scratch, 'index.html'), '<p>gallery</p>')
    writeFileSync(join(scratch, 'screens/character.html'), '<!doctype html><html lang="en"><head><title>c</title><script src="../system/include.js"></script></head><body><span data-character="host/asking"></span></body></html>')
    const scratchServer = await startDesignServer(scratch)
    const context = await browser.newContext()
    try {
      const page = await context.newPage()
      await page.goto(new URL('screens/character.html', scratchServer.url).href, { waitUntil: 'networkidle' })
      await expect.poll(() => page.locator('[data-character] svg title').textContent()).toBe('Character not drawn yet: host/asking')
    } finally {
      await context.close()
      await scratchServer.close()
      rmSync(scratch, { recursive: true, force: true })
    }
  }, 60_000)

  it('reports running animations under reduced motion', async () => {
    expect((await check('screens/animated.html')).join('\n')).toMatch(/1 animation running under reduced motion/)
  }, 60_000)
})
