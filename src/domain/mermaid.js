import { SHAPE } from './constants.js'
import { DEFAULT_TITLE, DOCUMENT_VERSION, edgeIdFor } from './document.js'
import { frameMembers } from './frames.js'

/**
 * Mermaid flowcharts in and out: the subset a diagram in a README uses. Import
 * takes what it understands and reports each line it skipped, rather than
 * refusing a file over one `classDef`.
 *
 * @typedef {{ line: number, message: string }} MermaidWarning
 */

/**
 * Mermaid's bracket for each shape. Document, table, text and the wireframe shapes
 * have no bracket of their own in the classic syntax, so they leave as rectangles,
 * and a button as a rounded one.
 * @type {Readonly<Record<string, [string, string]>>}
 */
const BRACKETS = Object.freeze({
  [SHAPE.PROCESS]: ['[', ']'],
  [SHAPE.TERMINAL]: ['([', '])'],
  [SHAPE.DECISION]: ['{', '}'],
  [SHAPE.DATA]: ['[/', '/]'],
  [SHAPE.DATABASE]: ['[(', ')]'],
  [SHAPE.DOCUMENT]: ['[', ']'],
  [SHAPE.NOTE]: ['>', ']'],
  [SHAPE.TABLE]: ['[', ']'],
  [SHAPE.TEXT]: ['[', ']'],
  [SHAPE.SCREEN]: ['[', ']'],
  [SHAPE.BUTTON]: ['(', ')'],
  [SHAPE.INPUT]: ['[', ']'],
  [SHAPE.CARD]: ['[', ']'],
  [SHAPE.LIST]: ['[', ']'],
  [SHAPE.IMAGE]: ['[', ']'],
})

/**
 * Longest opener first, so `([` is not read as `(`.
 * @type {readonly { open: string, close: readonly string[], shape: string }[]}
 */
const OPENERS = Object.freeze([
  { open: '([', close: ['])'], shape: SHAPE.TERMINAL },
  { open: '[(', close: [')]'], shape: SHAPE.DATABASE },
  { open: '[/', close: ['/]', '\\]'], shape: SHAPE.DATA },
  { open: '[\\', close: ['\\]', '/]'], shape: SHAPE.DATA },
  { open: '((', close: ['))'], shape: SHAPE.TERMINAL },
  { open: '{{', close: ['}}'], shape: SHAPE.PROCESS },
  { open: '[', close: [']'], shape: SHAPE.PROCESS },
  { open: '(', close: [')'], shape: SHAPE.PROCESS },
  { open: '{', close: ['}'], shape: SHAPE.DECISION },
  { open: '>', close: [']'], shape: SHAPE.NOTE },
])

const IGNORED = /^(classDef|class|style|linkStyle|click|direction|accTitle|accDescr)\b/
const HEADER = /^(flowchart|graph)(\s+(TB|TD|BT|RL|LR))?\s*;?$/i
const RESERVED = new Set(['end', 'graph', 'flowchart', 'subgraph', 'style', 'class', 'click'])

/** @param {string} text */
const escapeLabel = (text) =>
  String(text).replace(/"/g, '#quot;').replace(/\|/g, '#124;').replace(/\n/g, '<br/>')

/** @param {string} text */
const unescapeLabel = (text) =>
  String(text)
    .replace(/#quot;/g, '"')
    .replace(/#124;/g, '|')
    .replace(/#35;/g, '#')
    .replace(/<br\s*\/?>/gi, ' ')
    .trim()

/** Diff colours, as Mermaid styles. Removed is dashed, as in the SVG. */
const CHANGE_STYLES = Object.freeze({
  added: 'stroke:#16a34a,stroke-width:3px',
  removed: 'stroke:#dc2626,stroke-width:3px,stroke-dasharray:5,opacity:0.7',
  changed: 'stroke:#d97706,stroke-width:3px',
})

/**
 * @param {import('./types.js').FlowDocument} document
 * @param {{ highlight?: Map<string, 'added' | 'removed' | 'changed'> }} [options]
 *   marks nodes and edges by id, for a diff; GitHub renders the result in a comment
 * @returns {string}
 */
export function toMermaid(document, { highlight = new Map() } = {}) {
  /** @type {Map<string, string>} */
  const safe = new Map()
  const taken = new Set()

  document.nodes.forEach((node) => {
    let id = String(node.id).replace(/\W/g, '_')
    if (/^\d/.test(id) || RESERVED.has(id.toLowerCase())) id = `n_${id}`
    while (taken.has(id)) id = `${id}_`
    taken.add(id)
    safe.set(node.id, id)
  })

  const lines = ['---', `title: ${document.title || DEFAULT_TITLE}`, '---', 'flowchart TD']

  // Mermaid has nothing to draw a pen stroke with, and draws a frame as a subgraph.
  document.nodes
    .filter((node) => node.type !== SHAPE.INK && node.type !== SHAPE.FRAME)
    .forEach((node) => {
      const [open, close] = BRACKETS[node.type] ?? BRACKETS[SHAPE.PROCESS]
      lines.push(`  ${safe.get(node.id)}${open}"${escapeLabel(node.name ?? '')}"${close}`)
    })

  const frames = new Map(
    document.nodes.filter((node) => node.type === SHAPE.FRAME).map((node) => [node.id, node]),
  )
  if (frames.size) {
    const members = frameMembers(document)
    const nested = new Set([...members.values()].flat())
    /** @param {string} id @param {string} indent */
    const subgraph = (id, indent) => {
      const frame = /** @type {import('./types.js').FlowNode} */ (frames.get(id))
      lines.push(`${indent}subgraph ${safe.get(id)}["${escapeLabel(frame.name ?? '')}"]`)
      ;(members.get(id) ?? []).forEach((member) => {
        if (frames.has(member)) subgraph(member, `${indent}  `)
        else if (safe.has(member)) lines.push(`${indent}  ${safe.get(member)}`)
      })
      lines.push(`${indent}end`)
    }
    ;[...frames.keys()].filter((id) => !nested.has(id)).forEach((id) => subgraph(id, '  '))
  }

  document.edges.forEach((edge) => {
    const label = edge.label ? `|"${escapeLabel(edge.label)}"|` : ''
    // Mermaid's own dotted and two-way arrows.
    const arrow = `${edge.both ? '<' : ''}${edge.dashed ? '-.->' : '-->'}`
    lines.push(`  ${safe.get(edge.source)} ${arrow}${label} ${safe.get(edge.target)}`)
  })

  if (highlight.size) {
    Object.entries(CHANGE_STYLES).forEach(([change, style]) => {
      const nodes = document.nodes
        .filter((node) => highlight.get(String(node.id)) === change)
        .map((node) => safe.get(node.id))
      if (!nodes.length) return
      lines.push(`  classDef ${change} ${style}`)
      lines.push(`  class ${nodes.join(',')} ${change}`)
    })
    // Edges have no ids in Mermaid, only their order.
    document.edges.forEach((edge, index) => {
      const change = highlight.get(edge.id)
      if (change)
        lines.push(`  linkStyle ${index} ${CHANGE_STYLES[change].replace(',opacity:0.7', '')}`)
    })
  }

  return `${lines.join('\n')}\n`
}

/**
 * @param {string} text
 * @returns {{ document: import('./types.js').FlowDocument, warnings: MermaidWarning[] }}
 */
export function fromMermaid(text) {
  /** @type {MermaidWarning[]} */
  const warnings = []
  /** @type {Map<string, Record<string, any>>} */
  const nodes = new Map()
  /** @type {import('./types.js').FlowEdge[]} */
  const edges = []
  let title = DEFAULT_TITLE

  const rows = String(text ?? '').split(/\r?\n/)
  let start = 0

  // Front matter: `---`, `title: ...`, `---`.
  if (rows[0]?.trim() === '---') {
    const end = rows.findIndex((row, index) => index > 0 && row.trim() === '---')
    if (end > 0) {
      const heading = rows.slice(1, end).find((row) => /^\s*title:/.test(row))
      if (heading) title = heading.replace(/^\s*title:\s*/, '').trim() || DEFAULT_TITLE
      start = end + 1
    }
  }

  /**
   * @param {string} id
   * @param {{ shape: string, label: string } | null} shape
   */
  function declare(id, shape) {
    const existing = nodes.get(id)
    if (existing && !shape) return
    nodes.set(id, {
      id,
      type: shape?.shape ?? existing?.type ?? SHAPE.PROCESS,
      name: shape ? shape.label : (existing?.name ?? id),
      data: {},
    })
  }

  let sawHeader = false

  rows.slice(start).forEach((raw, offset) => {
    const line = start + offset + 1
    const content = raw.replace(/%%.*$/, '').trim()
    if (!content) return

    if (!sawHeader && HEADER.test(content)) {
      sawHeader = true
      return
    }
    if (IGNORED.test(content)) {
      warnings.push({ line, message: `Styling is not imported: ${content.split(/\s/)[0]}.` })
      return
    }
    if (/^subgraph\b/.test(content) || content === 'end') {
      if (/^subgraph\b/.test(content)) {
        warnings.push({ line, message: 'Subgraphs are flattened; their shapes are kept.' })
      }
      return
    }

    content
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((statement) => {
        const error = readStatement(statement, declare, edges)
        if (error) warnings.push({ line, message: error })
      })
  })

  return {
    document: { version: DOCUMENT_VERSION, title, nodes: [...nodes.values()], edges },
    warnings,
  }
}

/**
 * `a[A] --> b & c -->|yes| d`: groups of nodes joined by arrows.
 *
 * @param {string} statement
 * @param {(id: string, shape: { shape: string, label: string } | null) => void} declare
 * @param {import('./types.js').FlowEdge[]} edges
 * @returns {string | null} why the statement was skipped, if it was
 */
function readStatement(statement, declare, edges) {
  const scan = { text: statement, at: 0 }

  // Held until the whole statement reads, so a skipped one adds nothing.
  /** @type {[string, { shape: string, label: string } | null][]} */
  const declared = []
  /** @type {(id: string, shape: { shape: string, label: string } | null) => void} */
  const hold = (id, shape) => {
    declared.push([id, shape])
  }

  /** @type {string[] | null} */
  let previous = null
  /** @type {{ label: string } | null} */
  let arrow = null
  /** @type {{ source: string, target: string, label: string }[]} */
  const found = []

  while (scan.at < scan.text.length) {
    skipSpace(scan)

    const group = readGroup(scan, hold)
    if (!group) return `Skipped: could not read "${statement}".`

    if (previous && arrow) {
      const { label } = arrow
      previous.forEach((source) => group.forEach((target) => found.push({ source, target, label })))
    }

    previous = group
    skipSpace(scan)
    if (scan.at >= scan.text.length) break

    arrow = readArrow(scan)
    if (!arrow) return `Skipped: expected an arrow in "${statement}".`
  }

  if (arrow && found.length === 0)
    return `Skipped: an arrow with nothing after it in "${statement}".`

  declared.forEach(([id, shape]) => declare(id, shape))

  found.forEach(({ source, target, label }) => {
    if (source === target) return
    const id = edgeIdFor(source, target)
    if (edges.some((edge) => edge.id === id)) return
    edges.push({ id, source, target, ...(label ? { label } : {}) })
  })

  return null
}

/** @param {{ text: string, at: number }} scan */
function skipSpace(scan) {
  while (scan.at < scan.text.length && /\s/.test(scan.text[scan.at])) scan.at += 1
}

/**
 * @param {{ text: string, at: number }} scan
 * @param {(id: string, shape: { shape: string, label: string } | null) => void} declare
 * @returns {string[] | null}
 */
function readGroup(scan, declare) {
  const ids = []

  for (;;) {
    skipSpace(scan)
    const id = /^[A-Za-z0-9_]+/.exec(scan.text.slice(scan.at))?.[0]
    if (!id) return null
    scan.at += id.length

    const shape = readShape(scan)
    if (shape === undefined) return null
    declare(id, shape)
    ids.push(id)

    skipSpace(scan)
    if (scan.text[scan.at] !== '&') return ids
    scan.at += 1
  }
}

/**
 * @param {{ text: string, at: number }} scan
 * @returns {{ shape: string, label: string } | null | undefined} null for none, undefined for broken
 */
function readShape(scan) {
  const rest = scan.text.slice(scan.at)
  const opener = OPENERS.find(({ open }) => rest.startsWith(open))
  if (!opener) return null

  let at = opener.open.length
  let label = ''

  if (rest[at] === '"') {
    const end = rest.indexOf('"', at + 1)
    if (end === -1) return undefined
    label = rest.slice(at + 1, end)
    at = end + 1
  }

  const close = opener.close
    .map((candidate) => ({ candidate, index: rest.indexOf(candidate, at) }))
    .filter(({ index }) => index !== -1)
    .sort((a, b) => a.index - b.index)[0]
  if (!close) return undefined

  if (!label) label = rest.slice(at, close.index)
  scan.at += close.index + close.candidate.length

  return { shape: opener.shape, label: unescapeLabel(label) }
}

/**
 * Every arrow reads as a plain connection, with its label if it has one:
 * `-->`, `---`, `-.->`, `==>`, `--x`, `-->|label|`, `-- label -->`.
 *
 * @param {{ text: string, at: number }} scan
 * @returns {{ label: string } | null}
 */
function readArrow(scan) {
  const rest = scan.text.slice(scan.at)

  const inline = /^(--|==|-\.)(?![->.=])\s*(.+?)\s*(-->|---|==>|===|\.->|\.-)/.exec(rest)
  if (inline) {
    scan.at += inline[0].length
    return { label: unescapeLabel(stripQuotes(inline[2])) }
  }

  const plain = /^(-{2,}>|-{3,}|-\.+->|-\.+-|={2,}>|={3,}|--[xo]|<-->)/.exec(rest)
  if (!plain) return null
  scan.at += plain[0].length

  const piped = /^\s*\|([^|]*)\|/.exec(scan.text.slice(scan.at))
  if (!piped) return { label: '' }
  scan.at += piped[0].length
  return { label: unescapeLabel(stripQuotes(piped[1].trim())) }
}

/** @param {string} text */
const stripQuotes = (text) => text.replace(/^"(.*)"$/, '$1')
