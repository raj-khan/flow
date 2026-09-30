import { SHAPE, sizeOf } from './constants.js'
import { buildEdges, normaliseNode } from './graph.js'
import { layoutTree } from './layout.js'
import { metaFor } from './nodeMeta.js'
import { shapePath, textInset } from './shapes.js'
import { isSketch, SKETCH_FONT, sketchPath } from './sketch.js'
import { LINE, routeEdge } from './routes.js'
import { inkHeads, inkOutline, inkPath } from './ink.js'
import { colorOf, COLOR_NAMES, paintOf } from './colors.js'

/** @param {'light' | 'dark'} theme */
const paintsFor = (theme) =>
  Object.fromEntries(
    COLOR_NAMES.map((name) => [
      name,
      /** @type {import('./colors.js').Paint} */ (paintOf(name, theme)),
    ]),
  )

/**
 * The app's colour tokens, copied from `style.css` so the renderer runs where
 * there is no stylesheet: the command line, CI, a docs build. Keep the two in
 * step when a token changes.
 */
export const SVG_THEMES = Object.freeze({
  light: {
    changes: { added: '#16a34a', removed: '#dc2626', changed: '#d97706' },
    canvas: '#ffffff',
    surface: '#ffffff',
    ink: '#14181f',
    muted: '#64748b',
    line: '#e3e7ee',
    edge: '#f97362',
    accents: {
      trigger: '#e11d48',
      hours: '#ea580c',
      message: '#059669',
      comment: '#0284c7',
      branch: '#4f46e5',
      unknown: '#94a3b8',
    },
    paints: paintsFor('light'),
  },
  dark: {
    changes: { added: '#4ade80', removed: '#f87171', changed: '#fbbf24' },
    canvas: '#0d1117',
    surface: '#161b22',
    ink: '#e6edf3',
    muted: '#9aa7b6',
    line: '#2a323d',
    edge: '#fb8f7e',
    accents: {
      trigger: '#fb7185',
      hours: '#fb923c',
      message: '#34d399',
      comment: '#38bdf8',
      branch: '#a5b4fc',
      unknown: '#94a3b8',
    },
    paints: paintsFor('dark'),
  },
})

const FONT = "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
const TITLE_SIZE = 14
const TEXT_SIZE = 12
/** Average glyph width as a share of font size: close enough to fit text without a browser. */
const GLYPH = 0.56

/**
 * A diagram as a standalone SVG document, the same shapes and layout as the
 * canvas, with no browser. Nodes without a position are laid out as the app
 * lays them out.
 *
 * @param {import('./types.js').FlowDocument} document
 * @param {{ theme?: 'light' | 'dark', padding?: number, highlight?: Map<string, 'added' | 'removed' | 'changed'>, sketchFont?: string, credit?: boolean }} [options]
 *   `highlight` marks nodes and edges by id, for a diff; `sketchFont` is the handwriting
 *   font as a data URL, embedded in a sketch so it looks the same wherever it opens;
 *   `credit` adds a small "Made with isketch" in the bottom right corner, linked
 * @returns {string}
 */
export function renderSvg(
  document,
  { theme = 'light', padding = 32, highlight = new Map(), sketchFont = '', credit = false } = {},
) {
  const colours = SVG_THEMES[theme] ?? SVG_THEMES.light
  const nodes = document.nodes.map(normaliseNode)
  const ids = new Set(nodes.map((node) => node.id))
  const edges = buildEdges(document.edges, ids)
  const laidOut = layoutTree(nodes, edges)
  const at = new Map(
    nodes.map((node) => [node.id, node.position ?? laidOut.get(node.id) ?? { x: 0, y: 0 }]),
  )

  const boxes = nodes.map((node) => ({ ...(at.get(node.id) ?? { x: 0, y: 0 }), ...sizeOf(node) }))
  const left = (boxes.length ? Math.min(...boxes.map((box) => box.x)) : 0) - padding
  const top = (boxes.length ? Math.min(...boxes.map((box) => box.y)) : 0) - padding
  const width =
    (boxes.length ? Math.max(...boxes.map((box) => box.x + box.width)) : 0) - left + padding
  const height =
    (boxes.length ? Math.max(...boxes.map((box) => box.y + box.height)) : 0) - top + padding
  const sizes = new Map(nodes.map((node) => [node.id, sizeOf(node)]))
  const sketch = isSketch(document)

  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${round(width)}" height="${round(height)}" viewBox="${round(left)} ${round(top)} ${round(width)} ${round(height)}" font-family="${escapeXml(sketch ? SKETCH_FONT : FONT)}">`,
    `<title>${escapeXml(document.title ?? '')}</title>`,
    sketch ? sketchStyle(sketchFont) : '',
    `<defs>${[
      ['arrow', colours.edge],
      // Coloured heads only for a diff, so an ordinary drawing stays byte for byte the same.
      ...(highlight.size ? Object.entries(colours.changes) : []).map(([change, colour]) => [
        `arrow-${change}`,
        colour,
      ]),
    ]
      .map(
        ([id, fill]) =>
          // Heads scale with the stroke, so a diff's thicker lines get smaller ones to match.
          `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="${id === 'arrow' ? 7 : 4.2}" markerHeight="${id === 'arrow' ? 7 : 4.2}" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${fill}"/></marker>`,
      )
      .join('')}</defs>`,
    `<rect x="${round(left)}" y="${round(top)}" width="${round(width)}" height="${round(height)}" fill="${colours.canvas}"/>`,
    // Frames sit under everything, connections included.
    ...nodes
      .filter((node) => node.type === SHAPE.FRAME)
      .map((node) =>
        renderFrame(node, /** @type {any} */ (at.get(node.id)), colours, highlight.get(node.id)),
      ),
    ...edges.map((edge) =>
      renderEdge(
        edge,
        { ...at.get(edge.source), ...sizes.get(edge.source) },
        { ...at.get(edge.target), ...sizes.get(edge.target) },
        colours,
        highlight.get(edge.id),
        sketch,
        document.lines,
      ),
    ),
    ...nodes
      .filter((node) => node.type !== SHAPE.FRAME)
      .map((node) =>
        renderNode(
          node,
          /** @type {any} */ (at.get(node.id)),
          colours,
          highlight.get(node.id),
          sketch,
        ),
      ),
    // In the padding, clear of every shape.
    credit
      ? `<a href="https://isketch.online"><text x="${round(left + width - 10)}" y="${round(top + height - 10)}" font-size="11" fill="${colours.muted}" text-anchor="end">Made with isketch</text></a>`
      : '',
    '</svg>',
  ]

  return `${parts.filter(Boolean).join('\n')}\n`
}

/**
 * A frame: a light region with its name at the top left, behind what it holds.
 * @param {import('./types.js').FlowNode} node
 * @param {{ x: number, y: number }} position
 * @param {typeof SVG_THEMES.light} colours
 * @param {'added' | 'removed' | 'changed'} [change]
 */
function renderFrame(node, position, colours, change) {
  const { width, height } = sizeOf(node)
  const own = colorOf(node)
  const paint = own ? colours.paints[own] : null
  const stroke = change ? colours.changes[change] : (paint?.stroke ?? colours.muted)
  return [
    `<g transform="translate(${round(position.x)},${round(position.y)})"${change ? ` data-change="${change}"` : ''}>`,
    `<path d="${shapePath(SHAPE.FRAME, width, height, 1)}" fill="${paint?.fill ?? colours.line}" fill-opacity="${paint ? 0.45 : 0.35}" stroke="${stroke}" stroke-width="${change ? 3 : 1.5}" stroke-dasharray="8 5"/>`,
    `<text x="14" y="24" font-size="${TITLE_SIZE}" font-weight="600" fill="${colours.ink}">${escapeXml(wrap(node.name ?? '', width - 28, TITLE_SIZE, 1)[0] ?? '')}</text>`,
    '</g>',
  ].join('\n')
}

/**
 * A pen stroke, scaled to its box, in the ink colour or its change's.
 * @param {import('./types.js').FlowNode} node
 * @param {{ x: number, y: number }} position
 * @param {typeof SVG_THEMES.light} colours
 * @param {'added' | 'removed' | 'changed'} [change]
 */
function renderInk(node, position, colours, change) {
  const { width, height } = sizeOf(node)
  const own = colorOf(node)
  const colour = change ? colours.changes[change] : own ? colours.paints[own].stroke : colours.ink
  const g = `<g transform="translate(${round(position.x)},${round(position.y)})"${change ? ` data-change="${change}"` : ''}>`
  const outline = inkOutline(node.data?.points, width, height)
  if (outline) return `${g}<path d="${outline}" fill="${colour}"/></g>`
  const line = inkPath(node.data?.points, width, height)
  if (!line) return ''
  const heads = inkHeads(node.data?.points, width, height, node.data?.arrow)
  const d = heads ? `${line} ${heads}` : line
  return `<g transform="translate(${round(position.x)},${round(position.y)})"${change ? ` data-change="${change}"` : ''}><path d="${d}" fill="none" stroke="${colour}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></g>`
}

/**
 * Handwriting runs small and has one weight, so a sketch's text goes a size up
 * rather than bold. The sizes are keyed on the clean ones, so both looks share
 * one layout.
 * @param {string} font a data URL, or empty to rely on the fallbacks
 */
function sketchStyle(font) {
  const face = font ? `@font-face{font-family:'Patrick Hand';src:url(${font}) format('woff2')}` : ''
  return `<style>${face}text{font-weight:400}text[font-size="16"]{font-size:20px}text[font-size="${TITLE_SIZE}"]{font-size:17px}text[font-size="${TEXT_SIZE}"]{font-size:14px}text[font-size="11"]{font-size:13px}</style>`
}

/**
 * Along the same route the canvas draws: out of the side facing the other shape.
 * @param {import('./types.js').VueFlowEdge} edge
 * @param {{ x?: number, y?: number, width?: number, height?: number }} from
 * @param {{ x?: number, y?: number, width?: number, height?: number }} to
 * @param {typeof SVG_THEMES.light} colours
 * @param {'added' | 'removed' | 'changed'} [change]
 * @param {boolean} [sketch] drawn by hand
 * @param {string} [lines] step, curved or straight
 */
function renderEdge(edge, from, to, colours, change, sketch = false, lines = LINE.STEP) {
  const box = (/** @type {typeof from} */ b) => ({
    x: b.x ?? 0,
    y: b.y ?? 0,
    width: b.width ?? 0,
    height: b.height ?? 0,
  })
  const route = routeEdge(box(from), box(to), lines)
  const { dashed = false, both = false } = edge.data ?? {}

  const stroke = change ? colours.changes[change] : colours.edge
  const dash = change === 'removed' || dashed ? ' stroke-dasharray="6 4"' : ''
  const style = change
    ? ` stroke-width="2.5"${dash}${change === 'removed' ? ' opacity="0.75"' : ''}`
    : ` stroke-width="1.5"${dash}`
  const head = `url(#${change ? `arrow-${change}` : 'arrow'})`
  const line = `<path d="${sketch ? sketchPath(route.d, edge.id) : route.d}" fill="none" stroke="${stroke}"${style}${both ? ` marker-start="${head}"` : ''} marker-end="${head}"${change ? ` data-change="${change}"` : ''}/>`
  if (!edge.label) return line

  const labelWidth = edge.label.length * TEXT_SIZE * GLYPH + 16
  const { x, y } = route.label
  return [
    line,
    `<rect x="${round(x - labelWidth / 2)}" y="${round(y - 10)}" width="${round(labelWidth)}" height="20" rx="10" fill="${colours.surface}" stroke="${colours.line}"/>`,
    `<text x="${round(x)}" y="${round(y)}" font-size="11" fill="${colours.muted}" text-anchor="middle" dominant-baseline="central">${escapeXml(edge.label)}</text>`,
  ].join('\n')
}

/**
 * @param {import('./types.js').FlowNode} node
 * @param {{ x: number, y: number }} position
 * @param {typeof SVG_THEMES.light} colours
 * @param {'added' | 'removed' | 'changed'} [change]
 * @param {boolean} [sketch] drawn by hand: the clean shape fills, a wobbly one strokes
 */
function renderNode(node, position, colours, change, sketch = false) {
  if (node.type === SHAPE.INK) return renderInk(node, position, colours, change)
  const meta = metaFor(node.type)
  const accent =
    colours.accents[/** @type {keyof typeof colours.accents} */ (meta.accent)] ??
    colours.accents.unknown
  // A text shape has no outline of its own, but a change still needs a frame.
  const size = sizeOf(node)
  const outline =
    shapePath(node.type, size.width, size.height, 1.5) ||
    (change ? shapePath(SHAPE.PROCESS, size.width, size.height, 1.5) : '')
  const own = colorOf(node)
  const paint = own ? colours.paints[own] : null
  const fill = paint?.fill ?? colours.surface
  const stroke = change ? colours.changes[change] : (paint?.stroke ?? accent)
  const style = change
    ? ` stroke-width="3"${change === 'removed' ? ' stroke-dasharray="7 5"' : ''}`
    : ' stroke-width="1.5"'
  const description = meta.summary(node)

  const body =
    node.type === SHAPE.TABLE
      ? tableText(node.name, description, colours, size)
      : centredText(node, description, colours, size)

  return [
    `<g transform="translate(${round(position.x)},${round(position.y)})"${change === 'removed' ? ' opacity="0.6"' : ''}${change ? ` data-change="${change}"` : ''}>`,
    outline && sketch
      ? [
          `<path d="${outline}" fill="${fill}" stroke="none"/>`,
          `<path d="${sketchPath(outline, node.id)}" fill="none" stroke="${stroke}"${style} stroke-linecap="round"/>`,
        ].join('\n')
      : '',
    outline && !sketch
      ? `<path d="${outline}" fill="${fill}" stroke="${stroke}"${style} stroke-linejoin="round"/>`
      : '',
    body,
    '</g>',
  ]
    .filter(Boolean)
    .join('\n')
}

/**
 * @param {import('./types.js').FlowNode} node
 * @param {string} description
 * @param {typeof SVG_THEMES.light} colours
 * @param {{ width: number, height: number }} size
 */
function centredText(node, description, colours, size) {
  const inset = textInset(node.type, size.width, size.height)
  const room = size.width - 2 * (inset.x || 12)
  const titleSize = node.type === SHAPE.TEXT ? 16 : TITLE_SIZE
  const titles = wrap(node.name, room, titleSize, 2)
  const lines = description
    ? wrap(description, room, TEXT_SIZE, node.type === SHAPE.DECISION ? 1 : 2)
    : []

  const blockHeight =
    titles.length * titleSize * 1.25 + (lines.length ? 4 + lines.length * TEXT_SIZE * 1.3 : 0)
  let y = size.height / 2 - blockHeight / 2
  const cx = size.width / 2

  const out = titles.map((line) => {
    y += titleSize * 1.25
    return `<text x="${cx}" y="${round(y - 4)}" font-size="${titleSize}" font-weight="600" fill="${colours.ink}" text-anchor="middle">${escapeXml(line)}</text>`
  })
  y += 4
  lines.forEach((line) => {
    y += TEXT_SIZE * 1.3
    out.push(
      `<text x="${cx}" y="${round(y - 3)}" font-size="${TEXT_SIZE}" fill="${colours.muted}" text-anchor="middle">${escapeXml(line)}</text>`,
    )
  })
  return out.join('\n')
}

/**
 * @param {string} name
 * @param {string} description
 * @param {typeof SVG_THEMES.light} colours
 * @param {{ width: number, height: number }} size
 */
function tableText(name, description, colours, size) {
  const room = size.width - 24
  const out = [
    `<text x="12" y="21" font-size="${TITLE_SIZE}" font-weight="600" fill="${colours.ink}">${escapeXml(wrap(name, room, TITLE_SIZE, 1)[0] ?? '')}</text>`,
  ]
  wrap(description, room, TEXT_SIZE, 3).forEach((line, index) =>
    out.push(
      `<text x="12" y="${52 + index * 16}" font-size="${TEXT_SIZE}" fill="${colours.muted}">${escapeXml(line)}</text>`,
    ),
  )
  return out.join('\n')
}

/**
 * Words into at most `max` lines that fit `width`, the last ending in an
 * ellipsis when something was cut.
 *
 * @param {string} text
 * @param {number} width
 * @param {number} size
 * @param {number} max
 * @returns {string[]}
 */
export function wrap(text, width, size, max) {
  const fits = Math.max(4, Math.floor(width / (size * GLYPH)))
  const words = String(text ?? '')
    .split(/\s+/)
    .filter(Boolean)
  /** @type {string[]} */
  const lines = []
  let current = ''

  for (const word of words) {
    const next = current ? `${current} ${word}` : word
    if (next.length <= fits) {
      current = next
      continue
    }
    if (current) lines.push(current)
    current = word.length > fits ? `${word.slice(0, fits - 1)}…` : word
  }
  if (current) lines.push(current)

  if (lines.length <= max) return lines
  const kept = lines.slice(0, max)
  const last = kept[max - 1]
  kept[max - 1] = `${last.length >= fits ? last.slice(0, fits - 1) : last}…`
  return kept
}

/** @param {string} text */
export const escapeXml = (text) =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

/** @param {number} value */
const round = (value) => Math.round(value * 10) / 10
