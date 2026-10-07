import { describe, expect, it } from 'vitest'

import { toBrief } from '../brief.js'
import { parseFlow, serialiseFlow } from '../flowText.js'
import { decodeShare } from '../shareLink.js'

/** @param {string} text ASCII */
const base64url = (text) => btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

const flow = (text) => parseFlow(text).document

describe('toBrief', () => {
  it('lists each shape by what it means, and each connection in words', () => {
    const brief = toBrief(
      flow(
        [
          'title: Checkout',
          'cart = terminal "Cart"',
          'paid = decision "Paid?" -- Card or invoice',
          'orders = table "orders" -- id PK, user_id FK',
          'cart -> paid',
          'paid -> orders : yes',
        ].join('\n'),
      ),
    )

    expect(brief).toMatch(
      /^# Checkout\n\nA design sketched in isketch: 3 shapes and 2 connections\./,
    )
    expect(brief).toContain(
      '- **Cart** `cart`: where a flow starts or ends, or something outside the system.\n',
    )
    expect(brief).toContain('- **Paid?** `paid`: a branch the code must handle. Card or invoice\n')
    expect(brief).toContain('- **orders** `orders`: a database table. Columns: id PK, user_id FK\n')
    expect(brief).toContain(
      '## Connections\n\n- **Cart** → **Paid?**\n- **Paid?** → **orders**: yes\n',
    )
  })

  it('reads a wireframe as an interface to build', () => {
    const brief = toBrief(
      flow(
        'page = screen "Sign up" -- /signup\nemail = input "Email"\ngo = button "Create account"\n',
      ),
    )

    expect(brief).toContain('- **Sign up** `page`: a screen or page of the interface. /signup\n')
    expect(brief).toContain('- **Email** `email`: a form field.\n')
    expect(brief).toContain('- **Create account** `go`: a button.\n')
  })

  it('passes on notes for the diagram and for each shape as instructions', () => {
    const brief = toBrief(
      flow(
        'title: Shop\nnote: Use NestJS\n\napi = process "API"\napi note: Paginate lists\napi note: Idempotent writes\n',
      ),
    )

    expect(brief).toContain(
      '## Notes\n\nFrom whoever sketched this; follow them.\n\n- Use NestJS\n',
    )
    expect(brief).toContain(
      '- **API** `api`: a component or step.\n  - Note: Paginate lists\n  - Note: Idempotent writes\n',
    )
  })

  it('says which connections run both ways, and which are dashed', () => {
    const brief = toBrief(
      flow('a = process "A"\nb = process "B"\nc = process "C"\na <-> b\nb --> c : later'),
    )

    expect(brief).toContain('- **A** ↔ **B**\n')
    expect(brief).toContain('- **B** → **C**: later (dashed: optional or asynchronous)\n')
  })

  it('leaves pen strokes out, saying how many there are', () => {
    const brief = toBrief(flow('api = process "API"\nink-1 = ink\n@ink\nink-1 0,0 100,100'))

    expect(brief).toContain('1 shape and 0 connections')
    expect(brief).not.toContain('`ink-1`:')
    expect(brief).toContain(
      'The sketch also has 1 pen stroke drawn over it by hand, left out here.',
    )
  })

  it('ends with the .flow source, so an agent can edit it and hand it back', () => {
    const brief = toBrief(flow('a = process "A"\nb = database "B"\na -> b\n'))
    const source = brief.slice(brief.indexOf('```text\n') + 8, brief.lastIndexOf('```'))

    expect(parseFlow(source).errors).toEqual([])
    expect(parseFlow(source).document.edges).toHaveLength(1)
  })

  it('keeps names and descriptions from breaking the Markdown', () => {
    const brief = toBrief(
      flow('a = process "*bold* [link]" -- one\\ntwo\nb = note "Uses ```fences```"\n'),
    )

    expect(brief).toContain('- **\\*bold\\* \\[link\\]** `a`: a component or step. one; two\n')
    expect(brief).toContain('\n````text\n')
    expect(brief.trimEnd().endsWith('\n````')).toBe(true)
  })

  it('says so when the diagram is empty', () => {
    const brief = toBrief({ version: 3, title: '', nodes: [], edges: [] })

    expect(brief).toMatch(
      /^# Untitled diagram\n\nA design sketched in isketch: 0 shapes and 0 connections\./,
    )
    expect(brief).not.toContain('## Shapes')
  })

  it('with a link, asks for a link back, built the way the brief says', async () => {
    const document = flow('title: Login\na = process "A"\nb = database "B"\na -> b\n')
    const brief = toBrief(document, { link: 'https://isketch.online/new#flow=zabc' })

    expect(brief).toContain(
      'Here is my draft. Open it to see it: https://isketch.online/new#flow=zabc',
    )
    expect(brief).toContain('reply with a link to your version')

    // What the suggested one-liner produces opens the same diagram.
    const hash = `#flow=t${base64url(serialiseFlow(document))}`
    expect(brief).toContain('https://isketch.online/new#flow=t')
    expect(serialiseFlow(await decodeShare(hash))).toBe(serialiseFlow(document))
  })

  it('without a link, is the brief alone', () => {
    expect(toBrief(flow('a = process "A"\n'))).not.toContain('## My draft')
  })
})
