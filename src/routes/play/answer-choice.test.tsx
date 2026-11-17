import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { circledFor, tapOption } from '@/game/answer-sheet'
import { AnswerChoice } from './answer-choice'

const options = ['Alpha', 'Bravo', 'Charlie', 'Delta']
const text = { group: 'Answers', sentTag: 'sent!' }

type Props = Parameters<typeof AnswerChoice>[0]
const props = (over: Partial<Props> = {}): Props => ({ options, circled: null, sent: null, disabled: false, trueFalse: false, text, onCircle: () => {}, ...over })

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
  it('a tap circles and nothing else: the sheet has no send button of its own', () => {
    const onCircle = vi.fn()
    const buttons = clickables(AnswerChoice(props({ onCircle })))
    expect(buttons).toHaveLength(4)
    buttons[1].props.onClick!() // tap Bravo
    expect(onCircle).toHaveBeenCalledWith(1)

    const circled = circledFor(tapOption('q1', 1), 'q1')
    const html = renderToStaticMarkup(<AnswerChoice {...props({ circled })} />)
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(html).toMatch(/aria-pressed="true"[^>]*>(?:(?!<\/button>).)*Bravo/)
    expect(html).not.toContain('our answer!')
  })

  it('letters the options A to D, with a pen circle drawn by the kit on the picked one', () => {
    const html = renderToStaticMarkup(<AnswerChoice {...props()} />)
    expect(html).toMatch(/option__letter[^>]*>A<.*option__letter[^>]*>B<.*option__letter[^>]*>C<.*option__letter[^>]*>D</)
  })

  it('keeps my circle when a teammate sends another answer', () => {
    const html = renderToStaticMarkup(<AnswerChoice {...props({ circled: 1, sent: 3 })} />)
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
    expect(html).toMatch(/aria-pressed="true"[^>]*>(?:(?!<\/button>).)*Bravo/)
    expect(html).toMatch(/Delta(?:(?!<\/button>).)*option__note[^>]*>sent!/)
  })

  it('true/false is two tall tiles lettered T and F', () => {
    const html = renderToStaticMarkup(<AnswerChoice {...props({ options: ['True', 'False'], trueFalse: true })} />)
    expect(html).toContain('options options--tf')
    expect(html).toMatch(/option__letter[^>]*>T<.*option__letter[^>]*>F</)
  })

  it('a disabled sheet disables every option but keeps the pressed one pressed', () => {
    const html = renderToStaticMarkup(<AnswerChoice {...props({ circled: 0, sent: 0, disabled: true })} />)
    expect(html.match(/disabled=""/g)).toHaveLength(4)
    expect(html.match(/aria-pressed="true"/g)).toHaveLength(1)
  })
})
