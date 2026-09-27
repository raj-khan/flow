import { describe, expect, it } from 'vitest'

import { readSharedText } from '../sharedText.js'

describe('readSharedText', () => {
  it('reads .flow text', () => {
    const document = readSharedText({
      text: 'title: Pay\npay = process "Pay"\nship = process "Ship"\npay -> ship',
    })
    expect(document.title).toBe('Pay')
    expect(document.nodes.map((node) => node.id)).toEqual(['pay', 'ship'])
    expect(document.edges).toHaveLength(1)
  })

  it('reads a Mermaid flowchart, named after the shared title', () => {
    const document = readSharedText({
      text: 'flowchart TD\n  A[Start] --> B[Ship]',
      title: 'Release',
    })
    expect(document.title).toBe('Release')
    expect(document.nodes).toHaveLength(2)
  })

  it('finds the diagram when an app puts it in the url field', () => {
    expect(readSharedText({ url: 'a = process "A"' })?.nodes).toHaveLength(1)
  })

  it('refuses text that is not a diagram', () => {
    expect(readSharedText({ text: 'Look at this!' })).toBeNull()
    expect(readSharedText({})).toBeNull()
  })
})
