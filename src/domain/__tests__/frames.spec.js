import { describe, expect, it } from 'vitest'

import { toBrief } from '../brief.js'
import { fromDrawio, toDrawio } from '../drawio.js'
import { parseFlow, serialiseFlow } from '../flowText.js'
import { frameDocument, frameMembers } from '../frames.js'
import { toMermaid } from '../mermaid.js'
import { renderSvg } from '../renderSvg.js'

const at = (x, y) => ({ position: { x, y } })
const document = {
  version: 3,
  title: 'Shop',
  nodes: [
    {
      id: 'checkout',
      type: 'frame',
      name: 'Checkout',
      data: {},
      ...at(0, 0),
      size: { width: 600, height: 400 },
    },
    { id: 'pay', type: 'process', name: 'Pay', data: {}, ...at(40, 60) },
    {
      id: 'confirm',
      type: 'frame',
      name: 'Confirm',
      data: {},
      ...at(300, 200),
      size: { width: 280, height: 180 },
    },
    { id: 'ship', type: 'process', name: 'Ship', data: {}, ...at(320, 240) },
    { id: 'mail', type: 'process', name: 'Mail', data: {}, ...at(900, 60) },
  ],
  edges: [
    { id: 'e-pay-ship', source: 'pay', target: 'ship' },
    { id: 'e-ship-mail', source: 'ship', target: 'mail' },
  ],
}

describe('frameMembers', () => {
  it('puts a shape in the smallest frame its centre is in', () => {
    const members = frameMembers(document)
    expect(members.get('checkout')).toEqual(['pay', 'confirm'])
    expect(members.get('confirm')).toEqual(['ship'])
  })

  it('has nothing to say about a diagram without frames', () => {
    expect(frameMembers({ ...document, nodes: document.nodes.slice(1, 2) }).size).toBe(0)
  })
})

describe('frameDocument', () => {
  it('is the frame, everything within it, and the connections among them', () => {
    const checkout = frameDocument(document, 'checkout')
    expect(checkout.title).toBe('Checkout')
    expect(checkout.nodes.map((node) => node.id)).toEqual(['checkout', 'pay', 'confirm', 'ship'])
    expect(checkout.edges.map((edge) => edge.id)).toEqual(['e-pay-ship'])
  })

  it('is null for something that is not a frame', () => {
    expect(frameDocument(document, 'pay')).toBeNull()
  })
})

describe('frames elsewhere', () => {
  it('briefs a frame as a group, not as a shape to build', () => {
    const brief = toBrief(document)
    expect(brief).toContain('## Frames')
    expect(brief).toContain('- **Checkout** `checkout`: groups **Pay**, **Confirm**.')
    expect(brief).not.toMatch(/\*\*Checkout\*\* `checkout`: a /)
    expect(toBrief(frameDocument(document, 'confirm'))).toMatch(/^# Confirm\n/)
  })

  it('draws frames as Mermaid subgraphs, nested as they are', () => {
    const mermaid = toMermaid(document)
    expect(mermaid).toContain(
      '  subgraph checkout["Checkout"]\n    pay\n    subgraph confirm["Confirm"]\n      ship\n    end\n  end',
    )
    expect(mermaid).not.toMatch(/checkout\[\["/)
  })

  it('round-trips a frame through draw.io, behind the shapes', () => {
    const xml = toDrawio(document)
    expect(xml.indexOf('n-checkout')).toBeLessThan(xml.indexOf('n-pay'))
    const back = fromDrawio(xml).document
    expect(back.nodes.find((node) => node.id === 'checkout')).toMatchObject({ type: 'frame' })
  })

  it('renders frames first, under the connections, with their names', () => {
    const svg = renderSvg(document)
    expect(svg.indexOf('stroke-dasharray="8 5"')).toBeLessThan(svg.indexOf('marker-end'))
    expect(svg).toContain('>Checkout</text>')
  })

  it('keeps a frame in .flow text', () => {
    const text = serialiseFlow(document)
    expect(text).toContain('checkout = frame "Checkout"')
    expect(parseFlow(text).document.nodes[0].type).toBe('frame')
  })
})
