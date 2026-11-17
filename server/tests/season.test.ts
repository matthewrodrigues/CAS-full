import { describe, expect, it } from 'vitest'
import { displayName } from '../game/season'

describe('displayName', () => {
  it('shows the nickname, its first word, or the initials per the display mode', () => {
    expect(displayName('Sam the Squid', 'nickname')).toBe('Sam the Squid')
    expect(displayName('Sam the Squid', 'first_name')).toBe('Sam')
    expect(displayName('Sam the Squid', 'initials')).toBe('STS')
    expect(displayName('émile', 'initials')).toBe('É')
  })
})
