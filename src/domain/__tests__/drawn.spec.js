import { describe, expect, it } from 'vitest'

import { encloses, freeId, withDrawnShape, withInk } from '../drawn.js'

const DOC = {
  version: 3,
  title: 'Sketch',
  nodes: [{ id: 'ink-1', type: 'ink', name: '', data: { points: '0,0 100,100' } }],
  edges: [],
}

describe('drawn', () => {
  it('names each new shape after the first free number', () => {
    expect(freeId(DOC, 'ink')).toBe('ink-2')
    expect(freeId(DOC, 'process')).toBe('process-1')
  })

  it('adds a stroke as drawn, in the pen colour', () => {
    const ink = { position: { x: 4, y: 8 }, size: { width: 40, height: 20 }, points: '0,0 100,100' }
    const { id, document } = withInk(DOC, ink, 'red')
    expect(id).toBe('ink-2')
    expect(document.nodes[1]).toEqual({
      id: 'ink-2',
      type: 'ink',
      name: '',
      data: { points: '0,0 100,100', color: 'red' },
      position: { x: 4, y: 8 },
      size: { width: 40, height: 20 },
    })
    expect(withInk(DOC, ink, '').document.nodes[1].data).toEqual({ points: '0,0 100,100' })
  })

  it('adds a drawn outline as its clean shape, where it was drawn', () => {
    const box = { x: 100, y: 50, width: 220, height: 120 }
    const made = withDrawnShape(DOC, { kind: 'diamond', box }, 'blue')
    expect(made).toMatchObject({ id: 'decision-1', type: 'decision' })
    expect(made.document.nodes[1]).toMatchObject({
      type: 'decision',
      name: 'Decision',
      data: { color: 'blue' },
      position: { x: 100, y: 50 },
      size: { width: 220, height: 120 },
    })
    expect(withDrawnShape(DOC, { kind: 'ellipse', box }, '').type).toBe('terminal')
    expect(withDrawnShape(DOC, { kind: 'rectangle', box }, '').type).toBe('process')
  })

  it('grows a small outline about its centre, to hold a title', () => {
    const small = withDrawnShape(
      DOC,
      { kind: 'rectangle', box: { x: 100, y: 100, width: 40, height: 30 } },
      '',
    )
    expect(small.document.nodes[1]).toMatchObject({
      position: { x: 80, y: 95 },
      size: { width: 80, height: 40 },
    })
  })

  it('knows an outline drawn around a shape, to point it out', () => {
    const ring = { x: 0, y: 0, width: 300, height: 200 }
    expect(encloses(ring, [{ x: 50, y: 50, width: 100, height: 60 }])).toBe(true)
    expect(encloses(ring, [{ x: 260, y: 150, width: 100, height: 100 }])).toBe(false)
    expect(encloses(ring, [])).toBe(false)
  })
})
