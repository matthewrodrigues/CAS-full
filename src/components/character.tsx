import type { AnimalAvatar, Expression, Host } from '../../shared/characters'

export type CharacterName =
  | `hosts/${Host}/${Expression}`
  | `animals/${AnimalAvatar}`
  | `animals/${AnimalAvatar}-happy`

export type CharacterSize = 48 | 64 | 96 | 128 | 160 | 240 | 400

export const CHARACTER_ART = import.meta.glob<string>('../assets/characters/**/*.svg', {
  query: '?raw',
  import: 'default',
  eager: true,
})

export function hostCharacter(host: Host, expression: Expression): CharacterName {
  return `hosts/${host}/${expression}`
}

export function animalCharacter(avatar: AnimalAvatar, happy = false): CharacterName {
  return happy ? `animals/${avatar}-happy` : `animals/${avatar}`
}

export function Character({ name, size, label }: { name: CharacterName; size: CharacterSize; label?: string }) {
  // Static art we ship ourselves (src/assets/characters), never user input, so inlining the markup is safe.
  // Inlining lets the SVGs pick up theme colors through var(--color-*).
  const raw = CHARACTER_ART[`../assets/characters/${name}.svg`] ?? ''
  // The art ships role="img" and a <title>; the wrapper owns the semantics, so hide the SVG itself.
  const svg = raw.replace(/^(\s*<svg[^>]*?)\s+role="img"/, '$1').replace(/^(\s*<svg)/, '$1 aria-hidden="true"')
  const className = `char char--${size}`
  return label ? (
    <span className={className} role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: svg }} />
  ) : (
    <span className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
  )
}
