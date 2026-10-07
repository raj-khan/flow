import { DEFAULT_TITLE, DOCUMENT_VERSION, edgeIdFor } from './document.js'
import { isKnownShape, SHAPE_OPTIONS } from './nodeMeta.js'
import { LINE, LINES } from './routes.js'
import { SHAPE } from './constants.js'
import { COLOR_NAMES, colorNamed, isColor } from './colors.js'

/**
 * The `.flow` text format: a diagram as lines a person can read, write and
 * review in a pull request.
 *
 *     title: Web app architecture
 *     style: sketch
 *     note: Use NestJS and PostgreSQL
 *
 *     browser = terminal "Browser" -- Single page app
 *     api = process "API"
 *     api note: Paginate every list endpoint
 *     api color: blue
 *
 *     browser -> api : HTTPS
 *
 *     @layout
 *     browser 276,0
 *     api 276,176 300x120
 *
 * One node or edge per line, in document order, so a diff shows exactly what
 * changed. Positions sit in their own block at the end: moving a box never
 * touches the lines that say what the system is. Notes are instructions for
 * whoever builds from the diagram, one line each, for the diagram or a shape.
 *
 * @typedef {{ line: number, message: string }} FlowTextError
 */

const ID = String.raw`[A-Za-z0-9_][\w-]*`
const NODE_LINE = new RegExp(String.raw`^(${ID})\s*=\s*([A-Za-z][\w-]*)\s*(.*)$`)
const EDGE_LINE = new RegExp(String.raw`^(${ID})\s*(<?--?>)\s*(${ID})\s*(?::\s?(.*))?$`)
const LINES_LINE = /^lines:\s*(\S*)\s*$/
const LAYOUT_LINE = new RegExp(
  String.raw`^(${ID})\s+(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)(?:\s+(\d+)\s*x\s*(\d+))?$`,
)
const NOTE_LINE = new RegExp(String.raw`^(${ID})\s+note:\s?(.*)$`)
const ARROW_LINE = new RegExp(String.raw`^(${ID})\s+arrow:\s*(\S*)\s*$`)
const ARROWS = ['end', 'both']
const COLOR_LINE = new RegExp(String.raw`^(${ID})\s+colou?r:\s*(\S*)\s*$`)
const DIAGRAM_NOTE = 'note:'
const STYLE_LINE = /^style:\s*(\S*)\s*$/
const STYLES = ['clean', 'sketch']
const LAYOUT_HEADER = '@layout'
const INK_HEADER = '@ink'
const INK_LINE = new RegExp(String.raw`^(${ID})((?:\s+-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?)+)$`)
const DESCRIPTION_MARK = '--'

/**
 * Descriptions and labels run to the end of their line, so a newline in one is
 * written as `\n`, and a backslash as `\\`.
 * @param {string} text
 */
const escapeRest = (text) => text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n')

/** @param {string} text */
const unescapeRest = (text) =>
  text.replace(/\\(\\|n)/g, (_match, char) => (char === 'n' ? '\n' : '\\'))

/**
 * Notes are written one line per line of text, so each reads, and diffs, on
 * its own. Blank lines are dropped.
 * @param {string | undefined} notes
 */
const noteLines = (notes) =>
  String(notes ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

/**
 * `->`, dashed `-->`, both ways `<->`, or both `<-->`.
 * @param {import('./types.js').FlowEdge} edge
 */
const arrowOf = (edge) => `${edge.both ? '<' : ''}${edge.dashed ? '--' : '-'}>`

/** @param {number} value */
const coordinate = (value) => String(Math.round(value))

/**
 * @param {import('./types.js').FlowDocument} document
 * @returns {string}
 */
export function serialiseFlow(document) {
  const sections = [
    [
      `title: ${escapeRest(document.title ?? DEFAULT_TITLE)}`,
      ...(document.style === 'sketch' ? ['style: sketch'] : []),
      ...(document.lines && LINES.includes(document.lines) && document.lines !== LINE.STEP
        ? [`lines: ${document.lines}`]
        : []),
      ...noteLines(document.notes).map((line) => `${DIAGRAM_NOTE} ${line}`),
    ].join('\n'),
  ]

  const nodes = document.nodes.map((node) => {
    const description = node.data?.description
    const name = JSON.stringify(node.name ?? '')
    const tail = description ? ` ${DESCRIPTION_MARK} ${escapeRest(description)}` : ''
    // A stroke needs no name, so an unnamed one is written without.
    const head =
      node.type === SHAPE.INK && !node.name
        ? `${node.id} = ${node.type}`
        : `${node.id} = ${node.type} ${name}`
    return [
      `${head}${tail}`,
      ...(isColor(node.data?.color) ? [`${node.id} color: ${node.data.color}`] : []),
      ...(node.type === SHAPE.INK && ARROWS.includes(node.data?.arrow)
        ? [`${node.id} arrow: ${node.data.arrow}`]
        : []),
      ...noteLines(node.data?.notes).map((line) => `${node.id} note: ${line}`),
    ].join('\n')
  })
  if (nodes.length) sections.push(nodes.join('\n'))

  const edges = document.edges.map((edge) => {
    const label = edge.label ? ` : ${escapeRest(edge.label)}` : ''
    return `${edge.source} ${arrowOf(edge)} ${edge.target}${label}`
  })
  if (edges.length) sections.push(edges.join('\n'))

  const placed = document.nodes.filter((node) => node.position)
  if (placed.length) {
    sections.push(
      [
        LAYOUT_HEADER,
        ...placed.map(
          (node) =>
            `${node.id} ${coordinate(node.position.x)},${coordinate(node.position.y)}${
              node.size ? ` ${coordinate(node.size.width)}x${coordinate(node.size.height)}` : ''
            }`,
        ),
      ].join('\n'),
    )
  }

  // Strokes last: long runs of numbers no reader needs, kept out of the way.
  const inked = document.nodes.filter((node) => node.type === SHAPE.INK && node.data?.points)
  if (inked.length) {
    sections.push([INK_HEADER, ...inked.map((node) => `${node.id} ${node.data.points}`)].join('\n'))
  }

  return `${sections.join('\n\n')}\n`
}

/**
 * Read as much of the text as makes sense: each line with an error is left out
 * and the rest read again, so a diagram an agent wrote with one slip still
 * opens. Leaving out a shape can strand the lines that refer to it, so this
 * repeats until nothing more fails.
 * @param {string} text
 * @returns {{ document: import('./types.js').FlowDocument | null, skipped: FlowTextError[] }}
 */
export function parseFlowForgiving(text) {
  const lines = text.split('\n')
  /** @type {FlowTextError[]} */
  const skipped = []
  for (;;) {
    const { document, errors } = parseFlow(lines.join('\n'))
    const failing = errors.filter((error) => lines[error.line - 1]?.trim())
    if (document || !failing.length) return { document, skipped }
    for (const error of failing) {
      skipped.push({ line: error.line, message: error.message })
      lines[error.line - 1] = ''
    }
  }
}

/**
 * Every problem is reported, each with its line, rather than stopping at the
 * first: an editor can mark them all at once. The document is null whenever
 * there is any error, so a half-read diagram is never mistaken for the whole.
 *
 * @param {string} text
 * @returns {{ document: import('./types.js').FlowDocument | null, errors: FlowTextError[] }}
 */
export function parseFlow(text) {
  /** @type {FlowTextError[]} */
  const errors = []
  /** @type {Record<string, any>[]} */
  const nodes = []
  /** @type {import('./types.js').FlowEdge[]} */
  const edges = []
  /** @type {Map<string, Record<string, any>>} */
  const byId = new Map()
  /** @type {{ line: number, id: string, x: number, y: number, width?: number, height?: number }[]} */
  const layout = []
  /** @type {{ line: number, source: string, target: string, label: string, dashed: boolean, both: boolean }[]} */
  const pendingEdges = []
  /** @type {{ line: number, id: string, text: string }[]} */
  const pendingNotes = []
  /** @type {{ line: number, id: string, color: string }[]} */
  const pendingColors = []
  /** @type {{ line: number, id: string, arrow: string }[]} */
  const pendingArrows = []
  /** @type {string[]} */
  const diagramNotes = []

  let title = DEFAULT_TITLE
  /** @type {string} */
  let style = 'clean'
  /** @type {string} */
  let lines = LINE.STEP
  let inLayout = false
  let inInk = false
  /** @type {{ line: number, id: string, points: string }[]} */
  const inks = []

  String(text ?? '')
    .split(/\r?\n/)
    .forEach((raw, index) => {
      const line = index + 1
      const content = raw.trim()
      /** @param {string} message */
      const fail = (message) => errors.push({ line, message })

      if (!content || content.startsWith('#')) return

      if (content === LAYOUT_HEADER) {
        inLayout = true
        inInk = false
        return
      }

      if (content === INK_HEADER) {
        inInk = true
        inLayout = false
        return
      }

      if (inInk) {
        const match = INK_LINE.exec(content)
        if (!match) return fail('Expected a pen stroke, like `m1 0,0 40,20 100,0`.')
        inks.push({ line, id: match[1], points: match[2].trim().split(/\s+/).join(' ') })
        return
      }

      if (inLayout) {
        const match = LAYOUT_LINE.exec(content)
        if (!match)
          return fail('Expected a position, like `api 120,340`, or `api 120,340 300x120`.')
        layout.push({
          line,
          id: match[1],
          x: Number(match[2]),
          y: Number(match[3]),
          ...(match[4] ? { width: Number(match[4]), height: Number(match[5]) } : {}),
        })
        return
      }

      if (content.startsWith('title:')) {
        title = unescapeRest(content.slice('title:'.length).trim())
        return
      }

      const lined = LINES_LINE.exec(content)
      if (lined) {
        if (!LINES.includes(lined[1])) {
          return fail(`Unknown lines "${lined[1]}". Use one of: ${LINES.join(', ')}.`)
        }
        lines = lined[1]
        return
      }

      const styled = STYLE_LINE.exec(content)
      if (styled) {
        if (!STYLES.includes(styled[1])) {
          return fail(`Unknown style "${styled[1]}". Use one of: ${STYLES.join(', ')}.`)
        }
        style = styled[1]
        return
      }

      if (content.startsWith(DIAGRAM_NOTE)) {
        diagramNotes.push(content.slice(DIAGRAM_NOTE.length).trim())
        return
      }

      const note = NOTE_LINE.exec(content)
      if (note) {
        pendingNotes.push({ line, id: note[1], text: note[2].trim() })
        return
      }

      const headed = ARROW_LINE.exec(content)
      if (headed) {
        if (!ARROWS.includes(headed[2])) {
          return fail(`Unknown arrow "${headed[2]}". Use one of: ${ARROWS.join(', ')}.`)
        }
        pendingArrows.push({ line, id: headed[1], arrow: headed[2] })
        return
      }

      const colored = COLOR_LINE.exec(content)
      if (colored) {
        const color = colorNamed(colored[2])
        if (!color) {
          return fail(`Unknown color "${colored[2]}". Use one of: ${COLOR_NAMES.join(', ')}.`)
        }
        pendingColors.push({ line, id: colored[1], color })
        return
      }

      const edge = EDGE_LINE.exec(content)
      if (edge) {
        pendingEdges.push({
          line,
          source: edge[1],
          target: edge[3],
          label: unescapeRest((edge[4] ?? '').trim()),
          dashed: edge[2].includes('--'),
          both: edge[2].startsWith('<'),
        })
        return
      }

      const node = NODE_LINE.exec(content)
      if (!node) {
        return fail('Expected a node, like `api = process "API"`, or an edge, like `a -> b`.')
      }

      const [, id, shape, rest] = node
      if (!isKnownShape(shape)) {
        return fail(
          `Unknown shape "${shape}". Use one of: ${SHAPE_OPTIONS.map((o) => o.value).join(', ')}.`,
        )
      }
      if (byId.has(id)) return fail(`"${id}" is already defined.`)

      const parsed = readNameAndDescription(rest)
      if (parsed.error) return fail(parsed.error)

      const record = {
        id,
        type: shape,
        name: parsed.name ?? (shape === SHAPE.INK ? '' : id),
        data: parsed.description ? { description: parsed.description } : {},
      }
      nodes.push(record)
      byId.set(id, record)
    })

  // Edges and positions are checked once every node is known, so a line may
  // refer to a node defined further down.
  pendingEdges.forEach(({ line, source, target, label, dashed, both }) => {
    const missing = [source, target].find((id) => !byId.has(id))
    if (missing) return errors.push({ line, message: `No node called "${missing}".` })
    if (source === target) return errors.push({ line, message: 'A node cannot connect to itself.' })

    const id = edgeIdFor(source, target)
    if (edges.some((existing) => existing.id === id)) {
      return errors.push({ line, message: `${source} -> ${target} is already connected.` })
    }
    edges.push({
      id,
      source,
      target,
      ...(label ? { label } : {}),
      ...(dashed ? { dashed: true } : {}),
      ...(both ? { both: true } : {}),
    })
  })

  pendingNotes.forEach(({ line, id, text }) => {
    const node = byId.get(id)
    if (!node) return errors.push({ line, message: `No node called "${id}".` })
    node.data.notes = node.data.notes ? `${node.data.notes}\n${text}` : text
  })

  pendingColors.forEach(({ line, id, color }) => {
    const node = byId.get(id)
    if (!node) return errors.push({ line, message: `No node called "${id}".` })
    node.data.color = color
  })

  pendingArrows.forEach(({ line, id, arrow }) => {
    const node = byId.get(id)
    if (!node) return errors.push({ line, message: `No node called "${id}".` })
    if (node.type !== SHAPE.INK) {
      return errors.push({
        line,
        message: `"${id}" is not an ink shape; connect shapes with ->.`,
      })
    }
    node.data.arrow = arrow
  })

  inks.forEach(({ line, id, points }) => {
    const node = byId.get(id)
    if (!node) return errors.push({ line, message: `No node called "${id}".` })
    if (node.type !== SHAPE.INK) {
      return errors.push({ line, message: `"${id}" is not an ink shape, so it has no stroke.` })
    }
    node.data.points = points
  })

  const positioned = new Set()
  layout.forEach(({ line, id, x, y, width, height }) => {
    const node = byId.get(id)
    if (!node) return errors.push({ line, message: `No node called "${id}".` })
    if (positioned.has(id)) return errors.push({ line, message: `"${id}" already has a position.` })
    positioned.add(id)
    node.position = { x, y }
    if (width && height) node.size = { width, height }
  })

  errors.sort((a, b) => a.line - b.line)

  return errors.length
    ? { document: null, errors }
    : {
        document: {
          version: DOCUMENT_VERSION,
          title,
          ...(style === 'sketch' ? { style: /** @type {'sketch'} */ ('sketch') } : {}),
          ...(lines !== LINE.STEP ? { lines } : {}),
          ...(diagramNotes.length ? { notes: diagramNotes.join('\n') } : {}),
          nodes,
          edges,
        },
        errors,
      }
}

/**
 * `"Name" -- description`, where both parts are optional.
 * @param {string} rest
 * @returns {{ name?: string, description?: string, error?: string }}
 */
function readNameAndDescription(rest) {
  let remaining = rest.trim()
  /** @type {string | undefined} */
  let name

  if (remaining.startsWith('"')) {
    const end = closingQuote(remaining)
    if (end === -1) return { error: 'The name is missing its closing quote.' }
    try {
      name = JSON.parse(remaining.slice(0, end + 1))
    } catch {
      return { error: 'The name has an escape JSON does not allow.' }
    }
    remaining = remaining.slice(end + 1).trim()
  }

  if (!remaining) return { name }
  if (!remaining.startsWith(DESCRIPTION_MARK)) {
    return { error: 'Put the name in quotes, and start a description with `--`.' }
  }

  return { name, description: unescapeRest(remaining.slice(DESCRIPTION_MARK.length).trim()) }
}

/**
 * The index of the quote that closes the one at 0, skipping escaped quotes.
 * @param {string} text
 */
function closingQuote(text) {
  for (let index = 1; index < text.length; index += 1) {
    if (text[index] === '\\') index += 1
    else if (text[index] === '"') return index
  }
  return -1
}

export const FLOW_EXTENSION = '.flow'

/**
 * A file name from a diagram's title, safe on every file system.
 * @param {string} title
 */
export function flowFileName(title) {
  const base = String(title ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return `${base || 'diagram'}${FLOW_EXTENSION}`
}
