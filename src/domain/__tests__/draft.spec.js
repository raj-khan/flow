import { describe, expect, it } from 'vitest'

import { AGENT_LINKS, draftPrompt, readDraft } from '../draft.js'
import { parseFlow } from '../flowText.js'
import { SHAPE_OPTIONS } from '../nodeMeta.js'

describe('draftPrompt', () => {
  const prompt = draftPrompt(
    '  A checkout: the cart calls a payment API, which writes to an orders database.  ',
  )

  it('carries the description, every shape and the rules that make valid .flow', () => {
    expect(prompt).toContain(
      'What to draw:\nA checkout: the cart calls a payment API, which writes to an orders database.\n',
    )
    for (const option of SHAPE_OPTIONS) expect(prompt).toContain(`- \`${option.value}\`: `)
    expect(prompt).toContain('Leave out any @layout block')
    expect(prompt).toContain('Reply with only the diagram, in one ```flow code block.')
  })

  it('teaches with an example that is itself valid', () => {
    const example = /```flow\n([\s\S]*?)```/.exec(prompt)[1]
    const { document, errors } = parseFlow(example)
    expect(errors).toEqual([])
    expect(document.nodes).toHaveLength(4)
  })

  it('opens in Claude and ChatGPT, filled in', () => {
    expect(AGENT_LINKS.map((link) => link.url('a b&c'))).toEqual([
      'https://claude.ai/new?q=a%20b%26c',
      'https://chatgpt.com/?q=a%20b%26c',
    ])
  })
})

describe('readDraft', () => {
  it('reads the fenced block of an answer, and ignores the talk around it', () => {
    const answer =
      'Here is the diagram:\n\n```flow\ntitle: Checkout\ncart = screen "Cart"\npay = process "Payments"\ncart -> pay : checkout\n```\n\nLet me know!'
    const { document, errors } = readDraft(answer)
    expect(errors).toEqual([])
    expect(document.title).toBe('Checkout')
    expect(document.edges).toHaveLength(1)
  })

  it('reads an answer with no fence, and says where one is wrong', () => {
    expect(readDraft('a = process "A"').document.nodes).toHaveLength(1)
    const wrong = readDraft('```\ntitle: X\na = blob "A"\n```')
    expect(wrong.document).toBeNull()
    expect(wrong.errors[0].line).toBe(2)
  })

  it('refuses an answer with no shapes in it', () => {
    expect(readDraft('```flow\ntitle: Nothing\n```').errors).toEqual([
      { line: 1, message: 'There are no shapes in this answer.' },
    ])
  })
})
