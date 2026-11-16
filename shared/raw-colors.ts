// Raw color detection shared by the src/ guard (src/styles/no-raw-colors.test.ts) and the design
// mockup checker (scripts/check-mockups.ts). Only token files may contain raw color values.

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white'
const COLOR_UTILITIES =
  'bg|text|border(?:-[xytrblse])?|ring|ring-offset|outline|fill|stroke|from|via|to|divide|placeholder|accent|caret|decoration|shadow|inset-shadow|drop-shadow|text-shadow'

const RULES = [
  { name: 'hex color', pattern: /#[0-9a-f]{3,8}\b/i },
  { name: 'color function', pattern: /\b(?:rgba?|hsla?|hwb|oklch|oklab|lab|lch|color)\(/i },
  {
    name: 'Tailwind built-in palette class',
    pattern: new RegExp(
      `(?<![\\w-])(?:${COLOR_UTILITIES})-(?:${PALETTE})(?:-\\d{2,3})?(?:/\\d+)?(?![\\w-])`,
    ),
  },
]

export function findRawColors(text: string) {
  return text.split('\n').flatMap((line, index) =>
    RULES.flatMap(({ name, pattern }) => {
      const match = line.match(pattern)
      return match ? [{ line: index + 1, rule: name, match: match[0] }] : []
    }),
  )
}
