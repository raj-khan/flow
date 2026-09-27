import { describe, expect, it } from 'vitest'

import { fromExcalidraw, toExcalidraw } from '../excalidraw.js'

const base = { angle: 0, isDeleted: false, roughness: 1, strokeStyle: 'solid' }
const shape = (id, type, x, y, extra = {}) => ({
  ...base,
  id,
  type,
  x,
  y,
  width: 200,
  height: 80,
  ...extra,
})
const label = (id, containerId, text) => ({
  ...base,
  id,
  type: 'text',
  x: 0,
  y: 0,
  width: 50,
  height: 20,
  text,
  originalText: text,
  containerId,
})

/** What Excalidraw itself writes, trimmed to the fields that matter. */
const SKETCH = JSON.stringify({
  type: 'excalidraw',
  version: 2,
  elements: [
    shape('Ab3-x', 'rectangle', 0, 0, { boundElements: [{ type: 'text', id: 't1' }] }),
    label('t1', 'Ab3-x', 'API'),
    shape('db', 'ellipse', 0, 200),
    label('t2', 'db', 'Users'),
    shape('ok', 'diamond', 300, 200),
    {
      ...base,
      id: 'free',
      type: 'text',
      x: 500,
      y: 0,
      width: 80,
      height: 20,
      text: 'Draft',
      originalText: 'Draft',
      containerId: null,
    },
    {
      ...base,
      id: 'a1',
      type: 'arrow',
      x: 100,
      y: 80,
      width: 0,
      height: 120,
      points: [
        [0, 0],
        [0, 120],
      ],
      startBinding: { elementId: 'Ab3-x' },
      endBinding: { elementId: 'db' },
      endArrowhead: 'arrow',
      strokeStyle: 'dashed',
    },
    label('t3', 'a1', 'reads'),
    {
      ...base,
      id: 'a2',
      type: 'arrow',
      x: 0,
      y: 0,
      width: 50,
      height: 0,
      points: [
        [0, 0],
        [50, 0],
      ],
      startBinding: null,
      endBinding: { elementId: 'ok' },
    },
    {
      ...base,
      id: 'l1',
      type: 'line',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      points: [
        [0, 0],
        [10, 10],
      ],
    },
    {
      ...base,
      id: 'p1',
      type: 'freedraw',
      x: 600,
      y: 300,
      width: 100,
      height: 40,
      points: [
        [0, 0],
        [50, 30],
        [100, 5],
      ],
      pressures: [0.2, 0.8, 0.4],
      simulatePressure: false,
    },
    { ...base, id: 'gone', type: 'rectangle', x: 0, y: 0, width: 10, height: 10, isDeleted: true },
  ],
  appState: { viewBackgroundColor: '#ffffff' },
  files: {},
})

describe('fromExcalidraw', () => {
  const { document, warnings } = fromExcalidraw(SKETCH)
  const byId = Object.fromEntries(document.nodes.map((node) => [node.id, node]))

  it('turns rectangles, ellipses, diamonds and loose text into shapes, named by their text', () => {
    expect(byId['Ab3-x']).toMatchObject({
      type: 'process',
      name: 'API',
      position: { x: 0, y: 0 },
      size: { width: 200, height: 80 },
    })
    expect(byId.db).toMatchObject({ type: 'terminal', name: 'Users' })
    expect(byId.ok).toMatchObject({ type: 'decision', name: '' })
    expect(byId.free).toMatchObject({ type: 'text', name: 'Draft' })
    expect(byId.gone).toBeUndefined()
  })

  it('turns arrows bound at both ends into connections, keeping label and dashes', () => {
    expect(document.edges).toEqual([
      { id: 'e-Ab3-x-db', source: 'Ab3-x', target: 'db', label: 'reads', dashed: true },
    ])
  })

  it('turns free drawing into ink, with its pressure', () => {
    expect(byId.p1.type).toBe('ink')
    expect(byId.p1.data.points.split(' ')[0].split(',')).toHaveLength(3)
  })

  it('lists what it skipped, and draws by hand as Excalidraw did', () => {
    expect(warnings.map((warning) => warning.message)).toEqual([
      'Skipped a line (only arrows between shapes connect them).',
      'Skipped an arrow not joined to a shape at both ends.',
    ])
    expect(document.style).toBe('sketch')
  })

  it('reads the clipboard form too', () => {
    const clipboard = JSON.stringify({
      type: 'excalidraw/clipboard',
      elements: JSON.parse(SKETCH).elements,
    })
    expect(fromExcalidraw(clipboard).document.nodes).toHaveLength(document.nodes.length)
  })

  it('says so when it is not Excalidraw', () => {
    expect(fromExcalidraw('flowchart TD').document).toBeNull()
    expect(fromExcalidraw('{"type":"other","elements":[]}').document).toBeNull()
  })
})

describe('toExcalidraw', () => {
  const diagram = {
    version: 3,
    title: 'Shop',
    style: 'sketch',
    nodes: [
      {
        id: 'checkout',
        type: 'frame',
        name: 'Checkout',
        data: {},
        position: { x: 0, y: 0 },
        size: { width: 600, height: 400 },
      },
      {
        id: 'api',
        type: 'process',
        name: 'API',
        data: { description: 'REST', notes: 'Paginate' },
        position: { x: 40, y: 60 },
      },
      {
        id: 'db',
        type: 'database',
        name: 'Orders',
        data: { description: '' },
        position: { x: 40, y: 260 },
      },
      { id: 'go', type: 'terminal', name: 'Go', data: {}, position: { x: 700, y: 60 } },
      { id: 'hint', type: 'text', name: 'Draft', data: {}, position: { x: 700, y: 300 } },
      {
        id: 'ink-1',
        type: 'ink',
        name: '',
        data: { points: '0,0,0.2 50,60,0.9 100,100,0.4' },
        position: { x: 900, y: 0 },
        size: { width: 100, height: 40 },
      },
    ],
    edges: [
      { id: 'e-api-db', source: 'api', target: 'db', label: 'writes', dashed: true },
      { id: 'e-api-go', source: 'api', target: 'go', both: true },
    ],
  }

  it('writes a file Excalidraw opens, frames first', () => {
    const file = JSON.parse(toExcalidraw(diagram))
    expect(file).toMatchObject({ type: 'excalidraw', version: 2 })
    expect(file.elements[0]).toMatchObject({ type: 'frame', name: 'Checkout' })
    const arrow = file.elements.find((element) => element.id === 'e-api-db')
    expect(arrow).toMatchObject({
      type: 'arrow',
      startBinding: { elementId: 'api' },
      endBinding: { elementId: 'db' },
      strokeStyle: 'dashed',
    })
    expect(file.elements.find((element) => element.id === 'api').boundElements).toContainEqual({
      type: 'arrow',
      id: 'e-api-db',
    })
  })

  it('round-trips: every kind, name, description, note, position and connection comes back', () => {
    const back = fromExcalidraw(toExcalidraw(diagram)).document
    expect(back.title).toBe('Shop')
    expect(back.style).toBe('sketch')
    for (const node of diagram.nodes.filter((each) => each.type !== 'ink')) {
      const found = back.nodes.find((each) => each.id === node.id)
      expect(found, node.id).toMatchObject({
        type: node.type,
        name: node.name,
        position: node.position,
      })
      expect(found.data.description ?? '').toBe(node.data.description ?? '')
      expect(found.data.notes).toBe(node.data.notes)
    }
    expect(back.nodes.find((each) => each.id === 'ink-1').type).toBe('ink')
    expect(back.edges).toEqual(
      expect.arrayContaining([
        { id: 'e-api-db', source: 'api', target: 'db', label: 'writes', dashed: true },
        { id: 'e-api-go', source: 'api', target: 'go', both: true },
      ]),
    )
  })

  it('is the same bytes each time', () => {
    expect(toExcalidraw(diagram)).toBe(toExcalidraw(diagram))
  })
})
