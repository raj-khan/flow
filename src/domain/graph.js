import { SHAPE, sizeOf } from './constants.js'
import { edgeIdFor, toNodeId } from './document.js'
import { layoutTree } from './layout.js'

export { edgeIdFor, toNodeId }

/**
 * @param {Record<string, any>} raw
 * @returns {import('./types.js').FlowNode}
 */
export function normaliseNode(raw) {
  return {
    id: toNodeId(raw.id),
    type: raw.type,
    name: raw.name ?? 'Untitled',
    data: raw.data ?? {},
    position: raw.position ?? null,
    size: raw.size ?? null,
  }
}

/**
 * Only edges whose ends both exist: a half-deleted edge has nothing to draw to.
 *
 * @param {import('./types.js').FlowEdge[]} edges
 * @param {Set<string>} ids
 * @returns {import('./types.js').VueFlowEdge[]}
 */
export function buildEdges(edges, ids) {
  return edges
    .filter((edge) => ids.has(edge.source) && ids.has(edge.target))
    .map((edge) => ({
      id: edge.id,
      type: 'flow',
      source: edge.source,
      target: edge.target,
      ...(edge.label ? { label: edge.label } : {}),
      data: { dashed: Boolean(edge.dashed), both: Boolean(edge.both) },
    }))
}

/**
 * Where every node sits: its own position if it has one, else the layout's.
 * @param {import('./types.js').FlowDocument | null | undefined} document
 * @returns {Map<string, { x: number, y: number }>}
 */
export function documentPositions(document) {
  return new Map(documentToGraph(document).nodes.map((node) => [node.id, node.position]))
}

/**
 * A dragged node keeps where it was put; everything else is laid out.
 * @param {import('./types.js').FlowDocument | null | undefined} document
 * @returns {{ nodes: import('./types.js').VueFlowNode[], edges: import('./types.js').VueFlowEdge[] }}
 */
export function documentToGraph(document) {
  const nodes = (document?.nodes ?? []).map(normaliseNode)
  const ids = new Set(nodes.map((node) => node.id))
  const edges = buildEdges(document?.edges ?? [], ids)
  const positions = layoutTree(nodes, edges)

  return {
    nodes: nodes.map((node) => ({
      id: node.id,
      // One component draws every shape, so an unknown one still renders.
      type: 'shape',
      position: node.position ?? positions.get(node.id) ?? { x: 0, y: 0 },
      ...sizeOf(node),
      // Behind everything, even when selected, so what it holds stays in reach.
      ...(node.type === SHAPE.FRAME ? { zIndex: -2000 } : {}),
      data: { node },
    })),
    edges,
  }
}

/**
 * A node goes with every edge that touches it.
 *
 * @param {import('./types.js').FlowDocument} document
 * @param {string} id
 * @returns {import('./types.js').FlowDocument}
 */
export function withNodeRemoved(document, id) {
  if (!document.nodes.some((node) => toNodeId(node.id) === id)) return document

  return {
    ...document,
    nodes: document.nodes.filter((node) => toNodeId(node.id) !== id),
    edges: document.edges.filter((edge) => edge.source !== id && edge.target !== id),
  }
}

/**
 * Several nodes, as one change.
 * @param {import('./types.js').FlowDocument} document
 * @param {string[]} ids
 * @returns {import('./types.js').FlowDocument}
 */
export const withNodesRemoved = (document, ids) =>
  ids.reduce((next, id) => withNodeRemoved(next, id), document)

/**
 * @param {import('./types.js').FlowDocument} document
 * @param {Record<string, { x: number, y: number }>} positions
 * @returns {import('./types.js').FlowDocument}
 */
export function withPositions(document, positions) {
  return {
    ...document,
    nodes: document.nodes.map((node) => {
      const position = positions[toNodeId(node.id)]
      return position ? { ...node, position: { ...position } } : node
    }),
  }
}

/**
 * @param {import('./types.js').FlowDocument} document
 * @param {string} source
 * @param {string} target
 * @returns {import('./types.js').FlowDocument}
 */
export function withEdge(document, source, target) {
  const id = edgeIdFor(source, target)
  if (document.edges.some((edge) => edge.id === id)) return document
  return { ...document, edges: [...document.edges, { id, source, target }] }
}

/**
 * Dashed, or with an arrow at each end. A key left out stays as it is.
 * @param {import('./types.js').FlowDocument} document
 * @param {string} id
 * @param {{ dashed?: boolean, both?: boolean }} style
 * @returns {import('./types.js').FlowDocument}
 */
export function withEdgeStyle(document, id, style) {
  return {
    ...document,
    edges: document.edges.map((edge) => {
      if (edge.id !== id) return edge
      const next = { ...edge }
      ;/** @type {const} */ (['dashed', 'both']).forEach((key) => {
        if (style[key] === undefined) return
        if (style[key]) next[key] = true
        else delete next[key]
      })
      return next
    }),
  }
}

/**
 * An empty label removes it, rather than keeping an empty pill.
 * @param {import('./types.js').FlowDocument} document
 * @param {string} id
 * @param {string} label
 * @returns {import('./types.js').FlowDocument}
 */
export function withEdgeLabel(document, id, label) {
  const text = label.trim()
  return {
    ...document,
    edges: document.edges.map((edge) => {
      if (edge.id !== id) return edge
      const next = { ...edge }
      if (text) next.label = text
      else delete next.label
      return next
    }),
  }
}

/**
 * @param {import('./types.js').FlowDocument} document
 * @param {string} id
 * @returns {import('./types.js').FlowDocument}
 */
export function withoutEdge(document, id) {
  return { ...document, edges: document.edges.filter((edge) => edge.id !== id) }
}

/**
 * Whether an edge may be drawn from one node to another. Any number in and out;
 * only a line to itself and a second copy of the same line are refused.
 *
 * @param {import('./types.js').FlowDocument} document
 * @param {string} source
 * @param {string} target
 * @returns {string | null} why not, or null when it is allowed
 */
export function canConnect(document, source, target) {
  if (source === target) return 'A node cannot connect to itself.'

  const ids = new Set(document.nodes.map((node) => toNodeId(node.id)))
  if (!ids.has(source) || !ids.has(target)) return 'That node no longer exists.'

  if (document.edges.some((edge) => edge.source === source && edge.target === target)) {
    return 'These are already connected.'
  }

  return null
}
