import { NODE_GAP, SHAPE, sizeOf } from './constants.js'
import { edgeIdFor, toNodeId, withPositions } from './graph.js'
import { freeSpotNear } from './layout.js'
import { metaFor } from './nodeMeta.js'

/** Kinds that make no sense repeated as the next step, which becomes a process. */
const NOT_REPEATED = new Set([SHAPE.INK, SHAPE.TEXT, SHAPE.NOTE])

/**
 * Tab, as in Whimsical: a new shape below the selected one, connected to it,
 * of the same kind. Placed where nothing is, and the selected shape is pinned
 * where it is, so the layout does not move it for the new connection.
 *
 * @param {import('./types.js').FlowDocument} document
 * @param {{ id: string, position: { x: number, y: number } }} from where the shape is on screen
 * @param {{ position: { x: number, y: number } }[]} placed every shape, where it is on screen
 * @param {string} id the new shape's
 * @returns {import('./types.js').FlowDocument}
 */
export function withConnectedShape(document, from, placed, id) {
  const source = document.nodes.find((node) => toNodeId(node.id) === from.id)
  if (!source) return document

  const type = NOT_REPEATED.has(source.type) ? SHAPE.PROCESS : source.type
  const below = {
    x: Math.round(from.position.x),
    y: Math.round(from.position.y + sizeOf(source).height + NODE_GAP.Y),
  }
  const pinned = withPositions(document, { [from.id]: from.position })
  return {
    ...pinned,
    nodes: [
      ...pinned.nodes,
      {
        id,
        type,
        name: metaFor(type).label,
        data: { description: '' },
        position: freeSpotNear(below, placed),
      },
    ],
    edges: [...pinned.edges, { id: edgeIdFor(from.id, id), source: from.id, target: id }],
  }
}

/**
 * What the eraser went over, gone in one change: shapes with their
 * connections, and connections on their own.
 *
 * @param {import('./types.js').FlowDocument} document
 * @param {string[]} nodeIds
 * @param {string[]} edgeIds
 * @returns {import('./types.js').FlowDocument}
 */
export function withErased(document, nodeIds, edgeIds) {
  const nodes = new Set(nodeIds)
  const edges = new Set(edgeIds)
  return {
    ...document,
    nodes: document.nodes.filter((node) => !nodes.has(toNodeId(node.id))),
    edges: document.edges.filter(
      (edge) => !edges.has(edge.id) && !nodes.has(edge.source) && !nodes.has(edge.target),
    ),
  }
}
