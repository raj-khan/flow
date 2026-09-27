import { FRAME_SIZE, SHAPE, sizeOf } from './constants.js'
import { DOCUMENT_VERSION, edgeIdFor } from './document.js'
import { documentPositions, toNodeId } from './graph.js'
import { importFormat } from './importers.js'

/**
 * `isketch scan`: a first architecture diagram from what a repository
 * already says about itself. Each source found (compose, SQL migrations,
 * Prisma, OpenAPI, Drizzle) is imported as it would be one at a time, laid out
 * on its own, and framed, side by side, in one diagram an agent then refines.
 *
 * @typedef {{ format: string, label: string, paths: string[] }} Source
 */

/** Folders that hold other people's code or build output, never the design. */
export const IGNORED_FOLDERS = Object.freeze([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out',
  'coverage',
  'vendor',
  '.next',
  '.nuxt',
  'target',
])
const IGNORED = new RegExp(
  `(^|/)(${IGNORED_FOLDERS.map((name) => name.replace('.', '\\.')).join('|')})(/|$)`,
)

/** Tests and their fixtures describe what is tested, not the system. */
const TESTS = /(^|\/)(__tests__|tests?|e2e|fixtures?|__mocks__)\/|\.(spec|test)\.[cm]?[jt]s$/i

/** Files worth looking inside, to tell a spec or a schema from anything else. */
export const PEEKED = /\.(ya?ml|json|ts|js|mjs)$/i

/** How far apart the framed sources sit, and how much room a frame leaves inside. */
const GAP = 120
const PAD = { SIDE: 40, TOP: 64 }

/**
 * Which files are worth reading, and as what. Names decide most; YAML, JSON
 * and TypeScript are looked into, through `peek`, to tell a spec or a schema
 * from anything else. SQL files are read together, in name order, since
 * migrations build on each other.
 *
 * @param {string[]} paths every file, relative to the folder scanned
 * @param {(path: string) => string} peek the start of a file
 * @returns {Source[]}
 */
export function pickSources(paths, peek) {
  const files = paths.filter((path) => !IGNORED.test(path) && !TESTS.test(path)).sort()
  /** @type {Source[]} */
  const sources = []
  const add = (
    /** @type {string} */ format,
    /** @type {string} */ label,
    /** @type {string[]} */ found,
  ) => {
    if (found.length) sources.push({ format, label, paths: found })
  }

  files
    .filter((path) => /(^|\/)(docker-)?compose(\.[\w-]+)?\.ya?ml$/i.test(path))
    .forEach((path) => add('compose', 'Services', [path]))

  files
    .filter((path) => /\.(ya?ml|json)$/i.test(path) && !/compose/i.test(path))
    .filter((path) => /^\s*["']?(openapi|swagger)["']?\s*:/m.test(peek(path)))
    .forEach((path) => add('openapi', 'API', [path]))

  files
    .filter((path) => /\.prisma$/i.test(path))
    .forEach((path) => add('prisma', 'Database', [path]))

  files
    .filter((path) => /\.(ts|js|mjs)$/i.test(path))
    .filter(
      (path) => /drizzle-orm/.test(peek(path)) && /(pg|mysql|sqlite)Table\s*\(/.test(peek(path)),
    )
    .forEach((path) => add('drizzle', 'Database', [path]))

  add(
    'sql',
    'Database',
    files.filter((path) => /\.sql$/i.test(path)),
  )
  return sources
}

/**
 * One diagram from several: each laid out on its own, framed, and set beside
 * the last. Ids stay as they were unless two sources share one.
 *
 * @param {{ source: Source, document: import('./types.js').FlowDocument }[]} parts
 * @param {string} title
 * @returns {import('./types.js').FlowDocument}
 */
export function combineSources(parts, title) {
  /** @type {Record<string, any>[]} */
  const nodes = []
  /** @type {import('./types.js').FlowEdge[]} */
  const edges = []
  const taken = new Set()
  let left = 0

  parts.forEach(({ source, document }, index) => {
    const at = documentPositions(document)
    const boxes = document.nodes.map((node) => ({
      ...(at.get(toNodeId(node.id)) ?? { x: 0, y: 0 }),
      ...sizeOf(node),
    }))
    const minX = Math.min(...boxes.map((box) => box.x))
    const minY = Math.min(...boxes.map((box) => box.y))
    const width = Math.max(...boxes.map((box) => box.x + box.width)) - minX
    const height = Math.max(...boxes.map((box) => box.y + box.height)) - minY

    const frameName = `${source.label}: ${source.paths.length === 1 ? source.paths[0] : `${source.paths.length} ${source.format.toUpperCase()} files`}`
    const frameId = unique(`${source.format}-frame`, taken)
    nodes.push({
      id: frameId,
      type: SHAPE.FRAME,
      name: frameName,
      data: { description: '' },
      position: { x: left, y: 0 },
      size: {
        width: Math.max(Math.round(width + 2 * PAD.SIDE), FRAME_SIZE.WIDTH / 2),
        height: Math.round(height + PAD.TOP + PAD.SIDE),
      },
    })

    /** @type {Map<string, string>} */
    const renamed = new Map()
    document.nodes.forEach((node, at) => {
      const id = unique(toNodeId(node.id), taken, source.format)
      renamed.set(toNodeId(node.id), id)
      nodes.push({
        ...node,
        id,
        position: {
          x: Math.round(left + PAD.SIDE + boxes[at].x - minX),
          y: Math.round(PAD.TOP + boxes[at].y - minY),
        },
      })
    })
    document.edges.forEach((edge) => {
      const from = renamed.get(edge.source) ?? edge.source
      const to = renamed.get(edge.target) ?? edge.target
      edges.push({ ...edge, id: edgeIdFor(from, to), source: from, target: to })
    })

    left +=
      Math.max(Math.round(width + 2 * PAD.SIDE), FRAME_SIZE.WIDTH / 2) +
      (index < parts.length - 1 ? GAP : 0)
  })

  return { version: DOCUMENT_VERSION, title, nodes, edges }
}

/**
 * The id itself, or with the source in front when it is taken, then numbered.
 * @param {string} id
 * @param {Set<string>} taken
 * @param {string} [prefix]
 */
function unique(id, taken, prefix = '') {
  let next = taken.has(id) && prefix ? `${prefix}-${id}` : id
  for (let n = 2; taken.has(next); n += 1) next = `${prefix ? `${prefix}-` : ''}${id}-${n}`
  taken.add(next)
  return next
}

/**
 * Read and import every source found. SQL files are joined in name order.
 * @param {Source[]} sources
 * @param {(path: string) => Promise<string>} read
 * @returns {Promise<{ parts: { source: Source, document: import('./types.js').FlowDocument }[], warnings: { path: string, line: number, message: string }[] }>}
 */
export async function importSources(sources, read) {
  /** @type {{ source: Source, document: import('./types.js').FlowDocument }[]} */
  const parts = []
  /** @type {{ path: string, line: number, message: string }[]} */
  const warnings = []
  for (const source of sources) {
    const format = importFormat(source.format)
    if (!format) continue
    const texts = await Promise.all(source.paths.map(read))
    const { document, warnings: found } = format.read(texts.join('\n'))
    const where = source.paths.length === 1 ? source.paths[0] : `${source.paths.length} SQL files`
    found.forEach(({ line, message }) => warnings.push({ path: where, line, message }))
    if (document?.nodes.length) parts.push({ source, document })
  }
  return { parts, warnings }
}
