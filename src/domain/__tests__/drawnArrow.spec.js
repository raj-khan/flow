import { describe, expect, it } from 'vitest'

import { shapeAt, withDrawnArrow, withoutDrawn } from '../drawn.js'
import { inkHeads } from '../ink.js'
import { parseFlow, serialiseFlow } from '../flowText.js'
import { renderSvg } from '../renderSvg.js'

const DOC = {
  version: 3,
  title: 'Shop',
  nodes: [
    { id: 'api', type: 'process', name: 'API', data: {} },
    { id: 'db', type: 'database', name: 'Orders', data: {} },
    { id: 'area', type: 'frame', name: 'Backend', data: {} },
  ],
  edges: [],
}
const SHAPES = [
  { id: 'api', type: 'process', x: 0, y: 0, width: 200, height: 100 },
  { id: 'db', type: 'database', x: 400, y: 0, width: 200, height: 100 },
  { id: 'area', type: 'frame', x: -100, y: -100, width: 800, height: 600 },
]
const P = (x, y) => ({ x, y })
const arrow = (from, to, both = false) => ({ kind: 'arrow', from, to, both })

describe('shapeAt', () => {
  it('finds the shape an end is on or next to, never a frame or a stroke', () => {
    expect(shapeAt(P(100, 50), SHAPES)?.id).toBe('api')
    expect(shapeAt(P(205, 50), SHAPES)?.id).toBe('api')
    expect(shapeAt(P(300, 300), SHAPES)).toBeUndefined()
    expect(shapeAt(P(10, 10), [{ ...SHAPES[0], type: 'ink' }])).toBeUndefined()
  })
})

describe('withDrawnArrow', () => {
  it('connects two shapes in the drawn direction, pinning both where they are', () => {
    const made = withDrawnArrow(DOC, arrow(P(190, 50), P(410, 60)), SHAPES, '')
    expect(made).toMatchObject({ made: 'connection', edgeId: 'e-api-db' })
    expect(made.document.edges).toEqual([{ id: 'e-api-db', source: 'api', target: 'db' }])
    expect(made.document.nodes[0].position).toEqual({ x: 0, y: 0 })

    const back = withDrawnArrow(DOC, arrow(P(410, 60), P(190, 50), true), SHAPES, '')
    expect(back.document.edges).toEqual([
      { id: 'e-db-api', source: 'db', target: 'api', both: true },
    ])
  })

  it('does nothing for a line on one shape, or a connection already there', () => {
    expect(withDrawnArrow(DOC, arrow(P(10, 10), P(150, 80)), SHAPES, '').made).toBe('nothing')
    const joined = { ...DOC, edges: [{ id: 'e-api-db', source: 'api', target: 'db' }] }
    expect(withDrawnArrow(joined, arrow(P(190, 50), P(410, 60)), SHAPES, '').made).toBe('nothing')
  })

  it('adds a shape of the same kind past an arrow into open canvas, connected', () => {
    const made = withDrawnArrow(DOC, arrow(P(100, 110), P(100, 300)), SHAPES, 'green')
    expect(made).toMatchObject({ made: 'shape', nodeId: 'process-1', edgeId: 'e-api-process-1' })
    const added = made.document.nodes.at(-1)
    expect(added).toMatchObject({ type: 'process', name: 'Process', data: { color: 'green' } })
    // Below the tip, centred on the line.
    expect(added.position.y).toBeGreaterThanOrEqual(300)
    expect(added.position.x + 116).toBeCloseTo(100, -1)

    const into = withDrawnArrow(DOC, arrow(P(500, 300), P(500, 110)), SHAPES, '')
    expect(into.document.nodes.at(-1).type).toBe('database')
    expect(into.document.edges).toEqual([
      { id: 'e-database-1-db', source: 'database-1', target: 'db' },
    ])
  })

  it('straightens a line or arrow touching no shape, keeping its head', () => {
    const made = withDrawnArrow(DOC, arrow(P(100, 300), P(300, 300)), SHAPES, 'red')
    expect(made.made).toBe('stroke')
    expect(made.document.nodes.at(-1)).toMatchObject({
      type: 'ink',
      data: { arrow: 'end', color: 'red' },
    })
    const line = withDrawnArrow(
      DOC,
      { kind: 'line', from: P(100, 300), to: P(300, 340), both: false },
      SHAPES,
      '',
    )
    expect(line.document.nodes.at(-1).data).not.toHaveProperty('arrow')
  })

  it('is taken back whole by withoutDrawn', () => {
    const made = withDrawnArrow(DOC, arrow(P(100, 110), P(100, 300)), SHAPES, '')
    const back = withoutDrawn(made.document, made)
    expect(back.nodes.map((node) => node.id)).toEqual(['api', 'db', 'area'])
    expect(back.edges).toEqual([])
  })
})

describe('stroke arrowheads', () => {
  it('draws a V at the end, or at both ends', () => {
    expect(inkHeads('0,50 100,50', 200, 12, undefined)).toBe('')
    const end = inkHeads('0,50 100,50', 200, 12, 'end')
    expect(end.match(/M/g)).toHaveLength(1)
    expect(end).toContain('L200,6')
    expect(inkHeads('0,50 100,50', 200, 12, 'both').match(/M/g)).toHaveLength(2)
  })

  it('is written in .flow for a stroke only, and drawn in SVG', () => {
    const doc = {
      ...DOC,
      nodes: [
        {
          id: 'ink-1',
          type: 'ink',
          name: '',
          data: { points: '0,50 100,50', arrow: 'end' },
          position: { x: 0, y: 0 },
          size: { width: 200, height: 12 },
        },
      ],
    }
    const text = serialiseFlow(doc)
    expect(text).toContain('ink-1 = ink\nink-1 arrow: end\n')
    expect(parseFlow(text).document.nodes[0].data.arrow).toBe('end')
    expect(parseFlow('a = process "A"\na arrow: end').errors[0].message).toBe(
      '"a" is not an ink shape; connect shapes with ->.',
    )
    expect(parseFlow('a = ink\na arrow: up').errors[0].message).toBe(
      'Unknown arrow "up". Use one of: end, both.',
    )
    expect(renderSvg(doc)).toMatch(/d="M0,6 L200,6 M[\d.]+,-?[\d.]+ L200,6 L/)
  })
})
