import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ANIMAL_AVATARS, EXPRESSIONS, HOSTS } from '../../shared/characters'
import { CHARACTER_ART, Character, animalCharacter, hostCharacter, type CharacterName } from './character'

const names: CharacterName[] = [
  ...HOSTS.flatMap((h) => EXPRESSIONS.map((e) => hostCharacter(h, e))),
  ...ANIMAL_AVATARS.flatMap((a) => [animalCharacter(a), animalCharacter(a, true)]),
]

describe('Character art', () => {
  it('covers all 28 characters', () => {
    expect(names).toHaveLength(28)
  })

  it.each(names)('has art for %s', (name) => {
    const svg = CHARACTER_ART[`../assets/characters/${name}.svg`]
    expect(svg).toBeDefined()
    expect(svg.trimStart().startsWith('<svg')).toBe(true)
    expect(svg).toContain('<title>')
  })
})

describe('<Character>', () => {
  it('labels a meaningful character', () => {
    const html = renderToStaticMarkup(<Character name="hosts/rocco/asking" size={96} label="Rocco asks" />)
    expect(html).toMatch(/^<span class="char char--96" role="img" aria-label="Rocco asks">/)
    expect(html).toContain('<svg')
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/)
  })

  it('hides a decorative character', () => {
    const html = renderToStaticMarkup(<Character name="animals/moray-eel-happy" size={48} />)
    expect(html).toContain('aria-hidden="true"')
    expect(html).not.toContain('role="img"')
    expect(html).not.toContain('aria-label')
  })
})
