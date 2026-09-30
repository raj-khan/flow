import { MIN_NODE_SIZE, SHAPE, sizeOf } from './constants.js'
import { isColor } from './colors.js'
import { edgeIdFor, withPositions } from './graph.js'
import { strokeToInk } from './ink.js'
import { metaFor } from './nodeMeta.js'

/**
 * What a pen stroke adds to a diagram: the stroke itself, or, when it was
 * plainly meant as one, the clean shape it was drawn as.
 */

/** The shape each drawn outline becomes. */
export const DRAWN_KIND = Object.freeze({
  rectangle: SHAPE.PROCESS,
  ellipse: SHAPE.TERMINAL,
  diamond: SHAPE.DECISION,
})

/**
 * Whether an outline was drawn around a shape already there: a ring round
 * something to point it out, which stays a stroke. A shape counts when its
 * centre is inside.
 *
 * @param {{ x: number, y: number, width: number, height: number }} outline
 * @param {{ x: number, y: number, width: number, height: number }[]} shapes
 */
export function encloses(outline, shapes) {
  return shapes.some((shape) => {
    const cx = shape.x + shape.width / 2
    const cy = shape.y + shape.height / 2
    return (
      cx > outline.x &&
      cx < outline.x + outline.width &&
      cy > outline.y &&
      cy < outline.y + outline.height
    )
  })
}

/**
 * The first free id with this prefix: `ink-1`, `ink-2`, and so on.
 * @param {import('./types.js').FlowDocument} document
 * @param {string} prefix
 */
export function freeId(document, prefix) {
  const taken = new Set(document.nodes.map((node) => String(node.id)))
  let n = 1
  while (taken.has(`${prefix}-${n}`)) n += 1
  return `${prefix}-${n}`
}

/**
 * The diagram with a pen stroke added, as drawn.
 *
 * @param {import('./types.js').FlowDocument} document
 * @param {{ position: { x: number, y: number }, size: { width: number, height: number }, points: string }} ink
 * @param {string} color a ColorName, or '' for ink
 * @returns {{ document: import('./types.js').FlowDocument, id: string }}
 */
export function withInk(document, ink, color) {
  const id = freeId(document, 'ink')
  return {
    id,
    document: {
      ...document,
      nodes: [
        ...document.nodes,
        {
          id,
          type: SHAPE.INK,
          name: '',
          data: { points: ink.points, ...(isColor(color) ? { color } : {}) },
          position: ink.position,
          size: ink.size,
        },
      ],
    },
  }
}

/**
 * The diagram with a drawn outline added as the clean shape it was meant as,
 * where it was drawn, at least large enough to hold a title.
 *
 * @param {import('./types.js').FlowDocument} document
 * @param {import('./recognize.js').ClosedShape} drawn
 * @param {string} color a ColorName, or '' for the kind's own look
 * @returns {{ document: import('./types.js').FlowDocument, id: string, type: string }}
 */
export function withDrawnShape(document, drawn, color) {
  const type = DRAWN_KIND[drawn.kind]
  const id = freeId(document, type)
  const width = Math.max(MIN_NODE_SIZE.WIDTH, drawn.box.width)
  const height = Math.max(MIN_NODE_SIZE.HEIGHT, drawn.box.height)
  return {
    id,
    type,
    document: {
      ...document,
      nodes: [
        ...document.nodes,
        {
          id,
          type,
          name: metaFor(type).label,
          data: { description: '', ...(isColor(color) ? { color } : {}) },
          // Grown about its centre, so a small outline stays where it was drawn.
          position: {
            x: Math.round(drawn.box.x - (width - drawn.box.width) / 2),
            y: Math.round(drawn.box.y - (height - drawn.box.height) / 2),
          },
          size: { width, height },
        },
      ],
    },
  }
}

/**
 * @typedef {{ id: string, type: string, x: number, y: number, width: number, height: number }} PlacedShape
 * @typedef {{
 *   document: import('./types.js').FlowDocument,
 *   made: 'connection' | 'shape' | 'stroke' | 'nothing',
 *   nodeId?: string,
 *   edgeId?: string,
 * }} DrawnArrow
 */

/** How near a shape an end may land and still count as on it. */
const REACH = 14

/** Kinds that make no sense repeated at an arrow's end, which becomes a process. */
const NOT_REPEATED = new Set(
  /** @type {string[]} */ ([SHAPE.INK, SHAPE.TEXT, SHAPE.NOTE, SHAPE.FRAME]),
)

/**
 * The shape an end of a drawn line lands on: the smallest one it is on or
 * next to. Strokes are marks and frames are regions, so neither is ever an
 * end: an arrow drawn inside a frame stays an arrow.
 *
 * @param {{ x: number, y: number }} point
 * @param {PlacedShape[]} shapes
 * @returns {PlacedShape | undefined}
 */
export function shapeAt(point, shapes) {
  return shapes
    .filter(
      (shape) =>
        shape.type !== SHAPE.INK &&
        shape.type !== SHAPE.FRAME &&
        point.x >= shape.x - REACH &&
        point.x <= shape.x + shape.width + REACH &&
        point.y >= shape.y - REACH &&
        point.y <= shape.y + shape.height + REACH,
    )
    .sort((a, b) => a.width * a.height - b.width * b.height)[0]
}

/**
 * A drawn line or arrow, as what it was meant to be. From one shape to another,
 * a connection; from a shape into open canvas, or from open canvas into a
 * shape, a new shape there, connected; touching none, a straight stroke that
 * keeps its head. The shapes it joins are pinned where they are, so the new
 * connection moves nothing.
 *
 * @param {import('./types.js').FlowDocument} document
 * @param {import('./recognize.js').OpenShape} drawn
 * @param {PlacedShape[]} shapes every shape on the canvas, where it is drawn
 * @param {string} color a ColorName, or '' for ink
 * @returns {DrawnArrow}
 */
export function withDrawnArrow(document, drawn, shapes, color) {
  const from = shapeAt(drawn.from, shapes)
  const to = shapeAt(drawn.to, shapes)
  const pin = (/** @type {PlacedShape[]} */ ends) =>
    withPositions(
      document,
      Object.fromEntries(
        ends.map((end) => [end.id, { x: Math.round(end.x), y: Math.round(end.y) }]),
      ),
    )

  if (from && to) {
    if (from.id === to.id) return { document, made: 'nothing' }
    const edgeId = edgeIdFor(from.id, to.id)
    if (document.edges.some((edge) => edge.id === edgeId)) return { document, made: 'nothing' }
    const pinned = pin([from, to])
    return {
      made: 'connection',
      edgeId,
      document: {
        ...pinned,
        edges: [
          ...pinned.edges,
          { id: edgeId, source: from.id, target: to.id, ...(drawn.both ? { both: true } : {}) },
        ],
      },
    }
  }

  const known = from ?? to
  if (known) {
    // The new shape sits past the open end, away from the shape it joins.
    const end = from ? drawn.to : drawn.from
    const other = from ? drawn.from : drawn.to
    const type = NOT_REPEATED.has(known.type) ? SHAPE.PROCESS : known.type
    const nodeId = freeId(document, type)
    const along = Math.hypot(end.x - other.x, end.y - other.y) || 1
    const ux = (end.x - other.x) / along
    const uy = (end.y - other.y) / along
    const size = sizeOf({ type })
    const centre = {
      x: end.x + (ux * size.width) / 2,
      y: end.y + (uy * size.height) / 2,
    }
    const [source, target] = from ? [known.id, nodeId] : [nodeId, known.id]
    const edgeId = edgeIdFor(source, target)
    const pinned = pin([known])
    return {
      made: 'shape',
      nodeId,
      edgeId,
      document: {
        ...pinned,
        nodes: [
          ...pinned.nodes,
          {
            id: nodeId,
            type,
            name: metaFor(type).label,
            data: { description: '', ...(isColor(color) ? { color } : {}) },
            position: {
              x: Math.round(centre.x - size.width / 2),
              y: Math.round(centre.y - size.height / 2),
            },
          },
        ],
        edges: [
          ...pinned.edges,
          { id: edgeId, source, target, ...(drawn.both ? { both: true } : {}) },
        ],
      },
    }
  }

  const ink = strokeToInk([drawn.from, drawn.to])
  if (!ink) return { document, made: 'nothing' }
  const added = withInk(document, ink, color)
  const arrow = drawn.kind === 'arrow' ? (drawn.both ? 'both' : 'end') : ''
  return {
    made: 'stroke',
    nodeId: added.id,
    document: arrow
      ? {
          ...added.document,
          nodes: added.document.nodes.map((node) =>
            node.id === added.id ? { ...node, data: { ...node.data, arrow } } : node,
          ),
        }
      : added.document,
  }
}

/**
 * The diagram without what a drawn stroke became, for Keep as drawn.
 * @param {import('./types.js').FlowDocument} document
 * @param {{ nodeId?: string, edgeId?: string }} made
 * @returns {import('./types.js').FlowDocument}
 */
export function withoutDrawn(document, { nodeId, edgeId }) {
  return {
    ...document,
    nodes: document.nodes.filter((node) => String(node.id) !== nodeId),
    edges: document.edges.filter(
      (edge) => edge.id !== edgeId && edge.source !== nodeId && edge.target !== nodeId,
    ),
  }
}
