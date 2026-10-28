import { describe, expect, it } from 'vitest'
import { GAME_ERROR_CODES } from '../../../shared/game'
import i18n from '../../i18n'
import { errorMessage } from './errors'

const t = i18n.t.bind(i18n)

describe('errorMessage', () => {
  it.each([...GAME_ERROR_CODES, 'network'])('has its own words for %s', (code) => {
    const text = errorMessage(code, t)
    expect(text).not.toBe('')
    expect(text).not.toBe(code)
    expect(text).not.toBe(errorMessage('something-else', t))
  })

  it('falls back to a general message for codes it does not know', () => {
    expect(errorMessage('something-else', t)).toBe('Something went wrong. Please try again.')
  })
})
