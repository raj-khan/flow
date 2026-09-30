import { MIN_NODE_SIZE, SHAPE } from './constants.js'
import { isColor } from './colors.js'
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
