import { SHAPE } from './constants.js'
import { isLegacyBranch, legacyDescription, legacyName, shapeForLegacy } from './legacy.js'

export const DOCUMENT_VERSION = 3

/** v1 marked a root with this parent. */
const ROOT_PARENT_ID = '-1'

export const DEFAULT_TITLE = 'Untitled diagram'

/**
 * Older documents mix a numeric id with hex strings; route params are strings.
 * @param {unknown} id
 * @returns {string}
 */
export const toNodeId = (id) => String(id)

/**
 * One edge per ordered pair, so the pair is the key: an undone removal draws
 * the same edge again rather than a second one beside it.
 * @param {string} source
 * @param {string} target
 */
export const edgeIdFor = (source, target) => `e-${source}-${target}`

/** @returns {import('./types.js').FlowDocument} */
export const emptyDocument = (title = DEFAULT_TITLE) => ({
  version: DOCUMENT_VERSION,
  title,
  nodes: [],
  edges: [],
})

/**
 * Anything Flow has ever stored, lifted to the current shape.
 *
 * - v1: a bare array of chat-bot nodes whose one incoming edge was `parentId`
 * - v2: `{ nodes, edges }`, still with the chat-bot node types
 * - v3: the same, with general shapes; branch nodes became labelled edges
 *
 * @param {unknown} raw
 * @returns {import('./types.js').FlowDocument}
 */
export function migrate(raw) {
  if (Array.isArray(raw)) return toV3(fromV1(raw))

  if (raw && typeof raw === 'object' && Array.isArray(/** @type {any} */ (raw).nodes)) {
    const document = normalise(/** @type {Record<string, any>} */ (raw))
    return document.version >= DOCUMENT_VERSION ? document : toV3(document)
  }

  throw new Error('This is not an isketch document.')
}

/**
 * @param {Record<string, any>} document
 * @returns {import('./types.js').FlowDocument}
 */
function normalise(document) {
  return {
    version: Number(document.version) || 2,
    title: typeof document.title === 'string' ? document.title : DEFAULT_TITLE,
    ...(typeof document.notes === 'string' && document.notes ? { notes: document.notes } : {}),
    ...(document.style === 'sketch' ? { style: 'sketch' } : {}),
    ...(document.lines === 'curved' || document.lines === 'straight'
      ? { lines: document.lines }
      : {}),
    nodes: document.nodes.map((/** @type {Record<string, any>} */ node) => ({
      ...node,
      id: toNodeId(node.id),
    })),
    edges: (Array.isArray(document.edges) ? document.edges : []).map(
      (/** @type {Record<string, any>} */ edge) => ({
        ...edge,
        id: toNodeId(edge.id ?? edgeIdFor(edge.source, edge.target)),
        source: toNodeId(edge.source),
        target: toNodeId(edge.target),
      }),
    ),
  }
}

/**
 * Chat-bot types become shapes, keeping what their card showed as the
 * description. A branch node between two others becomes the label on a direct
 * edge; one that leads nowhere stays, as text, so its label is not lost.
 *
 * @param {import('./types.js').FlowDocument} document
 * @returns {import('./types.js').FlowDocument}
 */
function toV3(document) {
  let { nodes, edges } = document

  nodes.filter(isLegacyBranch).forEach((branch) => {
    const into = edges.filter((edge) => edge.target === branch.id)
    const out = edges.filter((edge) => edge.source === branch.id)
    if (!into.length || !out.length) return

    const bridged = into.flatMap((from) =>
      out.map((to) => ({
        id: edgeIdFor(from.source, to.target),
        source: from.source,
        target: to.target,
        label: branch.name ?? '',
      })),
    )

    nodes = nodes.filter((node) => node.id !== branch.id)
    edges = [
      ...edges.filter((edge) => edge.source !== branch.id && edge.target !== branch.id),
      ...bridged.filter((edge) => !edges.some((existing) => existing.id === edge.id)),
    ]
  })

  return {
    ...document,
    version: DOCUMENT_VERSION,
    nodes: nodes.map((node) => {
      if (isLegacyBranch(node)) return { ...node, type: SHAPE.TEXT }

      const shape = shapeForLegacy(node.type)
      if (!shape) return node
      return {
        ...node,
        type: shape,
        name: legacyName(node),
        data: { ...node.data, description: legacyDescription(node) },
      }
    }),
    edges,
  }
}

/**
 * @param {Record<string, any>[]} list
 * @returns {import('./types.js').FlowDocument}
 */
function fromV1(list) {
  const ids = new Set(list.map((node) => toNodeId(node.id)))

  const edges = list
    .map((node) => ({
      source: toNodeId(node.parentId ?? ROOT_PARENT_ID),
      target: toNodeId(node.id),
    }))
    .filter(({ source, target }) => ids.has(source) && source !== target)
    .map(({ source, target }) => ({ id: edgeIdFor(source, target), source, target }))

  const nodes = list.map(({ parentId: _parentId, ...node }) => ({ ...node, id: toNodeId(node.id) }))

  return { version: 2, title: DEFAULT_TITLE, nodes, edges }
}

/**
 * The same diagram with nothing drawn on it: every shape, stroke and
 * connection gone, and its title, notes and look kept.
 *
 * @param {import('./types.js').FlowDocument} document
 * @returns {import('./types.js').FlowDocument}
 */
export const withNothingDrawn = (document) => ({ ...document, nodes: [], edges: [] })
