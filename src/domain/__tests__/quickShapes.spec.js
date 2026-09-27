import { describe, expect, it } from 'vitest'

import { withConnectedShape, withErased } from '../quickShapes.js'

const document = {
  version: 3,
  title: 'T',
  nodes: [
    { id: 'a', type: 'database', name: 'A', data: {} },
    { id: 'b', type: 'note', name: 'B', data: {} },
    { id: 'c', type: 'process', name: 'C', data: {} },
  ],
  edges: [
    { id: 'e-a-b', source: 'a', target: 'b' },
    { id: 'e-b-c', source: 'b', target: 'c' },
  ],
}

describe('withConnectedShape', () => {
  it('adds a shape of the same kind below, connected, and pins the one it comes from', () => {
    const next = withConnectedShape(document, { id: 'a', position: { x: 10, y: 20 } }, [], 'n1')
    const added = next.nodes.at(-1)
    expect(added).toMatchObject({ id: 'n1', type: 'database', name: 'Database' })
    expect(added.position.y).toBeGreaterThan(20 + 104)
    expect(next.edges.at(-1)).toMatchObject({ source: 'a', target: 'n1' })
    expect(next.nodes[0].position).toEqual({ x: 10, y: 20 })
  })

  it('follows a note with a process, and finds room when below is taken', () => {
    const below = { position: { x: 0, y: 176 } }
    const next = withConnectedShape(document, { id: 'b', position: { x: 0, y: 0 } }, [below], 'n2')
    const added = next.nodes.at(-1)
    expect(added.type).toBe('process')
    expect(added.position).not.toEqual(below.position)
  })

  it('leaves the document alone for a shape it does not have', () => {
    expect(withConnectedShape(document, { id: 'x', position: { x: 0, y: 0 } }, [], 'n')).toBe(
      document,
    )
  })
})

describe('withErased', () => {
  it('removes shapes with their connections, and lone connections, at once', () => {
    const next = withErased(document, ['c'], ['e-a-b'])
    expect(next.nodes.map((node) => node.id)).toEqual(['a', 'b'])
    expect(next.edges).toEqual([])
  })
})
