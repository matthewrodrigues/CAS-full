import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { circledFor, tapOption } from '@/game/answer-sheet'
import { AnswerChoice } from './answer-choice'

const options = ['Alpha', 'Bravo', 'Charlie', 'Delta']
const text = { send: "That's our answer!", sendInstead: 'Send this one instead', sent: 'Sent!' }

type Props = Parameters<typeof AnswerChoice>[0]
const props = (over: Partial<Props> = {}): Props => ({ options, circled: null, sent: null, disabled: false, text, onCircle: () => {}, onSend: () => {}, ...over })

/** AnswerChoice has no hooks, so calling it gives its element tree; this finds the elements that carry a click handler. */
function clickables(node: ReactNode, found: ReactElement<{ onClick?: () => void; children?: ReactNode }>[] = []) {
  if (Array.isArray(node)) node.forEach((n) => clickables(n, found))
  else if (isValidElement<{ onClick?: () => void; children?: ReactNode }>(node)) {
    if (node.props.onClick) found.push(node)
    clickables(node.props.children, found)
  }
  return found
}

describe('AnswerChoice', () => {
  it('a tap circles without sending', () => {
    const onCircle = vi.fn()
    const onSend = vi.fn()
    const buttons = clickables(AnswerChoice(props({ onCircle, onSend })))
    expect(buttons).toHaveLength(4) // no send button until something is circled
    buttons[1].props.onClick!() // tap Bravo
    expect(onCircle).toHaveBeenCalledWith(1)
    expect(onSend).not.toHaveBeenCalled()

    // The sheet's state after that tap: Bravo is circled, so it is pressed and the send button appears.
    const circled = circledFor(tapOption('q1', 1), 'q1')
    const html = renderToStaticMarkup(<AnswerChoice {...props({ circled })} />)
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(html).toMatch(/aria-pressed="true"[^>]*>(?:(?!<\/button>).)*Bravo/)
    expect(html).toContain('our answer!')
  })

  it('sends only from the send button', () => {
    const onSend = vi.fn()
    const buttons = clickables(AnswerChoice(props({ circled: 1, onSend })))
    expect(buttons).toHaveLength(5)
    buttons[4].props.onClick!()
    expect(onSend).toHaveBeenCalledOnce()
  })

  it('keeps my circle when a teammate sends another answer', () => {
    const html = renderToStaticMarkup(<AnswerChoice {...props({ circled: 1, sent: 3 })} />)
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(html).toMatch(/aria-pressed="true"[^>]*>(?:(?!<\/button>).)*Bravo/)
    expect(html).toMatch(/Delta(?:(?!<\/button>).)*Sent!/)
    expect(html).toContain('Send this one instead')
  })

  it('shows no send button once my circle is the sent answer', () => {
    const html = renderToStaticMarkup(<AnswerChoice {...props({ circled: 3, sent: 3 })} />)
    expect(html).not.toContain('our answer!')
    expect(html).not.toContain('Send this one instead')
    expect(html).toContain('Sent!')
  })
})
