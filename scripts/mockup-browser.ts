// Browser checks for one design mockup: axe, tap targets, question size and reduced motion.
import AxeBuilder from '@axe-core/playwright'
import type { Page } from '@playwright/test'
import { createServer } from 'vite'
import { viewportFor } from './mockup-rules'

export type DesignServer = { url: string; close: () => Promise<void> }

/** Serves `root` statically, so mockups can fetch their character SVGs (file:// can't). */
export async function startDesignServer(root: string): Promise<DesignServer> {
  const server = await createServer({ root, configFile: false, logLevel: 'silent', server: { port: 0, host: '127.0.0.1' } })
  await server.listen()
  const url = server.resolvedUrls?.local[0]
  if (!url) throw new Error('design server did not report a URL')
  return { url, close: () => server.close() }
}

const TAP_TARGETS = 'button, a, input, select, [role=button], [role=radio]'
const MIN_TARGET = 44
const MIN_QUESTION_PX = 20

/** Loads `file` (relative to the served root) at its viewport with reduced motion on, and returns every problem found. */
export async function checkPage(page: Page, baseUrl: string, file: string): Promise<string[]> {
  await page.setViewportSize(viewportFor(file))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(new URL(file, baseUrl).href, { waitUntil: 'networkidle' })

  const problems: string[] = []
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
  for (const v of axe.violations) problems.push(`axe ${v.id}: ${v.nodes.length} element(s), ${v.help}`)

  const small = await page.$$eval(
    TAP_TARGETS,
    (elements, min) =>
      elements.flatMap((el) => {
        const style = getComputedStyle(el)
        // Links inside a sentence are exempt (WCAG 2.5.8); hidden elements can't be tapped.
        if (style.display === 'inline' || style.visibility === 'hidden' || (el as HTMLElement).offsetParent === null) return []
        const box = el.getBoundingClientRect()
        if (box.width >= min && box.height >= min) return []
        const label = (el.textContent ?? '').trim().slice(0, 30) || el.tagName.toLowerCase()
        return [`tap target ${Math.round(box.width)}x${Math.round(box.height)}: ${label}`]
      }),
    MIN_TARGET,
  )
  problems.push(...small)

  const sizes = await page.$$eval('[data-role=question]', (els) => els.map((el) => parseFloat(getComputedStyle(el).fontSize)))
  for (const px of sizes) if (px < MIN_QUESTION_PX) problems.push(`question text ${px}px, needs at least ${MIN_QUESTION_PX}px`)

  await page.waitForTimeout(500)
  const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running').length)
  if (running > 0) problems.push(`${running} animation${running === 1 ? '' : 's'} running under reduced motion`)

  return problems
}
