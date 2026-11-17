import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import '@/i18n'
import { AnswerText } from './answer-text'

type Props = Parameters<typeof AnswerText>[0]
const props = (over: Partial<Props> = {}): Props => ({
  numeric: false,
  value: '',
  foot: 'Close spellings get checked.',
  disabled: false,
  submitted: false,
  invalid: false,
  onChange: () => {},
  onEnter: () => {},
  ...over,
})

describe('AnswerText', () => {
  it("keeps my field and shows the team's sent answer when a teammate sends another", () => {
    const html = renderToStaticMarkup(<AnswerText {...props({ value: 'octopus', team: 'Our answer so far: squid' })} />)
    expect(html).toContain('value="octopus"')
    expect(html).toContain('Our answer so far: squid')
    expect(html).toContain('sent!')
    expect(html).not.toContain('field--submitted')
  })

  it('shows no team line when there is nothing else sent', () => {
    const html = renderToStaticMarkup(<AnswerText {...props({ value: 'squid', submitted: true })} />)
    expect(html).not.toContain('so far')
    expect(html).toContain('field--submitted')
  })
})
